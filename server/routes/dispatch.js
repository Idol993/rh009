const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');
const {
  calculateDistance,
  calculateDetourScore,
  haversineDistance
} = require('../utils');
const { sendToRider, broadcast } = require('../socket');

function scoreRider(rider, order) {
  const riderLocation = rider.currentLocation.coordinates;
  const pickupLocation = order.pickupLocation.coordinates;

  const distanceToPickup = haversineDistance(riderLocation, pickupLocation);
  const distanceScore = Math.max(0, 10 - distanceToPickup * 2);

  const loadScore = rider.currentOrders.length > 0 ?
    Math.max(0, 10 - rider.currentOrders.length * 2) : 10;

  let detourScore = 10;
  if (rider.currentOrders.length > 0) {
    const existingOrders = rider.currentOrders;
    const detour = calculateDetourScore(order, existingOrders, riderLocation);
    detourScore = Math.max(0, 10 - detour * 5);
  }

  const ratingScore = rider.rating * 2;

  const weightScore = order.cargo.weight <= rider.maxLoad ? 5 : 0;
  const volumeScore = order.cargo.volume <= rider.maxVolume ? 5 : 0;

  return {
    total: distanceScore + loadScore + detourScore + ratingScore + weightScore + volumeScore,
    components: {
      distance: distanceScore,
      load: loadScore,
      detour: detourScore,
      rating: ratingScore,
      capacity: weightScore + volumeScore
    },
    distanceToPickup
  };
}

async function findBestRiders(order, limit = 5) {
  const riders = await User.find({
    role: 'rider',
    onlineStatus: 'online',
    vehicleType: order.vehicleType,
    status: 'active',
    'currentOrders.2': { $exists: false }
  }).where('maxLoad').gte(order.cargo.weight)
    .where('maxVolume').gte(order.cargo.volume);

  const scoredRiders = riders.map(rider => ({
    rider,
    score: scoreRider(rider, order)
  }));

  scoredRiders.sort((a, b) => b.score.total - a.score.total);

  return scoredRiders.slice(0, limit);
}

router.get('/recommend/:orderId', protect, authorize('dispatcher', 'admin'), async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { limit = 5 } = req.query;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: '订单不存在' });
    }

    if (order.status !== 'pending') {
      return res.status(400).json({ success: false, message: '订单已被分配' });
    }

    const recommendedRiders = await findBestRiders(order, limit);

    res.json({
      success: true,
      data: recommendedRiders.map(item => ({
        rider: item.rider,
        score: item.score.total,
        scoreDetails: item.score.components,
        distanceToPickup: item.score.distanceToPickup
      }))
    });
  } catch (err) {
    next(err);
  }
});

router.post('/assign', protect, authorize('dispatcher', 'admin'), async (req, res, next) => {
  try {
    const { orderId, riderId, autoAssign = false } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: '订单不存在' });
    }

    if (order.status !== 'pending') {
      return res.status(400).json({ success: false, message: '订单已被分配' });
    }

    let rider;
    if (autoAssign) {
      const recommended = await findBestRiders(order, 1);
      if (recommended.length === 0) {
        return res.status(400).json({ success: false, message: '暂无可用骑手' });
      }
      rider = recommended[0].rider;
    } else {
      rider = await User.findById(riderId);
      if (!rider || rider.role !== 'rider') {
        return res.status(404).json({ success: false, message: '骑手不存在' });
      }
    }

    order.rider = rider._id;
    order.status = 'assigned';
    order.timeline.push({
      status: 'assigned',
      time: new Date(),
      remark: `已分配给骑手 ${rider.name}`
    });
    await order.save();

    rider.currentOrders.push(order._id);
    rider.onlineStatus = 'busy';
    await rider.save();

    sendToRider(rider._id, 'order:assigned', order);
    broadcast('order:update', order);

    res.json({
      success: true,
      data: {
        order,
        rider: {
          _id: rider._id,
          name: rider.name,
          phone: rider.phone
        }
      }
    });
  } catch (err) {
    next(err);
  }
});

router.post('/auto-dispatch', protect, authorize('dispatcher', 'admin'), async (req, res, next) => {
  try {
    const pendingOrders = await Order.find({ status: 'pending' }).sort({ createdAt: 1 });
    const results = [];

    for (const order of pendingOrders) {
      try {
        const recommended = await findBestRiders(order, 1);
        if (recommended.length > 0) {
          const rider = recommended[0].rider;

          order.rider = rider._id;
          order.status = 'assigned';
          order.timeline.push({
            status: 'assigned',
            time: new Date(),
            remark: `系统自动分配给骑手 ${rider.name}`
          });
          await order.save();

          rider.currentOrders.push(order._id);
          rider.onlineStatus = 'busy';
          await rider.save();

          sendToRider(rider._id, 'order:assigned', order);
          broadcast('order:update', order);

          results.push({
            orderId: order._id,
            orderNo: order.orderNo,
            riderId: rider._id,
            riderName: rider.name,
            success: true
          });
        } else {
          results.push({
            orderId: order._id,
            orderNo: order.orderNo,
            success: false,
            reason: '暂无可用骑手'
          });
        }
      } catch (err) {
        results.push({
          orderId: order._id,
          orderNo: order.orderNo,
          success: false,
          reason: err.message
        });
      }
    }

    res.json({
      success: true,
      data: {
        total: pendingOrders.length,
        assigned: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results
      }
    });
  } catch (err) {
    next(err);
  }
});

router.get('/batch-orders/:riderId', protect, authorize('dispatcher', 'admin', 'rider'), async (req, res, next) => {
  try {
    const { riderId } = req.params;

    const rider = await User.findById(riderId);
    if (!rider || rider.role !== 'rider') {
      return res.status(404).json({ success: false, message: '骑手不存在' });
    }

    const orders = await Order.find({
      _id: { $in: rider.currentOrders },
      status: { $in: ['assigned', 'accepted', 'picking', 'picked', 'delivering', 'arrived'] }
    }).populate('merchant', 'name companyName');

    const waypoints = [];
    orders.forEach(order => {
      if (order.status !== 'picked' && order.status !== 'delivering' && order.status !== 'arrived') {
        waypoints.push({
          type: 'pickup',
          orderId: order._id,
          location: order.pickupLocation.coordinates,
          address: order.pickupAddress
        });
      }
      waypoints.push({
        type: 'delivery',
        orderId: order._id,
        location: order.customer.location.coordinates,
        address: order.customer.address
      });
    });

    res.json({
      success: true,
      data: {
        orders,
        waypoints,
        riderLocation: rider.currentLocation.coordinates
      }
    });
  } catch (err) {
    next(err);
  }
});

router.get('/realtime-riders', protect, async (req, res, next) => {
  try {
    const { bounds, vehicleType } = req.query;
    const query = {
      role: 'rider',
      onlineStatus: 'online',
      status: 'active'
    };

    if (vehicleType) {
      query.vehicleType = vehicleType;
    }

    if (bounds) {
      const [minLng, minLat, maxLng, maxLat] = bounds.split(',').map(Number);
      query['currentLocation.coordinates'] = {
        $geoWithin: {
          $box: [
            [minLng, minLat],
            [maxLng, maxLat]
          ]
        }
      };
    }

    const riders = await User.find(query).select('-password');

    res.json({
      success: true,
      data: riders
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

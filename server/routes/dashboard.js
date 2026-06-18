const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const User = require('../models/User');
const RiskAlert = require('../models/Risk');
const { protect, authorize } = require('../middleware/auth');
const { getOnlineRiders } = require('../socket');

router.get('/overview', protect, authorize('dispatcher', 'admin'), async (req, res, next) => {
  try {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [
      totalOrders,
      todayOrders,
      pendingOrders,
      deliveringOrders,
      completedOrders,
      exceptionOrders,
      totalRiders,
      activeRiders,
      onlineRidersCount,
      totalMerchants,
      pendingAlerts
    ] = await Promise.all([
      Order.countDocuments(),
      Order.countDocuments({ createdAt: { $gte: startOfDay } }),
      Order.countDocuments({ status: 'pending' }),
      Order.countDocuments({ status: { $in: ['picking', 'picked', 'delivering', 'arrived'] } }),
      Order.countDocuments({ status: 'signed' }),
      Order.countDocuments({ status: 'exception' }),
      User.countDocuments({ role: 'rider', status: 'active' }),
      User.countDocuments({ role: 'rider', onlineStatus: { $in: ['online', 'busy'] } }),
      Promise.resolve(getOnlineRiders().length),
      User.countDocuments({ role: 'merchant', status: 'active' }),
      RiskAlert.countDocuments({ status: 'pending' })
    ]);

    const todaySignedOrders = await Order.find({
      status: 'signed',
      'signedBy.time': { $gte: startOfDay },
      estimatedDuration: { $exists: true }
    });

    let avgDeliveryTime = 0;
    if (todaySignedOrders.length > 0) {
      const totalDuration = todaySignedOrders.reduce((sum, order) => {
        const actualTime = (order.actualDeliveryTime - order.createdAt) / 60000;
        return sum + actualTime;
      }, 0);
      avgDeliveryTime = Math.round(totalDuration / todaySignedOrders.length);
    }

    const todaySigned = todaySignedOrders.length;
    const todayTotal = await Order.countDocuments({
      createdAt: { $gte: startOfDay },
      status: { $nin: ['pending', 'cancelled'] }
    });
    const successRate = todayTotal > 0 ? Math.round(todaySigned / todayTotal * 100) / 100 : 0;

    const todayRevenue = todaySignedOrders.reduce((sum, o) => sum + (o.freight?.total || 0), 0);

    res.json({
      success: true,
      data: {
        orders: {
          total: totalOrders,
          today: todayOrders,
          pending: pendingOrders,
          delivering: deliveringOrders,
          completed: completedOrders,
          exception: exceptionOrders
        },
        riders: {
          total: totalRiders,
          active: activeRiders,
          online: onlineRidersCount
        },
        merchants: {
          total: totalMerchants
        },
        metrics: {
          avgDeliveryTime,
          successRate,
          todayRevenue: Math.round(todayRevenue * 100) / 100,
          pendingAlerts
        }
      }
    });
  } catch (err) {
    next(err);
  }
});

router.get('/heatmap', protect, authorize('dispatcher', 'admin'), async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const query = { status: { $in: ['signed', 'delivering', 'picked'] } };

    if (startDate) query.createdAt = { ...query.createdAt, $gte: new Date(startDate) };
    if (endDate) query.createdAt = { ...query.createdAt, $lte: new Date(endDate) };

    const orders = await Order.find(query).select('pickupLocation customer.location');

    const heatmapData = orders.map(order => ({
      pickup: order.pickupLocation.coordinates,
      delivery: order.customer.location.coordinates
    }));

    res.json({
      success: true,
      data: heatmapData
    });
  } catch (err) {
    next(err);
  }
});

router.get('/order-trend', protect, authorize('dispatcher', 'admin'), async (req, res, next) => {
  try {
    const { days = 7 } = req.query;
    const now = new Date();
    const dates = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      dates.push(new Date(date.getFullYear(), date.getMonth(), date.getDate()));
    }

    const trendData = [];
    for (let i = 0; i < dates.length; i++) {
      const startOfDay = dates[i];
      const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000 - 1);

      const [total, completed, cancelled] = await Promise.all([
        Order.countDocuments({ createdAt: { $gte: startOfDay, $lte: endOfDay } }),
        Order.countDocuments({
          status: 'signed',
          'signedBy.time': { $gte: startOfDay, $lte: endOfDay }
        }),
        Order.countDocuments({ status: 'cancelled', createdAt: { $gte: startOfDay, $lte: endOfDay } })
      ]);

      trendData.push({
        date: startOfDay.toISOString().slice(0, 10),
        total,
        completed,
        cancelled,
        successRate: total > 0 ? Math.round(completed / total * 100) / 100 : 0
      });
    }

    res.json({
      success: true,
      data: trendData
    });
  } catch (err) {
    next(err);
  }
});

router.get('/realtime-orders', protect, authorize('dispatcher', 'admin'), async (req, res, next) => {
  try {
    const { limit = 50 } = req.query;

    const orders = await Order.find({
      status: { $in: ['pending', 'assigned', 'accepted', 'picking', 'picked', 'delivering', 'arrived'] }
    })
      .populate('merchant', 'name companyName')
      .populate('rider', 'name phone onlineStatus')
      .limit(limit)
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: orders
    });
  } catch (err) {
    next(err);
  }
});

router.get('/realtime-alerts', protect, authorize('dispatcher', 'admin'), async (req, res, next) => {
  try {
    const { limit = 20 } = req.query;

    const alerts = await RiskAlert.find({
      status: { $in: ['pending', 'processing'] }
    })
      .populate('order', 'orderNo')
      .populate('rider', 'name phone')
      .limit(limit)
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: alerts
    });
  } catch (err) {
    next(err);
  }
});

router.get('/rider-performance', protect, authorize('dispatcher', 'admin'), async (req, res, next) => {
  try {
    const { limit = 10, period = 'today' } = req.query;
    const now = new Date();
    let startDate;

    switch (period) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }

    const riders = await User.aggregate([
      { $match: { role: 'rider', status: 'active' } },
      {
        $lookup: {
          from: 'orders',
          let: { riderId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$rider', '$$riderId'] },
                    { $eq: ['$status', 'signed'] },
                    { $gte: ['$signedBy.time', startDate] }
                  ]
                }
              }
            }
          ],
          as: 'completedOrders'
        }
      },
      {
        $addFields: {
          orderCount: { $size: '$completedOrders' },
          totalDistance: {
            $sum: '$completedOrders.estimatedDistance'
          },
          totalCommission: {
            $sum: '$completedOrders.freight.riderCommission'
          }
        }
      },
      { $sort: { orderCount: -1 } },
      { $limit: parseInt(limit) },
      {
        $project: {
          _id: 1,
          name: 1,
          phone: 1,
          vehicleType: 1,
          rating: 1,
          onlineStatus: 1,
          orderCount: 1,
          totalDistance: 1,
          totalCommission: 1
        }
      }
    ]);

    res.json({
      success: true,
      data: riders.map(r => ({
        ...r,
        totalDistance: Math.round((r.totalDistance || 0) * 100) / 100,
        totalCommission: Math.round((r.totalCommission || 0) * 100) / 100
      }))
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

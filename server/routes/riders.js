const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Order = require('../models/Order');
const { RiderWallet } = require('../models/Finance');
const { protect, authorize } = require('../middleware/auth');

router.get('/status', protect, authorize('rider'), async (req, res, next) => {
  try {
    const rider = await User.findById(req.user._id);
    res.json({
      success: true,
      data: {
        onlineStatus: rider.onlineStatus,
        currentOrders: rider.currentOrders.length,
        completedOrders: rider.completedOrders,
        rating: rider.rating,
        todayEarnings: rider.todayEarnings,
        totalEarnings: rider.totalEarnings
      }
    });
  } catch (err) {
    next(err);
  }
});

router.put('/status', protect, authorize('rider'), async (req, res, next) => {
  try {
    const { onlineStatus } = req.body;
    const rider = await User.findByIdAndUpdate(
      req.user._id,
      { onlineStatus },
      { new: true }
    );

    res.json({
      success: true,
      data: { onlineStatus: rider.onlineStatus }
    });
  } catch (err) {
    next(err);
  }
});

router.put('/location', protect, authorize('rider'), async (req, res, next) => {
  try {
    const { location } = req.body;
    const rider = await User.findByIdAndUpdate(
      req.user._id,
      { 'currentLocation.coordinates': location },
      { new: true }
    );

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.get('/orders', protect, authorize('rider'), async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const query = { rider: req.user._id };

    if (status) {
      query.status = status;
    }

    const orders = await Order.find(query)
      .populate('merchant', 'name companyName phone')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await Order.countDocuments(query);

    res.json({
      success: true,
      data: orders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    next(err);
  }
});

router.post('/orders/:id/accept', protect, authorize('rider'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({ success: false, message: '订单不存在' });
    }

    if (order.rider.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: '无权操作此订单' });
    }

    if (order.status !== 'assigned') {
      return res.status(400).json({ success: false, message: '订单状态不正确' });
    }

    order.status = 'accepted';
    order.timeline.push({
      status: 'accepted',
      time: new Date(),
      remark: '骑手已接单'
    });
    await order.save();

    res.json({
      success: true,
      data: order
    });
  } catch (err) {
    next(err);
  }
});

router.post('/orders/:id/pickup', protect, authorize('rider'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { location } = req.body;

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ success: false, message: '订单不存在' });
    }

    if (order.rider.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: '无权操作此订单' });
    }

    if (order.status !== 'accepted') {
      return res.status(400).json({ success: false, message: '订单状态不正确' });
    }

    order.status = 'picking';
    order.timeline.push({
      status: 'picking',
      time: new Date(),
      location,
      remark: '骑手已到达取货点'
    });
    await order.save();

    res.json({
      success: true,
      data: order
    });
  } catch (err) {
    next(err);
  }
});

router.post('/orders/:id/depart', protect, authorize('rider'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { location } = req.body;

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ success: false, message: '订单不存在' });
    }

    if (order.rider.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: '无权操作此订单' });
    }

    if (order.status !== 'picked') {
      return res.status(400).json({ success: false, message: '订单状态不正确' });
    }

    order.status = 'delivering';
    order.timeline.push({
      status: 'delivering',
      time: new Date(),
      location,
      remark: '骑手已出发配送'
    });
    await order.save();

    res.json({
      success: true,
      data: order
    });
  } catch (err) {
    next(err);
  }
});

router.post('/orders/:id/arrive', protect, authorize('rider'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { location } = req.body;

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ success: false, message: '订单不存在' });
    }

    if (order.rider.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: '无权操作此订单' });
    }

    if (order.status !== 'delivering') {
      return res.status(400).json({ success: false, message: '订单状态不正确' });
    }

    order.status = 'arrived';
    order.timeline.push({
      status: 'arrived',
      time: new Date(),
      location,
      remark: '骑手已到达收货点'
    });
    await order.save();

    res.json({
      success: true,
      data: order
    });
  } catch (err) {
    next(err);
  }
});

router.get('/wallet', protect, authorize('rider'), async (req, res, next) => {
  try {
    let wallet = await RiderWallet.findOne({ rider: req.user._id });
    if (!wallet) {
      wallet = await RiderWallet.create({
        rider: req.user._id,
        balance: 0,
        totalEarnings: 0
      });
    }

    res.json({
      success: true,
      data: wallet
    });
  } catch (err) {
    next(err);
  }
});

router.get('/statistics', protect, authorize('rider'), async (req, res, next) => {
  try {
    const { period = 'today' } = req.query;
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

    const orders = await Order.find({
      rider: req.user._id,
      status: 'signed',
      signedBy: { $exists: true },
      'signedBy.time': { $gte: startDate }
    });

    const totalDistance = orders.reduce((sum, o) => sum + (o.estimatedDistance || 0), 0);
    const totalWeight = orders.reduce((sum, o) => sum + (o.cargo?.weight || 0), 0);
    const totalCommission = orders.reduce((sum, o) => sum + (o.freight?.riderCommission || 0), 0);

    res.json({
      success: true,
      data: {
        orderCount: orders.length,
        totalDistance: Math.round(totalDistance * 100) / 100,
        totalWeight: Math.round(totalWeight * 100) / 100,
        totalCommission: Math.round(totalCommission * 100) / 100,
        avgCommission: orders.length > 0 ? Math.round(totalCommission / orders.length * 100) / 100 : 0
      }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

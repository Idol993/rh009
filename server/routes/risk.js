const express = require('express');
const router = express.Router();
const RiskAlert = require('../models/Risk');
const Order = require('../models/Order');
const { protect, authorize } = require('../middleware/auth');
const { generateAlertNo, haversineDistance } = require('../utils');
const { broadcast } = require('../socket');

router.get('/alerts', protect, authorize('dispatcher', 'admin'), async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, level, type, startDate, endDate } = req.query;
    const query = {};

    if (status) query.status = status;
    if (level) query.level = level;
    if (type) query.type = type;
    if (startDate) query.createdAt = { ...query.createdAt, $gte: new Date(startDate) };
    if (endDate) query.createdAt = { ...query.createdAt, $lte: new Date(endDate) };

    const alerts = await RiskAlert.find(query)
      .populate('order', 'orderNo customer.name')
      .populate('rider', 'name phone')
      .populate('handledBy', 'name')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await RiskAlert.countDocuments(query);

    res.json({
      success: true,
      data: alerts,
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

router.post('/alerts/:id/handle', protect, authorize('dispatcher', 'admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { action, remark } = req.body;

    const alert = await RiskAlert.findById(id);
    if (!alert) {
      return res.status(404).json({ success: false, message: '预警不存在' });
    }

    if (alert.status !== 'pending' && alert.status !== 'processing') {
      return res.status(400).json({ success: false, message: '预警已处理' });
    }

    alert.status = action === 'ignore' ? 'ignored' : 'resolved';
    alert.handledBy = req.user._id;
    alert.handledAt = new Date();
    alert.handleRemark = remark;
    await alert.save();

    res.json({
      success: true,
      data: alert
    });
  } catch (err) {
    next(err);
  }
});

router.get('/alerts/:id', protect, authorize('dispatcher', 'admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const alert = await RiskAlert.findById(id)
      .populate('order', 'orderNo customer.name customer.phone pickupAddress gpsTrail')
      .populate('rider', 'name phone vehicleNumber');

    if (!alert) {
      return res.status(404).json({ success: false, message: '预警不存在' });
    }

    res.json({
      success: true,
      data: alert
    });
  } catch (err) {
    next(err);
  }
});

router.post('/check-route', protect, authorize('rider'), async (req, res, next) => {
  try {
    const { orderId, currentLocation } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: '订单不存在' });
    }

    if (order.rider.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: '无权操作此订单' });
    }

    if (order.status !== 'delivering') {
      return res.json({ success: true, data: { normal: true } });
    }

    const pickupLoc = order.pickupLocation.coordinates;
    const dropoffLoc = order.customer.location.coordinates;

    const distanceToPickup = haversineDistance(currentLocation, pickupLoc);
    const distanceToDropoff = haversineDistance(currentLocation, dropoffLoc);
    const totalDistance = haversineDistance(pickupLoc, dropoffLoc);

    const deviationThreshold = Math.min(totalDistance * 0.3, 2);
    const expectedRoute = distanceToPickup + distanceToDropoff;
    const deviation = expectedRoute - totalDistance;

    if (deviation > deviationThreshold) {
      const existingAlert = await RiskAlert.findOne({
        order: orderId,
        type: 'route_deviation',
        status: { $in: ['pending', 'processing'] }
      });

      if (!existingAlert) {
        const alert = await RiskAlert.create({
          alertNo: generateAlertNo(),
          type: 'route_deviation',
          level: deviation > deviationThreshold * 2 ? 'high' : 'medium',
          order: orderId,
          rider: req.user._id,
          description: `骑手偏离预定路线${Math.round(deviation * 1000)}米`,
          location: { coordinates: currentLocation },
          deviationDistance: Math.round(deviation * 1000)
        });

        broadcast('risk:alert', alert);

        return res.json({
          success: true,
          data: {
            normal: false,
            alert,
            deviation: Math.round(deviation * 1000),
            threshold: Math.round(deviationThreshold * 1000)
          }
        });
      }
    }

    res.json({ success: true, data: { normal: true } });
  } catch (err) {
    next(err);
  }
});

router.post('/check-stop', protect, authorize('rider'), async (req, res, next) => {
  try {
    const { orderId, currentLocation, stoppedDuration } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: '订单不存在' });
    }

    if (order.rider.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: '无权操作此订单' });
    }

    const dropoffLoc = order.customer.location.coordinates;
    const distanceToDropoff = haversineDistance(currentLocation, dropoffLoc);

    if (distanceToDropoff > 0.1 && stoppedDuration > 300) {
      const existingAlert = await RiskAlert.findOne({
        order: orderId,
        type: 'stop_timeout',
        status: { $in: ['pending', 'processing'] }
      });

      if (!existingAlert) {
        const alert = await RiskAlert.create({
          alertNo: generateAlertNo(),
          type: 'stop_timeout',
          level: stoppedDuration > 600 ? 'high' : 'medium',
          order: orderId,
          rider: req.user._id,
          description: `骑手停留超时${Math.floor(stoppedDuration / 60)}分钟`,
          location: { coordinates: currentLocation },
          stopDuration: stoppedDuration
        });

        broadcast('risk:alert', alert);

        return res.json({
          success: true,
          data: {
            normal: false,
            alert,
            duration: stoppedDuration,
            threshold: 300
          }
        });
      }
    }

    res.json({ success: true, data: { normal: true } });
  } catch (err) {
    next(err);
  }
});

router.get('/statistics', protect, authorize('dispatcher', 'admin'), async (req, res, next) => {
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

    const alerts = await RiskAlert.find({
      createdAt: { $gte: startDate }
    });

    const pendingAlerts = alerts.filter(a => a.status === 'pending').length;
    const routeDeviation = alerts.filter(a => a.type === 'route_deviation').length;
    const stopTimeout = alerts.filter(a => a.type === 'stop_timeout').length;
    const highAlerts = alerts.filter(a => a.level === 'high' || a.level === 'critical').length;

    const resolvedRate = alerts.length > 0
      ? Math.round(alerts.filter(a => a.status === 'resolved' || a.status === 'ignored').length / alerts.length * 100) / 100
      : 0;

    res.json({
      success: true,
      data: {
        totalAlerts: alerts.length,
        pendingAlerts,
        routeDeviation,
        stopTimeout,
        highAlerts,
        resolvedRate
      }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

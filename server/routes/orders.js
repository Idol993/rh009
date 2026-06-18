const express = require('express');
const router = express.Router();
const Tesseract = require('tesseract.js');
const Order = require('../models/Order');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');
const {
  generateOrderNo,
  matchVehicleType,
  calculateFreight,
  calculateDuration,
  calculateDistance,
  generateVerificationCode,
  haversineDistance
} = require('../utils');
const { sendToRider, sendToOrderChannel, broadcast } = require('../socket');

router.post('/estimate', protect, authorize('merchant', 'admin'), async (req, res, next) => {
  try {
    const { pickupLocation, customerLocation, cargo } = req.body;

    const distance = calculateDistance(
      pickupLocation[1], pickupLocation[0],
      customerLocation[1], customerLocation[0]
    );

    const vehicleType = matchVehicleType(cargo.weight, cargo.volume);

    const merchant = await User.findById(req.user._id);
    const discountRate = merchant.discountRate || 1.0;

    const freight = calculateFreight(distance, cargo.weight, cargo.volume, vehicleType, discountRate);
    const duration = calculateDuration(distance, vehicleType);

    res.json({
      success: true,
      data: {
        distance: Math.round(distance * 100) / 100,
        vehicleType,
        vehicleTypeName: vehicleType === 'motorcycle' ? '摩托车' : '厢式货车',
        duration,
        freight
      }
    });
  } catch (err) {
    next(err);
  }
});

router.post('/', protect, authorize('merchant', 'admin'), async (req, res, next) => {
  try {
    const { customer, pickupAddress, pickupLocation, cargo, remark } = req.body;
    const merchant = await User.findById(req.user._id);

    const distance = calculateDistance(
      pickupLocation[1], pickupLocation[0],
      customer.location[1], customer.location[0]
    );

    const vehicleType = matchVehicleType(cargo.weight, cargo.volume);
    const freight = calculateFreight(distance, cargo.weight, cargo.volume, vehicleType, merchant.discountRate);
    const duration = calculateDuration(distance, vehicleType);
    const verificationCode = generateVerificationCode();

    const order = new Order({
      orderNo: generateOrderNo(),
      merchant: req.user._id,
      customer,
      pickupAddress,
      pickupLocation: { coordinates: pickupLocation },
      cargo,
      vehicleType,
      estimatedDistance: Math.round(distance * 100) / 100,
      estimatedDuration: duration,
      freight,
      verificationCode,
      expectedDeliveryTime: new Date(Date.now() + duration * 60 * 1000),
      timeline: [{
        status: 'pending',
        time: new Date(),
        location: pickupLocation,
        remark: '订单已创建，等待调度'
      }]
    });

    await order.save();
    await order.populate('merchant', 'name companyName');

    merchant.monthlyOrders += 1;
    merchant.totalSpent += freight.total;
    await merchant.save();

    broadcast('order:new', order);

    res.status(201).json({
      success: true,
      data: order
    });
  } catch (err) {
    next(err);
  }
});

router.get('/', protect, async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20, startDate, endDate } = req.query;
    const query = {};

    if (req.user.role === 'merchant') {
      query.merchant = req.user._id;
    } else if (req.user.role === 'rider') {
      query.rider = req.user._id;
    }

    if (status) query.status = status;
    if (startDate) query.createdAt = { ...query.createdAt, $gte: new Date(startDate) };
    if (endDate) query.createdAt = { ...query.createdAt, $lte: new Date(endDate) };

    const orders = await Order.find(query)
      .populate('merchant', 'name companyName phone')
      .populate('rider', 'name phone')
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

router.get('/:id', protect, async (req, res, next) => {
  try {
    const { id } = req.params;
    const order = await Order.findById(id)
      .populate('merchant', 'name companyName phone')
      .populate('rider', 'name phone');

    if (!order) {
      return res.status(404).json({ success: false, message: '订单不存在' });
    }

    if (req.user.role === 'merchant' && order.merchant._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: '无权访问此订单' });
    }
    if (req.user.role === 'rider' && order.rider && order.rider._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: '无权访问此订单' });
    }

    res.json({
      success: true,
      data: order
    });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/ocr', protect, authorize('rider'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { imageBase64 } = req.body;

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ success: false, message: '订单不存在' });
    }

    if (order.rider.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: '无权操作此订单' });
    }

    const imageBuffer = Buffer.from(imageBase64, 'base64');
    const result = await Tesseract.recognize(imageBuffer, 'chi_sim+eng');
    const ocrText = result.data.text;

    const waybillInfo = {
      ocrResult: {
        text: ocrText,
        confidence: result.data.confidence,
        words: result.data.words.map(w => ({ text: w.text, confidence: w.confidence }))
      },
      verified: true
    };

    order.waybillInfo = waybillInfo;
    if (order.pickupPhotos) {
      order.pickupPhotos.push(imageBase64);
    } else {
      order.pickupPhotos = [imageBase64];
    }

    if (order.status === 'picking') {
      order.status = 'picked';
      order.timeline.push({
        status: 'picked',
        time: new Date(),
        remark: '货物已取，面单已核验'
      });
    }

    await order.save();
    sendToOrderChannel(order._id, 'order:update', order);

    res.json({
      success: true,
      data: waybillInfo
    });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/gps', protect, authorize('rider'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { location, speed } = req.body;

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ success: false, message: '订单不存在' });
    }

    if (order.rider.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: '无权操作此订单' });
    }

    order.gpsTrail.push({
      location,
      time: new Date(),
      speed
    });

    if (order.gpsTrail.length > 1000) {
      order.gpsTrail = order.gpsTrail.slice(-500);
    }

    await order.save();

    sendToOrderChannel(order._id, 'order:gps', {
      orderId: id,
      location,
      speed,
      time: new Date()
    });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.put('/:id/status', protect, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, remark, location } = req.body;

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ success: false, message: '订单不存在' });
    }

    if (req.user.role === 'rider' && order.rider.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: '无权操作此订单' });
    }

    if (status === 'signed') {
      const { code, signMethod, signName } = req.body;
      if (code !== order.verificationCode) {
        return res.status(400).json({ success: false, message: '验证码错误' });
      }
      order.signedBy = {
        name: signName,
        method: signMethod || 'code',
        time: new Date()
      };
      order.actualDeliveryTime = new Date();
    }

    if (status === 'exception') {
      const { exception } = req.body;
      order.exception = {
        ...exception,
        reportedAt: new Date(),
        handled: false
      };
      order.status = 'exception';
    } else {
      order.status = status;
    }

    order.timeline.push({
      status,
      time: new Date(),
      location,
      remark
    });

    await order.save();
    await order.populate('merchant', 'name companyName');
    await order.populate('rider', 'name phone');

    sendToOrderChannel(order._id, 'order:update', order);

    res.json({
      success: true,
      data: order
    });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/exception', protect, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { type, description, photos } = req.body;

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ success: false, message: '订单不存在' });
    }

    order.exception = {
      type,
      description,
      photos,
      reportedAt: new Date(),
      handled: false,
      claimAmount: 0
    };
    order.status = 'exception';
    order.timeline.push({
      status: 'exception',
      time: new Date(),
      remark: `异常上报: ${description}`
    });

    await order.save();

    broadcast('order:exception', order);
    sendToOrderChannel(order._id, 'order:update', order);

    res.json({
      success: true,
      data: order
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

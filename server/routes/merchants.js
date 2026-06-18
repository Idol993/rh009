const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Order = require('../models/Order');
const { protect, authorize } = require('../middleware/auth');

router.get('/profile', protect, authorize('merchant'), async (req, res, next) => {
  try {
    const merchant = await User.findById(req.user._id);
    res.json({
      success: true,
      data: merchant
    });
  } catch (err) {
    next(err);
  }
});

router.put('/profile', protect, authorize('merchant'), async (req, res, next) => {
  try {
    const { ...updateData } = req.body;
    const merchant = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true, runValidators: true }
    );
    res.json({
      success: true,
      data: merchant
    });
  } catch (err) {
    next(err);
  }
});

router.get('/statistics', protect, authorize('merchant', 'admin'), async (req, res, next) => {
  try {
    const merchantId = req.user.role === 'admin' ? req.query.merchantId : req.user._id;
    const { period = 'month' } = req.query;
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
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const orders = await Order.find({
      merchant: merchantId,
      createdAt: { $gte: startDate }
    });

    const totalOrders = orders.length;
    const totalAmount = orders.reduce((sum, o) => sum + (o.freight?.total || 0), 0);
    const completedOrders = orders.filter(o => o.status === 'signed').length;
    const cancelledOrders = orders.filter(o => o.status === 'cancelled').length;
    const exceptionOrders = orders.filter(o => o.status === 'exception').length;

    res.json({
      success: true,
      data: {
        totalOrders,
        completedOrders,
        cancelledOrders,
        exceptionOrders,
        totalAmount: Math.round(totalAmount * 100) / 100,
        completionRate: totalOrders > 0 ? Math.round(completedOrders / totalOrders * 100) / 100 : 0
      }
    });
  } catch (err) {
    next(err);
  }
});

router.get('/', protect, authorize('admin', 'dispatcher'), async (req, res, next) => {
  try {
    const { page = 1, limit = 20, keyword } = req.query;
    const query = { role: 'merchant' };

    if (keyword) {
      query.$or = [
        { name: { $regex: keyword, $options: 'i' } },
        { companyName: { $regex: keyword, $options: 'i' } },
        { phone: { $regex: keyword } }
      ];
    }

    const merchants = await User.find(query)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      data: merchants,
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

router.get('/:id', protect, authorize('admin', 'dispatcher'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const merchant = await User.findById(id);
    if (!merchant || merchant.role !== 'merchant') {
      return res.status(404).json({ success: false, message: '商户不存在' });
    }
    res.json({
      success: true,
      data: merchant
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

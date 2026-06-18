const express = require('express');
const router = express.Router();
const XLSX = require('xlsx');
const { Transaction, Settlement, RiderWallet } = require('../models/Finance');
const Order = require('../models/Order');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');
const { generateTransactionNo, generateSettlementNo, calculateCommission } = require('../utils');

router.get('/transactions', protect, async (req, res, next) => {
  try {
    const { page = 1, limit = 20, type, startDate, endDate } = req.query;
    const query = {};

    if (req.user.role === 'rider') {
      query.user = req.user._id;
    } else if (req.user.role === 'merchant') {
      query.user = req.user._id;
    }

    if (type) query.type = type;
    if (startDate) query.createdAt = { ...query.createdAt, $gte: new Date(startDate) };
    if (endDate) query.createdAt = { ...query.createdAt, $lte: new Date(endDate) };

    const transactions = await Transaction.find(query)
      .populate('user', 'name phone')
      .populate('order', 'orderNo')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await Transaction.countDocuments(query);

    res.json({
      success: true,
      data: transactions,
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

router.get('/transactions/export', protect, authorize('admin', 'finance'), async (req, res, next) => {
  try {
    const { startDate, endDate, type } = req.query;
    const query = {};

    if (type) query.type = type;
    if (startDate) query.createdAt = { ...query.createdAt, $gte: new Date(startDate) };
    if (endDate) query.createdAt = { ...query.createdAt, $lte: new Date(endDate) };

    const transactions = await Transaction.find(query)
      .populate('user', 'name phone role')
      .populate('order', 'orderNo')
      .sort({ createdAt: -1 });

    const data = transactions.map(t => ({
      '交易编号': t.transactionNo,
      '交易类型': getTypeName(t.type),
      '金额': t.amount,
      '用户': t.user?.name,
      '手机号': t.user?.phone,
      '角色': getRoleName(t.user?.role),
      '关联订单': t.order?.orderNo || '-',
      '状态': getStatusName(t.status),
      '支付方式': getPaymentName(t.paymentMethod),
      '备注': t.description || '-',
      '交易时间': t.createdAt.toLocaleString()
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, '财务流水');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const filename = `财务流水_${new Date().toISOString().slice(0, 10)}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (err) {
    next(err);
  }
});

function getTypeName(type) {
  const types = {
    recharge: '充值',
    payment: '支付',
    commission: '佣金',
    withdraw: '提现',
    refund: '退款',
    settlement: '结算'
  };
  return types[type] || type;
}

function getRoleName(role) {
  const roles = {
    rider: '骑手',
    merchant: '商户',
    dispatcher: '调度员',
    admin: '管理员'
  };
  return roles[role] || role;
}

function getStatusName(status) {
  const statuses = {
    pending: '处理中',
    completed: '已完成',
    failed: '失败'
  };
  return statuses[status] || status;
}

function getPaymentName(method) {
  const methods = {
    alipay: '支付宝',
    wechat: '微信',
    bank: '银行卡',
    balance: '余额'
  };
  return methods[method] || method || '-';
}

router.post('/settlement/daily', protect, authorize('admin', 'finance'), async (req, res, next) => {
  try {
    const { date } = req.body;
    const targetDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000 - 1);

    const riders = await User.find({ role: 'rider', status: 'active' });
    const results = [];

    for (const rider of riders) {
      const orders = await Order.find({
        rider: rider._id,
        status: 'signed',
        'signedBy.time': { $gte: startOfDay, $lte: endOfDay }
      });

      if (orders.length === 0) continue;

      const existingSettlement = await Settlement.findOne({
        rider: rider._id,
        date: startOfDay
      });

      if (existingSettlement) continue;

      const totalDistance = orders.reduce((sum, o) => sum + (o.estimatedDistance || 0), 0);
      const totalWeight = orders.reduce((sum, o) => sum + (o.cargo?.weight || 0), 0);

      const baseCommission = orders.reduce((sum, o) => sum + 3, 0);
      const distanceBonus = orders.reduce((sum, o) => sum + (o.estimatedDistance * 0.8), 0);
      const weightBonus = orders.reduce((sum, o) => sum + (o.cargo?.weight * 0.3), 0);
      const otherBonus = 0;
      const deductions = 0;

      const totalAmount = baseCommission + distanceBonus + weightBonus + otherBonus - deductions;

      const settlement = await Settlement.create({
        settlementNo: generateSettlementNo(),
        rider: rider._id,
        date: startOfDay,
        orders: orders.map(o => o._id),
        orderCount: orders.length,
        totalDistance: Math.round(totalDistance * 100) / 100,
        totalWeight: Math.round(totalWeight * 100) / 100,
        baseCommission: Math.round(baseCommission * 100) / 100,
        distanceBonus: Math.round(distanceBonus * 100) / 100,
        weightBonus: Math.round(weightBonus * 100) / 100,
        otherBonus,
        deductions,
        totalAmount: Math.round(totalAmount * 100) / 100,
        status: 'pending'
      });

      results.push({
        riderId: rider._id,
        riderName: rider.name,
        settlementNo: settlement.settlementNo,
        orderCount: orders.length,
        totalAmount: settlement.totalAmount
      });
    }

    res.json({
      success: true,
      data: {
        total: results.length,
        results
      }
    });
  } catch (err) {
    next(err);
  }
});

router.get('/settlements', protect, async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, startDate, endDate } = req.query;
    const query = {};

    if (req.user.role === 'rider') {
      query.rider = req.user._id;
    }

    if (status) query.status = status;
    if (startDate) query.date = { ...query.date, $gte: new Date(startDate) };
    if (endDate) query.date = { ...query.date, $lte: new Date(endDate) };

    const settlements = await Settlement.find(query)
      .populate('rider', 'name phone')
      .populate('orders', 'orderNo estimatedDistance')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await Settlement.countDocuments(query);

    res.json({
      success: true,
      data: settlements,
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

router.post('/settlements/:id/pay', protect, authorize('admin', 'finance'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { paymentMethod } = req.body;

    const settlement = await Settlement.findById(id).populate('rider');
    if (!settlement) {
      return res.status(404).json({ success: false, message: '结算单不存在' });
    }

    if (settlement.status !== 'pending') {
      return res.status(400).json({ success: false, message: '结算单状态不正确' });
    }

    settlement.status = 'processing';
    await settlement.save();

    const wallet = await RiderWallet.findOne({ rider: settlement.rider._id });
    if (!wallet) {
      return res.status(404).json({ success: false, message: '骑手钱包不存在' });
    }

    wallet.balance += settlement.totalAmount;
    wallet.totalEarnings += settlement.totalAmount;
    wallet.todayEarnings += settlement.totalAmount;
    wallet.lastSettlementDate = new Date();
    await wallet.save();

    const rider = await User.findById(settlement.rider._id);
    rider.todayEarnings += settlement.totalAmount;
    rider.totalEarnings += settlement.totalAmount;
    await rider.save();

    await Transaction.create({
      transactionNo: generateTransactionNo(),
      type: 'settlement',
      amount: settlement.totalAmount,
      user: settlement.rider._id,
      status: 'completed',
      paymentMethod,
      description: `日结结算 ${settlement.settlementNo}`,
      balanceBefore: wallet.balance - settlement.totalAmount,
      balanceAfter: wallet.balance
    });

    settlement.status = 'paid';
    settlement.paidAt = new Date();
    settlement.paymentMethod = paymentMethod;
    await settlement.save();

    res.json({
      success: true,
      data: settlement
    });
  } catch (err) {
    next(err);
  }
});

router.get('/wallet/:riderId', protect, async (req, res, next) => {
  try {
    const { riderId } = req.params;

    if (req.user.role === 'rider' && req.user._id.toString() !== riderId) {
      return res.status(403).json({ success: false, message: '无权访问' });
    }

    let wallet = await RiderWallet.findOne({ rider: riderId });
    if (!wallet) {
      wallet = await RiderWallet.create({
        rider: riderId,
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

router.get('/statistics', protect, authorize('admin', 'finance'), async (req, res, next) => {
  try {
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

    const transactions = await Transaction.find({
      createdAt: { $gte: startDate }
    });

    const totalIncome = transactions
      .filter(t => t.type === 'payment' || t.type === 'recharge')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpense = transactions
      .filter(t => t.type === 'settlement' || t.type === 'refund')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalSettlements = await Settlement.countDocuments({
      createdAt: { $gte: startDate }
    });

    const paidSettlements = await Settlement.countDocuments({
      status: 'paid',
      paidAt: { $gte: startDate }
    });

    res.json({
      success: true,
      data: {
        totalIncome: Math.round(totalIncome * 100) / 100,
        totalExpense: Math.round(totalExpense * 100) / 100,
        netProfit: Math.round((totalIncome - totalExpense) * 100) / 100,
        totalSettlements,
        paidSettlements,
        transactionCount: transactions.length
      }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

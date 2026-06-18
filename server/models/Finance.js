const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
  transactionNo: {
    type: String,
    unique: true,
    required: true
  },
  type: {
    type: String,
    enum: ['recharge', 'payment', 'commission', 'withdraw', 'refund', 'settlement'],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'completed'
  },
  paymentMethod: {
    type: String,
    enum: ['alipay', 'wechat', 'bank', 'balance']
  },
  description: String,
  balanceBefore: Number,
  balanceAfter: Number,
  createdAt: {
    type: Date,
    default: Date.now
  },
  settled: {
    type: Boolean,
    default: false
  },
  settledAt: Date
});

const SettlementSchema = new mongoose.Schema({
  settlementNo: {
    type: String,
    unique: true,
    required: true
  },
  rider: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  orders: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  }],
  orderCount: {
    type: Number,
    default: 0
  },
  totalDistance: {
    type: Number,
    default: 0
  },
  totalWeight: {
    type: Number,
    default: 0
  },
  baseCommission: {
    type: Number,
    default: 0
  },
  distanceBonus: {
    type: Number,
    default: 0
  },
  weightBonus: {
    type: Number,
    default: 0
  },
  otherBonus: {
    type: Number,
    default: 0
  },
  deductions: {
    type: Number,
    default: 0
  },
  totalAmount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'paid', 'failed'],
    default: 'pending'
  },
  paidAt: Date,
  paidAmount: Number,
  paymentMethod: String,
  remark: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const RiderWalletSchema = new mongoose.Schema({
  rider: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  balance: {
    type: Number,
    default: 0
  },
  frozenBalance: {
    type: Number,
    default: 0
  },
  totalEarnings: {
    type: Number,
    default: 0
  },
  totalWithdrawn: {
    type: Number,
    default: 0
  },
  todayEarnings: {
    type: Number,
    default: 0
  },
  lastSettlementDate: Date,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Transaction = mongoose.model('Transaction', TransactionSchema);
const Settlement = mongoose.model('Settlement', SettlementSchema);
const RiderWallet = mongoose.model('RiderWallet', RiderWalletSchema);

module.exports = { Transaction, Settlement, RiderWallet };

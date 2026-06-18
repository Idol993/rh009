const mongoose = require('mongoose');

const RiskAlertSchema = new mongoose.Schema({
  alertNo: {
    type: String,
    unique: true,
    required: true
  },
  type: {
    type: String,
    enum: ['route_deviation', 'stop_timeout', 'speed_abnormal', 'area_abnormal', 'order_exception'],
    required: true
  },
  level: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  rider: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  description: {
    type: String,
    required: true
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number]
    }
  },
  expectedLocation: {
    type: [Number]
  },
  deviationDistance: Number,
  stopDuration: Number,
  speed: Number,
  status: {
    type: String,
    enum: ['pending', 'processing', 'resolved', 'ignored'],
    default: 'pending'
  },
  handledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  handledAt: Date,
  handleRemark: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

RiskAlertSchema.index({ createdAt: -1 });
RiskAlertSchema.index({ status: 1 });
RiskAlertSchema.index({ level: 1 });

module.exports = mongoose.model('RiskAlert', RiskAlertSchema);

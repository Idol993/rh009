const mongoose = require('mongoose');
const User = require('./User');

const RiderSchema = new mongoose.Schema({
  vehicleType: {
    type: String,
    enum: ['motorcycle', 'van'],
    required: true
  },
  vehicleNumber: String,
  vehicleModel: String,
  licenseNumber: String,
  idCard: String,
  currentLocation: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      default: [116.3972, 39.9075]
    }
  },
  onlineStatus: {
    type: String,
    enum: ['online', 'offline', 'busy'],
    default: 'offline'
  },
  currentOrders: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  }],
  completedOrders: {
    type: Number,
    default: 0
  },
  rating: {
    type: Number,
    default: 5.0
  },
  totalEarnings: {
    type: Number,
    default: 0
  },
  todayEarnings: {
    type: Number,
    default: 0
  },
  maxLoad: {
    type: Number,
    default: 50
  },
  maxVolume: {
    type: Number,
    default: 0.5
  },
  workingHours: {
    start: String,
    end: String
  }
});

RiderSchema.index({ currentLocation: '2dsphere' });

module.exports = User.discriminator('rider', RiderSchema);

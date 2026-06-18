const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
  orderNo: {
    type: String,
    unique: true,
    required: true
  },
  merchant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  rider: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  customer: {
    name: {
      type: String,
      required: true
    },
    phone: {
      type: String,
      required: true
    },
    address: {
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
        type: [Number],
        required: true
      }
    }
  },
  pickupAddress: {
    type: String,
    required: true
  },
  pickupLocation: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      required: true
    }
  },
  cargo: {
    description: String,
    weight: {
      type: Number,
      required: true
    },
    volume: {
      type: Number,
      required: true
    },
    quantity: {
      type: Number,
      default: 1
    },
    declaredValue: Number,
    type: {
      type: String,
      enum: ['normal', 'fragile', 'fresh', 'dangerous'],
      default: 'normal'
    }
  },
  vehicleType: {
    type: String,
    enum: ['motorcycle', 'van'],
    required: true
  },
  estimatedDistance: {
    type: Number,
    required: true
  },
  estimatedDuration: {
    type: Number,
    required: true
  },
  freight: {
    basePrice: Number,
    distancePrice: Number,
    weightPrice: Number,
    total: {
      type: Number,
      required: true
    },
    riderCommission: Number
  },
  status: {
    type: String,
    enum: ['pending', 'assigned', 'accepted', 'picking', 'picked', 'delivering', 'arrived', 'signed', 'exception', 'cancelled'],
    default: 'pending'
  },
  timeline: [{
    status: String,
    time: {
      type: Date,
      default: Date.now
    },
    location: {
      type: [Number]
    },
    remark: String
  }],
  pickupPhotos: [String],
  deliveryPhotos: [String],
  waybillInfo: {
    ocrResult: Object,
    verified: Boolean
  },
  verificationCode: String,
  signedBy: {
    name: String,
    method: {
      type: String,
      enum: ['code', 'face', 'other']
    },
    time: Date
  },
  exception: {
    type: {
      type: String,
      enum: ['damaged', 'lost', 'delayed', 'refused', 'other']
    },
    description: String,
    photos: [String],
    reportedAt: Date,
    handled: Boolean,
    claimAmount: Number
  },
  gpsTrail: [{
    location: {
      type: [Number]
    },
    time: {
      type: Date,
      default: Date.now
    },
    speed: Number
  }],
  riskEvents: [{
    type: String,
    description: String,
    time: Date,
    handled: Boolean
  }],
  expectedDeliveryTime: Date,
  actualDeliveryTime: Date,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

OrderSchema.index({ 'pickupLocation': '2dsphere' });
OrderSchema.index({ 'customer.location': '2dsphere' });
OrderSchema.index({ createdAt: -1 });
OrderSchema.index({ status: 1 });
OrderSchema.index({ rider: 1, status: 1 });

module.exports = mongoose.model('Order', OrderSchema);

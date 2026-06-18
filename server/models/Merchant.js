const mongoose = require('mongoose');
const User = require('./User');

const MerchantSchema = new mongoose.Schema({
  companyName: {
    type: String,
    required: true
  },
  businessLicense: String,
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
  },
  contactPerson: String,
  industry: String,
  monthlyOrders: {
    type: Number,
    default: 0
  },
  totalSpent: {
    type: Number,
    default: 0
  },
  balance: {
    type: Number,
    default: 0
  },
  discountRate: {
    type: Number,
    default: 1.0
  },
  storeImages: [String],
  businessHours: {
    start: String,
    end: String
  }
});

MerchantSchema.index({ location: '2dsphere' });

module.exports = User.discriminator('merchant', MerchantSchema);

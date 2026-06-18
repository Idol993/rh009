const mongoose = require('mongoose');

const CommunitySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  address: String,
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: [Number]
  },
  totalBuildings: Number,
  totalHouses: Number,
  totalResidents: Number,
  propertyCompany: String,
  contactPhone: String,
  area: Number,
  greeningRate: Number,
  buildYear: Number,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const BuildingSchema = new mongoose.Schema({
  community: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Community',
    required: true
  },
  buildingNo: {
    type: String,
    required: true
  },
  totalFloors: Number,
  unitsPerFloor: Number,
  totalUnits: Number,
  buildingType: String,
  elevators: Number,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const HouseSchema = new mongoose.Schema({
  community: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Community',
    required: true
  },
  building: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Building',
    required: true
  },
  unitNo: String,
  roomNo: {
    type: String,
    required: true
  },
  area: Number,
  houseType: String,
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Resident'
  },
  residents: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Resident'
  }],
  status: {
    type: String,
    enum: ['owned', 'rented', 'empty'],
    default: 'empty'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const ResidentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    required: true
  },
  idCard: String,
  gender: {
    type: String,
    enum: ['male', 'female']
  },
  birthDate: Date,
  avatar: String,
  relation: {
    type: String,
    enum: ['owner', 'tenant', 'family'],
    default: 'owner'
  },
  community: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Community',
    required: true
  },
  house: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'House'
  },
  faceData: String,
  cardNumber: String,
  carNumbers: [String],
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const VisitorSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  phone: String,
  idCard: String,
  visitType: {
    type: String,
    enum: ['visit', 'delivery', 'service', 'other'],
    default: 'visit'
  },
  community: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Community',
    required: true
  },
  visitingHouse: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'House'
  },
  hostName: String,
  hostPhone: String,
  checkinTime: Date,
  checkoutTime: Date,
  carNumber: String,
  temperature: Number,
  healthCode: String,
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'checkedin', 'checkedout'],
    default: 'pending'
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  qrCode: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const SecurityEventSchema = new mongoose.Schema({
  eventNo: {
    type: String,
    unique: true,
    required: true
  },
  type: {
    type: String,
    enum: ['intrusion', 'fire', 'fight', 'theft', 'accident', 'complaint', 'maintenance', 'other'],
    required: true
  },
  level: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  community: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Community',
    required: true
  },
  location: String,
  coordinates: [Number],
  description: String,
  photos: [String],
  reporter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reporterName: String,
  reporterPhone: String,
  handler: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'resolved', 'closed'],
    default: 'pending'
  },
  handleProcess: [{
    handler: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    action: String,
    time: {
      type: Date,
      default: Date.now
    },
    remark: String
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const PropertyFeeSchema = new mongoose.Schema({
  feeNo: {
    type: String,
    unique: true,
    required: true
  },
  community: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Community',
    required: true
  },
  house: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'House',
    required: true
  },
  resident: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Resident'
  },
  type: {
    type: String,
    enum: ['property', 'water', 'electricity', 'gas', 'parking', 'other'],
    default: 'property'
  },
  period: {
    year: Number,
    month: Number
  },
  area: Number,
  unitPrice: Number,
  amount: {
    type: Number,
    required: true
  },
  paidAmount: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['unpaid', 'partial', 'paid', 'overdue'],
    default: 'unpaid'
  },
  dueDate: Date,
  paidDate: Date,
  paymentMethod: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const ParkingSpaceSchema = new mongoose.Schema({
  community: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Community',
    required: true
  },
  spaceNo: {
    type: String,
    required: true
  },
  location: String,
  type: {
    type: String,
    enum: ['temporary', 'fixed', 'rented'],
    default: 'temporary'
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Resident'
  },
  carNumber: String,
  status: {
    type: String,
    enum: ['available', 'occupied', 'reserved', 'maintenance'],
    default: 'available'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const AccessRecordSchema = new mongoose.Schema({
  community: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Community',
    required: true
  },
  resident: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Resident'
  },
  visitor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Visitor'
  },
  name: String,
  type: {
    type: String,
    enum: ['resident', 'visitor', 'staff'],
    required: true
  },
  accessType: {
    type: String,
    enum: ['in', 'out'],
    required: true
  },
  gate: String,
  accessMethod: {
    type: String,
    enum: ['card', 'face', 'qr', 'password', 'other'],
    default: 'card'
  },
  temperature: Number,
  photo: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Community = mongoose.model('Community', CommunitySchema);
const Building = mongoose.model('Building', BuildingSchema);
const House = mongoose.model('House', HouseSchema);
const Resident = mongoose.model('Resident', ResidentSchema);
const Visitor = mongoose.model('Visitor', VisitorSchema);
const SecurityEvent = mongoose.model('SecurityEvent', SecurityEventSchema);
const PropertyFee = mongoose.model('PropertyFee', PropertyFeeSchema);
const ParkingSpace = mongoose.model('ParkingSpace', ParkingSpaceSchema);
const AccessRecord = mongoose.model('AccessRecord', AccessRecordSchema);

module.exports = {
  Community,
  Building,
  House,
  Resident,
  Visitor,
  SecurityEvent,
  PropertyFee,
  ParkingSpace,
  AccessRecord
};

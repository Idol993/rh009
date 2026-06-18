const express = require('express');
const router = express.Router();
const {
  Community,
  Building,
  House,
  Resident,
  Visitor,
  SecurityEvent,
  PropertyFee,
  ParkingSpace,
  AccessRecord
} = require('../models/Community');
const { protect, authorize } = require('../middleware/auth');

router.get('/communities', protect, async (req, res, next) => {
  try {
    const { page = 1, limit = 20, keyword } = req.query;
    const query = {};

    if (keyword) {
      query.name = { $regex: keyword, $options: 'i' };
    }

    const communities = await Community.find(query)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await Community.countDocuments(query);

    res.json({
      success: true,
      data: communities,
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

router.post('/communities', protect, authorize('admin'), async (req, res, next) => {
  try {
    const community = await Community.create(req.body);
    res.status(201).json({
      success: true,
      data: community
    });
  } catch (err) {
    next(err);
  }
});

router.get('/residents', protect, async (req, res, next) => {
  try {
    const { page = 1, limit = 20, keyword, communityId } = req.query;
    const query = {};

    if (communityId) query.community = communityId;
    if (keyword) {
      query.$or = [
        { name: { $regex: keyword, $options: 'i' } },
        { phone: { $regex: keyword } }
      ];
    }

    const residents = await Resident.find(query)
      .populate('community', 'name')
      .populate('house', 'roomNo buildingNo')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await Resident.countDocuments(query);

    res.json({
      success: true,
      data: residents,
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

router.post('/residents', protect, async (req, res, next) => {
  try {
    const resident = await Resident.create(req.body);
    res.status(201).json({
      success: true,
      data: resident
    });
  } catch (err) {
    next(err);
  }
});

router.get('/buildings/:communityId', protect, async (req, res, next) => {
  try {
    const { communityId } = req.params;
    const buildings = await Building.find({ community: communityId });

    res.json({
      success: true,
      data: buildings
    });
  } catch (err) {
    next(err);
  }
});

router.get('/houses', protect, async (req, res, next) => {
  try {
    const { buildingId, communityId, page = 1, limit = 50 } = req.query;
    const query = {};

    if (buildingId) query.building = buildingId;
    if (communityId) query.community = communityId;

    const houses = await House.find(query)
      .populate('building', 'buildingNo')
      .populate('owner', 'name phone')
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await House.countDocuments(query);

    res.json({
      success: true,
      data: houses,
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

router.get('/visitors', protect, async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, communityId } = req.query;
    const query = {};

    if (communityId) query.community = communityId;
    if (status) query.status = status;

    const visitors = await Visitor.find(query)
      .populate('community', 'name')
      .populate('visitingHouse', 'roomNo')
      .populate('approvedBy', 'name')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await Visitor.countDocuments(query);

    res.json({
      success: true,
      data: visitors,
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

router.post('/visitors', protect, async (req, res, next) => {
  try {
    const visitor = await Visitor.create(req.body);
    res.status(201).json({
      success: true,
      data: visitor
    });
  } catch (err) {
    next(err);
  }
});

router.put('/visitors/:id/approve', protect, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { action } = req.body;

    const visitor = await Visitor.findById(id);
    if (!visitor) {
      return res.status(404).json({ success: false, message: '访客申请不存在' });
    }

    visitor.status = action === 'approve' ? 'approved' : 'rejected';
    visitor.approvedBy = req.user._id;
    if (action === 'approve') {
      visitor.qrCode = 'QR' + Math.random().toString(36).substring(2, 10).toUpperCase();
    }
    await visitor.save();

    res.json({
      success: true,
      data: visitor
    });
  } catch (err) {
    next(err);
  }
});

router.post('/visitors/:id/checkin', protect, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { temperature, gate } = req.body;

    const visitor = await Visitor.findById(id);
    if (!visitor) {
      return res.status(404).json({ success: false, message: '访客不存在' });
    }

    visitor.checkinTime = new Date();
    visitor.status = 'checkedin';
    if (temperature) visitor.temperature = temperature;
    await visitor.save();

    await AccessRecord.create({
      community: visitor.community,
      visitor: visitor._id,
      name: visitor.name,
      type: 'visitor',
      accessType: 'in',
      gate,
      temperature,
      accessMethod: 'qr'
    });

    res.json({
      success: true,
      data: visitor
    });
  } catch (err) {
    next(err);
  }
});

router.get('/security-events', protect, async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, level, type, communityId } = req.query;
    const query = {};

    if (communityId) query.community = communityId;
    if (status) query.status = status;
    if (level) query.level = level;
    if (type) query.type = type;

    const events = await SecurityEvent.find(query)
      .populate('community', 'name')
      .populate('reporter', 'name')
      .populate('handler', 'name')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await SecurityEvent.countDocuments(query);

    res.json({
      success: true,
      data: events,
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

router.post('/security-events', protect, async (req, res, next) => {
  try {
    const event = await SecurityEvent.create({
      ...req.body,
      eventNo: 'EV' + Date.now() + Math.random().toString(36).substring(2, 4).toUpperCase(),
      reporter: req.user._id,
      reporterName: req.user.name,
      reporterPhone: req.user.phone
    });
    res.status(201).json({
      success: true,
      data: event
    });
  } catch (err) {
    next(err);
  }
});

router.put('/security-events/:id/handle', protect, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { action, remark } = req.body;

    const event = await SecurityEvent.findById(id);
    if (!event) {
      return res.status(404).json({ success: false, message: '事件不存在' });
    }

    event.handler = req.user._id;
    event.status = action === 'close' ? 'closed' : 'resolved';
    event.handleProcess.push({
      handler: req.user._id,
      action: remark,
      remark
    });
    await event.save();

    res.json({
      success: true,
      data: event
    });
  } catch (err) {
    next(err);
  }
});

router.get('/property-fees', protect, async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, communityId, houseId } = req.query;
    const query = {};

    if (communityId) query.community = communityId;
    if (houseId) query.house = houseId;
    if (status) query.status = status;

    const fees = await PropertyFee.find(query)
      .populate('community', 'name')
      .populate('house', 'roomNo buildingNo')
      .populate('resident', 'name phone')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await PropertyFee.countDocuments(query);

    res.json({
      success: true,
      data: fees,
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

router.post('/property-fees/:id/pay', protect, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { amount, paymentMethod } = req.body;

    const fee = await PropertyFee.findById(id);
    if (!fee) {
      return res.status(404).json({ success: false, message: '账单不存在' });
    }

    fee.paidAmount += amount;
    fee.paidDate = new Date();
    fee.paymentMethod = paymentMethod;
    if (fee.paidAmount >= fee.amount) {
      fee.status = 'paid';
    } else if (fee.paidAmount > 0) {
      fee.status = 'partial';
    }
    await fee.save();

    res.json({
      success: true,
      data: fee
    });
  } catch (err) {
    next(err);
  }
});

router.get('/parking-spaces', protect, async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, communityId } = req.query;
    const query = {};

    if (communityId) query.community = communityId;
    if (status) query.status = status;

    const spaces = await ParkingSpace.find(query)
      .populate('community', 'name')
      .populate('owner', 'name phone')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ spaceNo: 1 });

    const total = await ParkingSpace.countDocuments(query);

    res.json({
      success: true,
      data: spaces,
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

router.get('/access-records', protect, async (req, res, next) => {
  try {
    const { page = 1, limit = 20, type, communityId, startDate, endDate } = req.query;
    const query = {};

    if (communityId) query.community = communityId;
    if (type) query.type = type;
    if (startDate) query.createdAt = { ...query.createdAt, $gte: new Date(startDate) };
    if (endDate) query.createdAt = { ...query.createdAt, $lte: new Date(endDate) };

    const records = await AccessRecord.find(query)
      .populate('community', 'name')
      .populate('resident', 'name')
      .populate('visitor', 'name')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await AccessRecord.countDocuments(query);

    res.json({
      success: true,
      data: records,
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

router.get('/statistics', protect, async (req, res, next) => {
  try {
    const { communityId } = req.query;
    const query = communityId ? { community: communityId } : {};

    const [
      totalResidents,
      totalHouses,
      todayVisitors,
      pendingEvents,
      unpaidFees,
      occupiedParking,
      todayAccess
    ] = await Promise.all([
      Resident.countDocuments(query),
      House.countDocuments(query),
      Visitor.countDocuments({ ...query, createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) } }),
      SecurityEvent.countDocuments({ ...query, status: { $in: ['pending', 'processing'] } }),
      PropertyFee.countDocuments({ ...query, status: { $in: ['unpaid', 'partial'] } }),
      ParkingSpace.countDocuments({ ...query, status: 'occupied' }),
      AccessRecord.countDocuments({ ...query, createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) } })
    ]);

    res.json({
      success: true,
      data: {
        totalResidents,
        totalHouses,
        todayVisitors,
        pendingEvents,
        unpaidFees,
        occupiedParking,
        todayAccess
      }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

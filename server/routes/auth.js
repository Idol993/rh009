const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');

router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: '请输入用户名和密码' });
    }

    const user = await User.findOne({ username }).select('+password');
    if (!user) {
      return res.status(401).json({ success: false, message: '用户名或密码错误' });
    }

    if (user.status !== 'active') {
      return res.status(403).json({ success: false, message: '账户已被禁用，请联系管理员' });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: '用户名或密码错误' });
    }

    const token = user.getSignedJwtToken();
    const userData = user.toObject();
    delete userData.password;

    res.json({
      success: true,
      token,
      user: userData
    });
  } catch (err) {
    next(err);
  }
});

router.get('/me', protect, async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({
      success: true,
      user
    });
  } catch (err) {
    next(err);
  }
});

router.post('/logout', protect, (req, res) => {
  res.json({
    success: true,
    message: '登出成功'
  });
});

router.put('/password', protect, async (req, res, next) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id).select('+password');

    const isMatch = await user.matchPassword(oldPassword);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: '原密码错误' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ success: true, message: '密码修改成功' });
  } catch (err) {
    next(err);
  }
});

router.get('/users', protect, authorize('admin'), async (req, res, next) => {
  try {
    const { role, page = 1, limit = 20 } = req.query;
    const query = {};
    if (role) query.role = role;

    const users = await User.find(query)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      data: users,
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

router.post('/users', protect, authorize('admin'), async (req, res, next) => {
  try {
    const { username, password, name, phone, role, ...extra } = req.body;

    const existing = await User.findOne({ $or: [{ username }, { phone }] });
    if (existing) {
      return res.status(400).json({ success: false, message: '用户名或手机号已存在' });
    }

    const user = new User({
      username,
      password,
      name,
      phone,
      role,
      ...extra
    });

    await user.save();
    const userData = user.toObject();
    delete userData.password;

    res.status(201).json({
      success: true,
      data: userData
    });
  } catch (err) {
    next(err);
  }
});

router.put('/users/:id', protect, authorize('admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { password, ...updateData } = req.body;

    if (password) {
      updateData.password = password;
    }

    const user = await User.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (err) {
    next(err);
  }
});

router.delete('/users/:id', protect, authorize('admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findByIdAndDelete(id);
    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }

    res.json({
      success: true,
      message: '删除成功'
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

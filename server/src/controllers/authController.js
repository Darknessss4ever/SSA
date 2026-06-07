const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Subscription = require('../models/Subscription');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'shsa_jwt_secret_2024', { expiresIn: '7d' });
};

// @desc    Register user
// @route   POST /api/auth/register
const register = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }
    const user = await User.create({ name, email, password, phone });
    const token = generateToken(user._id);
    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      data: { user, token },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }
    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Account deactivated. Contact admin.' });
    }

    // Populate subscription
    let subscription = null;
    if (user.subscriptionId) {
      subscription = await Subscription.findById(user.subscriptionId).populate('sportsIncluded');
    }

    const token = generateToken(user._id);
    res.json({
      success: true,
      message: 'Login successful',
      data: { user, token, subscription },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('subscriptionId');
    let subscription = null;
    if (user.subscriptionId) {
      subscription = await Subscription.findById(user.subscriptionId).populate('sportsIncluded');
    }
    res.json({ success: true, data: { user, subscription } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update profile
// @route   PUT /api/auth/profile
const updateProfile = async (req, res) => {
  try {
    const { name, phone, avatar } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { name, phone, avatar },
      { new: true }
    );
    res.json({ success: true, data: { user } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { register, login, getMe, updateProfile };

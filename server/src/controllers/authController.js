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

    if (!email && !phone) {
      return res.status(400).json({ success: false, message: 'Either email or phone number is required' });
    }

    if (email) {
      const existingEmail = await User.findOne({ email: email.toLowerCase() });
      if (existingEmail) {
        return res.status(400).json({ success: false, message: 'Email already registered' });
      }
    }
    if (phone) {
      const existingPhone = await User.findOne({ phone });
      if (existingPhone) {
        return res.status(400).json({ success: false, message: 'Phone number already registered' });
      }
    }

    const user = await User.create({
      name,
      email: email ? email.toLowerCase() : null,
      password,
      phone: phone || null
    });

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
    const { loginIdentifier, email, password } = req.body;
    const identifier = loginIdentifier || email;

    if (!identifier) {
      return res.status(400).json({ success: false, message: 'Email or phone number is required' });
    }

    const user = await User.findOne({
      $or: [
        { email: identifier.toLowerCase() },
        { phone: identifier }
      ]
    });

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
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

// Helper to decode base64 JWT payload safely
const decodeGoogleJwt = (credential) => {
  try {
    const payloadPart = credential.split('.')[1];
    const base64 = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      Buffer.from(base64, 'base64')
        .toString()
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (err) {
    throw new Error('Invalid Google credential token format');
  }
};

// @desc    Google Authentication
// @route   POST /api/auth/google
const googleLogin = async (req, res) => {
  try {
    const { credential, mockProfile } = req.body;
    
    let profile = null;
    if (credential) {
      profile = decodeGoogleJwt(credential);
    } else if (mockProfile) {
      profile = mockProfile;
    } else {
      return res.status(400).json({ success: false, message: 'Google credential is required' });
    }

    const { email, name, sub, picture } = profile;
    const googleId = sub;
    
    if (!googleId) {
      return res.status(400).json({ success: false, message: 'Google authentication error: missing profile identifier' });
    }

    let user = await User.findOne({ googleId });

    if (!user) {
      if (email) {
        user = await User.findOne({ email: email.toLowerCase() });
        if (user) {
          user.googleId = googleId;
          if (!user.avatar) user.avatar = picture || '';
          await user.save();
        }
      }
    }

    if (!user) {
      user = await User.create({
        name,
        email: email ? email.toLowerCase() : null,
        googleId,
        avatar: picture || '',
        isActive: true,
      });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Account deactivated. Contact admin.' });
    }

    let subscription = null;
    if (user.subscriptionId) {
      subscription = await Subscription.findById(user.subscriptionId).populate('sportsIncluded');
    }

    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Google login successful',
      data: { user, token, subscription }
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

module.exports = { register, login, getMe, updateProfile, googleLogin };

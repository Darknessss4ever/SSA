const User = require('../models/User');
const Subscription = require('../models/Subscription');
const Booking = require('../models/Booking');
const Sport = require('../models/Sport');
const Slot = require('../models/Slot');

// @desc    Get all users
const getUsers = async (req, res) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;
    const query = { role: 'user' };
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }
    const users = await User.find(query)
      .populate('subscriptionId')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    const total = await User.countDocuments(query);
    res.json({ success: true, data: users, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update user (activate/deactivate)
const updateUser = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Assign subscription to user
const assignSubscription = async (req, res) => {
  try {
    const { userId, type, sportsIncluded, validFrom, validTo, price } = req.body;
    
    // Cancel existing active subscription
    await Subscription.updateMany({ userId, status: 'active' }, { status: 'cancelled' });

    const subscription = await Subscription.create({
      userId, type, sportsIncluded: sportsIncluded || [],
      validFrom, validTo, price: price || 0,
      assignedBy: req.user._id,
    });

    await User.findByIdAndUpdate(userId, { subscriptionId: subscription._id });

    const populated = await Subscription.findById(subscription._id).populate('sportsIncluded', 'name icon');
    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get dashboard stats
const getDashboardStats = async (req, res) => {
  try {
    const [totalUsers, totalBookings, activeBookings, cancelledBookings, totalSports, totalSlots, blockedSlots] = await Promise.all([
      User.countDocuments({ role: 'user' }),
      Booking.countDocuments(),
      Booking.countDocuments({ status: 'confirmed' }),
      Booking.countDocuments({ status: 'cancelled' }),
      Sport.countDocuments({ isActive: true }),
      Slot.countDocuments(),
      Slot.countDocuments({ isBlocked: true }),
    ]);

    // Today's bookings
    const today = new Date().toISOString().split('T')[0];
    const todayBookings = await Booking.countDocuments({
      createdAt: { $gte: new Date(today), $lt: new Date(today + 'T23:59:59') },
    });

    // Bookings by sport
    const bookingsBySport = await Booking.aggregate([
      { $match: { status: { $ne: 'cancelled' } } },
      { $group: { _id: '$sportId', count: { $sum: 1 } } },
      { $lookup: { from: 'sports', localField: '_id', foreignField: '_id', as: 'sport' } },
      { $unwind: '$sport' },
      { $project: { sportName: '$sport.name', count: 1, color: '$sport.color' } },
    ]);

    // Recent bookings
    const recentBookings = await Booking.find()
      .populate('userId', 'name email')
      .populate('sportId', 'name icon color')
      .populate('slotId')
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      success: true,
      data: {
        totalUsers,
        totalBookings,
        activeBookings,
        cancelledBookings,
        totalSports,
        totalSlots,
        blockedSlots,
        todayBookings,
        bookingsBySport,
        recentBookings,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getUsers, updateUser, assignSubscription, getDashboardStats };

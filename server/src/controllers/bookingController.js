const Booking = require('../models/Booking');
const Slot = require('../models/Slot');
const User = require('../models/User');
const Subscription = require('../models/Subscription');

// @desc    Create booking
// @route   POST /api/bookings
const createBooking = async (req, res) => {
  try {
    const { slotId, sportId, isRecurring, recurringPattern, recurringEndDate, notes } = req.body;
    const userId = req.user._id;

    // Check slot exists
    const slot = await Slot.findById(slotId);
    if (!slot) return res.status(404).json({ success: false, message: 'Slot not found' });
    if (slot.isBlocked) return res.status(400).json({ success: false, message: 'Slot is blocked' });

    // Check conflict: same user + same slot
    const existingBooking = await Booking.findOne({ userId, slotId, status: { $ne: 'cancelled' } });
    if (existingBooking) {
      return res.status(400).json({ success: false, message: 'You have already booked this slot' });
    }

    // Check capacity
    const slotBookings = await Booking.countDocuments({ slotId, status: { $ne: 'cancelled' } });
    if (slotBookings >= slot.capacity) {
      return res.status(400).json({ success: false, message: 'Slot is fully booked' });
    }

    // Check booking cutoff (1 hour before)
    const slotDateTime = new Date(`${slot.date}T${slot.startTime}:00`);
    const cutoff = new Date(slotDateTime.getTime() - 60 * 60 * 1000);
    if (new Date() > cutoff) {
      return res.status(400).json({ success: false, message: 'Booking window has closed (1hr before slot)' });
    }

    // Check subscription access + once-per-day rule
    let paymentStatus = 'pending';
    const user = await User.findById(userId).populate('subscriptionId');
    if (user.subscriptionId) {
      const sub = await Subscription.findById(user.subscriptionId);
      if (sub && sub.status === 'active' && new Date(sub.validTo) >= new Date()) {
        const hasAccess = sub.type === 'combo' || sub.sportsIncluded.some(s => s.toString() === sportId);
        if (hasAccess) {
          // Enforce once-per-day per sport for subscription bookings
          const today = slot.date; // "YYYY-MM-DD"
          const todaySlotIds = await Slot.find({ date: today, sportId }).select('_id');
          const todaySlotIdStrings = todaySlotIds.map(s => s._id.toString());
          const alreadyBookedToday = await Booking.findOne({
            userId,
            sportId,
            slotId: { $in: todaySlotIdStrings },
            paymentStatus: 'subscription',
            status: { $ne: 'cancelled' },
          });
          if (alreadyBookedToday) {
            return res.status(400).json({
              success: false,
              message: `You've already used your daily ${sub.type === 'combo' ? 'subscription' : 'subscription'} slot for this sport today. Subscription allows once per day per sport.`,
            });
          }
          paymentStatus = 'subscription';
        }
      }
    }

    // Subscription bookings are immediately confirmed; others await payment at venue
    const bookingStatus = paymentStatus === 'subscription' ? 'confirmed' : 'pending_payment';

    const booking = await Booking.create({
      userId, sportId, slotId,
      isRecurring: isRecurring || false,
      recurringPattern: recurringPattern || null,
      recurringEndDate: recurringEndDate || null,
      paymentStatus,
      notes: notes || '',
      status: bookingStatus,
    });

    // Update slot booked count
    await Slot.findByIdAndUpdate(slotId, { $inc: { bookedCount: 1 } });

    const populated = await Booking.findById(booking._id)
      .populate('sportId', 'name icon color')
      .populate('slotId')
      .populate('userId', 'name email');

    res.status(201).json({ success: true, message: 'Booking confirmed!', data: populated });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'You have already booked this slot' });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get user bookings
// @route   GET /api/bookings
const getUserBookings = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const query = { userId: req.user._id };
    if (status) query.status = status;

    const bookings = await Booking.find(query)
      .populate('sportId', 'name icon color image')
      .populate('slotId')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Booking.countDocuments(query);
    res.json({ success: true, data: bookings, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Cancel booking
// @route   PUT /api/bookings/:id/cancel
const cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

    // Check ownership or admin
    if (booking.userId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    if (booking.status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Booking already cancelled' });
    }

    booking.status = 'cancelled';
    booking.updatedAt = new Date();
    await booking.save();

    await Slot.findByIdAndUpdate(booking.slotId, { $inc: { bookedCount: -1 } });

    res.json({ success: true, message: 'Booking cancelled', data: booking });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all bookings (admin)
// @route   GET /api/admin/bookings
const getAllBookings = async (req, res) => {
  try {
    const { status, sportId, userId, date, page = 1, limit = 20 } = req.query;
    const query = {};
    if (status) query.status = status;
    if (sportId) query.sportId = sportId;
    if (userId) query.userId = userId;

    const bookings = await Booking.find(query)
      .populate('sportId', 'name icon color')
      .populate('slotId')
      .populate('userId', 'name email phone')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Booking.countDocuments(query);
    res.json({ success: true, data: bookings, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Admin override booking status (confirm payment, mark no-show, etc)
// @route   PUT /api/admin/bookings/:id
const adminUpdateBooking = async (req, res) => {
  try {
    const { status, action } = req.body;
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

    if (action === 'confirm_payment') {
      // Admin confirms user paid at venue
      booking.status = 'confirmed';
      booking.paymentStatus = 'paid';
    } else if (action === 'no_show') {
      booking.status = 'no_show';
      booking.noShowMarkedAt = new Date();
      // Free up the slot
      await Slot.findByIdAndUpdate(booking.slotId, { $inc: { bookedCount: -1 } });
    } else if (status) {
      booking.status = status;
    }
    booking.updatedAt = new Date();
    await booking.save();

    const populated = await Booking.findById(booking._id).populate('sportId userId slotId');
    res.json({ success: true, data: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { createBooking, getUserBookings, cancelBooking, getAllBookings, adminUpdateBooking };

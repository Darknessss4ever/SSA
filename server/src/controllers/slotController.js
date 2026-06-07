const Slot = require('../models/Slot');
const Booking = require('../models/Booking');
const Sport = require('../models/Sport');
const Subscription = require('../models/Subscription');

// @desc    Get slots for a sport and date
// @route   GET /api/slots?sportId=&date=
const getSlots = async (req, res) => {
  try {
    const { sportId, date } = req.query;
    if (!sportId || !date) {
      return res.status(400).json({ success: false, message: 'sportId and date are required' });
    }
    const slots = await Slot.find({ sportId, date }).populate('sportId', 'name icon color');
    const bookings = await Booking.find({ slotId: { $in: slots.map(s => s._id) }, status: { $ne: 'cancelled' } });
    
    const slotsWithAvailability = slots.map(slot => {
      const slotBookings = bookings.filter(b => b.slotId.toString() === slot._id.toString());
      return {
        ...slot.toObject(),
        bookedCount: slotBookings.length,
        isAvailable: !slot.isBlocked && slotBookings.length < slot.capacity,
      };
    });

    res.json({ success: true, data: slotsWithAvailability });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create slot (admin)
// @route   POST /api/slots
const createSlot = async (req, res) => {
  try {
    const { sportId, date, startTime, endTime, capacity, price } = req.body;
    const existing = await Slot.findOne({ sportId, date, startTime });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Slot already exists for this time' });
    }
    const slot = await Slot.create({
      sportId, date, startTime, endTime,
      capacity: capacity || 1,
      price: price || 0,
      createdBy: req.user._id,
    });
    res.status(201).json({ success: true, data: slot });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Generate slots for a sport (admin bulk create)
// @route   POST /api/slots/generate
const generateSlots = async (req, res) => {
  try {
    const { sportId, date, startHour, endHour, duration, capacity, price } = req.body;
    const slots = [];
    let current = parseInt(startHour);
    const end = parseInt(endHour);
    const dur = parseInt(duration) || 60;

    while (current + dur / 60 <= end) {
      const sh = String(current).padStart(2, '0') + ':00';
      const eh = String(current + dur / 60).padStart(2, '0') + ':00';
      try {
        const slot = await Slot.create({
          sportId, date,
          startTime: sh, endTime: eh,
          capacity: capacity || 1,
          price: price || 0,
          createdBy: req.user._id,
        });
        slots.push(slot);
      } catch (_) { /* duplicate, skip */ }
      current += dur / 60;
    }
    res.status(201).json({ success: true, data: slots, count: slots.length });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Block/unblock slot
// @route   PUT /api/slots/:id/block
const blockSlot = async (req, res) => {
  try {
    const { isBlocked, blockReason } = req.body;
    const slot = await Slot.findByIdAndUpdate(
      req.params.id,
      { isBlocked, blockReason: isBlocked ? blockReason : '' },
      { new: true }
    );
    if (!slot) return res.status(404).json({ success: false, message: 'Slot not found' });
    res.json({ success: true, data: slot });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete slot
// @route   DELETE /api/slots/:id
const deleteSlot = async (req, res) => {
  try {
    const activeBookings = await Booking.find({ slotId: req.params.id, status: 'confirmed' });
    if (activeBookings.length > 0) {
      return res.status(400).json({ success: false, message: 'Cannot delete slot with active bookings' });
    }
    await Slot.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Slot deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all slots (admin)
const getAllSlots = async (req, res) => {
  try {
    const { sportId, date, page = 1, limit = 50 } = req.query;
    const query = {};
    if (sportId) query.sportId = sportId;
    if (date) query.date = date;

    const slots = await Slot.find(query)
      .populate('sportId', 'name icon color')
      .sort({ date: 1, startTime: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Slot.countDocuments(query);
    res.json({ success: true, data: slots, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getSlots, createSlot, generateSlots, blockSlot, deleteSlot, getAllSlots };

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
    const { sportId, date, startDate, endDate, startTime, endTime, duration, capacity, price } = req.body;
    
    const dur = parseInt(duration) || 60;
    const cap = parseInt(capacity) || 1;
    const prc = parseInt(price) || 0;
    
    // Helper to parse HH:mm to minutes
    const parseTimeToMinutes = (timeStr) => {
      const [h, m] = timeStr.split(':').map(Number);
      return h * 60 + m;
    };
    
    // Helper to format minutes to HH:mm
    const formatMinutesToTime = (totalMin) => {
      const h = Math.floor(totalMin / 60);
      const m = totalMin % 60;
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    };
    
    const startMin = parseTimeToMinutes(startTime || '06:00');
    const endMin = parseTimeToMinutes(endTime || '22:00');
    
    // Get array of dates to generate for
    const dates = [];
    if (startDate && endDate) {
      let current = new Date(startDate);
      const end = new Date(endDate);
      while (current <= end) {
        dates.push(current.toISOString().split('T')[0]);
        current.setDate(current.getDate() + 1);
      }
    } else if (date) {
      dates.push(date);
    } else {
      return res.status(400).json({ success: false, message: 'date or startDate/endDate range is required' });
    }
    
    const generatedSlots = [];
    for (const d of dates) {
      let currentMin = startMin;
      while (currentMin + dur <= endMin) {
        const sh = formatMinutesToTime(currentMin);
        const eh = formatMinutesToTime(currentMin + dur);
        
        try {
          const slot = await Slot.create({
            sportId,
            date: d,
            startTime: sh,
            endTime: eh,
            capacity: cap,
            price: prc,
            createdBy: req.user._id,
          });
          generatedSlots.push(slot);
        } catch (_) {
          // Skip duplicate slots
        }
        currentMin += dur;
      }
    }
    
    res.status(201).json({ success: true, data: generatedSlots, count: generatedSlots.length });
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

// @desc    Update single slot
// @route   PUT /api/slots/:id
const updateSlot = async (req, res) => {
  try {
    const { date, startTime, endTime, capacity, price, isBlocked, blockReason } = req.body;
    
    const slot = await Slot.findById(req.params.id);
    if (!slot) return res.status(404).json({ success: false, message: 'Slot not found' });
    
    // If capacity is reduced, verify it doesn't drop below bookedCount
    if (capacity !== undefined && capacity < slot.bookedCount) {
      return res.status(400).json({
        success: false,
        message: `Cannot reduce capacity below currently booked slots (${slot.bookedCount})`
      });
    }

    // Update fields
    if (date !== undefined) slot.date = date;
    if (startTime !== undefined) slot.startTime = startTime;
    if (endTime !== undefined) slot.endTime = endTime;
    if (capacity !== undefined) slot.capacity = capacity;
    if (price !== undefined) slot.price = price;
    if (isBlocked !== undefined) {
      slot.isBlocked = isBlocked;
      slot.blockReason = isBlocked ? (blockReason || '') : '';
    }
    
    await slot.save();
    res.json({ success: true, data: slot });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Bulk update slots
// @route   PUT /api/slots/bulk
const bulkUpdateSlots = async (req, res) => {
  try {
    const { ids, updates } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'ids array is required' });
    }
    
    const { capacity, price, isBlocked, blockReason } = updates || {};
    
    const query = { _id: { $in: ids } };
    
    const updateData = {};
    if (capacity !== undefined) updateData.capacity = capacity;
    if (price !== undefined) updateData.price = price;
    if (isBlocked !== undefined) {
      updateData.isBlocked = isBlocked;
      updateData.blockReason = isBlocked ? (blockReason || '') : '';
    }
    
    await Slot.updateMany(query, { $set: updateData });
    
    res.json({ success: true, message: `Successfully updated ${ids.length} slots` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Bulk delete slots
// @route   POST /api/slots/bulk-delete
const bulkDeleteSlots = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'ids array is required' });
    }

    // Find slots with active confirmed bookings
    const activeBookedSlots = await Booking.find({
      slotId: { $in: ids },
      status: 'confirmed'
    }).distinct('slotId');

    const activeBookedIdsStr = activeBookedSlots.map(id => id.toString());
    const deletableIds = ids.filter(id => !activeBookedIdsStr.includes(id));

    if (deletableIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete selected slots; all have active bookings',
        skippedCount: ids.length
      });
    }

    await Slot.deleteMany({ _id: { $in: deletableIds } });

    res.json({
      success: true,
      message: `Deleted ${deletableIds.length} slots. Skipped ${ids.length - deletableIds.length} slots due to active bookings.`,
      deletedCount: deletableIds.length,
      skippedCount: ids.length - deletableIds.length
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getSlots, createSlot, generateSlots, blockSlot, deleteSlot, getAllSlots, updateSlot, bulkUpdateSlots, bulkDeleteSlots };

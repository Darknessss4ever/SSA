const express = require('express');
const router = express.Router();
const { createBooking, getUserBookings, cancelBooking, getAllBookings, adminUpdateBooking } = require('../controllers/bookingController');
const { protect, adminOnly } = require('../middleware/auth');

router.post('/', protect, createBooking);
router.get('/', protect, getUserBookings);
router.put('/:id/cancel', protect, cancelBooking);

// Admin routes
router.get('/admin/all', protect, adminOnly, getAllBookings);
router.put('/admin/:id', protect, adminOnly, adminUpdateBooking);

module.exports = router;

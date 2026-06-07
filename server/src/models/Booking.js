const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  userId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sportId: { type: mongoose.Schema.Types.ObjectId, ref: 'Sport', required: true },
  slotId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Slot', required: true },
  status: {
    type: String,
    enum: ['pending_payment', 'confirmed', 'cancelled', 'completed', 'no_show'],
    default: 'pending_payment',
  },
  paymentStatus: {
    type: String,
    enum: ['free', 'paid', 'pending', 'subscription'],
    default: 'pending',
  },
  isRecurring: { type: Boolean, default: false },
  recurringPattern: { type: String, enum: ['daily', 'weekly', 'monthly', null], default: null },
  recurringEndDate: { type: String, default: null },
  notes: { type: String, default: '' },
  noShowMarkedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

bookingSchema.index({ userId: 1, slotId: 1 }, { unique: true });
bookingSchema.index({ slotId: 1, status: 1 });

module.exports = mongoose.model('Booking', bookingSchema);

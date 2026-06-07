const mongoose = require('mongoose');

const slotSchema = new mongoose.Schema({
  sportId: { type: mongoose.Schema.Types.ObjectId, ref: 'Sport', required: true },
  date: { type: String, required: true }, // YYYY-MM-DD
  startTime: { type: String, required: true }, // HH:mm
  endTime: { type: String, required: true },   // HH:mm
  capacity: { type: Number, default: 1 },
  bookedCount: { type: Number, default: 0 },
  isBlocked: { type: Boolean, default: false },
  blockReason: { type: String, default: '' },
  price: { type: Number, default: 0 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
});

slotSchema.index({ sportId: 1, date: 1, startTime: 1 }, { unique: true });

slotSchema.virtual('isAvailable').get(function () {
  return !this.isBlocked && this.bookedCount < this.capacity;
});

module.exports = mongoose.model('Slot', slotSchema);

const mongoose = require('mongoose');

const sportSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: { type: String, default: '' },
  image: { type: String, default: '' },
  icon: { type: String, default: '' },
  color: { type: String, default: '#6366f1' },
  pricePerSlot: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  maxCapacity: { type: Number, default: 1 },
  duration: { type: Number, default: 60 }, // in minutes
  features: [{ type: String }],
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Sport', sportSchema);

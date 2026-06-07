const mongoose = require('mongoose');

const coachingSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  sportId: { type: mongoose.Schema.Types.ObjectId, ref: 'Sport', required: true },
  trainerName: { type: String, required: true },
  trainerImage: { type: String, default: '' },
  trainerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null },
  schedule: { type: String, default: '' },
  duration: { type: String, default: '' },
  price: { type: Number, default: 0 },
  maxParticipants: { type: Number, default: 10 },
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  pendingParticipants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  isActive: { type: Boolean, default: true },
  startDate: { type: Date },
  endDate: { type: Date },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Coaching', coachingSchema);

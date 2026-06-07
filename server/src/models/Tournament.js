const mongoose = require('mongoose');

const tournamentSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  sportId: { type: mongoose.Schema.Types.ObjectId, ref: 'Sport', required: true },
  date: { type: Date, required: true },
  registrationDeadline: { type: Date },
  maxParticipants: { type: Number, default: 16 },
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  entryFee: { type: Number, default: 0 },
  prize: { type: String, default: '' },
  status: { type: String, enum: ['upcoming', 'ongoing', 'completed', 'cancelled'], default: 'upcoming' },
  image: { type: String, default: '' },
  leaderboard: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    position: Number,
    score: Number,
  }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Tournament', tournamentSchema);

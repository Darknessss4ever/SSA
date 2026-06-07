const mongoose = require('mongoose');

// Per-sport preferred/allotted time
const sportTimeSchema = new mongoose.Schema({
  sportId: { type: mongoose.Schema.Types.ObjectId, ref: 'Sport', required: true },
  startTime: { type: String, required: true }, // "06:00"
  endTime:   { type: String, required: true }, // "07:00"
}, { _id: false });

const subscriptionSchema = new mongoose.Schema({
  userId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  planId:  { type: mongoose.Schema.Types.ObjectId, ref: 'SubscriptionPlan', default: null },
  type:    { type: String, enum: ['individual', 'combo'], required: true },
  sportsIncluded: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Sport' }],
  validFrom: { type: Date, required: true },
  validTo:   { type: Date, required: true },
  status:    { type: String, enum: ['active', 'expired', 'cancelled'], default: 'active' },
  price:     { type: Number, default: 0 },
  durationDays:  { type: Number, required: true },
  durationLabel: { type: String, default: '' },

  // Whether the user is allowed to pick their own daily slot time
  userSelectsTime: { type: Boolean, default: false },

  // Admin-allotted daily slot times per sport (set during assignment for 1m/3m)
  adminAllottedTimes: [sportTimeSchema],

  // User's preferred daily slot times per sport (set by user for 6m/1yr)
  preferredSlotTimes: [sportTimeSchema],

  allowedPerDay: { type: Number, default: 1 },
  assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  notes: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Subscription', subscriptionSchema);

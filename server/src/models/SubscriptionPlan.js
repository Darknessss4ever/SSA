const mongoose = require('mongoose');

// Each duration tier inside a plan can have its own pricing + time-control rule
const durationTierSchema = new mongoose.Schema({
  label: { type: String, required: true },    // "1 Month", "3 Months", etc.
  days: { type: Number, required: true },      // 30, 90, 180, 365
  price: { type: Number, required: true },
  // false = admin picks the daily slot time for the user
  // true  = user picks their own preferred daily slot time
  userSelectsTime: { type: Boolean, default: false },
}, { _id: false });

const subscriptionPlanSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, default: '' },
  type: { type: String, enum: ['individual', 'combo'], required: true },
  sportsIncluded: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Sport' }],

  // Multiple duration tiers — admin configures each separately
  durations: [durationTierSchema],

  // Once per day per sport (default 1, future-proof)
  allowedPerDay: { type: Number, default: 1 },

  features: [{ type: String }],
  isActive: { type: Boolean, default: true },
  isPopular: { type: Boolean, default: false },
  color: { type: String, default: '#d946ef' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('SubscriptionPlan', subscriptionPlanSchema);

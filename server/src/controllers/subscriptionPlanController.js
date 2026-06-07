const SubscriptionPlan = require('../models/SubscriptionPlan');
const Subscription = require('../models/Subscription');
const User = require('../models/User');

// ─── Helpers ─────────────────────────────────────────────────────────────────
const populatePlan = (q) =>
  q.populate('sportsIncluded', 'name icon color');

const populateSub = (q) =>
  q
    .populate('userId', 'name email phone')
    .populate('planId', 'name color allowedPerDay')
    .populate('sportsIncluded', 'name icon color')
    .populate('adminAllottedTimes.sportId', 'name icon')
    .populate('preferredSlotTimes.sportId', 'name icon');

// ─── Plans ────────────────────────────────────────────────────────────────────

const getPlans = async (req, res) => {
  try {
    const showAll = req.user?.role === 'admin';
    const plans = await populatePlan(
      SubscriptionPlan.find(showAll ? {} : { isActive: true }).sort({ isPopular: -1, 'durations.0.price': 1 })
    );
    res.json({ success: true, data: plans });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createPlan = async (req, res) => {
  try {
    const plan = await SubscriptionPlan.create({ ...req.body, createdBy: req.user._id });
    const populated = await populatePlan(SubscriptionPlan.findById(plan._id));
    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updatePlan = async (req, res) => {
  try {
    const plan = await populatePlan(
      SubscriptionPlan.findByIdAndUpdate(req.params.id, req.body, { new: true })
    );
    if (!plan) return res.status(404).json({ success: false, message: 'Plan not found' });
    res.json({ success: true, data: plan });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deletePlan = async (req, res) => {
  try {
    await SubscriptionPlan.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ success: true, message: 'Plan deactivated' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Admin: all subscriptions ─────────────────────────────────────────────────

const getAllSubscriptions = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const query = status ? { status } : {};
    const [subscriptions, total] = await Promise.all([
      populateSub(Subscription.find(query).sort({ createdAt: -1 }).limit(limit * 1).skip((page - 1) * limit)),
      Subscription.countDocuments(query),
    ]);
    res.json({ success: true, data: subscriptions, total });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/subscription-plans/assign
// Body: { userId, planId, durationIndex, customValidFrom, adminAllottedTimes? }
const assignPlanToUser = async (req, res) => {
  try {
    const { userId, planId, durationIndex = 0, customValidFrom, adminAllottedTimes } = req.body;

    const plan = await SubscriptionPlan.findById(planId).populate('sportsIncluded');
    if (!plan) return res.status(404).json({ success: false, message: 'Plan not found' });

    const tier = plan.durations[durationIndex];
    if (!tier) return res.status(400).json({ success: false, message: 'Invalid duration tier' });

    // Cancel existing active subscription
    await Subscription.updateMany({ userId, status: 'active' }, { status: 'cancelled' });

    const validFrom = customValidFrom ? new Date(customValidFrom) : new Date();
    const validTo = new Date(validFrom);
    validTo.setDate(validTo.getDate() + tier.days);

    // If admin allots time, they must provide times for each sport
    if (!tier.userSelectsTime && adminAllottedTimes) {
      const bad = adminAllottedTimes.find(t => !t.sportId || !t.startTime || !t.endTime);
      if (bad) return res.status(400).json({ success: false, message: 'Please provide start & end time for all sports' });
    }

    const subscription = await Subscription.create({
      userId,
      planId: plan._id,
      type: plan.type,
      sportsIncluded: plan.sportsIncluded.map(s => s._id),
      validFrom,
      validTo,
      price: tier.price,
      durationDays: tier.days,
      durationLabel: tier.label,
      userSelectsTime: tier.userSelectsTime,
      adminAllottedTimes: tier.userSelectsTime ? [] : (adminAllottedTimes || []),
      preferredSlotTimes: [],
      allowedPerDay: plan.allowedPerDay,
      assignedBy: req.user._id,
    });

    await User.findByIdAndUpdate(userId, { subscriptionId: subscription._id });

    const populated = await populateSub(Subscription.findById(subscription._id));
    res.status(201).json({
      success: true,
      message: `"${plan.name}" (${tier.label}) assigned successfully!`,
      data: populated,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const cancelUserSubscription = async (req, res) => {
  try {
    const sub = await Subscription.findByIdAndUpdate(req.params.id, { status: 'cancelled' }, { new: true });
    if (!sub) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: sub });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── User: my subscription + set preferred times ──────────────────────────────

const getMySubscription = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    let subscription = null;

    if (user.subscriptionId) {
      subscription = await populateSub(Subscription.findById(user.subscriptionId));
      if (subscription?.status === 'active' && new Date(subscription.validTo) < new Date()) {
        subscription.status = 'expired';
        await subscription.save();
      }
    }

    const plans = await populatePlan(SubscriptionPlan.find({ isActive: true }).sort({ isPopular: -1 }));
    res.json({ success: true, data: { subscription, plans } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/subscription-plans/my-preferred-times
// Body: { preferredSlotTimes: [{ sportId, startTime, endTime }] }
const setPreferredTimes = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user.subscriptionId) return res.status(404).json({ success: false, message: 'No active subscription' });

    const sub = await Subscription.findById(user.subscriptionId);
    if (!sub || sub.status !== 'active') return res.status(400).json({ success: false, message: 'Subscription not active' });
    if (!sub.userSelectsTime) return res.status(403).json({ success: false, message: 'Your plan does not allow self-selection of time' });

    const { preferredSlotTimes } = req.body;
    if (!Array.isArray(preferredSlotTimes) || preferredSlotTimes.length === 0)
      return res.status(400).json({ success: false, message: 'Please provide at least one preferred time' });

    sub.preferredSlotTimes = preferredSlotTimes;
    await sub.save();

    const populated = await populateSub(Subscription.findById(sub._id));
    res.json({ success: true, message: 'Preferred times saved!', data: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/subscription-plans/my-status  (user — fast check of which sports are covered + today quota)
const getMyStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user.subscriptionId) return res.json({ success: true, data: { active: false, coveredSportIds: [], usedTodaySportIds: [] } });

    const sub = await Subscription.findById(user.subscriptionId).populate('sportsIncluded', '_id');
    if (!sub || sub.status !== 'active' || new Date(sub.validTo) < new Date()) {
      return res.json({ success: true, data: { active: false, coveredSportIds: [], usedTodaySportIds: [] } });
    }

    const coveredSportIds = sub.sportsIncluded.map((s) => (s._id || s).toString());

    // Check which sports have already been booked today via subscription
    const Booking = require('../models/Booking');
    const Slot = require('../models/Slot');
    const today = new Date().toISOString().split('T')[0];
    const todaySlots = await Slot.find({ date: today }).select('_id sportId');
    const todaySlotMap = {};
    todaySlots.forEach(s => { todaySlotMap[s._id.toString()] = s.sportId.toString(); });

    const todaySubBookings = await Booking.find({
      userId: req.user._id,
      paymentStatus: 'subscription',
      status: { $ne: 'cancelled' },
      slotId: { $in: Object.keys(todaySlotMap) },
    }).select('slotId');

    const usedTodaySportIds = [...new Set(todaySubBookings.map(b => todaySlotMap[b.slotId.toString()]))];

    res.json({ success: true, data: { active: true, coveredSportIds, usedTodaySportIds, allowedPerDay: sub.allowedPerDay } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getPlans, createPlan, updatePlan, deletePlan,
  getAllSubscriptions, assignPlanToUser, cancelUserSubscription,
  getMySubscription, setPreferredTimes, getMyStatus,
};

const express = require('express');
const router = express.Router();
const {
  getPlans, createPlan, updatePlan, deletePlan,
  getAllSubscriptions, assignPlanToUser, cancelUserSubscription,
  getMySubscription, setPreferredTimes, getMyStatus,
} = require('../controllers/subscriptionPlanController');
const { protect, adminOnly } = require('../middleware/auth');

// User
router.get('/', protect, getPlans);
router.get('/my-subscription', protect, getMySubscription);
router.get('/my-status', protect, getMyStatus);
router.put('/my-preferred-times', protect, setPreferredTimes);

// Admin
router.post('/', protect, adminOnly, createPlan);
router.put('/:id', protect, adminOnly, updatePlan);
router.delete('/:id', protect, adminOnly, deletePlan);
router.get('/all-subscriptions', protect, adminOnly, getAllSubscriptions);
router.post('/assign', protect, adminOnly, assignPlanToUser);
router.put('/subscriptions/:id/cancel', protect, adminOnly, cancelUserSubscription);

module.exports = router;

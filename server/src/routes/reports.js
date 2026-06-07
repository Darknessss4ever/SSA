const express = require('express');
const router = express.Router();
const FinancialTransaction = require('../models/FinancialTransaction');
const Subscription = require('../models/Subscription');
const User = require('../models/User');
const { protect, adminOnly } = require('../middleware/auth');

router.use(protect, adminOnly);

// @desc    Get sales report grouped by category
// @route   GET /api/reports/sales
router.get('/sales', async (req, res) => {
  try {
    const transactions = await FinancialTransaction.find({ 
      type: 'income', 
      status: 'paid' 
    }).sort({ date: -1 });

    const categoryTotals = {
      membership: 0,
      coaching: 0,
      tournament: 0,
      booking: 0,
      other: 0
    };

    transactions.forEach(t => {
      if (categoryTotals[t.category] !== undefined) {
        categoryTotals[t.category] += t.amount;
      } else {
        categoryTotals.other += t.amount;
      }
    });

    const populated = await Promise.all(transactions.map(async (t) => {
      let details = null;
      if (t.referenceId && t.referenceModel === 'User') {
        const user = await User.findById(t.referenceId).select('name email phone');
        if (user) details = { name: user.name, email: user.email, phone: user.phone };
      }
      const item = t.toObject();
      item.customerDetails = details;
      return item;
    }));

    res.json({
      success: true,
      data: {
        categoryTotals,
        transactions: populated
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Get payment dues report (pending status)
// @route   GET /api/reports/dues
router.get('/dues', async (req, res) => {
  try {
    const dues = await FinancialTransaction.find({ 
      status: 'pending' 
    }).sort({ dueDate: 1 });

    const populated = await Promise.all(dues.map(async (d) => {
      let details = null;
      if (d.referenceId && d.referenceModel === 'User') {
        const user = await User.findById(d.referenceId).select('name email phone');
        if (user) details = { name: user.name, email: user.email, phone: user.phone };
      }
      const item = d.toObject();
      item.customerDetails = details;
      return item;
    }));

    res.json({
      success: true,
      count: populated.length,
      data: populated
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Get membership expiry report (expiring in next 30 days)
// @route   GET /api/reports/memberships
router.get('/memberships', async (req, res) => {
  try {
    const today = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);

    // Find active subscriptions
    const subscriptions = await Subscription.find({ 
      status: 'active'
    })
    .populate('userId', 'name email phone')
    .populate('planId', 'name')
    .sort({ validTo: 1 });

    // Filter and map them
    const expiringSoon = [];
    const allActive = [];

    subscriptions.forEach(sub => {
      const validToDate = new Date(sub.validTo);
      const isExpiringSoon = validToDate >= today && validToDate <= thirtyDaysFromNow;
      
      const item = {
        _id: sub._id,
        user: sub.userId ? {
          name: sub.userId.name,
          email: sub.userId.email,
          phone: sub.userId.phone
        } : { name: 'Unknown', email: '', phone: '' },
        planName: sub.planId ? sub.planId.name : 'Custom Plan',
        price: sub.price,
        validFrom: sub.validFrom,
        validTo: sub.validTo,
        durationLabel: sub.durationLabel,
        daysRemaining: Math.ceil((validToDate - today) / (1000 * 60 * 60 * 24))
      };

      if (isExpiringSoon) {
        expiringSoon.push(item);
      }
      allActive.push(item);
    });

    res.json({
      success: true,
      data: {
        expiringSoon,
        allActive
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;

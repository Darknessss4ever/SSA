const express = require('express');
const router = express.Router();
const FinancialTransaction = require('../models/FinancialTransaction');
const User = require('../models/User');
const { protect, adminOnly } = require('../middleware/auth');

router.use(protect, adminOnly);

// Helper function to get month name
const getMonthName = (date) => {
  return date.toLocaleString('default', { month: 'short' });
};

// @desc    Get financial overview (Stats & P&L trends)
// @route   GET /api/financials/overview
router.get('/overview', async (req, res) => {
  try {
    const transactions = await FinancialTransaction.find();

    let totalIncome = 0;
    let totalExpense = 0;
    let totalDues = 0;

    // We want to group by month for the last 6 months
    const monthlyGroups = {};
    const today = new Date();
    
    // Initialize last 6 months with 0s
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlyGroups[key] = {
        month: d.toLocaleString('default', { month: 'short', year: '2-digit' }),
        income: 0,
        expense: 0,
        sortKey: key
      };
    }

    transactions.forEach(t => {
      const amt = t.amount;
      if (t.type === 'income') {
        if (t.status === 'paid') {
          totalIncome += amt;
        } else if (t.status === 'pending') {
          totalDues += amt;
        }
      } else if (t.type === 'expense') {
        if (t.status === 'paid') {
          totalExpense += amt;
        }
      }

      // Add to monthly trends if it falls in the window
      if (t.status === 'paid' && t.date) {
        const tDate = new Date(t.date);
        const key = `${tDate.getFullYear()}-${String(tDate.getMonth() + 1).padStart(2, '0')}`;
        if (monthlyGroups[key]) {
          if (t.type === 'income') {
            monthlyGroups[key].income += amt;
          } else if (t.type === 'expense') {
            monthlyGroups[key].expense += amt;
          }
        }
      }
    });

    const netProfit = totalIncome - totalExpense;
    const monthlyData = Object.values(monthlyGroups).sort((a, b) => a.sortKey.localeCompare(b.sortKey));

    res.json({
      success: true,
      data: {
        totalIncome,
        totalExpense,
        netProfit,
        totalDues,
        monthlyData
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Get all unique subcategories grouped by category
// @route   GET /api/financials/subcategories
router.get('/subcategories', async (req, res) => {
  try {
    const transactions = await FinancialTransaction.find({ subcategory: { $ne: '', $exists: true } });
    const mapping = {};
    transactions.forEach(t => {
      if (!mapping[t.category]) {
        mapping[t.category] = new Set();
      }
      mapping[t.category].add(t.subcategory);
    });

    const data = {};
    Object.keys(mapping).forEach(cat => {
      data[cat] = Array.from(mapping[cat]);
    });

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Get all transactions (filterable)
// @route   GET /api/financials/transactions
router.get('/transactions', async (req, res) => {
  try {
    const { type, category, status } = req.query;
    const filter = {};
    if (type) filter.type = type;
    if (category) filter.category = category;
    if (status) filter.status = status;

    const transactions = await FinancialTransaction.find(filter).sort({ date: -1 });

    // Populate user references if they exist
    // Since mongoose reference is dynamic, we'll manually attach user details if referenceModel is 'User'
    const populated = await Promise.all(transactions.map(async (t) => {
      let details = null;
      if (t.referenceId && t.referenceModel === 'User') {
        const user = await User.findById(t.referenceId).select('name email phone');
        if (user) {
          details = { name: user.name, email: user.email, phone: user.phone };
        }
      }
      const item = t.toObject();
      item.customerDetails = details;
      return item;
    }));

    res.json({ success: true, count: populated.length, data: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Manually record custom transaction
// @route   POST /api/financials/transactions
router.post('/transactions', async (req, res) => {
  try {
    const { type, amount, category, subcategory, status, date, dueDate, paymentMethod, description, referenceId, referenceModel } = req.body;

    const transaction = await FinancialTransaction.create({
      type,
      amount,
      category,
      subcategory: subcategory || '',
      status: status || 'paid',
      date: date || Date.now(),
      dueDate: status === 'pending' ? dueDate : null,
      paymentMethod: paymentMethod || 'cash',
      description: description || '',
      referenceId: referenceId || null,
      referenceModel: referenceModel || null,
    });

    res.status(201).json({ success: true, data: transaction });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// @desc    Update transaction (e.g. mark pending due as paid)
// @route   PUT /api/financials/transactions/:id
router.put('/transactions/:id', async (req, res) => {
  try {
    const { status, paymentMethod, date } = req.body;
    const updates = {};
    if (status) updates.status = status;
    if (paymentMethod) updates.paymentMethod = paymentMethod;
    if (date) updates.date = date;

    const transaction = await FinancialTransaction.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });

    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    res.json({ success: true, data: transaction });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// @desc    Delete transaction
// @route   DELETE /api/financials/transactions/:id
router.delete('/transactions/:id', async (req, res) => {
  try {
    const transaction = await FinancialTransaction.findByIdAndDelete(req.params.id);

    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    res.json({ success: true, message: 'Transaction deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;

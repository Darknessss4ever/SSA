const express = require('express');
const router = express.Router();
const Employee = require('../models/Employee');
const { protect, adminOnly } = require('../middleware/auth');

// Protect all routes here to adminOnly
router.use(protect, adminOnly);

// @desc    Get all employees
// @route   GET /api/employees
router.get('/', async (req, res) => {
  try {
    const employees = await Employee.find().sort({ createdAt: -1 });
    res.json({ success: true, count: employees.length, data: employees });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Create new employee
// @route   POST /api/employees
router.post('/', async (req, res) => {
  try {
    const { name, email, phone, role, salary, joiningDate, status, notes } = req.body;
    
    // Check if employee already exists
    const existingEmployee = await Employee.findOne({ email });
    if (existingEmployee) {
      return res.status(400).json({ success: false, message: 'Employee with this email already exists' });
    }

    const employee = await Employee.create({
      name,
      email,
      phone,
      role,
      salary,
      joiningDate: joiningDate || Date.now(),
      status: status || 'Active',
      notes: notes || ''
    });

    res.status(201).json({ success: true, data: employee });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// @desc    Update employee
// @route   PUT /api/employees/:id
router.put('/:id', async (req, res) => {
  try {
    const employee = await Employee.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!employee) {
      return res.status(444).json({ success: false, message: 'Employee not found' });
    }

    res.json({ success: true, data: employee });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// @desc    Delete employee
// @route   DELETE /api/employees/:id
router.delete('/:id', async (req, res) => {
  try {
    const employee = await Employee.findByIdAndDelete(req.params.id);

    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    res.json({ success: true, message: 'Employee deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;

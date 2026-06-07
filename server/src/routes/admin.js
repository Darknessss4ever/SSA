const express = require('express');
const router = express.Router();
const { getUsers, updateUser, assignSubscription, getDashboardStats } = require('../controllers/adminController');
const { protect, adminOnly } = require('../middleware/auth');

router.use(protect, adminOnly);

router.get('/dashboard', getDashboardStats);
router.get('/users', getUsers);
router.put('/users/:id', updateUser);
router.post('/subscriptions', assignSubscription);

module.exports = router;

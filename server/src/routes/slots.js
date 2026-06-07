const express = require('express');
const router = express.Router();
const { getSlots, createSlot, generateSlots, blockSlot, deleteSlot, getAllSlots } = require('../controllers/slotController');
const { protect, adminOnly } = require('../middleware/auth');

router.get('/', protect, getSlots);
router.get('/all', protect, adminOnly, getAllSlots);
router.post('/', protect, adminOnly, createSlot);
router.post('/generate', protect, adminOnly, generateSlots);
router.put('/:id/block', protect, adminOnly, blockSlot);
router.delete('/:id', protect, adminOnly, deleteSlot);

module.exports = router;

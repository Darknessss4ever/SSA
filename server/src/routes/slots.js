const express = require('express');
const router = express.Router();
const { 
  getSlots, createSlot, generateSlots, blockSlot, deleteSlot, getAllSlots,
  updateSlot, bulkUpdateSlots, bulkDeleteSlots 
} = require('../controllers/slotController');
const { protect, adminOnly } = require('../middleware/auth');

router.get('/', protect, getSlots);
router.get('/all', protect, adminOnly, getAllSlots);
router.post('/', protect, adminOnly, createSlot);
router.post('/generate', protect, adminOnly, generateSlots);
router.put('/bulk', protect, adminOnly, bulkUpdateSlots);
router.post('/bulk-delete', protect, adminOnly, bulkDeleteSlots);
router.put('/:id/block', protect, adminOnly, blockSlot);
router.put('/:id', protect, adminOnly, updateSlot);
router.delete('/:id', protect, adminOnly, deleteSlot);

module.exports = router;

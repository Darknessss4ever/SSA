const express = require('express');
const router = express.Router();
const { getSports, createSport, updateSport, deleteSport } = require('../controllers/sportController');
const { protect, adminOnly } = require('../middleware/auth');

router.get('/', getSports);
router.post('/', protect, adminOnly, createSport);
router.put('/:id', protect, adminOnly, updateSport);
router.delete('/:id', protect, adminOnly, deleteSport);

module.exports = router;

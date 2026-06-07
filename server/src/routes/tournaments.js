const express = require('express');
const router = express.Router();
const { getTournaments, createTournament, registerForTournament, updateTournament } = require('../controllers/tournamentController');
const { protect, adminOnly } = require('../middleware/auth');

router.get('/', protect, getTournaments);
router.post('/', protect, adminOnly, createTournament);
router.put('/:id', protect, adminOnly, updateTournament);
router.post('/:id/register', protect, registerForTournament);

module.exports = router;

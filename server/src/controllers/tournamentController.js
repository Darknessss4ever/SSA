const Tournament = require('../models/Tournament');

const getTournaments = async (req, res) => {
  try {
    const tournaments = await Tournament.find()
      .populate('sportId', 'name icon color')
      .populate('participants', 'name avatar')
      .sort({ date: 1 });
    res.json({ success: true, data: tournaments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createTournament = async (req, res) => {
  try {
    const tournament = await Tournament.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json({ success: true, data: tournament });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const registerForTournament = async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) return res.status(404).json({ success: false, message: 'Tournament not found' });
    if (tournament.participants.includes(req.user._id)) {
      return res.status(400).json({ success: false, message: 'Already registered' });
    }
    if (tournament.participants.length >= tournament.maxParticipants) {
      return res.status(400).json({ success: false, message: 'Tournament is full' });
    }
    tournament.participants.push(req.user._id);
    await tournament.save();
    res.json({ success: true, message: 'Registered successfully!', data: tournament });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateTournament = async (req, res) => {
  try {
    const tournament = await Tournament.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!tournament) return res.status(404).json({ success: false, message: 'Tournament not found' });
    res.json({ success: true, data: tournament });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getTournaments, createTournament, registerForTournament, updateTournament };

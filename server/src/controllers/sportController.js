const Sport = require('../models/Sport');

const getSports = async (req, res) => {
  try {
    const sports = await Sport.find({ isActive: true });
    res.json({ success: true, data: sports });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createSport = async (req, res) => {
  try {
    const sport = await Sport.create({ ...req.body });
    res.status(201).json({ success: true, data: sport });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateSport = async (req, res) => {
  try {
    const sport = await Sport.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!sport) return res.status(404).json({ success: false, message: 'Sport not found' });
    res.json({ success: true, data: sport });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteSport = async (req, res) => {
  try {
    await Sport.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ success: true, message: 'Sport deactivated' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getSports, createSport, updateSport, deleteSport };

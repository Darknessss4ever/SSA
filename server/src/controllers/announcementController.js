const Announcement = require('../models/Announcement');

const getAnnouncements = async (req, res) => {
  try {
    const now = new Date();
    const announcements = await Announcement.find({
      $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
    })
      .populate('createdBy', 'name')
      .sort({ isPinned: -1, createdAt: -1 });
    res.json({ success: true, data: announcements });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createAnnouncement = async (req, res) => {
  try {
    const data = { ...req.body };
    if (data.expiresAt === '') {
      data.expiresAt = null;
    }
    const announcement = await Announcement.create({ ...data, createdBy: req.user._id });
    res.status(201).json({ success: true, data: announcement });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteAnnouncement = async (req, res) => {
  try {
    await Announcement.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Announcement deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getAnnouncements, createAnnouncement, deleteAnnouncement };

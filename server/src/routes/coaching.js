const express = require('express');
const router = express.Router();
const {
  getCoachingPrograms,
  adminGetAllPrograms,
  createCoachingProgram,
  updateCoachingProgram,
  deleteCoachingProgram,
  enrollInCoaching,
  unenrollFromCoaching,
  adminRemoveParticipant,
  adminApproveParticipant,
  adminRejectParticipant,
} = require('../controllers/coachingController');
const { protect, adminOnly } = require('../middleware/auth');

// ── User routes ────────────────────────────────────────────────────────────────
router.get('/', protect, getCoachingPrograms);
router.post('/:id/enroll', protect, enrollInCoaching);
router.delete('/:id/unenroll', protect, unenrollFromCoaching);

// ── Admin routes ───────────────────────────────────────────────────────────────
router.get('/admin/all', protect, adminOnly, adminGetAllPrograms);
router.post('/', protect, adminOnly, createCoachingProgram);
router.put('/:id', protect, adminOnly, updateCoachingProgram);
router.delete('/:id', protect, adminOnly, deleteCoachingProgram);
router.delete('/:id/participants/:userId', protect, adminOnly, adminRemoveParticipant);
router.post('/:id/approve/:userId', protect, adminOnly, adminApproveParticipant);
router.post('/:id/reject/:userId', protect, adminOnly, adminRejectParticipant);

module.exports = router;

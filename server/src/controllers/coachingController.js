const Coaching = require('../models/Coaching');
const FinancialTransaction = require('../models/FinancialTransaction');
const User = require('../models/User');

// ── User-facing: only active programs ─────────────────────────────────────────
const getCoachingPrograms = async (req, res) => {
  try {
    const programs = await Coaching.find({ isActive: true })
      .populate('sportId', 'name icon color')
      .populate('participants', 'name email')
      .populate('pendingParticipants', 'name email')
      .populate('trainerId')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: programs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Admin-facing: ALL programs (active + inactive) ────────────────────────────
const adminGetAllPrograms = async (req, res) => {
  try {
    const programs = await Coaching.find({})
      .populate('sportId', 'name icon color')
      .populate('participants', 'name email phone')
      .populate('pendingParticipants', 'name email phone')
      .populate('createdBy', 'name email')
      .populate('trainerId')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: programs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Create ────────────────────────────────────────────────────────────────────
const createCoachingProgram = async (req, res) => {
  try {
    const { title, description, sportId, trainerName, trainerImage, trainerId, schedule,
            duration, price, maxParticipants, startDate, endDate } = req.body;

    if (!title || !sportId || (!trainerName && !trainerId)) {
      return res.status(400).json({ success: false, message: 'Title, sport, and trainer details are required.' });
    }
    if (maxParticipants && maxParticipants < 1) {
      return res.status(400).json({ success: false, message: 'Max participants must be at least 1.' });
    }
    if (startDate && endDate && new Date(endDate) <= new Date(startDate)) {
      return res.status(400).json({ success: false, message: 'End date must be after start date.' });
    }

    const program = await Coaching.create({
      title: title.trim(),
      description: description?.trim() || '',
      sportId,
      trainerName: trainerName ? trainerName.trim() : '',
      trainerImage: trainerImage?.trim() || '',
      trainerId: trainerId || null,
      schedule: schedule?.trim() || '',
      duration: duration?.trim() || '',
      price: price != null ? Math.max(0, parseInt(price)) : 0,
      maxParticipants: maxParticipants ? Math.max(1, parseInt(maxParticipants)) : 10,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      createdBy: req.user._id,
    });

    const populated = await program.populate([
      { path: 'sportId', select: 'name icon color' },
      { path: 'trainerId' }
    ]);
    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Update (admin only) ───────────────────────────────────────────────────────
const updateCoachingProgram = async (req, res) => {
  try {
    const program = await Coaching.findById(req.params.id);
    if (!program) return res.status(404).json({ success: false, message: 'Program not found.' });

    const { title, description, sportId, trainerName, trainerImage, trainerId, schedule,
            duration, price, maxParticipants, isActive, startDate, endDate } = req.body;

    // Validate capacity: cannot reduce below current enrollments
    if (maxParticipants !== undefined) {
      const newMax = Math.max(1, parseInt(maxParticipants));
      if (newMax < program.participants.length) {
        return res.status(400).json({
          success: false,
          message: `Cannot set max participants to ${newMax} — ${program.participants.length} users are already enrolled.`,
        });
      }
      program.maxParticipants = newMax;
    }
    if (startDate !== undefined && endDate !== undefined && startDate && endDate) {
      if (new Date(endDate) <= new Date(startDate)) {
        return res.status(400).json({ success: false, message: 'End date must be after start date.' });
      }
    }

    // Safe field-by-field update (never wipe participants)
    if (title !== undefined)         program.title         = title.trim();
    if (description !== undefined)   program.description   = description.trim();
    if (sportId !== undefined)       program.sportId       = sportId;
    if (trainerName !== undefined)   program.trainerName   = trainerName ? trainerName.trim() : '';
    if (trainerImage !== undefined)  program.trainerImage  = trainerImage.trim();
    if (trainerId !== undefined)     program.trainerId     = trainerId || null;
    if (schedule !== undefined)      program.schedule      = schedule.trim();
    if (duration !== undefined)      program.duration      = duration.trim();
    if (price !== undefined)         program.price         = Math.max(0, parseInt(price));
    if (isActive !== undefined)      program.isActive      = Boolean(isActive);
    if (startDate !== undefined)     program.startDate     = startDate || undefined;
    if (endDate !== undefined)       program.endDate       = endDate || undefined;

    await program.save();
    const populated = await program.populate([
      { path: 'sportId', select: 'name icon color' },
      { path: 'trainerId' }
    ]);
    res.json({ success: true, data: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Delete (admin only — hard delete; only if no participants, else deactivate) ─
const deleteCoachingProgram = async (req, res) => {
  try {
    const program = await Coaching.findById(req.params.id);
    if (!program) return res.status(404).json({ success: false, message: 'Program not found.' });

    if (program.participants.length > 0) {
      // Soft-delete: deactivate so enrolled users can still see their history
      program.isActive = false;
      await program.save();
      return res.json({
        success: true,
        message: `Program deactivated (${program.participants.length} enrolled user(s) retained). Remove all participants first to permanently delete.`,
        softDeleted: true,
      });
    }

    await Coaching.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Program permanently deleted.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Enroll (user) ─────────────────────────────────────────────────────────────
const enrollInCoaching = async (req, res) => {
  try {
    const program = await Coaching.findById(req.params.id);
    if (!program) return res.status(404).json({ success: false, message: 'Program not found.' });
    if (!program.isActive) return res.status(400).json({ success: false, message: 'This program is no longer active.' });
    
    // Check if already in participants
    if (program.participants.map(String).includes(String(req.user._id))) {
      return res.status(400).json({ success: false, message: 'You are already enrolled in this program.' });
    }
    
    // Check if already in pendingParticipants
    if (program.pendingParticipants && program.pendingParticipants.map(String).includes(String(req.user._id))) {
      return res.status(400).json({ success: false, message: 'Your application is already pending admin approval.' });
    }

    if (program.participants.length >= program.maxParticipants) {
      return res.status(400).json({ success: false, message: 'Program is full. No spots available.' });
    }
    
    // Check if program has ended
    if (program.endDate && new Date(program.endDate) < new Date()) {
      return res.status(400).json({ success: false, message: 'This program has already ended.' });
    }
    
    if (!program.pendingParticipants) {
      program.pendingParticipants = [];
    }
    program.pendingParticipants.push(req.user._id);
    await program.save();
    
    res.json({ success: true, message: 'Application submitted! Pending admin approval. ⏳', data: program });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Unenroll self or cancel pending application (user) ───────────────────────
const unenrollFromCoaching = async (req, res) => {
  try {
    const program = await Coaching.findById(req.params.id);
    if (!program) return res.status(404).json({ success: false, message: 'Program not found.' });
    
    const participantIdx = program.participants.map(String).indexOf(String(req.user._id));
    const pendingIdx = program.pendingParticipants ? program.pendingParticipants.map(String).indexOf(String(req.user._id)) : -1;
    
    if (participantIdx === -1 && pendingIdx === -1) {
      return res.status(400).json({ success: false, message: 'You are not enrolled or pending in this program.' });
    }
    
    if (participantIdx !== -1) {
      program.participants.splice(participantIdx, 1);
    }
    if (pendingIdx !== -1) {
      program.pendingParticipants.splice(pendingIdx, 1);
    }
    
    await program.save();
    res.json({ success: true, message: 'Request cancelled successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Admin: remove a specific participant ──────────────────────────────────────
const adminRemoveParticipant = async (req, res) => {
  try {
    const { id, userId } = req.params;
    const program = await Coaching.findById(id);
    if (!program) return res.status(404).json({ success: false, message: 'Program not found.' });
    
    const idx = program.participants.map(String).indexOf(String(userId));
    if (idx === -1) {
      return res.status(400).json({ success: false, message: 'User is not enrolled in this program.' });
    }
    
    program.participants.splice(idx, 1);
    await program.save();
    res.json({ success: true, message: 'Participant removed.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Admin: approve a pending participant ──────────────────────────────────────
const adminApproveParticipant = async (req, res) => {
  try {
    const { id, userId } = req.params;
    const { amount, paymentMethod } = req.body;
    
    const program = await Coaching.findById(id);
    if (!program) return res.status(404).json({ success: false, message: 'Program not found.' });
    
    const pendingIdx = program.pendingParticipants ? program.pendingParticipants.map(String).indexOf(String(userId)) : -1;
    if (pendingIdx === -1) {
      return res.status(400).json({ success: false, message: 'No pending application found for this user.' });
    }
    
    if (program.participants.length >= program.maxParticipants) {
      return res.status(400).json({ success: false, message: 'Program is full. Cannot approve more participants.' });
    }
    
    // Move user from pending to active
    program.pendingParticipants.splice(pendingIdx, 1);
    program.participants.push(userId);
    await program.save();
    
    // Fetch user details for description
    const user = await User.findById(userId);
    const finalAmount = amount !== undefined && amount !== null ? Number(amount) : program.price;
    
    // Record Financial Transaction
    await FinancialTransaction.create({
      type: 'income',
      amount: finalAmount,
      category: 'coaching',
      status: 'paid',
      paymentMethod: paymentMethod || 'cash',
      description: `Enrollment in coaching: ${program.title} - Participant: ${user ? user.name : userId}`,
      referenceId: userId,
      referenceModel: 'User',
      date: new Date()
    });
    
    res.json({ success: true, message: 'Application approved and payment recorded! 🎓' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Admin: reject a pending participant ───────────────────────────────────────
const adminRejectParticipant = async (req, res) => {
  try {
    const { id, userId } = req.params;
    const program = await Coaching.findById(id);
    if (!program) return res.status(404).json({ success: false, message: 'Program not found.' });
    
    const pendingIdx = program.pendingParticipants ? program.pendingParticipants.map(String).indexOf(String(userId)) : -1;
    if (pendingIdx === -1) {
      return res.status(400).json({ success: false, message: 'No pending application found for this user.' });
    }
    
    // Remove from pending list
    program.pendingParticipants.splice(pendingIdx, 1);
    await program.save();
    
    res.json({ success: true, message: 'Application rejected.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
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
};

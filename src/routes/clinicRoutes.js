const express = require('express');
const router = express.Router();
const protect = require('../middleware/authMiddleware');
const authorizeRoles = require('../middleware/roleMiddleware');
const {
  getDashboardStats,
  getAllAppointments,
  createAppointment,
  getClinicProfile,
  updateClinicProfile,
} = require('../controllers/clinicController');

// ── All routes require authentication ──
// router.use(protect); // ← Ye sab routes pe protect laga dega

// ── Profile Routes (with auth) ──
router.get('/profile', protect, authorizeRoles('clinic'), getClinicProfile);
router.put('/profile', protect, authorizeRoles('clinic'), updateClinicProfile);

// ── Dashboard ──
router.get('/dashboard', protect, authorizeRoles('clinic'), getDashboardStats);

// ── Appointments ──
router.get('/appointments', protect, authorizeRoles('clinic'), getAllAppointments);
router.post('/appointments', protect, authorizeRoles('clinic'), createAppointment);

module.exports = router;
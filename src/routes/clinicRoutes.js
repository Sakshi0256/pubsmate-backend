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
  addDoctorByClinic,
  getClinicDoctors,
} = require('../controllers/clinicController');
// const { getClinicDoctors } = require('../controllers/clinicController');


// ── All routes require authentication ──
// router.use(protect); // ← Ye sab routes pe protect laga dega
router.get('/doctors', protect, authorizeRoles('clinic'), getClinicDoctors);

// ── Profile Routes (with auth) ──
router.get('/profile', protect, authorizeRoles('clinic'), getClinicProfile);
router.put('/profile', protect, authorizeRoles('clinic'), updateClinicProfile);

// ── Dashboard ──
router.get('/dashboard', protect, authorizeRoles('clinic'), getDashboardStats);

// ── Appointments ──
router.get('/appointments', protect, authorizeRoles('clinic'), getAllAppointments);
router.post('/appointments', protect, authorizeRoles('clinic'), createAppointment);
// routes/clinicRoutes.js
router.post('/doctors', protect, authorizeRoles('clinic'), addDoctorByClinic);


module.exports = router;
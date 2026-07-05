// const express = require('express');
// const router = express.Router();
// const { protect, authorizeRoles } = require('../middleware/auth');
// const {
//   getDoctors,
//   getDoctorById,
//   getDoctorSlots,
//   generateSlots,
//   updateSlotStatus,
//   toggleSlotAvailability,
//   getDoctorAppointments,
//   acceptAppointment,
//   rejectAppointment,
//   completeAppointment,
//   getDoctorDashboard,
//   updateDoctorProfile,
// } = require('../controllers/doctorController');

// // ── ✅ 1. SPECIFIC ROUTES (Pehle yeh match karega) ──
// router.get('/appointments', protect, authorizeRoles('doctor'), getDoctorAppointments);
// router.get('/dashboard', protect, authorizeRoles('doctor'), getDoctorDashboard);
// router.post('/slots/generate', protect, authorizeRoles('doctor'), generateSlots);
// router.patch('/slots/:slotId/status', protect, authorizeRoles('doctor'), updateSlotStatus);
// router.patch('/slots/:slotId/toggle', protect, authorizeRoles('doctor'), toggleSlotAvailability);
// router.patch('/appointments/:id/accept', protect, authorizeRoles('doctor'), acceptAppointment);
// router.patch('/appointments/:id/reject', protect, authorizeRoles('doctor'), rejectAppointment);
// router.patch('/appointments/:id/complete', protect, authorizeRoles('doctor'), completeAppointment);
// router.patch('/profile/:id', protect, authorizeRoles('doctor'), updateDoctorProfile);

// // ── ✅ 2. PUBLIC ROUTES (Baad me match karega) ──
// router.get('/', getDoctors);
// router.get('/:id', getDoctorById);
// router.get('/:doctorId/slots', getDoctorSlots);

// module.exports = router;


const express = require('express');
const router = express.Router();
const { protect, authorizeRoles } = require('../middleware/auth');
const {
  getDoctors,
  getDoctorById,
  getDoctorSlots,
  generateSlots,
  updateSlotStatus,
  toggleSlotAvailability,
  getDoctorAppointments,
  acceptAppointment,
  rejectAppointment,
  completeAppointment,
  getDoctorDashboard,
  updateDoctorProfile,
} = require('../controllers/doctorController');

// ── ✅ FRONTEND KE PURANE PATHS ──
router.get('/appointments', protect, authorizeRoles('doctor'), getDoctorAppointments);
router.get('/dashboard', protect, authorizeRoles('doctor'), getDoctorDashboard);

// ── SPECIFIC ROUTES ──
router.get('/appointments/my', protect, authorizeRoles('doctor'), getDoctorAppointments);
router.get('/dashboard/stats', protect, authorizeRoles('doctor'), getDoctorDashboard);
router.post('/slots/generate', protect, authorizeRoles('doctor'), generateSlots);
router.patch('/slots/:slotId/status', protect, authorizeRoles('doctor'), updateSlotStatus);
router.patch('/slots/:slotId/toggle', protect, authorizeRoles('doctor'), toggleSlotAvailability);

// // ✅ CHANGE TO PUT (frontend uses PUT)
// router.put('/appointments/:id/accept', protect, authorizeRoles('doctor'), acceptAppointment);
// router.put('/appointments/:id/reject', protect, authorizeRoles('doctor'), rejectAppointment);
// router.put('/appointments/:id/complete', protect, authorizeRoles('doctor'), completeAppointment);

// routes/doctorRoutes.js
router.put('/appointments/:id/accept', protect, authorizeRoles('doctor', 'clinic'), acceptAppointment);
router.put('/appointments/:id/reject', protect, authorizeRoles('doctor', 'clinic'), rejectAppointment);
router.put('/appointments/:id/complete', protect, authorizeRoles('doctor', 'clinic'), completeAppointment);

router.patch('/profile/:id', protect, authorizeRoles('doctor'), updateDoctorProfile);

// ── PUBLIC ROUTES ──
router.get('/', getDoctors);
router.get('/:id', getDoctorById);
router.get('/:doctorId/slots', getDoctorSlots);

module.exports = router;
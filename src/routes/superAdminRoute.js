const express = require('express');
const router = express.Router();
const { protect, authorizeRoles } = require('../middleware/auth');
const {
  getSuperAdminStats,
  getClinics,
  getClinicById,
  registerClinicBySuperAdmin,
} = require('../controllers/superAdminController');

// All routes require authentication and superadmin role
router.use(protect);
router.use(authorizeRoles('superadmin'));

// Dashboard stats
router.get('/stats', getSuperAdminStats);

// Clinic Management
router.get('/clinics', getClinics);
router.get('/clinics/:id', getClinicById);
router.post('/clinics', registerClinicBySuperAdmin);

module.exports = router;
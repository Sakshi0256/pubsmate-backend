const express = require('express'); // 1. Express import kar
const router = express.Router();    // 2. Router initialize kar

const { getSuperAdminStats } = require('../controllers/superAdminController');
const { protect, authorizeRoles } = require('../middleware/auth');

// Ab yahan 'router' kaam karega
// router.get('/stats', protect, authorizeRoles('superadmin'), getSuperAdminStats);
router.get('/stats', protect, getSuperAdminStats);

module.exports = router;

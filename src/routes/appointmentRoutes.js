const express = require('express');

const router = express.Router();

const protect =
  require('../middleware/authMiddleware');

const authorizeRoles =
  require('../middleware/roleMiddleware');

const {
  createAppointment,
} = require('../controllers/appointmentController');

const {
    getDoctorAppointments,
} = require('../controllers/appointmentController');


// patient books appointment
router.post(
  '/',
  protect,
  authorizeRoles('patient'),
  createAppointment
);

router.get(
  '/doctor',
  protect,
  authorizeRoles('doctor'),
  getDoctorAppointments
);


module.exports = router;
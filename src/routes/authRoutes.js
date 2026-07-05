const express = require('express');

const router = express.Router();

const { signup, login, getDoctorProfile } = require('../controllers/authController');
const protect = require('../middleware/authMiddleware');
const authorizeRoles = require('../middleware/roleMiddleware');


router.get('/me', protect, (req, res) => {

  res.status(200).json({
    success: true,
    user: req.user,
  });

});

router.get('/test', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Auth route working',
  });
});

router.get(
  '/patient-dashboard',
  protect,
  authorizeRoles('patient'),
  (req, res) => {

    res.status(200).json({
      success: true,
      message: 'Welcome Patient',
    });

  }
);

router.get(
  '/doctor-dashboard',
  protect,
  authorizeRoles('doctor'),
  (req, res) => {

    res.status(200).json({
      success: true,
      message: 'Welcome Doctor',
    });

  }
);

router.get(
  '/clinic-dashboard',
  protect,
  authorizeRoles('clinic'),
  (req, res) => {

    res.status(200).json({
      success: true,
      message: 'Welcome Clinic',
    });

  }
);

router.get(
  '/doctor-profile',
  protect,
  authorizeRoles('doctor'),
  getDoctorProfile,
);

router.post('/signup', signup);

router.post('/login', login);

module.exports = router;
const express = require('express');
const router = express.Router();

const protect =
  require('../middleware/authMiddleware');

const authorizeRoles =
  require('../middleware/roleMiddleware');

  router.post('/cleanup', protect, authorizeRoles('clinic'), async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const currentTime = new Date();

    const slots = await Slot.find({
      slotDate: today,
      status: 'available'
    });

    let updatedCount = 0;
    for (const slot of slots) {
      const slotHour = parseInt(slot.slotTime.split(':')[0]);
      const slotMinute = parseInt(slot.slotTime.split(':')[1].split(' ')[0]);
      const isPM = slot.slotTime.includes('PM');
      const slotDateObj = new Date();
      slotDateObj.setHours(isPM ? slotHour + 12 : slotHour, slotMinute, 0);

      if (slotDateObj < currentTime) {
        slot.status = 'completed';
        await slot.save();
        updatedCount++;
      }
    }

    res.status(200).json({
      success: true,
      message: `Updated ${updatedCount} slots to completed`,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
    });
  }
});

const {
  getSlots,
  createSlot,
  generateSlots,
  toggleSlotStatus,
  getAllSlots,
  getDoctorSlots,
} = require('../controllers/slotController');

router.get(
  '/',
  protect,
  authorizeRoles('doctor'),
  getSlots,
);

router.get(
  '/doctor/:doctorId',
  getDoctorSlots
);
router.post(
  '/',
  protect,
  authorizeRoles('doctor'),
  createSlot,
);

router.post(
  '/generate',
  protect,
  authorizeRoles('doctor'),
  generateSlots,
);

router.put(
  '/:id/toggle',
  protect,
  authorizeRoles('doctor'),
  toggleSlotStatus,
  
);

router.get(
  '/all',
  protect,
  getAllSlots,
);

module.exports = router;
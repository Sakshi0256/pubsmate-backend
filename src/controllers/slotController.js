const Slot = require('../models/Slot');
const generateSlotsForDoctor = require('../utils/generateSlotsForDoctor');

const createSlot = async (req, res) => {
  try {

    const {
      doctor,
      slotDate,
      slotTime,
    } = req.body;

    const slot = await Slot.create({
      doctor,
      slotDate,
      slotTime,
    });

    res.status(201).json({
      success: true,
      slot,
    });

  } catch (error) {

    console.log(error);

    res.status(500).json({
      success: false,
      message: 'Server Error',
    });

  }
};

const getSlots = async (req, res) => {
  try {

    const slots = await Slot.find({
      doctor: req.user.userId,
    })

      .populate('doctor', 'name email')
      .sort({
        slotDate: 1,
        slotTime: 1,
      });

    res.status(200).json({
      success: true,
      slots,
    });

  } catch (error) {

    console.log(error);

    res.status(500).json({
      success: false,
      message: 'Server Error',
    });

  }
};

const getDoctorSlots = async (req, res) => {
  try {
    const { doctorId } = req.params;

    let slots = await Slot.find({
      doctor: doctorId,
      status: 'available',
    })
      .populate('doctor', 'name email')
      .sort({ slotDate: 1, slotTime: 1 });
  
    // 🧹 Filter out past slots (today's past time slots)
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    slots = slots.filter(slot => {
      if (slot.slotDate > todayStr) return true;   // Future date → keep
      if (slot.slotDate < todayStr) return false;  // Past date → remove

      // Same day: check time
      const timeParts = slot.slotTime.match(/(\d+):(\d+)\s*([AP]M)/i);
      if (!timeParts) return true;
      let hour = parseInt(timeParts[1]);
      const minute = parseInt(timeParts[2]);
      const ampm = timeParts[3].toUpperCase();
      if (ampm === 'PM' && hour !== 12) hour += 12;
      if (ampm === 'AM' && hour === 12) hour = 0;
      const slotMinutes = hour * 60 + minute;
      const currentMinutes = currentHour * 60 + currentMinute;
      return slotMinutes > currentMinutes;  // Only future time slots
    });

    res.status(200).json({
      success: true,
      slots,
    });

  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
    });
  }
};

const generateSlots = async (req, res) => {
  try {
    const { doctor } = req.body;

    const today = new Date().toISOString().split('T')[0];

    const result = await generateSlotsForDoctor(doctor, today);

    if (result.created === 0) {
      return res.status(400).json({
        success: false,
        message: 'No new slots generated'
      });
    }

    res.status(201).json({
      success: true,
      message: `${result.created} slots created`
    });

  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

const toggleSlotStatus = async (
  req,
  res,
) => {
  try {

    const slot =
      await Slot.findById(
        req.params.id,
      );

    if (!slot) {
      return res.status(404).json({
        success: false,
        message: 'Slot not found',
      });
    }

    if (
      slot.status === 'booked'
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Booked slot cannot be modified',
      });
    }

    slot.status =
      slot.status === 'available'
        ? 'unavailable'
        : 'available';

    await slot.save();

    res.status(200).json({
      success: true,
      slot,
    });

  } catch (error) {

    console.log(error);

    res.status(500).json({
      success: false,
      message: 'Server Error',
    });

  }
};

const getAllSlots = async (req, res) => {
  try {

    const slots = await Slot.find({
      status: 'available',
    })
      .populate(
        'doctor',
        'name email'
      );

    res.status(200).json({
      success: true,
      slots,
    });

  } catch (error) {

    console.log(error);

    res.status(500).json({
      success: false,
      message: 'Server Error',
    });

  }
};

module.exports = {
  getSlots,
  createSlot,
  generateSlots,
  toggleSlotStatus,
  getAllSlots,
  getDoctorSlots,
};
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

    const slots = await Slot.find({
      doctor: doctorId,
      status: 'available',
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
    res.status(500).json({
      success: false,
      message: 'Server Error',
    });
  }
};
const generateSlots = async (req, res) => {
  try {
    const { doctor, slotDate } = req.body;
    const result = await generateSlotsForDoctor(doctor, slotDate);

    if (result.skipped) {
      return res.status(400).json({ success: false, message: 'Slots already generated' });
    }

    res.status(201).json({ success: true, message: `${result.created} slots created` });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: 'Server Error' });
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
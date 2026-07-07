const mongoose = require('mongoose');
const User = require('../models/User');
const Slot = require('../models/Slot');
const Appointment = require('../models/Appointment');
const generateSlotsForDoctor = require('../utils/generateSlotsForDoctor');

// ── GET ALL DOCTORS ──────────────────────────────────────────────────────────
// controllers/doctorController.js - Updated getDoctors

// const getDoctors = async (req, res) => {
//   try {
//     // If user is authenticated and role is clinic or doctor, filter by clinicId
//     let query = { role: 'doctor', isActive: true };
    
//     if (req.user && (req.user.role === 'clinic' || req.user.role === 'doctor')) {
//       const clinicId = req.user.userId || req.user._id;
//       query.clinicId = clinicId;
//     }

//     const doctors = await User.find(
//       query,
//       'name email specialty qualification experience consultationFee hospitalName about timing workingDays isActive clinicId'
//     );

//     res.status(200).json({
//       success: true,
//       doctors: doctors || [],
//     });
//   } catch (error) {
//     console.log(error);
//     res.status(500).json({
//       success: false,
//       message: 'Server Error',
//     });
//   }
// };

const getDoctors = async (req, res) => {
  try {
    let query = { role: 'doctor', isActive: true };
    let clinicId = null;

    // 1. Manually check for token (even though route is public)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.id || decoded.userId;
        const user = await User.findById(userId).select('role clinicId');
        if (user) {
          if (user.role === 'clinic') {
            clinicId = userId;                       // clinic admin's own ID
          } else if (user.role === 'doctor') {
            clinicId = user.clinicId;                // doctor's linked clinic
          }
        }
      } catch (err) {
        // token invalid – ignore and return all doctors
      }
    }

    // 2. Apply clinic filter if we have a clinicId
    if (clinicId) {
      query.clinicId = clinicId;
    }

    const doctors = await User.find(
      query,
      'name email specialty qualification experience consultationFee hospitalName about timing workingDays isActive clinicId'
    );

    res.status(200).json({ success: true, doctors: doctors || [] });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};


// ── UPDATE DOCTOR STATUS (Clinic Admin) ────────────────────────────────────
const updateDoctorStatus = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { isActive } = req.body;

    const doctor = await User.findByIdAndUpdate(
      doctorId,
      { isActive },
      { new: true }
    ).select('-password');

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found',
      });
    }

    res.status(200).json({
      success: true,
      message: `Doctor ${isActive ? 'activated' : 'deactivated'} successfully`,
      doctor,
    });

  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
    });
  }
};

// ── GET DOCTOR BY ID ──────────────────────────────────────────────────────────
// ── GET DOCTOR BY ID ──────────────────────────────────────────────────────────
const getDoctorById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // ✅ Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid doctor ID format',
      });
    }

    const doctor = await User.findById(
      id,
      'name email specialty qualification experience consultationFee hospitalName about timing workingDays isActive'
    );

    if (!doctor || doctor.role !== 'doctor') {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found',
      });
    }

    res.status(200).json({
      success: true,
      doctor,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
    });
  }
};
// ── GET DOCTOR SLOTS ──────────────────────────────────────────────────────────
const getDoctorSlots = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { date, status = 'available' } = req.query;

    const query = {
      doctor: new mongoose.Types.ObjectId(doctorId),
    };

    if (date) query.slotDate = date;
    if (status && status !== 'all') query.status = status;

    let slots = await Slot.find(query).sort({ slotDate: 1, slotTime: 1 });

    // 🧹 Filter past slots (if no specific date requested)
    if (!date) {
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();

      slots = slots.filter(slot => {
        if (slot.slotDate > todayStr) return true;
        if (slot.slotDate < todayStr) return false;

        const timeParts = slot.slotTime.match(/(\d+):(\d+)\s*([AP]M)/i);
        if (!timeParts) return true;
        let hour = parseInt(timeParts[1]);
        const minute = parseInt(timeParts[2]);
        const ampm = timeParts[3].toUpperCase();
        if (ampm === 'PM' && hour !== 12) hour += 12;
        if (ampm === 'AM' && hour === 12) hour = 0;
        const slotMinutes = hour * 60 + minute;
        const currentMinutes = currentHour * 60 + currentMinute;
        return slotMinutes > currentMinutes;
      });
    }

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

// ── ✅ FIX: GENERATE SLOTS FOR DOCTOR (max 3 days) ──
const generateSlots = async (req, res) => {
  try {
    const { doctorId, days = 1 } = req.body; // ✅ Default 1 day
    const actualDoctorId = doctorId || req.user.userId;

    // Check if doctor exists
    const doctor = await User.findById(actualDoctorId);
    if (!doctor || doctor.role !== 'doctor') {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found',
      });
    }

    // ✅ Maximum 3 days generate karo
    const maxDays = Math.min(days, 3);
    const today = new Date();
    const results = [];

    for (let i = 1; i <= maxDays; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      const slotDate = date.toISOString().split('T')[0];
      const dayOfWeek = date.getDay();

      // Check working days
      const workingDays = doctor.workingDays || [1, 2, 3, 4, 5, 6];
      if (!workingDays.includes(dayOfWeek)) {
        results.push({
          date: slotDate,
          created: 0,
          message: 'Not a working day',
        });
        continue;
      }

      try {
        const result = await generateSlotsForDoctor(actualDoctorId, slotDate);
        results.push({
          date: slotDate,
          ...result,
        });
      } catch (error) {
        results.push({
          date: slotDate,
          created: 0,
          error: error.message,
        });
      }
    }

    res.status(200).json({
      success: true,
      results,
      message: `Generated slots for ${maxDays} days`,
    });

  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
    });
  }
};

// ── UPDATE SLOT STATUS ────────────────────────────────────────────────────────
const updateSlotStatus = async (req, res) => {
  try {
    const { slotId } = req.params;
    const { status } = req.body;

    const slot = await Slot.findById(slotId);
    if (!slot) {
      return res.status(404).json({
        success: false,
        message: 'Slot not found',
      });
    }

    // Only allow updating if slot is not booked
    if (slot.status === 'booked') {
      return res.status(400).json({
        success: false,
        message: 'Cannot modify booked slot',
      });
    }

    slot.status = status;
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

// ── TOGGLE SLOT AVAILABILITY ──────────────────────────────────────────────────
const toggleSlotAvailability = async (req, res) => {
  try {
    const { slotId } = req.params;

    const slot = await Slot.findById(slotId);
    if (!slot) {
      return res.status(404).json({
        success: false,
        message: 'Slot not found',
      });
    }

    if (slot.status === 'booked') {
      return res.status(400).json({
        success: false,
        message: 'Cannot modify booked slot',
      });
    }

    slot.status = slot.status === 'available' ? 'unavailable' : 'available';
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

// ── GET DOCTOR APPOINTMENTS ──────────────────────────────────────────────────
const getDoctorAppointments = async (req, res) => {
  try {
    const doctorId = req.user.userId;
    const { status, dateFrom, dateTo } = req.query;

    const query = {
      doctor: new mongoose.Types.ObjectId(doctorId),
    };

    if (status && status !== 'all') {
      query.status = status;
    }

    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) {
        query.createdAt.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        query.createdAt.$lte = new Date(new Date(dateTo).setHours(23, 59, 59, 999));
      }
    }

    const appointments = await Appointment.find(query)
      .populate('patient', 'name email phone')
      .populate('doctor', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      appointments,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
    });
  }
};

// // ── ACCEPT APPOINTMENT ────────────────────────────────────────────────────────
// const acceptAppointment = async (req, res) => {
//   try {
//     const { id } = req.params;
// console.log('Appointment ID:', id);
//     console.log('Logged-in Doctor ID:', req.user.userId);
//     const appointment = await Appointment.findById(id);
//     if (!appointment) {
//       return res.status(404).json({
//         success: false,
//         message: 'Appointment not found',
//       });
//     }

//     // Check if doctor owns this appointment
//     if (appointment.doctor.toString() !== req.user.userId) {
//        console.log('❌ Unauthorized: Doctor ID mismatch');
//       return res.status(403).json({
//         success: false,
//         message: 'Unauthorized',
//       });
//     }

//     // Update slot status to booked
//     if (appointment.slotId) {
//       await Slot.findByIdAndUpdate(appointment.slotId, {
//         status: 'booked',
//         appointmentId: appointment._id,
//       });
//     }

//     appointment.status = 'accepted';
//     await appointment.save();

//     res.status(200).json({
//       success: true,
//       appointment,
//     });
//   } catch (error) {
//     console.log(error);
//     res.status(500).json({
//       success: false,
//       message: 'Server Error',
//     });
//   }
// };

// // ── REJECT APPOINTMENT ────────────────────────────────────────────────────────
// const rejectAppointment = async (req, res) => {
//   try {
//     const { id } = req.params;

//     const appointment = await Appointment.findById(id);
//     if (!appointment) {
//       return res.status(404).json({
//         success: false,
//         message: 'Appointment not found',
//       });
//     }

//     // Check if doctor owns this appointment
//     if (appointment.doctor.toString() !== req.user.userId) {
//       return res.status(403).json({
//         success: false,
//         message: 'Unauthorized',
//       });
//     }

//     // Free the slot
//     if (appointment.slotId) {
//       await Slot.findByIdAndUpdate(appointment.slotId, {
//         status: 'available',
//         appointmentId: null,
//       });
//     }

//     appointment.status = 'rejected';
//     await appointment.save();

//     res.status(200).json({
//       success: true,
//       appointment,
//     });
//   } catch (error) {
//     console.log(error);
//     res.status(500).json({
//       success: false,
//       message: 'Server Error',
//     });
//   }
// };

// // ── COMPLETE APPOINTMENT ──────────────────────────────────────────────────────
// const completeAppointment = async (req, res) => {
//   try {
//     const { id } = req.params;

//     const appointment = await Appointment.findById(id);
//     if (!appointment) {
//       return res.status(404).json({
//         success: false,
//         message: 'Appointment not found',
//       });
//     }

//     // Check if doctor owns this appointment
//     if (appointment.doctor.toString() !== req.user.userId) {
//       return res.status(403).json({
//         success: false,
//         message: 'Unauthorized',
//       });
//     }

//     appointment.status = 'completed';
//     await appointment.save();

//     // Update slot to completed
//     if (appointment.slotId) {
//       await Slot.findByIdAndUpdate(appointment.slotId, {
//         status: 'completed',
//       });
//     }

//     res.status(200).json({
//       success: true,
//       appointment,
//     });
//   } catch (error) {
//     console.log(error);
//     res.status(500).json({
//       success: false,
//       message: 'Server Error',
//     });
//   }
// };


const acceptAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const appointment = await Appointment.findById(id);
    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found',
      });
    }

    const doctorId = appointment.doctor.toString();
    const userId = req.user.userId.toString();

    if (doctorId !== userId && req.user.role !== 'clinic') {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    if (appointment.slotId) {
      await Slot.findByIdAndUpdate(appointment.slotId, {
        status: 'booked',
        appointmentId: appointment._id,
      });
    }

    appointment.status = 'accepted';
    await appointment.save();

    res.status(200).json({
      success: true,
      appointment,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
    });
  }
};

// Reject
const rejectAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const appointment = await Appointment.findById(id);
    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found',
      });
    }

    const doctorId = appointment.doctor.toString();
    const userId = req.user.userId.toString();

    if (doctorId !== userId && req.user.role !== 'clinic') {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    if (appointment.slotId) {
      await Slot.findByIdAndUpdate(appointment.slotId, {
        status: 'available',
        appointmentId: null,
      });
    }

    appointment.status = 'rejected';
    await appointment.save();

    res.status(200).json({
      success: true,
      appointment,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
    });
  }
};

// Complete
const completeAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const appointment = await Appointment.findById(id);
    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found',
      });
    }

    const doctorId = appointment.doctor.toString();
    const userId = req.user.userId.toString();

    if (doctorId !== userId && req.user.role !== 'clinic') {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    appointment.status = 'completed';
    await appointment.save();

    if (appointment.slotId) {
      await Slot.findByIdAndUpdate(appointment.slotId, {
        status: 'completed',
      });
    }

    res.status(200).json({
      success: true,
      appointment,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
    });
  }
};

// ── GET DOCTOR DASHBOARD STATS ───────────────────────────────────────────────
const getDoctorDashboard = async (req, res) => {
  try {
    const doctorId = req.user.userId;
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    // Get appointment stats
    const totalAppointments = await Appointment.countDocuments({
      doctor: doctorId,
    });

    const pendingAppointments = await Appointment.countDocuments({
      doctor: doctorId,
      status: 'pending',
    });

    const acceptedAppointments = await Appointment.countDocuments({
      doctor: doctorId,
      status: 'accepted',
    });

    const completedAppointments = await Appointment.countDocuments({
      doctor: doctorId,
      status: 'completed',
    });

    const rejectedAppointments = await Appointment.countDocuments({
      doctor: doctorId,
      status: 'rejected',
    });

    // Get today's appointments
    const todayAppointments = await Appointment.find({
      doctor: doctorId,
      slotDate: today,
    }).populate('patient', 'name email');

    // Get available slots
    const availableSlots = await Slot.countDocuments({
      doctor: doctorId,
      slotDate: { $gte: today },
      status: 'available',
    });

    res.status(200).json({
      success: true,
      stats: {
        totalAppointments,
        pendingAppointments,
        acceptedAppointments,
        completedAppointments,
        rejectedAppointments,
        availableSlots,
      },
      todayAppointments,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
    });
  }
};

// ── UPDATE DOCTOR PROFILE ────────────────────────────────────────────────────
const updateDoctorProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Allowed fields to update
    const allowedUpdates = [
      'name', 'specialty', 'qualification', 'experience',
      'consultationFee', 'hospitalName', 'about', 'timing',
      'workingDays', 'maxAppointmentsPerDay', 'isActive'
    ];

    const filteredUpdates = {};
    for (const key of allowedUpdates) {
      if (updates[key] !== undefined) {
        filteredUpdates[key] = updates[key];
      }
    }

    const doctor = await User.findByIdAndUpdate(
      id,
      filteredUpdates,
      { new: true, runValidators: true }
    ).select('-password');

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found',
      });
    }

    res.status(200).json({
      success: true,
      doctor,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
    });
  }
};

// ── EXPORT ────────────────────────────────────────────────────────────────────
module.exports = {
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
  updateDoctorStatus,
};
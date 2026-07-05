const Appointment = require('../models/Appointment');
const Slot = require('../models/Slot');
const User = require('../models/User'); 

const getDashboardStats = async (req, res) => {
  try {
    const totalAppointments =
      await Appointment.countDocuments();
    const pendingAppointments =
      await Appointment.countDocuments({
        status: 'pending',
      });

    const completedAppointments =
      await Appointment.countDocuments({
        status: 'completed',
      });

   const rejectedAppointments =
      await Appointment.countDocuments({
        status: 'rejected',
      });
console.log('STATS =>', {
  totalAppointments,
  pendingAppointments,
  completedAppointments,
  rejectedAppointments,
});
    res.status(200).json({
      success: true,
      stats: {
        totalAppointments,
        pendingAppointments,
        completedAppointments,
       rejectedAppointments,
      },
      
    });

  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: 'Server Error',
    });
  }
};

const getAllAppointments = async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;
    const query = {};

    if (dateFrom && dateTo) {
      query.slotDate = {  // ⬅️ Use slotDate instead of createdAt
        $gte: dateFrom,
        $lte: dateTo,
      };
    }
    console.log('FILTER QUERY =>', query);

    const appointments = await Appointment.find(query)
      .populate('patient', 'name email')
      .populate('doctor', 'name email')
      .sort({ createdAt: -1 });

    // Format appointments to include date field
    const formattedAppointments = appointments.map(app => {
      const appObj = app.toObject();
      // Extract date from createdAt or use slotDate if available
      const dateObj = app.slotDate || app.createdAt;
      return {
        ...appObj,
        date: dateObj ? new Date(dateObj).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      };
    });

    res.status(200).json({
      success: true,
      appointments: formattedAppointments,
    });

  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
    });
  }
};

// const getAllAppointments = async (req, res) => {
//   try {

//     const appointments = await Appointment.find()
//       .populate('patient', 'name email')
//       .populate('doctor', 'name email')
//       .sort({ createdAt: -1 });

//     res.status(200).json({
//       success: true,
//       appointments,
//     });

//   } catch (error) {

//     console.log(error);

//     res.status(500).json({
//       success: false,
//       message: 'Server Error',
//     });

//   }
// };
const createAppointment = async (req, res) => {
  try {

    console.log('BODY =>', req.body);

    const {
      patientName,
      mobile,
      doctorName,
      doctorId,
      slotTime,
       slotDate,
    } = req.body;


     const slot = await Slot.findOne({
      doctor: doctorId,
      slotTime: slotTime,
      status: 'available',
    });

    const appointment =
      await Appointment.create({
        patientName,
        mobile,

        doctor: doctorId,
        doctorId: doctorId,

        doctorName,

        slotTime,
        slotDate: slotDate || slot.slotDate, 
        status: 'pending',
      });

    console.log(
      'CREATED =>',
      appointment,
    );

    await Slot.findOneAndUpdate(
      {
        doctor: doctorId,
        slotTime,
        status: 'available',
      },
      {
        status: 'booked',
      },
    );

    res.status(201).json({
      success: true,
      message:
        'Appointment created successfully',
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

// ── GET CLINIC PROFILE ──────────────────────────────────────────────────────
const getClinicProfile = async (req, res) => {
  try {
    const clinicId = req.user.userId;
    
    const clinic = await User.findById(clinicId)
      .select('-password')
      .lean();

    if (!clinic || clinic.role !== 'clinic') {
      return res.status(404).json({
        success: false,
        message: 'Clinic not found',
      });
    }

    // Get doctors count
    const doctors = await User.find({ role: 'doctor', isActive: true });
    const totalDoctors = doctors.length;

    res.status(200).json({
      success: true,
      clinic: {
        id: clinic._id,
        name: clinic.name,
        email: clinic.email,
        phone: clinic.phone || 'Not provided',
        address: clinic.address || 'Not provided',
        about: clinic.about || '',
        hospitalName: clinic.hospitalName || '',
        totalDoctors: totalDoctors,
        createdAt: clinic.createdAt,
      }
    });

  } catch (error) {
    console.log('Get clinic profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
    });
  }
};

// ── UPDATE CLINIC PROFILE ──────────────────────────────────────────────────
const updateClinicProfile = async (req, res) => {
  try {
    const clinicId = req.user.userId;
    const {
      name,
      phone,
      address,
      about,
      hospitalName,
    } = req.body;

    const clinic = await User.findByIdAndUpdate(
      clinicId,
      {
        name,
        phone,
        address,
        about,
        hospitalName,
      },
      { new: true, runValidators: true }
    ).select('-password');

    if (!clinic) {
      return res.status(404).json({
        success: false,
        message: 'Clinic not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      clinic,
    });

  } catch (error) {
    console.log('Update clinic profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
    });
  }
};

module.exports = {
  getDashboardStats,
  getAllAppointments,
  createAppointment,
  getClinicProfile,
  updateClinicProfile,
};
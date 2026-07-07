const Appointment = require('../models/Appointment');
const Slot = require('../models/Slot');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

// ── Clinic admin adds a doctor (protected) ──
const addDoctorByClinic = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      specialty,
      qualification,
      experience,
      consultationFee,
      hospitalName,
      about,
      timing,
      workingDays,
    } = req.body;

    // 1. Check if doctor already exists
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    // 2. Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 3. Create doctor with clinicId from logged-in clinic admin
    const doctorData = {
      name,
      email,
      password: hashedPassword,
      role: 'doctor',
      specialty: specialty || '',
      qualification: qualification || '',
      experience: experience || '',
      consultationFee: consultationFee || 0,
      hospitalName: hospitalName || '',
      about: about || '',
      clinicId: req.user.userId, // 🔥 The key fix!
      isActive: true,
      timing: timing || {
        morning: { start: '09:00', end: '12:00', enabled: true },
        evening: { start: '16:00', end: '20:00', enabled: true },
        slotDuration: 15,
        break: { start: '13:00', end: '14:00', enabled: true }
      },
      workingDays: workingDays || [1, 2, 3, 4, 5, 6],
      maxAppointmentsPerDay: 20,
    };

    const doctor = await User.create(doctorData);

    // (Optional) Generate slots – but cron job will handle it.

    res.status(201).json({
      success: true,
      message: 'Doctor added successfully',
      doctor,
    });
  } catch (error) {
    console.error('Error adding doctor by clinic:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// ── GET DASHBOARD STATS ─────────────────────────────────────────────────────
const getDashboardStats = async (req, res) => {
  try {
    // 🪄 MAGIC FILTER: Kis clinic ne login kiya hai?
    const clinicId = req.user.userId || req.user._id;

    // Har query me clinicId pass kar diya!
    const totalAppointments = await Appointment.countDocuments({ clinicId });
    
    const pendingAppointments = await Appointment.countDocuments({
        clinicId, 
        status: 'pending',
    });

    const completedAppointments = await Appointment.countDocuments({
        clinicId, 
        status: 'completed',
    });

    const rejectedAppointments = await Appointment.countDocuments({
        clinicId, 
        status: 'rejected',
    });

    console.log('STATS =>', { totalAppointments, pendingAppointments, completedAppointments, rejectedAppointments });
    
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
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// ── GET ALL APPOINTMENTS ────────────────────────────────────────────────────
const getAllAppointments = async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;
    
    // 🪄 MAGIC FILTER: Sirf is clinic ke appointments lao
    const clinicId = req.user.userId || req.user._id;
    const query = { clinicId }; // ⬅️ Sabse bada game-changer ye line hai

    if (dateFrom && dateTo) {
      query.slotDate = {
        $gte: dateFrom,
        $lte: dateTo,
      };
    }
    console.log('FILTER QUERY =>', query);

    const appointments = await Appointment.find(query)
      .populate('patient', 'name email')
      .populate('doctor', 'name email')
      .sort({ createdAt: -1 });

    const formattedAppointments = appointments.map(app => {
      const appObj = app.toObject();
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
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// ── CREATE APPOINTMENT ──────────────────────────────────────────────────────
const createAppointment = async (req, res) => {
  try {
    console.log('BODY =>', req.body);
    const { patientName, mobile, doctorName, doctorId, slotTime, slotDate } = req.body;

    // 🪄 MAGIC FILTER: Jis clinic ke dashboard se ye ban raha hai, uski ID
    const clinicId = req.user.userId || req.user._id;

    const slot = await Slot.findOne({
      doctor: doctorId,
      slotTime: slotTime,
      status: 'available',
    });

    const appointment = await Appointment.create({
        patientName,
        mobile,
        doctor: doctorId,
        doctorId: doctorId,
        doctorName,
        slotTime,
        slotDate: slotDate || slot.slotDate, 
        clinicId, // ⬅️ YAHAN CLINIC KI ID SAVE HO RAHI HAI
        status: 'pending',
    });

    console.log('CREATED =>', appointment);

    await Slot.findOneAndUpdate(
      { doctor: doctorId, slotTime, status: 'available' },
      { status: 'booked' },
    );

    res.status(201).json({
      success: true,
      message: 'Appointment created successfully',
      appointment,
    });

  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// ── GET CLINIC PROFILE ──────────────────────────────────────────────────────
const getClinicProfile = async (req, res) => {
  try {
    const clinicId = req.user.userId || req.user._id;
    
    const clinic = await User.findById(clinicId).select('-password').lean();

    if (!clinic || clinic.role !== 'clinic') {
      return res.status(404).json({ success: false, message: 'Clinic not found' });
    }

    // 🪄 MAGIC FILTER: Sirf IS clinic ke doctors count karo
    const doctors = await User.find({ role: 'doctor', clinicId: clinicId, isActive: true });
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
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// ── UPDATE CLINIC PROFILE ──────────────────────────────────────────────────
const updateClinicProfile = async (req, res) => {
  try {
    const clinicId = req.user.userId || req.user._id;
    const { name, phone, address, about, hospitalName } = req.body;

    const clinic = await User.findByIdAndUpdate(
      clinicId,
      { name, phone, address, about, hospitalName },
      { new: true, runValidators: true }
    ).select('-password');

    if (!clinic) {
      return res.status(404).json({ success: false, message: 'Clinic not found' });
    }

    res.status(200).json({ success: true, message: 'Profile updated successfully', clinic });

  } catch (error) {
    console.log('Update clinic profile error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

module.exports = {
  getDashboardStats,
  getAllAppointments,
  createAppointment,
  getClinicProfile,
  updateClinicProfile,
  addDoctorByClinic,
};
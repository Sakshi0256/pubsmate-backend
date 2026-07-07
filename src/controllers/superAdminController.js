const User = require('../models/User');
const Appointment = require('../models/Appointment');

// ── Get Super Admin Dashboard Stats ──
const getSuperAdminStats = async (req, res) => {
  try {
    const totalClinics = await User.countDocuments({ role: { $regex: /^clinic$/i } });
    const totalDoctors = await User.countDocuments({ role: { $regex: /^doctor$/i } });
    const totalPatients = await User.countDocuments({ role: { $regex: /^patient$/i } });
    const totalAppointments = await Appointment.countDocuments();

    const recentClinics = await User.find({ role: { $regex: /^clinic$/i } })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('name email createdAt isActive');

    res.status(200).json({
      success: true,
      stats: { totalClinics, totalDoctors, totalPatients, totalAppointments },
      recentClinics
    });
  } catch (error) {
    console.log("Stats Error:", error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// ── Get All Clinics ──
const getClinics = async (req, res) => {
  try {
    const clinics = await User.find({ role: { $regex: /^clinic$/i } })
      .select('-password')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      clinics
    });
  } catch (error) {
    console.error('Error fetching clinics:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// ── Get Single Clinic Details (with doctor & appointment counts) ──
const getClinicById = async (req, res) => {
  try {
    const { id } = req.params;

    // Find clinic
    const clinic = await User.findById(id)
      .select('-password')
      .lean();

    if (!clinic || clinic.role.toLowerCase() !== 'clinic') {
      return res.status(404).json({ success: false, message: 'Clinic not found' });
    }

    // 👇 IMPORTANT: If your doctor model has a `clinicId` field, use it.
    // Otherwise, we'll count doctors by `hospitalName` (temporary solution).
    // For accurate linking, add `clinicId` to the doctor model.
    // For now, we'll use hospitalName as a fallback (works if clinic's name is unique).
    const doctors = await User.find({ 
      role: { $regex: /^doctor$/i },
      // If you have a `clinicId` field, replace the line below with:
      clinicId: id
      // hospitalName: clinic.name  // fallback – assumes clinic name matches
    }).select('_id');

    const doctorIds = doctors.map(d => d._id);
    const totalDoctors = doctorIds.length;

    // Count appointments that belong to these doctors
    const totalAppointments = await Appointment.countDocuments({ 
      doctor: { $in: doctorIds } 
    });

    // Send response
    res.status(200).json({
      success: true,
      clinic: {
        ...clinic,
        totalDoctors,
        totalAppointments,
      }
    });

  } catch (error) {
    console.error('Error fetching clinic details:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// ── Register a new clinic (Super Admin only) ──
const registerClinicBySuperAdmin = async (req, res) => {
  try {
    const { name, email, password, phone, address, about, hospitalName } = req.body;

    // Check if email already exists
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const clinic = await User.create({
      name,
      email,
      password: hashedPassword,
      role: 'clinic',
      phone: phone || '',
      address: address || '',
      about: about || '',
      hospitalName: hospitalName || '',
      isActive: true,
    });

    res.status(201).json({
      success: true,
      message: 'Clinic registered successfully',
      clinic: {
        id: clinic._id,
        name: clinic.name,
        email: clinic.email,
        phone: clinic.phone,
        address: clinic.address,
        about: clinic.about,
        hospitalName: clinic.hospitalName,
        createdAt: clinic.createdAt,
      }
    });

  } catch (error) {
    console.error('Error registering clinic:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

module.exports = {
  getSuperAdminStats,
  getClinics,
  getClinicById,
  registerClinicBySuperAdmin,
};
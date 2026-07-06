const User = require('../models/User');
const bcrypt = require('bcryptjs');
const Slot = require('../models/Slot');
const generateToken = require('../utils/generateToken');
const generateSlotsForDoctor = require('../utils/generateSlotsForDoctor'); // ← Import this
const connectDB = require('../config/db');
const Admin = require('../models/Admin');

// ── SIGNUP ────────────────────────────────────────────────────────────────────
// const signup = async (req, res) => {
//   try {
//     const {
//       name,
//       email,
//       password,
//       role,
//       specialty,
//       qualification,
//       experience,
//       consultationFee,
//       hospitalName,
//       about,
//       timing,
//       workingDays,
//     } = req.body;

//     const allowedRoles = ['patient', 'doctor', 'clinic'];

//     // Validation
//     if (!name || !email || !password || !role) {
//       return res.status(400).json({
//         success: false,
//         message: 'All fields are required',
//       });
//     }

//     if (!allowedRoles.includes(role)) {
//       return res.status(400).json({
//         success: false,
//         message: 'Invalid role selected',
//       });
//     }

//     // Check existing user
//     const existingUser = await User.findOne({ email });
//     if (existingUser) {
//       return res.status(400).json({
//         success: false,
//         message: 'User already exists',
//       });
//     }

//     // ✅ FIX: Hash password here
//     const hashedPassword = await bcrypt.hash(password, 10);

//     // Create user data
//     const userData = {
//       name,
//       email,
//       password: hashedPassword, // ← Use hashedPassword
//       role,
//       specialty: specialty || '',
//       qualification: qualification || '',
//       experience: experience || '',
//       consultationFee: consultationFee || 0,
//       hospitalName: hospitalName || '',
//       about: about || '',
//     };

//     // If role is doctor, add timing fields
//     if (role === 'doctor') {
//       userData.timing = timing || {
//         morning: { start: '09:00', end: '12:00', enabled: true },
//         evening: { start: '16:00', end: '20:00', enabled: true },
//         slotDuration: 15,
//         break: { start: '13:00', end: '14:00', enabled: true }
//       };
//       userData.workingDays = workingDays || [1, 2, 3, 4, 5, 6];
//       userData.isActive = true;
//       userData.maxAppointmentsPerDay = 20;
//     }

//     const user = await User.create(userData);

//     // ── IF DOCTOR: Generate slots for 30 days ──
//     if (role === 'doctor') {
//       const today = new Date();
//       let totalSlots = 0;

//       for (let i = 0; i < 30; i++) {
//         const date = new Date(today);
//         date.setDate(today.getDate() + i);
//         const slotDate = date.toISOString().split('T')[0];
//         const dayOfWeek = date.getDay();

//         // Check if working day
//         const workingDays = userData.workingDays || [1, 2, 3, 4, 5, 6];
//         if (!workingDays.includes(dayOfWeek)) {
//           continue;
//         }

//         // ✅ Use generateSlotsForDoctor from utils
//         const result = await generateSlotsForDoctor(user._id, slotDate);
//         totalSlots += result.created || 0;
//       }

//       console.log(`✅ Generated ${totalSlots} slots for doctor ${user.name}`);
//     }

//     // Generate token
//     const token = generateToken(user);

//     res.status(201).json({
//       success: true,
//       message: 'User registered successfully',
//       token,
//       data: {
//         id: user._id,
//         name: user.name,
//         email: user.email,
//         role: user.role,
//         specialty: user.specialty,
//         qualification: user.qualification,
//         experience: user.experience,
//         consultationFee: user.consultationFee,
//         hospitalName: user.hospitalName,
//         about: user.about,
//         timing: user.timing,
//         workingDays: user.workingDays,
//         isActive: user.isActive,
//       },
//     });

//   } catch (error) {
//     console.log('Signup error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Server Error',
//     });
//   }
// };


// ── SIGNUP ────────────────────────────────────────────────────────────────────
const signup = async (req, res) => {
  try {
     await connectDB();
    const {
      name,
      email,
      password,
      role,
      specialty,
      qualification,
      experience,
      consultationFee,
      hospitalName,
      about,
      timing,
      workingDays,
    } = req.body;

    const allowedRoles = ['patient', 'doctor', 'clinic'];

    // Validation
    if (!name || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required',
      });
    }

    if (!allowedRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role selected',
      });
    }

    // Check existing user
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists',
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user data
    const userData = {
      name,
      email,
      password: hashedPassword,
      role,
      specialty: specialty || '',
      qualification: qualification || '',
      experience: experience || '',
      consultationFee: consultationFee || 0,
      hospitalName: hospitalName || '',
      about: about || '',
      clinicId: req.user ? req.user.userId || req.user._id : null,
    };

    // If role is doctor, add timing fields
    if (role === 'doctor') {
      userData.timing = timing || {
        morning: { start: '09:00', end: '12:00', enabled: true },
        evening: { start: '16:00', end: '20:00', enabled: true },
        slotDuration: 15,
        break: { start: '13:00', end: '14:00', enabled: true }
      };
      userData.workingDays = workingDays || [1, 2, 3, 4, 5, 6];
      userData.isActive = true;
      userData.maxAppointmentsPerDay = 20;
    }

    const user = await User.create(userData);

    // ── ✅ FIX: IF DOCTOR: Generate slots for ONLY 1 DAY (tomorrow) ──
    // if (role === 'doctor') {
    //   const today = new Date();
    //   const tomorrow = new Date(today);
    //   tomorrow.setDate(tomorrow.getDate() + 1);
    //   const slotDate = tomorrow.toISOString().split('T')[0];
    //   const dayOfWeek = tomorrow.getDay();

    //   // Check if working day
    //   const workingDays = userData.workingDays || [1, 2, 3, 4, 5, 6];
    //   if (workingDays.includes(dayOfWeek)) {
    //     const result = await generateSlotsForDoctor(user._id, slotDate);
    //     console.log(`✅ Generated ${result.created || 0} slots for doctor ${user.name} for ${slotDate}`);
    //   } else {
    //     console.log(`⏭️ ${slotDate} is not a working day for ${user.name}`);
    //   }
    // }

    // ── Skip slot generation here – cron job will handle it ──
if (role === 'doctor') {
  console.log(`✅ Doctor ${user.name} registered. Slots will be generated by cron job.`);
}

    // Generate token
    const token = generateToken(user);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        specialty: user.specialty,
        qualification: user.qualification,
        experience: user.experience,
        consultationFee: user.consultationFee,
        hospitalName: user.hospitalName,
        about: user.about,
        timing: user.timing,
        workingDays: user.workingDays,
        isActive: user.isActive,
      },
    });

  } catch (error) {
    console.log('Signup error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
    });
  }
};

// // ── LOGIN ─────────────────────────────────────────────────────────────────────
// const login = async (req, res) => {
//   try {
//     await connectDB();
//     const { email, password, role } = req.body;

//     if (!email || !password) {
//       return res.status(400).json({
//         success: false,
//         message: 'Email and password are required',
//       });
//     }

//     const user = await User.findOne({ email });
//     if (!user) {
//       return res.status(401).json({
//         success: false,
//         message: 'Invalid credentials',
//       });
//     }

//     // ✅ Check if doctor is active
//     if (user.role === 'doctor' && !user.isActive) {
//       return res.status(403).json({
//         success: false,
//         message: 'Your account is inactive. Please contact clinic admin.',
//       });
//     }

//     if (role && user.role !== role) {
//       return res.status(403).json({
//         success: false,
//         message: `This account is registered as ${user.role}`,
//       });
//     }

//     const isMatch = await bcrypt.compare(password, user.password);
//     if (!isMatch) {
//       return res.status(401).json({
//         success: false,
//         message: 'Invalid credentials',
//       });
//     }

//     const token = generateToken(user);

//     res.status(200).json({
//       success: true,
//       message: 'Login successful',
//       token,
//       user: {
//         id: user._id,
//         name: user.name,
//         email: user.email,
//         role: user.role,
//         specialty: user.specialty,
//         qualification: user.qualification,
//         experience: user.experience,
//         consultationFee: user.consultationFee,
//         hospitalName: user.hospitalName,
//         about: user.about,
//         timing: user.timing,
//         workingDays: user.workingDays,
//         isActive: user.isActive,
//       },
//     });

//   } catch (error) {
//     console.log('Login error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Server Error',
//     });
//   }
// };


// Top me file ke imports me Admin model zaroor add kar lena:
// const Admin = require('../models/Admin'); 

// ── LOGIN ─────────────────────────────────────────────────────────────────────
const login = async (req, res) => {
  try {
    await connectDB();
    const { email, password, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
      });
    }

    // 1. Pehle normal 'User' collection me dhoondho
    let user = await User.findOne({ email });
    let isSuperAdmin = false;

    // 2. Agar User me nahi mila, toh 'Admin' collection me dhoondho
    if (!user) {
      user = await Admin.findOne({ email });
      if (user) {
        isSuperAdmin = true; // Mark kar diya ki ye superadmin hai
      }
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    // ✅ Check if doctor is active (Skip for superadmin)
    if (!isSuperAdmin && user.role === 'doctor' && !user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Your account is inactive. Please contact clinic admin.',
      });
    }

    // ✅ Role validation
    if (role && user.role !== role) {
      return res.status(403).json({
        success: false,
        message: `This account is registered as ${user.role}`,
      });
    }

    // ✅ Password check
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

   const token = generateToken(user, isSuperAdmin ? 'admin' : 'user');

    // ✅ Build User Data object smartly (Superadmin ko baki fields nahi chahiye hote)
    const userData = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
     clinicId: user.clinicId || null,
    };

    // Agar normal user (doctor/clinic) hai, toh baki fields bhi bhej do
    if (!isSuperAdmin) {
      userData.specialty = user.specialty;
      userData.qualification = user.qualification;
      userData.experience = user.experience;
      userData.consultationFee = user.consultationFee;
      userData.hospitalName = user.hospitalName;
      userData.about = user.about;
      userData.timing = user.timing;
      userData.workingDays = user.workingDays;
      userData.isActive = user.isActive;
    }

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: userData,
    });

  } catch (error) {
    console.log('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
    });
  }
};

const getClinics = async (req, res) => {
  try {
    // User collection se saare clinics fetch karo aur naye wale upar dikhao
    const clinics = await User.find({ role: 'clinic' })
      .select('-password') // Password mat bhejna security ke liye
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: clinics,
    });
  } catch (error) {
    console.log('Get clinics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error fetching clinics',
    });
  }
};

// ── GET DOCTOR PROFILE ──────────────────────────────────────────────────────
const getDoctorProfile = async (req, res) => {
  try {
    const doctor = await User.findOne({
      _id: req.user.userId || req.user.id,
      role: 'doctor',
    }).select('-password');

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found',
      });
    }

    if (!doctor.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Doctor account is inactive',
      });
    }

    res.status(200).json({
      success: true,
      data: doctor,
    });
  } catch (error) {
    console.log('Get doctor profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
    });
  }
};

module.exports = {
  signup,
  login,
  getDoctorProfile,
  getClinics,
};
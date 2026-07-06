const getSuperAdminStats = async (req, res) => {
  try {
    // 1. Case-insensitive count (Role 'clinic', 'Clinic', etc. sab count honge)
    const totalClinics = await User.countDocuments({ role: { $regex: /^clinic$/i } });
    const totalDoctors = await User.countDocuments({ role: { $regex: /^doctor$/i } });
    const totalPatients = await User.countDocuments({ role: { $regex: /^patient$/i } });
    const totalAppointments = await Appointment.countDocuments();
    
    // 2. Recent clinics
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
    console.log("Stats Error:", error); // Error yahan dikhega
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};


module.exports = { 
  getSuperAdminStats 
}; // ✅ YEH LINE ZAROORI HAI
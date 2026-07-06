const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Admin = require('../models/Admin');

const protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ success: false, message: 'Not authorized, no token' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key');

    // ✅ Phele User collection mein dhoondo
    let user = await User.findById(decoded.id || decoded.userId).select('-password');
    
    // ✅ Agar nahi mila, toh Admin collection mein dhoondo
    if (!user) {
      user = await Admin.findById(decoded.id || decoded.userId).select('-password');
    }
    
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    // Attach user to request
    req.user = {
      userId: user._id,
      id: user._id,
      role: user.role,
      email: user.email,
      name: user.name,
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({ success: false, message: 'Not authorized' });
  }
};

module.exports = protect;
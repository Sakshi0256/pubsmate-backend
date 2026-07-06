const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Admin = require('../models/Admin');


const protect = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) return res.status(401).json({ success: false, message: 'No token' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key');
    
    // 2. Logic: Pehle User mein dekho, nahi mila toh Admin mein
    let user = await User.findById(decoded.id || decoded.userId).select('-password');
    let isUser = true;

    if (!user) {
      user = await Admin.findById(decoded.id || decoded.userId).select('-password');
      isUser = false;
    }
    
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    req.user = {
      userId: user._id,
      role: user.role, // 'superadmin' yahan se aayega
      email: user.email,
      name: user.name,
    };

    next();
  } catch (error) {
    console.error('Auth error:', error);
    return res.status(401).json({ success: false, message: 'Not authorized' });
  }
};

// const protect = async (req, res, next) => {
//   try {
//     let token;

//     if (
//       req.headers.authorization &&
//       req.headers.authorization.startsWith('Bearer')
//     ) {
//       token = req.headers.authorization.split(' ')[1];
//     }

//     if (!token) {
//       return res.status(401).json({
//         success: false,
//         message: 'Not authorized, no token',
//       });
//     }

//     const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key');
//     const user = await User.findById(decoded.id || decoded.userId).select('-password');
    
//     if (!user) {
//       return res.status(401).json({
//         success: false,
//         message: 'User not found',
//       });
//     }

//     req.user = {
//       userId: user._id,
//       id: user._id,
//       role: user.role,
//       email: user.email,
//       name: user.name,
//     };

//     next();
//   } catch (error) {
//     console.error('Auth error:', error);
//     return res.status(401).json({
//       success: false,
//       message: 'Not authorized',
//     });
//   }
// };

// ✅ FIX: Rename to authorizeRoles to match route import
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    console.log("User Role:", req.user.role); 
    console.log("Allowed Roles:", roles);
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized - No user found',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Role (${req.user.role}) is not allowed to access this resource`,
        allowedRoles: roles,
      });
    }

    next();
  };
};

module.exports = {
  protect,
  authorizeRoles,
};
const jwt = require('jsonwebtoken');

// user ke saath 'userType' bhi pass karo ('user' or 'admin')
const generateToken = (user, userType = 'user') => {
  return jwt.sign(
    {
      id: user._id,
      role: user.role,
      userType: userType, // Yahan se pata chalega backend ko
    },
    process.env.JWT_SECRET || 'your_jwt_secret_key',
    { expiresIn: '7d' }
  );
};

module.exports = generateToken;
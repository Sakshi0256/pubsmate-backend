const jwt = require('jsonwebtoken');

const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      userId: user._id,
      email: user.email,
      role: user.role,
      name: user.name,
    },
    process.env.JWT_SECRET || 'your_jwt_secret_key',
    {
      expiresIn: '7d',
    }
  );
};

module.exports = generateToken;
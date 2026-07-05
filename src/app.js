const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const authRoutes = require('./routes/authRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const clinicRoutes = require('./routes/clinicRoutes');
const slotRoutes = require('./routes/slotRoutes');
const doctorRoutes = require('./routes/doctorRoutes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Home route
app.get('/', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'HealthMate API Running',
  });
});

// Routes - Order matters (more specific routes first)
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/appointments', appointmentRoutes);
app.use('/api/v1/clinic', clinicRoutes);
app.use('/api/v1/slots', slotRoutes);
app.use('/api/v1/doctors', doctorRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal Server Error',
    error: err.message,
  });
});

app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error('DB connection failed for request:', req.url, err);
    res.status(500).json({ success: false, message: 'Database connection failed' });
  }
});


app.get('/api/v1/test-db', async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const state = mongoose.connection.readyState;
    res.json({ 
      state, 
      message: state === 1 ? 'Connected ✅' : 'Not connected ❌',
      uri: process.env.MONGODB_URI ? 'Set' : 'Not Set'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = app;
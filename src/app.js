const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

// ── Import DB connection ──
const connectDB = require('./config/db');

const authRoutes = require('./routes/authRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const clinicRoutes = require('./routes/clinicRoutes');
const slotRoutes = require('./routes/slotRoutes');
const doctorRoutes = require('./routes/doctorRoutes');

const app = express();

// ── Middleware ──
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// ── Database connection middleware (runs BEFORE routes) ──
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error('❌ DB connection error:', err.message);
    res.status(500).json({ success: false, message: 'Database unavailable' });
  }
});

// ── Home route ──
app.get('/', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'HealthMate API Running',
  });
});

// ── Test DB route ──
app.get('/api/v1/test-db', async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const state = mongoose.connection.readyState;
    const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
    res.json({
      state,
      message: state === 1 ? 'Connected ✅' : 'Not connected ❌',
      uri: uri ? 'Set ✅' : 'Not Set ❌',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── API Routes ──
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/appointments', appointmentRoutes);
app.use('/api/v1/clinic', clinicRoutes);
app.use('/api/v1/slots', slotRoutes);
app.use('/api/v1/doctors', doctorRoutes);

// ── 404 handler (must be LAST) ──
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
});

// ── Error handler ──
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal Server Error',
    error: err.message,
  });
});

module.exports = app;
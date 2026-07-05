const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
    },

    password: {
      type: String,
      required: true,
    },

    phone: {
      type: String,
      default: '',
    },
    address: {
      type: String,
      default: '',
    },

    role: {
      type: String,
      enum: ['patient', 'doctor', 'clinic'],
      required: true,
    },

    // Doctor specific fields
    specialty: {
      type: String,
      default: '',
    },

    qualification: {
      type: String,
      default: '',
    },

    experience: {
      type: String,
      default: '',
    },

    consultationFee: {
      type: Number,
      default: 0,
    },

    hospitalName: {
      type: String,
      default: '',
    },

    about: {
      type: String,
      default: '',
    },

    // ═══ NEW: Doctor Timing Configuration ═══
    timing: {
      morning: {
        start: {
          type: String,
          default: '09:00', // 24-hour format
        },
        end: {
          type: String,
          default: '12:00',
        },
        enabled: {
          type: Boolean,
          default: true,
        },
      },
      evening: {
        start: {
          type: String,
          default: '16:00',
        },
        end: {
          type: String,
          default: '20:00',
        },
        enabled: {
          type: Boolean,
          default: true,
        },
      },
      slotDuration: {
        type: Number,
        default: 15, // minutes
      },
      break: {
        start: {
          type: String,
          default: '13:00',
        },
        end: {
          type: String,
          default: '14:00',
        },
        enabled: {
          type: Boolean,
          default: true,
        },
      },
    },

    // Working days: 0=Sunday, 1=Monday, ... 6=Saturday
    workingDays: {
      type: [Number],
      default: [1, 2, 3, 4, 5, 6], // Monday to Saturday
    },

    // Max appointments per day (optional)
    maxAppointmentsPerDay: {
      type: Number,
      default: 20,
    },

    // Buffer time between appointments (minutes)
    bufferTime: {
      type: Number,
      default: 5,
    },

    // Is doctor currently accepting appointments
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('User', userSchema);
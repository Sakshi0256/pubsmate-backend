

const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },

    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },

    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },

    appointmentDate: {
      type: Date,
      required: false,
    },

    slotTime: {
      type: String,
      required: true,
    },

    slotDate: {  // ⬅️ ADD THIS FIELD
      type: String, // YYYY-MM-DD format
      required: true,
    },


    clinicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },

    issue: {
      type: String,
      required: false,
    },

    status: {
      type: String,
      enum: [
        'pending',
        'accepted',
        'rejected',
        'completed',
      ],
      default: 'pending',
    },

    patientName: {
      type: String,
      required: true,
    },

    mobile: {
      type: String,
      required: true,
    },

    doctorName: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  'Appointment',
  appointmentSchema
);
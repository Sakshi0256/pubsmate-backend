const Appointment = require('../models/Appointment');
const Slot = require('../models/Slot');

const createAppointment = async (req, res) => {
  try {
console.log(req.body);
    const {
      patientName,
      mobile,
      doctorName,
      doctorId,
      slotTime,
      slotDate,
    } = req.body;

    const appointment =
  
      await Appointment.create({
        patientName,
        mobile,
        doctorName,
       doctor: doctorId, 
        slotTime,
        slotDate,
        status: 'pending',
      });

    await Slot.findOneAndUpdate(
      {
        doctor: doctorId,
        slotTime,
        status: 'available',
      },
      {
        status: 'booked',
      }
    );

    res.status(201).json({
      success: true,
      message: 'Appointment booked successfully',
      appointment,
    });

  } catch (error) {

    console.log(error);

    res.status(500).json({
      success: false,
      message: 'Server Error',
    });

  }
};

const getDoctorAppointments = async (
  req,
  res
) => {
  try {

    const appointments =
      await Appointment.find({
        doctor: req.user.userId,
      })

      .populate(
        'patient',
        'name email'
      )

      .sort({
        appointmentDate: -1,
      });
console.log('BODY =>', req.body);
    res.status(200).json({
      success: true,
      appointments,
    });

  } catch (error) {

    console.log(error);

    res.status(500).json({
      success: false,
      message: 'Server Error',
    });

  }
};

module.exports = {
  createAppointment,
    getDoctorAppointments,
};
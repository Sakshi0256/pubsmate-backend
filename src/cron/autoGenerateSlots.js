const cron = require('node-cron');
const User = require('../models/User');
const Slot = require('../models/Slot');
const generateSlotsForDoctor = require('../utils/generateSlotsForDoctor');

const startAutoSlotGeneration = () => {
  console.log('⏰ Auto slot scheduler initialized...');

  // Run every day at 12:05 AM
  cron.schedule('5 0 * * *', async () => {
    console.log('🔄 Auto-generating slots for all doctors...');

    try {
      const doctors = await User.find({ 
        role: 'doctor',
        isActive: true 
      });

      if (doctors.length === 0) {
        console.log('No active doctors found');
        return;
      }

      const daysToGenerate = 3;
      const today = new Date();

      for (let i = 1; i <= daysToGenerate; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() + i);
        const slotDate = date.toISOString().split('T')[0];
        const dayOfWeek = date.getDay();

        for (const doctor of doctors) {
          const workingDays = doctor.workingDays || [1, 2, 3, 4, 5, 6];
          if (!workingDays.includes(dayOfWeek)) {
            continue;
          }

          try {
            const result = await generateSlotsForDoctor(doctor._id, slotDate);
            console.log(`✅ Doctor ${doctor.name}: ${result.message || `${result.created} slots created`}`);
          } catch (error) {
            console.error(`❌ Error for doctor ${doctor.name}:`, error.message);
          }
        }
      }

      // Cleanup old slots (keep last 7 days)
      const cleanupDate = new Date();
      cleanupDate.setDate(cleanupDate.getDate() - 7);
      const cleanupDateStr = cleanupDate.toISOString().split('T')[0];

      const deleted = await Slot.deleteMany({
        slotDate: { $lt: cleanupDateStr },
        status: { $in: ['completed', 'unavailable'] }
      });

      console.log(`🧹 Cleaned up ${deleted.deletedCount} old slots`);

    } catch (error) {
      console.error('❌ Auto-generation error:', error);
    }
  });

  // Run at 12:05 PM to update today's slots
  cron.schedule('5 12 * * *', async () => {
    console.log('🔄 Updating today\'s slots...');

    try {
      const today = new Date().toISOString().split('T')[0];
      const currentTime = new Date();

      const slots = await Slot.find({
        slotDate: today,
        status: 'available'
      });

      let updatedCount = 0;
      for (const slot of slots) {
        const slotHour = parseInt(slot.slotTime.split(':')[0]);
        const slotMinute = parseInt(slot.slotTime.split(':')[1].split(' ')[0]);
        const isPM = slot.slotTime.includes('PM');
        const slotDateObj = new Date();
        slotDateObj.setHours(isPM ? slotHour + 12 : slotHour, slotMinute, 0);

        if (slotDateObj < currentTime) {
          slot.status = 'completed';
          await slot.save();
          updatedCount++;
        }
      }

      console.log(`✅ Updated ${updatedCount} slots to completed`);

    } catch (error) {
      console.error('❌ Error updating today\'s slots:', error);
    }
  });

  console.log('✅ Slot scheduler started successfully');
};

module.exports = startAutoSlotGeneration;
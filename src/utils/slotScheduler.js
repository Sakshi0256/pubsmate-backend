const cron = require('node-cron');
const User = require('../models/User');
const Slot = require('../models/Slot');
const generateSlotsForDoctor = require('./generateSlotsForDoctor');

const startAutoSlotGeneration = () => {
  console.log('⏰ Auto slot scheduler initialized...');

  // ── ✅ FIX: Run every day at 12:05 AM ──
  cron.schedule('5 0 * * *', async () => {
    console.log('🔄 Auto-generating slots for all active doctors...');

    try {
      const doctors = await User.find({ 
        role: 'doctor',
        isActive: true 
      });

      if (doctors.length === 0) {
        console.log('ℹ️ No active doctors found');
        return;
      }

      console.log(`👨‍⚕️ Found ${doctors.length} active doctors`);

      // ✅ SIRF NEXT DAY KA GENERATE KARO
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const slotDate = tomorrow.toISOString().split('T')[0];
      const dayOfWeek = tomorrow.getDay();

      let totalCreated = 0;

      for (const doctor of doctors) {
        console.log(`\n📌 Processing: ${doctor.name}`);
        
        // Check working days
        const workingDays = doctor.workingDays || [1, 2, 3, 4, 5, 6];
        if (!workingDays.includes(dayOfWeek)) {
          console.log(`  ⏭️ ${slotDate}: Not a working day`);
          continue;
        }

        // Check if slots already exist for tomorrow
        const existingSlots = await Slot.find({
          doctor: doctor._id,
          slotDate: slotDate
        });

        if (existingSlots.length > 0) {
          console.log(`  ⏭️ ${slotDate}: Slots already exist (${existingSlots.length})`);
          continue;
        }

        try {
          const result = await generateSlotsForDoctor(doctor._id, slotDate);
          totalCreated += result.created || 0;
          console.log(`  ✅ ${slotDate}: ${result.created || 0} slots created`);
        } catch (error) {
          console.error(`  ❌ ${slotDate}: ${error.message}`);
        }
      }

      // ── ✅ FIX: Cleanup old slots (keep last 3 days) ──
      const cleanupDate = new Date();
      cleanupDate.setDate(cleanupDate.getDate() - 3);
      const cleanupDateStr = cleanupDate.toISOString().split('T')[0];

      const deleted = await Slot.deleteMany({
        slotDate: { $lt: cleanupDateStr },
        status: { $in: ['completed', 'unavailable'] }
      });

      console.log(`\n🧹 Cleaned up ${deleted.deletedCount} old slots`);
      console.log(`📊 Total slots created: ${totalCreated}`);

    } catch (error) {
      console.error('❌ Auto-generation error:', error);
    }
  });

  // ── ✅ FIX: Run at 12:05 PM to update today's slots ──
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
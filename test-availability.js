// Test the availability system end-to-end
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function testAvailability() {
  const providerId = 'c7fa7484-9609-49d1-af95-6508a739f4a2';
  const testDate = '2025-10-03'; // A Thursday

  console.log('Testing availability for provider:', providerId);
  console.log('Test date:', testDate, '(Thursday)');

  try {
    // 1. Get provider schedule
    console.log('\n1. Getting provider schedule...');
    const { data: scheduleResponse, error: scheduleError } = await supabase.functions.invoke('get-provider-schedule', {
      body: { providerId }
    });

    if (scheduleError) {
      console.error('Schedule error:', scheduleError);
      return;
    }

    const schedule = scheduleResponse?.schedule;
    console.log('Schedule found:', !!schedule);
    if (schedule) {
      console.log('Thursday schedule:', schedule.schedule_data?.thursday);
    }

    // 2. Get existing bookings for the date
    console.log('\n2. Getting existing bookings...');
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('start_time, end_time')
      .eq('provider_id', providerId)
      .eq('booking_date', testDate)
      .in('status', ['confirmed', 'in_progress']);

    if (bookingsError) {
      console.error('Bookings error:', bookingsError);
      return;
    }

    console.log('Existing bookings:', bookings?.length || 0);

    // 3. Calculate available slots (simulate the hook logic)
    console.log('\n3. Calculating available slots...');

    if (!schedule?.schedule_data?.thursday?.enabled) {
      console.log('Provider not available on Thursdays');
      return;
    }

    const daySchedule = schedule.schedule_data.thursday;
    console.log('Thursday schedule:', daySchedule);

    const slots = [];
    let currentTime = daySchedule.start;

    // Generate 30-minute intervals
    while (currentTime < daySchedule.end) {
      // Check if this time slot conflicts with existing bookings
      const isBooked = bookings?.some(booking => {
        const bookingStart = booking.start_time;
        const bookingEnd = booking.end_time;
        // Simple overlap check
        return currentTime >= bookingStart && currentTime < bookingEnd;
      });

      slots.push({
        date: testDate,
        time: currentTime,
        available: !isBooked
      });

      // Add 30 minutes
      const [hours, mins] = currentTime.split(':').map(Number);
      const totalMinutes = hours * 60 + mins + 30;
      const newHours = Math.floor(totalMinutes / 60);
      const newMinutes = totalMinutes % 60;
      currentTime = `${newHours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}`;
    }

    console.log('Available slots:');
    slots.forEach(slot => {
      if (slot.available) {
        console.log(`  ✓ ${slot.time}`);
      } else {
        console.log(`  ✗ ${slot.time} (booked)`);
      }
    });

    console.log('\nTest completed successfully!');

  } catch (error) {
    console.error('Test error:', error);
  }
}

testAvailability();
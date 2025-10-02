// Check provider schedules
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function checkSchedules() {
  console.log('Checking provider_schedules table...');

  try {
    const { data: schedules, error } = await supabase
      .from('provider_schedules')
      .select('*')
      .limit(10);

    if (error) {
      console.error('Error:', error);
      return;
    }

    console.log('Found schedules:', schedules?.length || 0);
    schedules?.forEach(schedule => {
      console.log(`Provider: ${schedule.provider_id}`);
      console.log(`Schedule Data:`, JSON.stringify(schedule.schedule_data, null, 2));
      console.log('---');
    });

  } catch (error) {
    console.error('Error:', error);
  }
}

checkSchedules();
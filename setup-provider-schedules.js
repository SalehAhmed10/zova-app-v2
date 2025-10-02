require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Provider IDs from our earlier search
const PROVIDERS = [
  { id: 'c7fa7484-9609-49d1-af95-6508a739f4a2', name: 'artinsane00@gmail.com' },
  { id: '5742f770-cfbb-488b-8615-232b39897343', name: 'myworkxpace@gmail.com' }
];

// Create schedule data in the expected JSONB format
const SCHEDULE_DATA = {
  monday: { start: '09:00', end: '17:00', enabled: true },
  tuesday: { start: '09:00', end: '17:00', enabled: true },
  wednesday: { start: '09:00', end: '17:00', enabled: true },
  thursday: { start: '09:00', end: '17:00', enabled: true },
  friday: { start: '09:00', end: '17:00', enabled: true },
  saturday: { start: '10:00', end: '16:00', enabled: true },
  sunday: { start: '10:00', end: '16:00', enabled: false }
};

async function createProviderSchedules() {
  for (const provider of PROVIDERS) {
    console.log(`Checking/creating schedule for provider: ${provider.name} (${provider.id})`);

    // First check if schedule exists
    const { data: existing, error: checkError } = await supabase
      .from('provider_schedules')
      .select('id')
      .eq('provider_id', provider.id)
      .maybeSingle();

    if (checkError) {
      console.error(`Error checking schedule for ${provider.name}:`, checkError);
      continue;
    }

    if (existing) {
      console.log(`✓ Schedule already exists for ${provider.name}, updating...`);
      
      // Update existing schedule
      const { data, error } = await supabase
        .from('provider_schedules')
        .update({
          schedule_data: SCHEDULE_DATA
        })
        .eq('provider_id', provider.id)
        .select();

      if (error) {
        console.error(`Error updating schedule for ${provider.name}:`, error);
      } else {
        console.log(`✓ Updated schedule for ${provider.name}`);
      }
    } else {
      // Create new schedule
      const { data, error } = await supabase
        .from('provider_schedules')
        .insert({
          provider_id: provider.id,
          schedule_data: SCHEDULE_DATA
        })
        .select();

      if (error) {
        console.error(`Error creating schedule for ${provider.name}:`, error);
      } else {
        console.log(`✓ Created schedule for ${provider.name}`);
      }
    }
  }

  console.log('All schedules processed successfully!');
}

createProviderSchedules();
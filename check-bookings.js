const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkBookings() {
  console.log('Checking bookings for provider: c7fa7484-9609-49d1-af95-6508a739f4a2');

  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('provider_id', 'c7fa7484-9609-49d1-af95-6508a739f4a2');

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Bookings found:', data?.length || 0);
    if (data && data.length > 0) {
      console.log('First booking:', JSON.stringify(data[0], null, 2));
    }
  }

  process.exit(0);
}

checkBookings();
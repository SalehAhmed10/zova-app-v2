// Test script for review query
const { supabase } = require('./src/lib/core/supabase');

async function testQuery() {
  console.log('🧪 Testing Review Query...\n');

  const { data, error } = await supabase
    .from('reviews')
    .select(`
      id,
      rating,
      comment,
      created_at,
      is_anonymous,
      provider_response,
      provider_response_at,
      booking_id,
      provider_id,
      bookings!reviews_booking_id_fkey (
        booking_date,
        start_time,
        service_address,
        provider_services!bookings_service_id_fkey (
          title,
          description
        )
      ),
      profiles!reviews_provider_id_fkey (
        first_name,
        last_name,
        business_name
      )
    `)
    .eq('customer_id', 'c7fa7484-9609-49d1-af95-6508a739f4a2')
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) {
    console.error('❌ Error:', error);
  } else {
    console.log('✅ Data structure:', JSON.stringify(data, null, 2));
  }
}

testQuery();
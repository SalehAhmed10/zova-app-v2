const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function testHookLogic() {
  console.log('Testing the useProviderBookings hook logic with RLS policy...\n');
  
  const providerId = '38e8ec75-eb25-43d3-a72f-9b4e0b6e7e8a';
  const customerId = '605cc653-0f7e-40aa-95bc-1396b99f6390';
  
  console.log('1. Testing bookings query (should work):');
  const { data: bookingsData, error: bookingsError } = await supabase
    .from('bookings')
    .select(`
      id,
      booking_date,
      start_time,
      end_time,
      status,
      total_amount,
      customer_id,
      service_id,
      created_at
    `)
    .eq('provider_id', providerId);
  
  if (bookingsError) {
    console.error('❌ Bookings error:', bookingsError.message);
    return;
  }
  
  console.log('✅ Bookings found:', bookingsData?.length || 0);
  
  if (bookingsData && bookingsData.length > 0) {
    const customerIds = [...new Set(bookingsData.map(b => b.customer_id))];
    const serviceIds = [...new Set(bookingsData.map(b => b.service_id))];
    
    console.log('\n2. Testing customer profiles with RLS policy:');
    const { data: customersData, error: customersError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, role')
      .in('id', customerIds);
    
    if (customersError) {
      console.error('❌ Customers error:', customersError.message);
    } else {
      console.log('✅ Customers retrieved:', customersData?.length || 0);
      console.log('Customer data:', customersData);
    }
    
    console.log('\n3. Testing services query (should work):');
    const { data: servicesData, error: servicesError } = await supabase
      .from('provider_services')
      .select('id, title, price_type, base_price')
      .in('id', serviceIds);
    
    if (servicesError) {
      console.error('❌ Services error:', servicesError.message);
    } else {
      console.log('✅ Services retrieved:', servicesData?.length || 0);
    }
  }
}

testHookLogic().catch(console.error);
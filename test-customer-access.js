const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Test with anon key (same as app)
const supabaseAnon = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

// Test with service role key (for comparison)
const supabaseService = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testCustomerAccess() {
  console.log('Testing customer profile access...\n');
  
  const customerId = '605cc653-0f7e-40aa-95bc-1396b99f6390';
  
  // Test with anon key (same as app)
  console.log('1. Testing with anon key (same as app):');
  const { data: anonData, error: anonError } = await supabaseAnon
    .from('profiles')
    .select('id, first_name, last_name, role')
    .eq('id', customerId);
  
  if (anonError) {
    console.error('❌ Anon key error:', anonError.message);
  } else {
    console.log('✅ Anon key success:', anonData);
  }
  
  // Test with service role key (for comparison)
  console.log('\n2. Testing with service role key:');
  const { data: serviceData, error: serviceError } = await supabaseService
    .from('profiles')
    .select('id, first_name, last_name, role')
    .eq('id', customerId);
  
  if (serviceError) {
    console.error('❌ Service key error:', serviceError.message);
  } else {
    console.log('✅ Service key success:', serviceData);
  }
  
  // Test if we can access profile through booking relationship
  console.log('\n3. Testing profile access through booking relationship:');
  const { data: bookingData, error: bookingError } = await supabaseAnon
    .from('bookings')
    .select(`
      id,
      customer_id,
      profiles!customer_id(id, first_name, last_name, role)
    `)
    .eq('customer_id', customerId)
    .limit(1);
  
  if (bookingError) {
    console.error('❌ Booking relationship error:', bookingError.message);
  } else {
    console.log('✅ Booking relationship success:', JSON.stringify(bookingData, null, 2));
  }
}

testCustomerAccess().catch(console.error);
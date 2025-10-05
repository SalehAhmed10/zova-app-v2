const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function testBookingDetailQuery() {
  console.log('Testing booking detail query...');
  
  // Use a known booking ID from our previous query
  const bookingId = 'e16e9785-4a32-498e-9beb-af420578e595';
  console.log('Testing with booking ID:', bookingId);
  
  // Test the corrected query
  const { data, error } = await supabase
    .from('bookings')
    .select(`
      *,
      customer:profiles!bookings_customer_id_fkey (
        first_name,
        last_name,
        email,
        phone_number
      ),
      service:provider_services!bookings_service_id_fkey (
        id,
        title,
        description,
        provider:profiles!provider_services_provider_id_fkey (
          first_name,
          last_name
        ),
        service_category:service_categories (
          name,
          subcategory:service_subcategories (
            name
          )
        )
      )
    `)
    .eq('id', bookingId)
    .single();
    
  if (error) {
    console.error('Query error:', error);
  } else {
    console.log('Query successful!');
    console.log('Customer name:', `${data.customer?.first_name || ''} ${data.customer?.last_name || ''}`.trim());
    console.log('Service title:', data.service?.title);
    console.log('Category:', data.service?.service_category?.name);
  }
}

testBookingDetailQuery().catch(console.error);
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://nbubnrvqthfqguztkpnt.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5idWJucnZxdGhmcWd1enRrcG50Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjcxNzMwNjYsImV4cCI6MjA0Mjc0OTA2Nn0.JKBGpNLW2LBxCaTF9Q3TkokF48Sn_5Ws4tLVJi_TWOI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testCategoryFix() {
  try {
    console.log('🔍 Testing corrected booking detail query with category relationships...\n');

    // Get all bookings first
    const { data: allBookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('id')
      .limit(10);

    if (bookingsError) {
      console.error('❌ Error fetching bookings:', bookingsError);
      return;
    }

    if (!allBookings || allBookings.length === 0) {
      console.log('⚠️ No bookings found to test with');
      return;
    }

    console.log(`📋 Found ${allBookings.length} bookings to test\n`);

    // Test the corrected query on each booking
    for (const booking of allBookings) {
      console.log(`🔍 Testing booking ID: ${booking.id}`);
      
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          status,
          booking_date,
          start_time,
          customer:profiles!bookings_customer_id_fkey (
            first_name,
            last_name
          ),
          service:provider_services!bookings_service_id_fkey (
            title,
            category_id,
            subcategory_id,
            category:service_categories!provider_services_category_id_fkey (
              name
            ),
            subcategory:service_subcategories!provider_services_subcategory_id_fkey (
              name,
              category:service_categories!service_subcategories_category_id_fkey (
                name
              )
            )
          )
        `)
        .eq('id', booking.id)
        .single();

      if (error) {
        console.error(`❌ Error for booking ${booking.id}:`, error.message);
        continue;
      }

      if (data) {
        const categoryDirect = data.service?.category?.name;
        const categoryFromSubcat = data.service?.subcategory?.category?.name;
        const finalCategory = categoryDirect || categoryFromSubcat || 'Unknown Category';
        
        console.log(`  Service: ${data.service?.title || 'N/A'}`);
        console.log(`  Category (direct): ${categoryDirect || 'N/A'}`);
        console.log(`  Category (from subcat): ${categoryFromSubcat || 'N/A'}`);
        console.log(`  Final Category: ${finalCategory}`);
        console.log(`  Subcategory: ${data.service?.subcategory?.name || 'N/A'}`);
        
        if (finalCategory !== 'Unknown Category') {
          console.log(`✅ SUCCESS: Category resolved for booking ${booking.id}\n`);
          break; // Found a working example
        } else {
          console.log(`⚠️ Still showing unknown category\n`);
        }
      }
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

testCategoryFix();
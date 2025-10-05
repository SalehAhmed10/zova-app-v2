/**
 * Test SOS Booking System
 * 
 * Tests the emergency booking flow with real database data
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://wezgwqqdlwybadtvripr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indlemd3cXFkbHd5YmFkdHZyaXByIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0MjU0NDgsImV4cCI6MjA3MDAwMTQ0OH0.qlk1-Cg8UXdoCxVtW14mPKZxRo3xA5Zj9DF382OMSDs';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSOSSystem() {
  console.log('🚨 Testing SOS Emergency Booking System...\n');

  try {
    // 1. Check for providers with SOS-enabled services
    console.log('1. Checking providers with SOS services...');
    const { data: sosProviders, error: providerError } = await supabase
      .from('profiles')
      .select(`
        id,
        first_name,
        last_name,
        business_name,
        verification_status,
        provider_services!inner (
          id,
          title,
          allows_sos_booking,
          is_active,
          subcategory_id,
          service_subcategories (
            name,
            service_categories (
              name
            )
          )
        )
      `)
      .eq('role', 'provider')
      .eq('verification_status', 'verified')
      .eq('provider_services.allows_sos_booking', true)
      .eq('provider_services.is_active', true)
      .limit(5);

    if (providerError) {
      console.error('❌ Error fetching SOS providers:', providerError.message);
      return;
    }

    console.log(`✅ Found ${sosProviders?.length || 0} SOS-enabled providers:`);
    sosProviders?.forEach(provider => {
      const services = Array.isArray(provider.provider_services) 
        ? provider.provider_services 
        : [provider.provider_services];
      
      console.log(`   - ${provider.business_name || `${provider.first_name} ${provider.last_name}`}`);
      services.forEach(service => {
        const subcategory = service.service_subcategories;
        console.log(`     └ ${service.title} (${subcategory?.name} - ${subcategory?.service_categories?.name})`);
      });
    });

    // 2. Check service categories that support emergency bookings
    console.log('\n2. Checking service categories...');
    const { data: categories, error: catError } = await supabase
      .from('service_categories')
      .select(`
        id,
        name,
        service_subcategories (
          id,
          name,
          provider_services!inner (
            allows_sos_booking
          )
        )
      `)
      .limit(10);

    if (catError) {
      console.error('❌ Error fetching categories:', catError.message);
    } else {
      console.log(`✅ Found ${categories?.length || 0} service categories:`);
      categories?.forEach(category => {
        const sosSubcategories = category.service_subcategories?.filter(sub => 
          sub.provider_services?.some(service => service.allows_sos_booking)
        );
        
        if (sosSubcategories && sosSubcategories.length > 0) {
          console.log(`   - ${category.name}:`);
          sosSubcategories.forEach(sub => {
            console.log(`     └ ${sub.name} (SOS available)`);
          });
        }
      });
    }

    // 3. Test the find-sos-providers edge function
    console.log('\n3. Testing find-sos-providers Edge Function...');
    try {
      const { data: providerResponse, error: edgeError } = await supabase.functions.invoke('find-sos-providers', {
        body: {
          category_id: 'plumbing',
          service_location: '123 Test Street, London, UK',
          emergency_mode: true,
          max_distance_km: 15,
          priority_matching: true
        }
      });

      if (edgeError) {
        console.error('❌ Edge function error:', edgeError.message);
      } else {
        console.log(`✅ Edge function returned ${providerResponse?.providers?.length || 0} providers`);
        providerResponse?.providers?.forEach((provider, index) => {
          console.log(`   ${index + 1}. ${provider.full_name || provider.business_name}`);
          console.log(`      Rating: ${provider.average_rating}/5 | Distance: ${provider.distance_km}km`);
          console.log(`      Emergency jobs: ${provider.completed_emergency_jobs}`);
        });
      }
    } catch (error) {
      console.error('❌ Edge function test failed:', error.message);
    }

    // 4. Check subscription system
    console.log('\n4. Checking SOS subscriptions...');
    const { data: subscriptions, error: subError } = await supabase
      .from('subscriptions')
      .select('id, user_id, plan_type, status, created_at')
      .eq('plan_type', 'sos')
      .eq('status', 'active')
      .limit(5);

    if (subError) {
      console.error('❌ Error fetching subscriptions:', subError.message);
    } else {
      console.log(`✅ Found ${subscriptions?.length || 0} active SOS subscriptions`);
      subscriptions?.forEach(sub => {
        console.log(`   - User: ${sub.user_id} | Status: ${sub.status} | Created: ${sub.created_at}`);
      });
    }

    console.log('\n🎉 SOS System Test Complete!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testSOSSystem();
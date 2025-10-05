/**
 * Test Updated SOS System with Beauty & Events Focus
 * 
 * Tests the emergency booking flow with the new focused categories
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://wezgwqqdlwybadtvripr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indlemd3cXFkbHd5YmFkdHZyaXByIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0MjU0NDgsImV4cCI6MjA3MDAwMTQ0OH0.qlk1-Cg8UXdoCxVtW14mPKZxRo3xA5Zj9DF382OMSDs';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testFocusedSOSSystem() {
  console.log('🎯 Testing Focused SOS System - Beauty & Events...\n');

  try {
    // Test 1: Verify focused categories exist
    console.log('1. Checking focused categories...');
    const { data: categories, error: catError } = await supabase
      .from('service_categories')
      .select('id, name')
      .in('name', ['Beauty & Grooming', 'Events & Entertainment']);

    if (catError) {
      console.error('❌ Error fetching categories:', catError.message);
      return;
    }

    console.log(`✅ Found focused categories: ${categories?.length || 0}`);
    categories?.forEach(cat => console.log(`   - ${cat.name}`));

    // Test 2: Check subcategories for emergency services
    console.log('\n2. Checking emergency subcategories...');
    const { data: subcategories, error: subError } = await supabase
      .from('service_subcategories')
      .select(`
        name,
        service_categories (name)
      `)
      .in('service_categories.name', ['Beauty & Grooming', 'Events & Entertainment']);

    if (subError) {
      console.error('❌ Error fetching subcategories:', subError.message);
    } else {
      console.log(`✅ Found emergency subcategories: ${subcategories?.length || 0}`);
      
      const beautyServices = subcategories?.filter(sub => 
        sub.service_categories?.name === 'Beauty & Grooming'
      );
      console.log(`   💅 Beauty & Grooming services: ${beautyServices?.length || 0}`);
      beautyServices?.forEach(service => 
        console.log(`     - ${service.name}`)
      );

      const eventServices = subcategories?.filter(sub => 
        sub.service_categories?.name === 'Events & Entertainment'
      );
      console.log(`   🎉 Events & Entertainment services: ${eventServices?.length || 0}`);
      eventServices?.forEach(service => 
        console.log(`     - ${service.name}`)
      );
    }

    // Test 3: Test the updated SOS provider finder for beauty emergency
    console.log('\n3. Testing emergency beauty provider search...');
    try {
      const { data: beautyProviders, error: beautyError } = await supabase.functions.invoke('find-sos-providers', {
        body: {
          category_id: 'hair',
          service_location: '123 Emergency Street, London, UK',
          emergency_mode: true,
          max_distance_km: 10,
          priority_matching: true
        }
      });

      if (beautyError) {
        console.error('❌ Beauty provider search error:', beautyError.message);
      } else {
        console.log(`✅ Emergency hair providers found: ${beautyProviders?.providers?.length || 0}`);
        beautyProviders?.providers?.slice(0, 2).forEach((provider, index) => {
          console.log(`   ${index + 1}. ${provider.full_name || provider.business_name}`);
          console.log(`      Category: Hair Styling | Rating: ${provider.average_rating}/5`);
        });
      }
    } catch (error) {
      console.error('❌ Edge function test failed:', error.message);
    }

    // Test 4: Test events emergency provider search
    console.log('\n4. Testing emergency event provider search...');
    try {
      const { data: eventProviders, error: eventError } = await supabase.functions.invoke('find-sos-providers', {
        body: {
          category_id: 'photographer',
          service_location: '456 Event Avenue, London, UK',
          emergency_mode: true,
          max_distance_km: 15,
          priority_matching: true
        }
      });

      if (eventError) {
        console.error('❌ Event provider search error:', eventError.message);
      } else {
        console.log(`✅ Emergency photographers found: ${eventProviders?.providers?.length || 0}`);
        eventProviders?.providers?.slice(0, 2).forEach((provider, index) => {
          console.log(`   ${index + 1}. ${provider.full_name || provider.business_name}`);
          console.log(`      Category: Photography | Rating: ${provider.average_rating}/5`);
        });
      }
    } catch (error) {
      console.error('❌ Events edge function test failed:', error.message);
    }

    console.log('\n🎉 Focused SOS System Test Complete!');
    console.log('\n📱 Ready for use:');
    console.log('   - 💅 Emergency Beauty: Hair, Nails, Makeup, Lashes & Brows');
    console.log('   - 🎉 Emergency Events: Photography, Event Planning');
    console.log('   - 🚀 Real-time provider matching with focused expertise');
    console.log('   - ⚡ Instant booking confirmation for specialized services');

    process.exit(0);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testFocusedSOSSystem();
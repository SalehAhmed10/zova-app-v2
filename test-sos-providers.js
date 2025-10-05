/**
 * Test SOS Providers - Quick test of the find-sos-providers edge function
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://wezgwqqdlwybadtvripr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndlemV3cXFkbHd5YmFkdHZyaXByIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzNzUzNjEsImV4cCI6MjA3NDk1MTM2MX0.tRlBT-7pKuIvuQ4WHWmIhFu8GN8AY_Ckh0wQz_EZjJs';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSOSProviders() {
  console.log('🧪 Testing SOS Provider Search...\n');

  // Test with Hair subcategory
  const hairSubcategoryId = '98e5f6b5-8f1b-4e1a-8a73-02f83018d362';
  
  try {
    console.log('1️⃣ Testing Hair Services...');
    const { data, error } = await supabase.functions.invoke('find-sos-providers', {
      body: {
        category_id: hairSubcategoryId,
        service_location: '123 Main St, London, UK',
        emergency_mode: true,
        max_distance_km: 15,
        priority_matching: true
      }
    });

    if (error) {
      console.error('❌ Error:', error);
      return;
    }

    console.log('✅ Response received!');
    console.log('📊 Search params:', JSON.stringify(data.search_params, null, 2));
    console.log('🚨 Emergency info:', JSON.stringify(data.emergency_info, null, 2));
    console.log(`👥 Found ${data.providers?.length || 0} providers:`);
    
    data.providers?.forEach((provider, index) => {
      console.log(`\n  ${index + 1}. ${provider.full_name || provider.business_name}`);
      console.log(`     🏢 Business: ${provider.business_name || 'N/A'}`);
      console.log(`     ⭐ Rating: ${provider.average_rating}/5.0`);
      console.log(`     🚗 Distance: ${provider.distance_km}km`);
      console.log(`     ⏱️ ETA: ${provider.estimated_arrival}`);
      console.log(`     ✅ Verified: ${provider.is_verified ? 'Yes' : 'No'}`);
      console.log(`     📞 Emergency jobs: ${provider.completed_emergency_jobs}`);
    });

  } catch (err) {
    console.error('❌ Test failed:', err.message);
  }

  console.log('\n' + '='.repeat(60));

  // Test with Makeup subcategory
  const makeupSubcategoryId = '33b8068b-5d51-43b3-8e3f-3b2517a2fecc';
  
  try {
    console.log('\n2️⃣ Testing Makeup Services...');
    const { data, error } = await supabase.functions.invoke('find-sos-providers', {
      body: {
        category_id: makeupSubcategoryId,
        service_location: '456 Park Avenue, London, UK',
        emergency_mode: true
      }
    });

    if (error) {
      console.error('❌ Error:', error);
      return;
    }

    console.log('✅ Response received!');
    console.log(`👥 Found ${data.providers?.length || 0} providers for ${data.search_params?.subcategory_name}`);
    
    data.providers?.forEach((provider, index) => {
      console.log(`\n  ${index + 1}. ${provider.full_name || provider.business_name}`);
      console.log(`     ⭐ Rating: ${provider.average_rating}/5.0`);
      console.log(`     ⏱️ ETA: ${provider.estimated_arrival}`);
    });

  } catch (err) {
    console.error('❌ Test failed:', err.message);
  }

  console.log('\n🎉 SOS Provider testing complete!');
}

testSOSProviders().catch(console.error);
const fetch = require('node-fetch');

const SUPABASE_URL = 'https://wezgwqqdlwybadtvripr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indlemd3cXFkbHd5YmFkdHZyaXByIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0MjU0NDgsImV4cCI6MjA3MDAwMTQ0OH0.qlk1-Cg8UXdoCxVtW14mPKZxRo3xA5Zj9DF382OMSDs';

async function testRealProviders() {
  console.log('🚨 Testing SOS Provider Search with Real Providers...\n');

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/find-sos-providers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        category_id: '98e5f6b5-8f1b-4e1a-8a73-02f83018d362', // Hair subcategory UUID
        emergency_mode: true,
        max_distance_km: 25,
        priority_matching: true
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ Edge Function Response:', JSON.stringify(data, null, 2));
    
    if (data.providers && data.providers.length > 0) {
      console.log('\n🎉 SUCCESS: Found real providers!');
      console.log(`📊 Provider Count: ${data.providers.length}`);
      
      data.providers.forEach((provider, index) => {
        console.log(`\n👤 Provider ${index + 1}:`);
        console.log(`   Name: ${provider.name}`);
        console.log(`   Business: ${provider.business_name}`);
        console.log(`   Location: ${provider.location}`);
        console.log(`   Services: ${provider.services.join(', ')}`);
        console.log(`   Pricing: ${provider.pricing}`);
        console.log(`   Verified: ${provider.is_verified}`);
        console.log(`   Auto-confirm: ${provider.auto_confirm}`);
      });
    } else {
      console.log('❌ No providers found');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testRealProviders();
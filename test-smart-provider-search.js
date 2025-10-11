const fetch = require('node-fetch');

async function testSmartProviderSearch() {
  const SUPABASE_URL = 'https://wezgwqqdlwybadtvripr.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indlemd3cXFkbHd5YmFkdHZyaXByIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0MjU0NDgsImV4cCI6MjA3MDAwMTQ0OH0.qlk1-Cg8UXdoCxVtW14mPKZxRo3xA5Zj9DF382OMSDs';

  console.log('🧪 Testing Smart Provider Search Function...');

  // Test 1: Basic search with GPS coordinates (London - where our test providers are)
  console.log('\n📍 Test 1: Search near London (51.5074, -0.1278)');
  try {
    const response1 = await fetch(`${SUPABASE_URL}/functions/v1/smart-provider-search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        userLat: 51.5074,
        userLng: -0.1278,
        maxDistance: 50,
        sortBy: 'distance',
        maxResults: 5
      }),
    });

    const result1 = await response1.json();
    console.log('✅ Response status:', response1.status);
    console.log('� Full response:', JSON.stringify(result1, null, 2));
    console.log('� Results found:', result1.data?.length || 0);

    if (result1.data && result1.data.length > 0) {
      console.log('🎯 First result:', {
        name: result1.data[0].business_name || `${result1.data[0].first_name} ${result1.data[0].last_name}`,
        distance: result1.data[0].distance,
        coordinates: result1.data[0].coordinates
      });
    }

    if (result1.error) {
      console.log('❌ Error:', result1.error);
    }
  } catch (error) {
    console.log('❌ Network error:', error.message);
  }

  // Test 2: Search with service query
  console.log('\n💅 Test 2: Search for "nails" near London');
  try {
    const response2 = await fetch(`${SUPABASE_URL}/functions/v1/smart-provider-search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        query: 'Nail',
        userLat: 51.5074,
        userLng: -0.1278,
        maxDistance: 50,
        sortBy: 'distance',
        maxResults: 5
      }),
    });

    const result2 = await response2.json();
    console.log('✅ Response status:', response2.status);
    console.log('📊 Results found:', result2.data?.length || 0);

    if (result2.data && result2.data.length > 0) {
      result2.data.forEach((provider, index) => {
        console.log(`🎯 Result ${index + 1}:`, {
          name: provider.business_name || `${provider.first_name} ${provider.last_name}`,
          distance: provider.distance,
          services: provider.provider_services?.length || 0
        });
      });
    }

    if (result2.error) {
      console.log('❌ Error:', result2.error);
    }
  } catch (error) {
    console.log('❌ Network error:', error.message);
  }

  // Test 3: Search without GPS (should return test data if no real providers)
  console.log('\n🧪 Test 3: Search without GPS coordinates');
  try {
    const response3 = await fetch(`${SUPABASE_URL}/functions/v1/smart-provider-search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        query: 'hair',
        maxResults: 2
      }),
    });

    const result3 = await response3.json();
    console.log('✅ Response status:', response3.status);
    console.log('📊 Results found:', result3.data?.length || 0);

    if (result3.data && result3.data.length > 0) {
      console.log('🎯 First result:', result3.data[0]);
    }

    if (result3.error) {
      console.log('❌ Error:', result3.error);
    }
  } catch (error) {
    console.log('❌ Network error:', error.message);
  }
}

testSmartProviderSearch().catch(console.error);
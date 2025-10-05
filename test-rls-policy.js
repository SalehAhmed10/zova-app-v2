const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Test with anon key (same as app)
const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function testProviderRLS() {
  console.log('Testing new RLS policy for provider access to customer profiles...\n');
  
  // Provider ID from our test data
  const providerId = '38e8ec75-eb25-43d3-a72f-9b4e0b6e7e8a';
  const customerId = '605cc653-0f7e-40aa-95bc-1396b99f6390';
  
  try {
    // First, simulate setting the auth context (in the real app, this is done by Supabase auth)
    // For testing, we need to use a real provider session
    
    console.log('1. Testing direct customer profile access with provider context:');
    
    // Test direct access to customer profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, role')
      .eq('id', customerId);
    
    if (profilesError) {
      console.error('❌ Direct access error:', profilesError.message);
    } else {
      console.log('✅ Direct access success:', profiles);
    }
    
    // Test getting all customer profiles that this provider can access
    console.log('\n2. Testing all accessible customer profiles:');
    const { data: allProfiles, error: allError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, role')
      .eq('role', 'customer');
    
    if (allError) {
      console.error('❌ All profiles error:', allError.message);
    } else {
      console.log('✅ All accessible profiles:', allProfiles);
    }
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
}

testProviderRLS().catch(console.error);
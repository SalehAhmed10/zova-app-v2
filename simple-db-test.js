/**
 * Simple Database Test
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://wezgwqqdlwybadtvripr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indlemd3cXFkbHd5YmFkdHZyaXByIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0MjU0NDgsImV4cCI6MjA3MDAwMTQ0OH0.qlk1-Cg8UXdoCxVtW14mPKZxRo3xA5Zj9DF382OMSDs';

const supabase = createClient(supabaseUrl, supabaseKey);

async function simpleTest() {
  console.log('🔍 Simple Database Test...\n');

  try {
    // Test 1: Check profiles count
    const { count: profilesCount, error: profilesError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    if (profilesError) {
      console.error('❌ Profiles error:', profilesError.message);
    } else {
      console.log(`✅ Total profiles: ${profilesCount}`);
    }

    // Test 2: Check service categories
    const { data: categories, error: catError } = await supabase
      .from('service_categories')
      .select('id, name')
      .limit(5);

    if (catError) {
      console.error('❌ Categories error:', catError.message);
    } else {
      console.log(`✅ Sample categories: ${categories?.length || 0}`);
      categories?.forEach(cat => console.log(`   - ${cat.name}`));
    }

    // Test 3: Check providers
    const { data: providers, error: provError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, business_name, role')
      .eq('role', 'provider')
      .limit(3);

    if (provError) {
      console.error('❌ Providers error:', provError.message);
    } else {
      console.log(`✅ Sample providers: ${providers?.length || 0}`);
      providers?.forEach(prov => {
        const name = prov.business_name || `${prov.first_name} ${prov.last_name}`;
        console.log(`   - ${name}`);
      });
    }

    console.log('\n✅ Simple test complete!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

simpleTest();
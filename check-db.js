const { createClient } = require('@supabase/supabase-js');
const { SUPABASE_URL, SUPABASE_ANON_KEY } = require('dotenv').config().parsed;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkData() {
  console.log('Checking provider_services table...');
  const { data, error } = await supabase.from('provider_services').select('*').limit(5);
  console.log('Services:', data?.length || 0, 'records');
  if (data) console.log('Sample service:', JSON.stringify(data[0], null, 2));
  if (error) console.log('Error:', error.message);

  console.log('\nChecking profiles table for providers...');
  const { data: providers, error: pError } = await supabase.from('profiles').select('id, role, business_name').eq('role', 'provider').limit(5);
  console.log('Providers:', providers?.length || 0, 'records');
  if (providers) console.log('Sample provider:', JSON.stringify(providers[0], null, 2));
  if (pError) console.log('Error:', pError.message);
}

checkData();
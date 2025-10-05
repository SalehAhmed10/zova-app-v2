const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkCustomerProfile() {
  console.log('Checking customer profile: 605cc653-0f7e-40aa-95bc-1396b99f6390');

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', '605cc653-0f7e-40aa-95bc-1396b99f6390')
    .single();

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Customer profile:', JSON.stringify(data, null, 2));
  }

  process.exit(0);
}

checkCustomerProfile();
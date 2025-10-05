const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createProviderCustomerPolicy() {
  console.log('Creating RLS policy to allow providers to read customer profiles for their bookings...');
  
  try {
    // Create a policy that allows providers to read customer profiles 
    // only for customers who have bookings with them
    const policySQL = `
      CREATE POLICY "Providers can read customer profiles for their bookings" 
      ON profiles FOR SELECT 
      USING (
        role = 'customer' 
        AND id IN (
          SELECT customer_id 
          FROM bookings 
          WHERE provider_id = auth.uid()
        )
      );
    `;
    
    const { data, error } = await supabase.rpc('exec_sql', { sql: policySQL });
    
    if (error) {
      console.error('❌ Error creating policy:', error);
    } else {
      console.log('✅ Policy created successfully');
    }
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

createProviderCustomerPolicy();
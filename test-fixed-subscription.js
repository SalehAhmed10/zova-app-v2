const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://wezgwqqdlwybadtvripr.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indlemd3cXFkbHd5YmFkdHZyaXByIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0MjU0NDgsImV4cCI6MjA3MDAwMTQ0OH0.qlk1-Cg8UXdoCxVtW14mPKZxRo3xA5Zj9DF382OMSDs';

async function testSubscriptionCreation() {
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  
  // Use existing test user
  const testEmail = 'lm.ahmed1010@gmail.com';
  const testPassword = '@Password123';
  
  console.log('🔐 Signing in as test user...');
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: testEmail,
    password: testPassword,
  });
  
  if (authError) {
    console.error('❌ Auth error:', authError.message);
    return;
  }
  
  console.log('✅ Authenticated successfully as:', authData.user.email);
  console.log('User ID:', authData.user.id);
  
  // Test the fixed subscription creation
  console.log('\n📋 Testing fixed subscription creation...');
  
  const subscriptionData = {
    priceId: 'price_1SBWW4ENAHMeamEYNObfzeCr', // Customer SOS price from webhook config
  };
  
  console.log('Subscription data:', subscriptionData);
  
  try {
    const { data, error } = await supabase.functions.invoke('create-subscription', {
      body: subscriptionData,
    });
    
    if (error) {
      console.error('❌ Subscription creation error:', error);
      
      // Get the actual error response
      if (error.context && error.context.body) {
        const errorBody = await error.context.text();
        console.error('Error response body:', errorBody);
      }
      
      console.error('Error details:', JSON.stringify(error, null, 2));
    } else {
      console.log('✅ Subscription function response:', data);
      
      // Also check if the subscription was saved to the database
      console.log('\n🔍 Checking database for new subscription...');
      const { data: dbSubscriptions, error: dbError } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', authData.user.id)
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (dbError) {
        console.error('❌ Database check error:', dbError);
      } else {
        console.log('✅ Database subscription record:', dbSubscriptions);
      }
    }
  } catch (err) {
    console.error('❌ Unexpected error:', err);
  }
}

testSubscriptionCreation().catch(console.error);
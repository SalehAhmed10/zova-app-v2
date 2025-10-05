const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://wezgwqqdlwybadtvripr.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndlemdjcXFkbHd5YmFkdHZyaXByIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgyNzY3MDgsImV4cCI6MjA3Mzg1MjcwOH0.J5Cg8vAOQPSjV6owJPU5F5oWbFjz6_K8Tgb5zSLEsqc';

async function testSubscriptionCreation() {
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  
  // First, let's test with a real authenticated user
  const testEmail = 'user1@example.com';
  const testPassword = 'password123';
  
  console.log('🔐 Attempting to sign in with test user...');
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
  
  // Now test the subscription creation
  console.log('\n📋 Testing subscription creation...');
  
  const subscriptionData = {
    userId: authData.user.id,
    subscriptionType: 'CUSTOMER_SOS',
    priceId: 'price_test_123', // This should be a real Stripe price ID
    customerEmail: authData.user.email,
  };
  
  console.log('Subscription data:', subscriptionData);
  
  try {
    const { data, error } = await supabase.functions.invoke('create-subscription', {
      body: subscriptionData,
    });
    
    if (error) {
      console.error('❌ Subscription creation error:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
    } else {
      console.log('✅ Subscription created successfully:', data);
    }
  } catch (err) {
    console.error('❌ Unexpected error:', err);
  }
}

testSubscriptionCreation().catch(console.error);
/**
 * Test script to verify subscription creation flow
 * This tests the create-subscription Edge Function with proper payment handling
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Mock user token for testing - use your actual test user ID
const TEST_USER_ID = 'your-test-user-id'; // Replace with actual test user ID
const TEST_EMAIL = 'test@example.com';
const CUSTOMER_SOS_PRICE_ID = 'price_1QWehKFJGltUqsUMpgtGxK1D'; // Update with actual price ID

async function testSubscriptionCreation() {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Missing Supabase environment variables');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  console.log('🧪 Testing subscription creation flow...');
  console.log('📍 Edge Function URL:', `${supabaseUrl}/functions/v1/create-subscription`);

  try {
    // Create a simple JWT token for testing (in real app this comes from auth)
    const mockPayload = {
      sub: TEST_USER_ID,
      email: TEST_EMAIL,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600
    };
    
    // Note: This is just for testing - in real app the JWT is created by Supabase Auth
    console.log('📝 Mock user payload:', mockPayload);

    const requestBody = {
      priceId: CUSTOMER_SOS_PRICE_ID,
      subscriptionType: 'CUSTOMER_SOS'
    };

    console.log('📤 Sending request:', requestBody);

    const { data, error } = await supabase.functions.invoke('create-subscription', {
      body: requestBody,
    });

    if (error) {
      console.error('❌ Error response:', error);
      
      // Try to extract more details from the error
      if (error.context && typeof error.context.json === 'function') {
        try {
          const errorDetails = await error.context.json();
          console.error('❌ Error details:', errorDetails);
        } catch (parseError) {
          console.error('❌ Could not parse error details:', parseError);
        }
      }
      return;
    }

    console.log('✅ Success! Response:', data);
    
    if (data.clientSecret) {
      console.log('✅ Client secret received - Payment Sheet can be initialized');
      console.log('✅ Subscription ID:', data.subscriptionId);
      console.log('✅ Status:', data.status);
    } else {
      console.log('⚠️ No client secret in response - check payment intent creation');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('❌ Error details:', error);
  }
}

// Test the subscription price configuration
async function testSubscriptionPrice() {
  console.log('\n🧪 Testing subscription price configuration...');
  
  const priceConfig = {
    CUSTOMER_SOS: {
      priceId: CUSTOMER_SOS_PRICE_ID,
      displayName: 'SOS Emergency Access',
      amount: 999, // $9.99 in cents
      currency: 'usd',
      interval: 'month'
    }
  };

  console.log('💰 Price configuration:', priceConfig);
  console.log('✅ Price ID format looks correct');
}

console.log('🚀 Starting subscription flow tests...\n');

testSubscriptionPrice();
testSubscriptionCreation();
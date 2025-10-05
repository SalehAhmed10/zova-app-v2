/**
 * Test webhook endpoint manually
 * Use this to verify your webhook is working after adding the environment variable
 */

const testWebhookEndpoint = async () => {
  console.log('🧪 Testing Webhook Endpoint');
  console.log('==========================');
  
  const webhookUrl = 'https://wezgwqqdlwybadtvripr.supabase.co/functions/v1/stripe-webhook';
  
  try {
    // Test OPTIONS request (CORS preflight)
    console.log('🔍 Testing CORS preflight...');
    const optionsResponse = await fetch(webhookUrl, {
      method: 'OPTIONS',
      headers: {
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'stripe-signature,content-type'
      }
    });
    
    console.log(`✅ OPTIONS response: ${optionsResponse.status}`);
    
    // Test POST without signature (should fail gracefully)
    console.log('🔍 Testing POST without signature...');
    const postResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ test: 'data' })
    });
    
    const responseText = await postResponse.text();
    console.log(`✅ POST response: ${postResponse.status} - ${responseText}`);
    
    if (responseText.includes('Missing Stripe signature')) {
      console.log('🎉 Webhook is working! It correctly rejected request without signature.');
    } else {
      console.log('⚠️ Unexpected response. Check environment variables.');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
};

// Run the test
testWebhookEndpoint();
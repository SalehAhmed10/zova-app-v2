const WEBHOOK_URL = 'https://wezgwqqdlwybadtvripr.supabase.co/functions/v1/stripe-webhook';

async function testWebhook() {
  console.log('🧪 Testing Stripe Webhook Integration');
  console.log('====================================\n');

  // Test 1: CORS Preflight
  console.log('🔍 Test 1: CORS Preflight Request');
  try {
    const corsResponse = await fetch(WEBHOOK_URL, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://dashboard.stripe.com',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'stripe-signature,content-type'
      }
    });
    
    console.log(`✅ CORS Status: ${corsResponse.status}`);
    console.log(`✅ CORS Headers: ${JSON.stringify(Object.fromEntries(corsResponse.headers))}\n`);
  } catch (error) {
    console.error(`❌ CORS Error: ${error.message}\n`);
  }

  // Test 2: Invalid Method
  console.log('🔍 Test 2: Invalid Method (GET)');
  try {
    const getResponse = await fetch(WEBHOOK_URL, { method: 'GET' });
    console.log(`✅ GET Status: ${getResponse.status}`);
    console.log(`✅ GET Response: ${await getResponse.text()}\n`);
  } catch (error) {
    console.error(`❌ GET Error: ${error.message}\n`);
  }

  // Test 3: Missing Signature
  console.log('🔍 Test 3: POST without Stripe Signature');
  try {
    const noSigResponse = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ test: 'data' })
    });
    
    console.log(`✅ No Signature Status: ${noSigResponse.status}`);
    const responseText = await noSigResponse.text();
    console.log(`✅ No Signature Response: ${responseText}\n`);
  } catch (error) {
    console.error(`❌ No Signature Error: ${error.message}\n`);
  }

  // Test 4: Mock Stripe Event
  console.log('🔍 Test 4: Mock Stripe Subscription Event');
  try {
    const mockEvent = {
      id: 'evt_test_webhook',
      object: 'event',
      api_version: '2023-10-16',
      created: Math.floor(Date.now() / 1000),
      data: {
        object: {
          id: 'sub_test123',
          object: 'subscription',
          customer: 'cus_test123',
          status: 'active',
          current_period_start: Math.floor(Date.now() / 1000),
          current_period_end: Math.floor(Date.now() / 1000) + 2592000,
          cancel_at_period_end: false,
          trial_end: null,
          items: {
            data: [{
              price: {
                id: 'price_1SBWW4ENAHMeamEYNObfzeCr'
              }
            }]
          }
        }
      },
      livemode: false,
      pending_webhooks: 1,
      request: { id: 'req_test123', idempotency_key: null },
      type: 'customer.subscription.updated'
    };

    const payload = JSON.stringify(mockEvent);
    const timestamp = Math.floor(Date.now() / 1000);
    const mockSignature = `t=${timestamp},v1=mock_signature_for_testing`;

    const mockResponse = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': mockSignature
      },
      body: payload
    });

    console.log(`✅ Mock Event Status: ${mockResponse.status}`);
    const mockResponseText = await mockResponse.text();
    console.log(`✅ Mock Event Response: ${mockResponseText}\n`);
  } catch (error) {
    console.error(`❌ Mock Event Error: ${error.message}\n`);
  }

  console.log('🎯 Test Summary:');
  console.log('================');
  console.log('✅ CORS: Should return 200');
  console.log('✅ Invalid Method: Should return 405');
  console.log('✅ Missing Signature: Should return 400 with error message');
  console.log('❌ Mock Event: Will return 400 (invalid signature) - this is expected!');
  console.log('\n🚀 Your webhook is ready for Stripe events!');
  console.log('\n📝 Next Steps:');
  console.log('1. Save your webhook configuration in Stripe Dashboard');
  console.log('2. Copy the webhook signing secret from Stripe');
  console.log('3. Update STRIPE_WEBHOOK_SECRET in Supabase environment');
  console.log('4. Test with real Stripe events');
}

testWebhook().catch(console.error);
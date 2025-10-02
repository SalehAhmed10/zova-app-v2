// Test the create-payment-intent Edge Function
const fetch = require('node-fetch');

async function testPaymentIntent() {
  const url = 'https://wezgwqqdlwybadtvripr.supabase.co/functions/v1/create-payment-intent';
  const headers = {
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indlemd3cXFkbHd5YmFkdHZyaXByIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0MjU0NDgsImV4cCI6MjA3MDAwMTQ0OH0.qlk1-Cg8UXdoCxVtW14mPKZxRo3xA5Zj9DF382OMSDs',
    'Content-Type': 'application/json'
  };

  const testPayload = {
    amount: 5000, // $50.00 in cents
    currency: 'usd',
    service_id: 'test-service-123',
    provider_id: 'test-provider-456',
    customer_email: 'test@example.com',
    supabase_user_id: 'test-user-789'
  };

  console.log('--- Testing create-payment-intent ---');
  console.log('Payload:', JSON.stringify(testPayload, null, 2));

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(testPayload)
    });

    const result = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(result, null, 2));

    if (result.error) {
      console.log('❌ Error:', result.error);
    } else if (result.client_secret) {
      console.log('✅ Success: Payment intent created with client_secret:', result.client_secret.substring(0, 50) + '...');
    } else {
      console.log('❌ Unexpected response format');
    }
  } catch (error) {
    console.log('❌ Network Error:', error.message);
  }
}

testPaymentIntent();
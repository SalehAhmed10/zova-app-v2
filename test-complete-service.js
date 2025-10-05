const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://wezgwqqdlwybadtvripr.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indlemd3cXFkbHd5YmFkdHZyaXByIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0MjU0NDgsImV4cCI6MjA3MDAwMTQ0OH0.qlk1-Cg8UXdoCxVtW14mPKZxRo3xA5Zj9DF382OMSDs';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testCompleteService() {
  const bookingId = '1e3eb68e-834e-4852-beef-35de739f1759'; // Real booking with in_progress status and Stripe payment intent

  console.log('Testing complete-service function with booking:', bookingId);

  try {
    const response = await fetch('https://wezgwqqdlwybadtvripr.supabase.co/functions/v1/complete-service', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`
      },
      body: JSON.stringify({ booking_id: bookingId })
    });

    const text = await response.text();
    console.log('Response status:', response.status);
    console.log('Response body:', text);

  } catch (err) {
    console.error('Exception:', err);
  }
}

testCompleteService();
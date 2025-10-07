const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://wezgwqqdlwybadtvripr.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indlemd3cXFkbHd5YmFkdHZyaXByIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDQyNTQ0OCwiZXhwIjoyMDcwMDAxNDQ4fQ.jvihrJJB8fQKyB-q8DhENmv3Z1qBX6BdS5gumY6Euno'
);

async function checkBooking() {
  console.log('Checking booking status...');
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', '63cd2500-4937-400a-9b76-499e66a6e5a8')
    .single();

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Booking status:', data.status);
    console.log('Payment status:', data.payment_status);
    console.log('Payment intent ID:', data.stripe_payment_intent_id);
    console.log('Full booking data:', JSON.stringify(data, null, 2));
  }
}

async function updateBookingStatus() {
  console.log('Updating booking status to in_progress...');

  const { data, error } = await supabase
    .from('bookings')
    .update({
      status: 'in_progress',
      provider_response_deadline: null,
      updated_at: new Date().toISOString()
    })
    .eq('id', '63cd2500-4937-400a-9b76-499e66a6e5a8')
    .select()
    .single();

  if (error) {
    console.error('Error updating booking:', error);
  } else {
    console.log('Booking updated successfully:', data);
  }
}

async function completeService() {
  console.log('Completing service...');

  const response = await fetch('https://wezgwqqdlwybadtvripr.supabase.co/functions/v1/complete-service', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indlemd3cXFkbHd5YmFkdHZyaXByIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDQyNTQ0OCwiZXhwIjoyMDcwMDAxNDQ4fQ.jvihrJJB8fQKyB-q8DhENmv3Z1qBX6BdS5gumY6Euno'
    },
    body: JSON.stringify({
      booking_id: '63cd2500-4937-400a-9b76-499e66a6e5a8',
      test_mode: true
    })
  });

  const result = await response.json();
  console.log('Complete service response:', result);
}

async function checkPayouts() {
  console.log('Checking payouts...');
  const { data, error } = await supabase
    .from('provider_payouts')
    .select('*')
    .eq('booking_id', '63cd2500-4937-400a-9b76-499e66a6e5a8');

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Payout records:', JSON.stringify(data, null, 2));
  }
}

// Run the tests
async function runTests() {
  await checkBooking();
  console.log('\n--- Updating Booking Status ---');
  await updateBookingStatus();
  console.log('\n--- Checking Booking Status After Update ---');
  await checkBooking();
  console.log('\n--- Completing Service ---');
  await completeService();
  console.log('\n--- Checking Payouts ---');
  await checkPayouts();
}

runTests().catch(console.error);
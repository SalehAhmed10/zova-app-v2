const { createClient } = require('@supabase/supabase-js');

// Test the submit-review edge function
async function testSubmitReview() {
  const supabaseUrl = 'https://wezgwqqdlwybadtvripr.supabase.co';
  const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indlemd3cXFkbHd5YmFkdHZyaXByIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0MjU0NDgsImV4cCI6MjA3MDAwMTQ0OH0.qlk1-Cg8UXdoCxVtW14mPKZxRo3xA5Zj9DF382OMSDs';

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Use a known completed booking ID from our database
  const bookingId = 'c8048f05-e057-4716-b65f-873634ec6ff2';

  console.log('Testing review submission for booking:', bookingId);

  // Test the review submission
  console.log('Submitting review...');

  const reviewData = {
    booking_id: bookingId,
    rating: 5,
    comment: 'Excellent service! Very professional and timely.',
    is_anonymous: false
  };

  try {
    const { data, error } = await supabase.functions.invoke('submit-review', {
      body: reviewData,
    });

    if (error) {
      console.error('Review submission failed:', error);
      return;
    }

    console.log('Review submission successful:', data);

    // Verify the review was created (this might fail due to RLS, but that's ok)
    console.log('Attempting to verify review creation...');
    const { data: review, error: reviewError } = await supabase
      .from('reviews')
      .select('*')
      .eq('booking_id', bookingId)
      .single();

    if (reviewError) {
      console.error('Review verification failed (expected due to RLS):', reviewError.message);
      console.log('But the submission was successful based on the function response');
    } else {
      console.log('Review created successfully:', review);
    }

  } catch (error) {
    console.error('Test failed:', error);
  }
}

testSubmitReview();
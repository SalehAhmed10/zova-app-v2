import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

interface SubmitReviewRequest {
  booking_id: string;
  rating: number;
  comment?: string;
  is_anonymous?: boolean;
}

Deno.serve(async (req) => {
  console.log('=== SUBMIT REVIEW FUNCTION START ===');

  // Handle CORS
  if (req.method === 'OPTIONS') {
    console.log('OPTIONS request received');
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('Processing POST request');

    // Check environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    console.log('Environment check:');
    console.log('- SUPABASE_URL:', supabaseUrl ? 'Set' : 'Missing');
    console.log('- SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? 'Set' : 'Missing');

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Configuration error');
      return new Response(JSON.stringify({
        error: 'Configuration error'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 500
      });
    }

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const body: SubmitReviewRequest = await req.json();
    const { booking_id, rating, comment, is_anonymous = false } = body;

    console.log('Request body:', { booking_id, rating, comment, is_anonymous });

    // Validate required fields
    if (!booking_id || !rating) {
      return new Response(JSON.stringify({
        error: 'Booking ID and rating are required'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 400
      });
    }

    // Validate rating (1-5 stars)
    if (rating < 1 || rating > 5) {
      return new Response(JSON.stringify({
        error: 'Rating must be between 1 and 5'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 400
      });
    }

    // 1. Get booking details to verify it exists and is completed
    console.log('Fetching booking details...');
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        id,
        status,
        customer_id,
        provider_id,
        service_id
      `)
      .eq('id', booking_id)
      .single();

    if (bookingError || !booking) {
      console.error('Booking not found:', bookingError);
      return new Response(JSON.stringify({
        error: 'Booking not found'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 404
      });
    }

    console.log('Booking found:', {
      id: booking.id,
      status: booking.status,
      customer_id: booking.customer_id,
      provider_id: booking.provider_id
    });

    // 2. Check if booking is completed
    if (booking.status !== 'completed') {
      return new Response(JSON.stringify({
        error: 'Can only review completed services'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 400
      });
    }

    // 3. Check if review already exists for this booking
    console.log('Checking for existing review...');
    const { data: existingReview, error: reviewCheckError } = await supabase
      .from('reviews')
      .select('id')
      .eq('booking_id', booking_id)
      .single();

    if (existingReview) {
      return new Response(JSON.stringify({
        error: 'Review already exists for this booking'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 400
      });
    }

    // 4. Create the review
    console.log('Creating review...');
    const { data: review, error: reviewError } = await supabase
      .from('reviews')
      .insert({
        booking_id: booking_id,
        customer_id: booking.customer_id,
        provider_id: booking.provider_id,
        rating: rating,
        comment: comment || null,
        is_anonymous: is_anonymous,
      })
      .select()
      .single();

    if (reviewError) {
      console.error('Error creating review:', reviewError);
      return new Response(JSON.stringify({
        error: 'Failed to create review'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 500
      });
    }

    // 5. Update booking to mark review as submitted
    console.log('Updating booking review status...');
    const { error: updateError } = await supabase
      .from('bookings')
      .update({
        customer_review_submitted: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', booking_id);

    if (updateError) {
      console.error('Error updating booking:', updateError);
      // Don't fail the request for this - review was successful
    }

    // 6. Create notification for provider about new review
    console.log('Creating notification for provider...');
    await supabase
      .from('notifications')
      .insert({
        user_id: booking.provider_id,
        type: 'new_review',
        title: 'New Review Received',
        message: `You received a ${rating}-star review for a completed service.`,
        data: {
          booking_id: booking_id,
          review_id: review.id,
          rating: rating,
        },
      });

    console.log('=== SUBMIT REVIEW FUNCTION SUCCESS ===');

    return new Response(JSON.stringify({
      success: true,
      review_id: review.id,
      message: 'Review submitted successfully'
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    });

  } catch (error) {
    console.error('=== SUBMIT REVIEW FUNCTION ERROR ===');
    console.error('Error details:', error);

    return new Response(JSON.stringify({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 500
    });
  }
});
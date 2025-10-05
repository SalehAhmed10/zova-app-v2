import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};

interface DeclineBookingRequest {
  booking_id: string;
  reason?: string;
}

Deno.serve(async (req) => {
  console.log('=== DECLINE BOOKING FUNCTION START ===');

  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');

    if (!supabaseUrl || !supabaseServiceKey || !stripeSecretKey) {
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract JWT token and user info
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const jwt = authHeader.replace('Bearer ', '');
    let providerId: string;

    try {
      const jwtParts = jwt.split('.');
      const payload = JSON.parse(atob(jwtParts[1]));
      providerId = payload.sub;

      if (!providerId) {
        throw new Error('Invalid user ID in JWT');
      }
    } catch (error) {
      console.error('JWT parsing error:', error);
      return new Response(
        JSON.stringify({ error: 'Invalid authentication token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body = await req.json();
    const { booking_id, reason }: DeclineBookingRequest = body;

    if (!booking_id) {
      return new Response(
        JSON.stringify({ error: 'booking_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseService = createClient(supabaseUrl, supabaseServiceKey);

    // Get booking details and verify ownership
    const { data: booking, error: bookingError } = await supabaseService
      .from('bookings')
      .select('*, provider_id, customer_id, status, stripe_payment_intent_id')
      .eq('id', booking_id)
      .single();

    if (bookingError || !booking) {
      console.error('Booking not found:', bookingError);
      return new Response(
        JSON.stringify({ error: 'Booking not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify this provider owns the booking
    if (booking.provider_id !== providerId) {
      console.error('Provider does not own this booking');
      return new Response(
        JSON.stringify({ error: 'Unauthorized - not your booking' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check booking status
    if (booking.status !== 'pending') {
      return new Response(
        JSON.stringify({
          error: `Booking cannot be declined - current status: ${booking.status}`,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Process Stripe refund
    if (!booking.stripe_payment_intent_id) {
      console.error('No payment intent ID found for booking');
      return new Response(
        JSON.stringify({ error: 'No payment found for this booking' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Creating refund for payment intent:', booking.stripe_payment_intent_id);

    // Create Stripe refund
    const refundResponse = await fetch('https://api.stripe.com/v1/refunds', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        payment_intent: booking.stripe_payment_intent_id,
        reason: 'requested_by_customer', // Stripe refund reason
      }),
    });

    if (!refundResponse.ok) {
      const errorData = await refundResponse.json();
      console.error('Stripe refund failed:', errorData);
      return new Response(
        JSON.stringify({
          error: 'Failed to process refund',
          details: errorData.error?.message,
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const refund = await refundResponse.json();
    console.log('Refund created successfully:', refund.id);

    // Update booking status to declined
    const { data: updatedBooking, error: updateError } = await supabaseService
      .from('bookings')
      .update({
        status: 'declined',
        payment_status: 'refunded',
        declined_reason: reason || 'Provider declined booking',
        provider_response_deadline: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', booking_id)
      .select()
      .single();

    if (updateError) {
      console.error('Failed to update booking:', updateError);
      // Refund was successful, but DB update failed - this is critical
      return new Response(
        JSON.stringify({
          error: 'Refund processed but booking update failed',
          refund_id: refund.id,
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update payment_intents record
    await supabaseService
      .from('payment_intents')
      .update({
        status: 'refunded',
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_payment_intent_id', booking.stripe_payment_intent_id);

    // Update payments record
    await supabaseService
      .from('payments')
      .update({
        status: 'refunded',
        refunded_at: new Date().toISOString(),
      })
      .eq('booking_id', booking_id);

    // TODO: Send notification to customer about booking decline and refund
    console.log('Booking declined successfully:', booking_id);
    console.log('TODO: Send push notification to customer:', booking.customer_id);

    return new Response(
      JSON.stringify({
        success: true,
        booking: updatedBooking,
        refund_id: refund.id,
        message: 'Booking declined and refunded successfully',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Decline booking error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};

interface CancelBookingRequest {
  booking_id: string;
  reason?: string;
}

Deno.serve(async (req) => {
  console.log('=== CANCEL BOOKING FUNCTION START ===');

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
      console.error('Missing environment variables');
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
    let userId: string;

    try {
      const jwtParts = jwt.split('.');
      const payload = JSON.parse(atob(jwtParts[1]));
      userId = payload.sub;

      if (!userId) {
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
    const { booking_id, reason }: CancelBookingRequest = body;

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
      .select('*')
      .eq('id', booking_id)
      .single();

    if (bookingError || !booking) {
      console.error('Booking not found:', bookingError);
      return new Response(
        JSON.stringify({ error: 'Booking not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify authorization - customer or provider can cancel
    const isCustomer = booking.customer_id === userId;
    const isProvider = booking.provider_id === userId;

    if (!isCustomer && !isProvider) {
      console.error('User does not own this booking');
      return new Response(
        JSON.stringify({ error: 'Unauthorized - not your booking' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Allow cancellation only for pending and confirmed bookings
    if (!['pending', 'confirmed'].includes(booking.status)) {
      return new Response(
        JSON.stringify({
          error: `Booking cannot be cancelled - current status: ${booking.status}`,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[CancelBooking] Cancelling booking ${booking_id}, status: ${booking.status}`);

    // Process refund if payment was captured
    let refundId: string | null = null;

    if (booking.payment_intent_id && booking.payment_status !== 'refunded') {
      console.log(
        `[CancelBooking] Creating refund for payment intent: ${booking.payment_intent_id}`
      );

      try {
        const refundResponse = await fetch('https://api.stripe.com/v1/refunds', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${stripeSecretKey}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            payment_intent: booking.payment_intent_id,
            reason: 'requested_by_customer',
          }),
        });

        if (!refundResponse.ok) {
          const errorData = await refundResponse.json();
          console.error('[CancelBooking] Stripe refund failed:', errorData);
          return new Response(
            JSON.stringify({
              error: 'Failed to process refund',
              details: errorData.error?.message || 'Unknown error',
            }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const refund = await refundResponse.json();
        refundId = refund.id;
        console.log(`[CancelBooking] Refund created successfully: ${refundId}`);
      } catch (stripeError) {
        console.error('[CancelBooking] Stripe API error:', stripeError);
        return new Response(
          JSON.stringify({
            error: 'Failed to process refund',
            details: (stripeError as any)?.message || 'Unknown error',
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Update booking status to cancelled and payment status to refunded
    const { data: updatedBooking, error: updateError } = await supabaseService
      .from('bookings')
      .update({
        status: 'cancelled',
        payment_status: booking.payment_intent_id ? 'refunded' : booking.payment_status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', booking_id)
      .select()
      .single();

    if (updateError) {
      console.error('[CancelBooking] Failed to update booking:', updateError);
      return new Response(
        JSON.stringify({
          error: 'Failed to update booking status',
          details: updateError.message,
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update payment record to mark as refunded
    if (booking.payment_intent_id) {
      const { error: paymentUpdateError } = await supabaseService
        .from('payments')
        .update({
          status: 'refunded',
          refunded_at: new Date().toISOString(),
        })
        .eq('booking_id', booking_id);

      if (paymentUpdateError) {
        console.error('[CancelBooking] Failed to update payment record:', paymentUpdateError);
        // Don't fail the whole operation, just log it
      }
    }

    console.log(`✅ [CancelBooking] Booking cancelled successfully with refund: ${refundId}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Booking cancelled and customer refunded',
        booking: updatedBooking,
        refund_id: refundId,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('💥 [CancelBooking] Unexpected error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: (error as any)?.message || 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

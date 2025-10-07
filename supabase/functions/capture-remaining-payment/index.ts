import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

interface CaptureRemainingRequest {
  paymentIntentId: string;
  remainingAmount: number; // in pence
  bookingId: string;
}

Deno.serve(async (req) => {
  console.log('🔥 CAPTURE REMAINING PAYMENT FUNCTION START');

  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', // Service key for RLS bypass
    );

    const { paymentIntentId, remainingAmount, bookingId }: CaptureRemainingRequest = await req.json();

    // Validate required fields
    if (!paymentIntentId || !remainingAmount || !bookingId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: paymentIntentId, remainingAmount, bookingId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      return new Response(
        JSON.stringify({ error: 'Stripe configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('💰 Capturing remaining payment:', { paymentIntentId, remainingAmount, bookingId });

    // First, verify the booking exists and is in correct state
    const { data: booking, error: bookingError } = await supabaseClient
      .from('bookings')
      .select('id, payment_intent_id, payment_status, captured_deposit')
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      console.error('❌ Booking not found:', bookingError);
      return new Response(
        JSON.stringify({ error: 'Booking not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (booking.payment_intent_id !== paymentIntentId) {
      console.error('❌ PaymentIntent ID mismatch');
      return new Response(
        JSON.stringify({ error: 'PaymentIntent ID does not match booking' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Capture remaining amount using Stripe API
    const captureParams = new URLSearchParams({
      amount_to_capture: remainingAmount.toString(),
    });

    const captureResponse = await fetch(`https://api.stripe.com/v1/payment_intents/${paymentIntentId}/capture`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: captureParams,
    });

    if (!captureResponse.ok) {
      const errorData = await captureResponse.json();
      console.error('❌ Stripe remaining capture error:', errorData);
      
      // Update booking to reflect capture failure
      await supabaseClient
        .from('bookings')
        .update({
          payment_status: 'capture_failed',
          provider_notes: `Payment capture failed: ${errorData.error?.message || 'Unknown error'}`
        })
        .eq('id', bookingId);

      return new Response(
        JSON.stringify({ 
          error: 'Failed to capture remaining payment', 
          details: errorData.error?.message,
          bookingId: bookingId
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const captureData = await captureResponse.json();
    console.log('✅ Remaining payment captured successfully:', captureData.id);

    // Update booking record with successful capture
    const { error: updateError } = await supabaseClient
      .from('bookings')
      .update({
        remaining_to_capture: 0, // Set to 0 since it's now captured
        remaining_captured_at: new Date().toISOString(),
        payment_status: 'completed' // Fully paid
      })
      .eq('id', bookingId);

    if (updateError) {
      console.error('⚠️ Failed to update booking after successful capture:', updateError);
      // Don't fail the request - capture was successful
    } else {
      console.log('📝 Booking record updated with remaining capture details');
    }

    return new Response(
      JSON.stringify({
        success: true,
        captureId: captureData.id,
        amountCaptured: captureData.amount_received,
        totalAmountCaptured: captureData.amount_received, // This will be the full amount now
        status: captureData.status,
        paymentIntentId: paymentIntentId,
        bookingId: bookingId
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('💥 Error in capture-remaining-payment function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Try to update booking status to reflect the error
    try {
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      );
      
      const { bookingId } = await req.json();
      if (bookingId) {
        await supabaseClient
          .from('bookings')
          .update({
            payment_status: 'capture_failed',
            provider_notes: `Payment capture failed: ${errorMessage}`
          })
          .eq('id', bookingId);
      }
    } catch (updateError) {
      console.error('Failed to update booking status after error:', updateError);
    }
    
    return new Response(
      JSON.stringify({
        error: 'Internal server error during remaining payment capture',
        details: errorMessage
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
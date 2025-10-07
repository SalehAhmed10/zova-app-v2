import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

interface CaptureDepositRequest {
  paymentIntentId: string;
  depositAmount: number; // in pence
  bookingId?: string;
}

Deno.serve(async (req) => {
  console.log('🔥 CAPTURE DEPOSIT FUNCTION START');

  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', // Service key for RLS bypass
    );

    // Get auth user for validation
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { paymentIntentId, depositAmount, bookingId }: CaptureDepositRequest = await req.json();

    // Validate required fields
    if (!paymentIntentId || !depositAmount) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: paymentIntentId, depositAmount' }),
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

    console.log('💰 Capturing deposit:', { paymentIntentId, depositAmount, bookingId });

    // Capture deposit amount using Stripe API
    const captureParams = new URLSearchParams({
      amount_to_capture: depositAmount.toString(),
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
      console.error('❌ Stripe capture error:', errorData);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to capture deposit', 
          details: errorData.error?.message 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const captureData = await captureResponse.json();
    console.log('✅ Deposit captured successfully:', captureData.id);

    // Update booking record if bookingId provided
    if (bookingId) {
      const { error: dbError } = await supabaseClient
        .from('bookings')
        .update({
          payment_intent_id: paymentIntentId,
          captured_deposit: depositAmount,
          deposit_captured_at: new Date().toISOString(),
          payment_status: 'deposit_captured'
        })
        .eq('id', bookingId);

      if (dbError) {
        console.error('⚠️ Failed to update booking record:', dbError);
        // Don't fail the request - capture was successful
      } else {
        console.log('📝 Booking record updated with capture details');
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        captureId: captureData.id,
        amountCaptured: captureData.amount_received,
        status: captureData.status,
        paymentIntentId: paymentIntentId
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('💥 Error in capture-deposit function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return new Response(
      JSON.stringify({
        error: 'Internal server error during deposit capture',
        details: errorMessage
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
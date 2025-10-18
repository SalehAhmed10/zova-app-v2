import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

interface CaptureDepositRequest {
  paymentIntentId: string;
  totalAmount: number; // Full amount in pence (service + fee)
  providerAmount: number; // Provider's share in pence
  platformFee: number; // Platform commission in pence
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

    const { paymentIntentId, totalAmount, providerAmount, platformFee, bookingId }: CaptureDepositRequest = await req.json();

    // Validate required fields
    if (!paymentIntentId || !totalAmount || !providerAmount || !platformFee) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields: paymentIntentId, totalAmount, providerAmount, platformFee' 
        }),
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

    console.log('💰 Capturing FULL AMOUNT for escrow:', { 
      paymentIntentId, 
      totalAmount, 
      providerAmount, 
      platformFee, 
      bookingId 
    });

    // ✨ ESCROW SYSTEM: Capture FULL amount immediately (not just deposit)
    // This holds the entire payment in the platform account until service completion
    const captureParams = new URLSearchParams();
    // Empty params = capture full authorized amount (totalAmount)
    // This implements true escrow - full payment held until provider transfer

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
          error: 'Failed to capture payment for escrow', 
          details: errorData.error?.message 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const captureData = await captureResponse.json();
    console.log('✅ Full amount captured and held in escrow:', {
      captureId: captureData.id,
      amountCaptured: captureData.amount_received,
      status: captureData.status
    });

    // Update booking record with escrow tracking
    if (bookingId) {
      const capturedAmountDecimal = (captureData.amount_received / 100).toFixed(2);
      const providerAmountDecimal = (providerAmount / 100).toFixed(2);
      const platformFeeDecimal = (platformFee / 100).toFixed(2);

      const { error: dbError } = await supabaseClient
        .from('bookings')
        .update({
          payment_intent_id: paymentIntentId,
          payment_status: 'funds_held_in_escrow', // New status indicating escrow
          captured_amount: capturedAmountDecimal, // Total captured (£99.00)
          amount_held_for_provider: providerAmountDecimal, // Provider's share (£90.00)
          platform_fee_held: platformFeeDecimal, // Platform commission (£9.00)
          funds_held_at: new Date().toISOString(),
          // Keep legacy fields for backwards compatibility
          captured_deposit: captureData.amount_received,
          deposit_captured_at: new Date().toISOString(),
        })
        .eq('id', bookingId);

      if (dbError) {
        console.error('⚠️ Failed to update booking record:', dbError);
        // Don't fail the request - capture was successful
      } else {
        console.log('📝 Booking record updated with escrow tracking:', {
          capturedAmount: capturedAmountDecimal,
          providerAmount: providerAmountDecimal,
          platformFee: platformFeeDecimal,
          status: 'funds_held_in_escrow'
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        captureId: captureData.id,
        amountCaptured: captureData.amount_received, // Full amount in pence
        providerAmount: providerAmount, // Amount for provider
        platformFee: platformFee, // Platform commission
        status: captureData.status,
        paymentStatus: 'funds_held_in_escrow',
        paymentIntentId: paymentIntentId,
        message: 'Full payment captured and held in escrow until service completion'
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
        error: 'Internal server error during escrow capture',
        details: errorMessage
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// 🎯 ESCROW SYSTEM IMPLEMENTATION
// ================================
// This function implements a proper marketplace escrow system:
//
// 1. Captures FULL payment amount immediately (service price + platform fee)
// 2. Holds entire amount in platform Stripe account (escrow)
// 3. Tracks provider's share and platform commission separately
// 4. Updates booking status to 'funds_held_in_escrow'
// 5. Funds remain in escrow until service completion
// 6. At completion, provider receives their share via Stripe Connect transfer
// 7. Platform keeps commission automatically
//
// Benefits:
// - Single charge to customer (better UX)
// - Payment guaranteed for provider (no risk of failed second charge)
// - True escrow protection (funds held until service delivered)
// - Automatic commission collection
// - Compliant with marketplace requirements
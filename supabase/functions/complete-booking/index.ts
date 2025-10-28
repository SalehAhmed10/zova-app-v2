import { createClient } from 'npm:@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE'
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize clients and parse
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ 
        error: 'Missing env vars',
        has_url: !!supabaseUrl,
        has_key: !!serviceRoleKey,
        v: 22
      }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    
    const supabaseClient = createClient(supabaseUrl, serviceRoleKey);
    
    let body;
    try {
      body = await req.json();
    } catch (e) {
      return new Response(JSON.stringify({ 
        error: 'Parse error',
        msg: String(e),
        v: 22
      }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { bookingId } = body;
    if (!bookingId) {
      return new Response(JSON.stringify({ error: 'bookingId required', v: 22 }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Fetch booking
    const { data: booking, error: bookingErr } = await supabaseClient
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single();

    if (bookingErr || !booking) {
      return new Response(JSON.stringify({
        error: 'Booking not found',
        err: bookingErr?.message,
        v: 22
      }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Validate status
    if (booking.status !== 'in_progress' && booking.status !== 'confirmed') {
      return new Response(JSON.stringify({
        error: `Invalid booking status: ${booking.status}`,
        v: 22
      }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Validate payment
    if (booking.payment_status !== 'funds_held_in_escrow' && booking.payment_status !== 'paid') {
      return new Response(JSON.stringify({
        error: `Invalid payment status: ${booking.payment_status}`,
        v: 22
      }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Fetch provider
    const { data: provider, error: providerErr } = await supabaseClient
      .from('profiles')
      .select('id, stripe_account_id')
      .eq('id', booking.provider_id)
      .single();

    if (providerErr || !provider) {
      return new Response(JSON.stringify({
        error: 'Provider not found',
        err: providerErr?.message,
        v: 22
      }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (!provider.stripe_account_id) {
      return new Response(JSON.stringify({
        error: 'No stripe account for provider',
        v: 22
      }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ✅ v23: Fetch payment intent which contains the Stripe charge ID
    // This is the KEY to the solution - we need the charge ID as source_transaction for transfers
    const { data: paymentIntent, error: piErr } = await supabaseClient
      .from('payment_intents')
      .select('stripe_payment_intent_id, id')
      .eq('booking_id', bookingId)
      .single();

    let sourceChargeId: string | undefined;
    if (paymentIntent && paymentIntent.stripe_payment_intent_id) {
      console.log('[v23] Found PaymentIntent ID:', paymentIntent.stripe_payment_intent_id);
      
      // ✅ NEW: Fetch from Stripe API to get the charge ID
      // When a payment intent is succeeded, it has a latest_charge that contains the actual charge
      const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
      if (stripeSecretKey) {
        const piResponse = await fetch(
          `https://api.stripe.com/v1/payment_intents/${paymentIntent.stripe_payment_intent_id}`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${stripeSecretKey}`
            }
          }
        );
        
        if (piResponse.ok) {
          const piData = await piResponse.json();
          if (piData.latest_charge) {
            sourceChargeId = piData.latest_charge;
            console.log('[v23] ✅ Found charge ID from PaymentIntent:', sourceChargeId);
          }
        } else {
          console.log('[v23] Could not fetch PaymentIntent from Stripe');
        }
      }
    } else {
      console.log('[v23] Warning: No payment intent found, transfer may fail if platform balance insufficient');
    }

    // Create Stripe transfer with source_transaction to handle insufficient balance
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      return new Response(JSON.stringify({
        error: 'Stripe key missing',
        v: 23
      }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const amountInPence = Math.round(parseFloat(booking.amount_held_for_provider || '0') * 100);
    
    const params = new URLSearchParams({
      amount: amountInPence.toString(),
      currency: 'gbp',
      destination: provider.stripe_account_id,
      description: `Booking ${bookingId} - Provider payout`
    });

    // ✅ v23 FIX: Use source_transaction to link transfer to the original captured charge
    // This allows the transfer to succeed even if platform available balance is temporarily low
    // The transfer will use the charge's funds which are held in escrow
    if (sourceChargeId) {
      params.append('source_transaction', sourceChargeId);
      console.log('[v23] 🔗 Transfer linked to charge:', sourceChargeId);
    } else {
      console.log('[v23] ⚠️ No charge ID - transfer may fail without source_transaction');
    }

    const stripeResponse = await fetch('https://api.stripe.com/v1/transfers', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });

    if (!stripeResponse.ok) {
      let stripeErr;
      try {
        stripeErr = await stripeResponse.json();
      } catch {
        stripeErr = { error: 'Could not parse stripe error' };
      }
      
      const stripeErrorCode = stripeErr.error?.code;
      const stripeErrorMsg = stripeErr.error?.message || String(stripeErr);
      
      console.log('[v23] ❌ Transfer failed, error code:', stripeErrorCode);
      console.log('[v23] Full error:', stripeErr);
      
      // Return actual error with debug info
      return new Response(JSON.stringify({
        error: 'Stripe transfer failed',
        stripeStatus: stripeResponse.status,
        stripeCode: stripeErrorCode,
        stripeErr: stripeErrorMsg,
        debug: {
          amount: amountInPence,
          destination: provider.stripe_account_id,
          sourceCharge: sourceChargeId || 'none',
          fullError: stripeErr
        },
        v: 23
      }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const transferData = await stripeResponse.json();

    // Update booking
    const { error: updateErr } = await supabaseClient
      .from('bookings')
      .update({
        status: 'completed',
        payment_status: 'payout_completed',
        provider_transfer_id: transferData.id,
        provider_paid_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', bookingId);

    if (updateErr) {
      console.error('[v23] Update error:', updateErr);
      // Non-fatal - transfer succeeded
    }

    // ✅ v24 FIX: Record payout in provider_payouts table for earnings tracking
    const providerAmountInPounds = (amountInPence / 100).toFixed(2);
    const { error: payoutErr } = await supabaseClient
      .from('provider_payouts')
      .insert({
        provider_id: booking.provider_id,
        booking_id: booking.id,
        stripe_transfer_id: transferData.id,
        amount: providerAmountInPounds,
        currency: 'GBP',
        status: 'completed',
        actual_payout_date: new Date().toISOString().split('T')[0],
        created_at: new Date().toISOString()
      });

    if (payoutErr) {
      console.warn('[v24] ⚠️ Failed to record payout:', payoutErr);
      // Non-fatal - transfer succeeded, payout record is just for analytics
    } else {
      console.log('[v24] ✅ Payout recorded for provider:', booking.provider_id);
    }

      return new Response(JSON.stringify({
        success: true,
        message: 'Booking completed',
        bookingId: booking.id,
        transferId: transferData.id,
        amount: transferData.amount,
        payoutRecorded: !payoutErr,
        v: 24
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error && error.stack ? error.stack.substring(0, 500) : 'N/A';
    
    return new Response(JSON.stringify({
      error: 'Unexpected error',
      message: msg,
      stack: stack,
      v: 23
    }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});

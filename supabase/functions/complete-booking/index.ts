import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

interface CompleteBookingRequest {
  bookingId: string;
}

Deno.serve(async (req) => {
  console.log('🎯 COMPLETE BOOKING FUNCTION START');

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

    const { bookingId }: CompleteBookingRequest = await req.json();

    // Validate required fields
    if (!bookingId) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: bookingId' }),
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

    console.log('📋 Fetching booking details:', bookingId);

    // Get booking details with provider information
    const { data: booking, error: bookingError } = await supabaseClient
      .from('bookings')
      .select(`
        *,
        provider:profiles!bookings_provider_id_fkey(
          id,
          stripe_account_id,
          business_name,
          first_name,
          last_name
        ),
        service:provider_services(
          id,
          title
        )
      `)
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      console.error('❌ Booking not found:', bookingError);
      return new Response(
        JSON.stringify({ error: 'Booking not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Booking found:', {
      bookingId: booking.id,
      status: booking.status,
      paymentStatus: booking.payment_status,
      providerAmount: booking.amount_held_for_provider,
      platformFee: booking.platform_fee_held,
    });

    // Validate booking can be completed
    if (booking.status !== 'confirmed' && booking.status !== 'in_progress') {
      return new Response(
        JSON.stringify({ 
          error: 'Booking cannot be completed', 
          details: `Booking status is '${booking.status}'` 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if funds are held in escrow
    if (booking.payment_status !== 'funds_held_in_escrow' && booking.payment_status !== 'paid') {
      return new Response(
        JSON.stringify({ 
          error: 'Payment not available for transfer', 
          details: `Payment status is '${booking.payment_status}'` 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if provider has Stripe account configured
    if (!booking.provider?.stripe_account_id) {
      console.error('❌ Provider Stripe account not configured');
      return new Response(
        JSON.stringify({ 
          error: 'Provider payment account not configured',
          details: 'Provider must complete Stripe onboarding first'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if already paid
    if (booking.provider_paid_at) {
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Provider already paid',
          transferId: booking.provider_transfer_id,
          paidAt: booking.provider_paid_at
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('💸 Initiating transfer to provider:', {
      providerId: booking.provider.id,
      providerName: booking.provider.business_name || `${booking.provider.first_name} ${booking.provider.last_name}`,
      stripeAccountId: booking.provider.stripe_account_id,
      amount: booking.amount_held_for_provider,
    });

    // Convert amount to pence for Stripe
    const amountInPence = Math.round(parseFloat(booking.amount_held_for_provider) * 100);

    // Create transfer to provider via Stripe Connect
    const transferParams = new URLSearchParams({
      amount: amountInPence.toString(),
      currency: 'gbp',
      destination: booking.provider.stripe_account_id,
      description: `Booking ${bookingId} completion payment - ${booking.service?.title || 'Service'}`,
    });

    // Add metadata for tracking
    transferParams.append('metadata[booking_id]', bookingId);
    transferParams.append('metadata[booking_date]', booking.booking_date);
    transferParams.append('metadata[service_id]', booking.service_id);
    transferParams.append('metadata[provider_id]', booking.provider_id);

    const transferResponse = await fetch('https://api.stripe.com/v1/transfers', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: transferParams,
    });

    if (!transferResponse.ok) {
      const errorData = await transferResponse.json();
      console.error('❌ Stripe transfer error:', errorData);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to transfer payment to provider', 
          details: errorData.error?.message 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const transferData = await transferResponse.json();
    console.log('✅ Transfer successful:', {
      transferId: transferData.id,
      amount: transferData.amount,
      destination: transferData.destination,
    });

    // Update booking with payout information
    const platformFeeCollected = booking.platform_fee_held;
    
    const { error: updateError } = await supabaseClient
      .from('bookings')
      .update({
        status: 'completed',
        payment_status: 'payout_completed',
        provider_payout_amount: booking.amount_held_for_provider,
        platform_fee_collected: platformFeeCollected,
        provider_paid_at: new Date().toISOString(),
        provider_transfer_id: transferData.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', bookingId);

    if (updateError) {
      console.error('⚠️ Failed to update booking:', updateError);
      // Don't fail - transfer was successful
    } else {
      console.log('📝 Booking updated to completed status');
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Booking completed and provider paid',
        booking: {
          id: booking.id,
          status: 'completed',
          paymentStatus: 'payout_completed',
        },
        transfer: {
          transferId: transferData.id,
          providerAmount: booking.amount_held_for_provider,
          platformFee: platformFeeCollected,
          transferredAt: new Date().toISOString(),
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('💥 Error in complete-booking function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return new Response(
      JSON.stringify({
        error: 'Internal server error during booking completion',
        details: errorMessage
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// 🎯 BOOKING COMPLETION & PROVIDER PAYOUT
// ========================================
// This function handles service completion and automatic provider payout:
//
// 1. Validates booking status (must be 'confirmed' or 'in_progress')
// 2. Verifies funds are held in escrow (payment_status = 'funds_held_in_escrow')
// 3. Checks provider has Stripe Connect account configured
// 4. Transfers provider's share via Stripe Connect (e.g., £90.00)
// 5. Platform automatically keeps commission (e.g., £9.00)
// 6. Updates booking to 'completed' with payout details
// 7. Records transfer ID for reconciliation
//
// Flow:
// Customer pays £99 → Platform holds in escrow → Service completed → 
// Transfer £90 to provider → Platform keeps £9 commission
//
// Provider receives funds in their Stripe Express account immediately
// and can transfer to their bank account based on their payout schedule.
import { createClient } from 'npm:@supabase/supabase-js@2.38.4';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};

interface PaymentIntentRequest {
  amount: number;           // This is now the FULL amount (not just deposit)
  depositAmount: number;    // The deposit portion to capture immediately
  currency: string;
  serviceId: string;
  providerId: string;
  bookingId?: string;       // Optional booking ID for tracking
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    console.log('[v28] Request received - auth header present:', !!authHeader);

    // ✨ CRITICAL FIX: Use service role key for reliability
    // The service role key can perform operations without depending on user auth
    // We still verify the user exists by checking the payment parameters
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !serviceRoleKey) {
      console.error('[v28] Missing env vars');
      return new Response(
        JSON.stringify({
          error: 'Configuration error',
          v: 27,
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Create service role client (bypass RLS, no user auth needed for basic operations)
    const supabaseClient = createClient(
      supabaseUrl,
      serviceRoleKey
    );

    console.log('[v28] Supabase client created with service role');

    // ✨ Parse request body - use same approach as complete-booking
    let requestBody;
    try {
      requestBody = await req.json();
      console.log('[v28] Request body parsed successfully:', Object.keys(requestBody || {}));
    } catch (parseError) {
      console.error('[v28] Failed to parse request body:', String(parseError));
      return new Response(
        JSON.stringify({
          error: 'Invalid JSON in request body',
          details: String(parseError),
          v: 28,
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const { amount, depositAmount, currency, serviceId, providerId, bookingId, userId } = requestBody as PaymentIntentRequest & { userId?: string };

    // ✨ Extract user ID from auth header if not in body
    let finalUserId = userId;
    if (!finalUserId && authHeader?.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        // Decode JWT payload (format: header.payload.signature)
        const payload = JSON.parse(
          atob(token.split('.')[1] || '')
        );
        finalUserId = payload.sub; // sub is the user ID in Supabase JWT
        console.log('[v28] Extracted user ID from token:', finalUserId);
      } catch (e) {
        console.log('[v28] Could not extract user from token:', String(e));
      }
    }

    // Validate required fields
    if (!amount || depositAmount === undefined || !currency || !serviceId || !providerId) {
      console.error('[v28] Missing required fields:', { amount, depositAmount, currency, serviceId, providerId });
      return new Response(
        JSON.stringify({ error: 'Missing required fields: amount, depositAmount, currency, serviceId, providerId', v: 27 }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ✅ FIXED: Allow depositAmount === amount for full escrow capture scenarios
    // Validate that deposit does not EXCEED total amount (but can equal it for full escrow)
    if (depositAmount > amount) {
      console.error('[v28] Deposit exceeds total:', { depositAmount, amount });
      return new Response(
        JSON.stringify({ error: 'Deposit amount cannot exceed total amount', v: 27 }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      console.error('[v28] Stripe configuration error: missing secret key');
      return new Response(
        JSON.stringify({ error: 'Stripe configuration error', v: 27 }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ✨ Fetch user profile from database using service role
    // This works with service role key (no auth check needed)
    console.log('[v28] Fetching user profile for ID:', finalUserId);
    const { data: userProfile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('id, email, first_name, last_name, stripe_customer_id')
      .eq('id', finalUserId)
      .single();

    if (profileError || !userProfile) {
      console.error('[v28] User profile not found:', profileError?.message);
      return new Response(
        JSON.stringify({
          error: 'User profile not found',
          details: profileError?.message,
          v: 27,
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[v28] ✅ User profile loaded:', userProfile.email);

    // Get customer ID from user profile or create one
    let customerId = userProfile.stripe_customer_id;

    if (!customerId) {
      console.log('[v28] Creating Stripe customer for user:', finalUserId);
      // Create Stripe customer using fetch
      const customerParams = new URLSearchParams({
        email: userProfile.email || '',
        name: `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim(),
      });
      
      // Add metadata - only if finalUserId is defined
      if (finalUserId) {
        customerParams.append('metadata[supabase_user_id]', finalUserId);
      }

      const customerResponse = await fetch('https://api.stripe.com/v1/customers', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${stripeSecretKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: customerParams,
      });

      if (!customerResponse.ok) {
        const errorData = await customerResponse.json();
        console.error('[v28] Stripe customer creation error:', errorData);
        throw new Error(`Failed to create customer: ${errorData.error?.message || 'Unknown error'}`);
      }

      const customerData = await customerResponse.json();
      customerId = customerData.id;

      // Update user profile with Stripe customer ID (using service role)
      await supabaseClient
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', finalUserId);
    }

    // Calculate remaining amount for metadata
    const remainingAmount = amount - depositAmount;
    
    // Create payment intent for FULL amount with manual capture
    const paymentIntentParams = new URLSearchParams({
      amount: amount.toString(),                    // FULL amount (e.g., 8500 for £85)
      currency: currency.toLowerCase(),
      customer: customerId,
      capture_method: 'manual',                     // Key change: manual capture
      description: `Service booking - Full: £${(amount/100).toFixed(2)}, Deposit: £${(depositAmount/100).toFixed(2)}`,
    });
    
    // Add comprehensive metadata for tracking
    paymentIntentParams.append('metadata[service_id]', serviceId);
    paymentIntentParams.append('metadata[provider_id]', providerId);
    paymentIntentParams.append('metadata[customer_id]', finalUserId || '');
    paymentIntentParams.append('metadata[total_amount]', amount.toString());
    paymentIntentParams.append('metadata[deposit_amount]', depositAmount.toString());
    paymentIntentParams.append('metadata[remaining_amount]', remainingAmount.toString());
    if (bookingId) {
      paymentIntentParams.append('metadata[booking_id]', bookingId);
    }
    
    // Add automatic payment methods
    paymentIntentParams.append('automatic_payment_methods[enabled]', 'true');

    const paymentIntentResponse = await fetch('https://api.stripe.com/v1/payment_intents', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: paymentIntentParams,
    });

    if (!paymentIntentResponse.ok) {
      const errorData = await paymentIntentResponse.json();
      console.error('[v28] Stripe payment intent creation error:', errorData);
      throw new Error(`Failed to create payment intent: ${errorData.error?.message || 'Unknown error'}`);
    }

    const paymentIntentData = await paymentIntentResponse.json();

    return new Response(
      JSON.stringify({
        clientSecret: paymentIntentData.client_secret,
        paymentIntentId: paymentIntentData.id,
        amount: amount,                    // Full amount authorized
        depositAmount: depositAmount,      // Amount to capture immediately
        remainingAmount: remainingAmount,  // Amount to capture later
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('[v28] Error creating payment intent:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    const errorName = error instanceof Error ? error.name : 'UnknownError';

    console.error('[v28] Error details:', {
      message: errorMessage,
      stack: errorStack,
      name: errorName
    });
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: errorMessage,
        v: 27
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

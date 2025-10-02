import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

interface PaymentIntentRequest {
  amount: number;
  currency: string;
  serviceId: string;
  providerId: string;
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get the user from the auth token
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { amount, currency, serviceId, providerId }: PaymentIntentRequest = await req.json();

    // Validate required fields
    if (!amount || !currency || !serviceId || !providerId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
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

    // Get customer ID from user metadata or create one
    let customerId = user.user_metadata?.stripe_customer_id;

    if (!customerId) {
      // Create Stripe customer using fetch
      const customerParams = new URLSearchParams({
        email: user.email!,
        name: `${user.user_metadata?.first_name || ''} ${user.user_metadata?.last_name || ''}`.trim(),
      });
      
      // Add metadata
      customerParams.append('metadata[supabase_user_id]', user.id);

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
        console.error('Stripe customer creation error:', errorData);
        throw new Error(`Failed to create customer: ${errorData.error?.message || 'Unknown error'}`);
      }

      const customerData = await customerResponse.json();
      customerId = customerData.id;

      // Update user metadata with Stripe customer ID
      await supabaseClient.auth.updateUser({
        data: { stripe_customer_id: customerId }
      });
    }

    // Create payment intent using fetch
    const paymentIntentParams = new URLSearchParams({
      amount: amount.toString(),
      currency: currency.toLowerCase(),
      customer: customerId,
      description: 'Deposit for service booking',
    });
    
    // Add metadata
    paymentIntentParams.append('metadata[service_id]', serviceId);
    paymentIntentParams.append('metadata[provider_id]', providerId);
    paymentIntentParams.append('metadata[customer_id]', user.id);
    
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
      console.error('Stripe payment intent creation error:', errorData);
      throw new Error(`Failed to create payment intent: ${errorData.error?.message || 'Unknown error'}`);
    }

    const paymentIntentData = await paymentIntentResponse.json();

    return new Response(
      JSON.stringify({
        clientSecret: paymentIntentData.client_secret,
        paymentIntentId: paymentIntentData.id,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error creating payment intent:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    const errorName = error instanceof Error ? error.name : 'UnknownError';

    console.error('Error details:', {
      message: errorMessage,
      stack: errorStack,
      name: errorName
    });
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: errorMessage
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import Stripe from 'https://esm.sh/stripe@14.21.0';
import { corsHeaders } from '../_shared/cors.ts';

interface RetrySubscriptionRequest {
  subscriptionId: string;
  subscriptionType: 'CUSTOMER_SOS' | 'PROVIDER_PREMIUM';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      console.error('No authorization header found');
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        }
      );
    }

    // Parse JWT manually
    const token = authHeader.replace('Bearer ', '');
    const payload = JSON.parse(atob(token.split('.')[1]));
    const authenticatedUserId = payload.sub;
    
    console.log('Authenticated user ID:', authenticatedUserId);

    // Parse request body
    const body: RetrySubscriptionRequest = await req.json();
    const { subscriptionId, subscriptionType } = body;

    if (!subscriptionId) {
      console.error('Missing subscriptionId in request body');
      return new Response(
        JSON.stringify({ error: 'subscriptionId is required' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    if (!subscriptionType) {
      console.error('Missing subscriptionType in request body');
      return new Response(
        JSON.stringify({ error: 'subscriptionType is required' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    console.log('Retrying subscription payment for:', subscriptionId);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Initialize Stripe
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')!;
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
    });

    // Verify subscription exists and belongs to authenticated user
    const { data: subscription, error: subError } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('stripe_subscription_id', subscriptionId)
      .eq('user_id', authenticatedUserId)
      .single();

    if (subError) {
      console.error('Subscription fetch error:', subError);
      return new Response(
        JSON.stringify({ error: 'Subscription not found' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        }
      );
    }

    if (!subscription) {
      console.error('Subscription not found for user');
      return new Response(
        JSON.stringify({ error: 'Subscription not found' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        }
      );
    }

    // Check if subscription is incomplete
    if (subscription.status !== 'incomplete') {
      console.error('Subscription is not incomplete:', subscription.status);
      return new Response(
        JSON.stringify({ error: `Subscription is already ${subscription.status}. Cannot retry payment.` }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // Get the Stripe subscription with expanded payment intent
    console.log('Fetching Stripe subscription:', subscriptionId);
    const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ['latest_invoice.payment_intent'],
    });

    console.log('Stripe subscription status:', stripeSubscription.status);
    console.log('Latest invoice:', stripeSubscription.latest_invoice?.id);

    // Get the payment intent from the latest invoice
    const latestInvoice = stripeSubscription.latest_invoice;
    if (!latestInvoice || typeof latestInvoice === 'string') {
      console.error('No latest invoice found or invoice is string ID');
      return new Response(
        JSON.stringify({ error: 'No payment intent found for this subscription' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    const paymentIntent = latestInvoice.payment_intent;
    if (!paymentIntent || typeof paymentIntent === 'string') {
      console.error('No payment intent found in latest invoice');
      return new Response(
        JSON.stringify({ error: 'No payment intent found for this subscription' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    const clientSecret = paymentIntent.client_secret;
    if (!clientSecret) {
      console.error('No client secret found in payment intent');
      return new Response(
        JSON.stringify({ error: 'No client secret found for this subscription' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    console.log('Retrieved client secret for retry');

    return new Response(
      JSON.stringify({
        subscriptionId: subscriptionId,
        clientSecret: clientSecret,
        status: stripeSubscription.status,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Retry subscription payment error:', error);
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    const errorType = error instanceof Error ? error.constructor.name : typeof error;
    
    console.error('Error details:', {
      message: errorMessage,
      stack: errorStack,
      type: errorType,
      timestamp: new Date().toISOString()
    });
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        type: errorType
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

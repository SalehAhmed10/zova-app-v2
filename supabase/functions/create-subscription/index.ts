import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import Stripe from 'https://esm.sh/stripe@14.21.0';
import { corsHeaders } from '../_shared/cors.ts';

interface SubscriptionRequest {
  priceId: string;
  subscriptionType: 'CUSTOMER_SOS' | 'PROVIDER_PREMIUM';
  successUrl?: string;
  cancelUrl?: string;
}

interface SubscriptionData {
  id: string;
  status: string;
  current_period_end: number;
  customer: string;
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

    // Parse JWT manually (following established pattern from create-booking)
    const token = authHeader.replace('Bearer ', '');
    const payload = JSON.parse(atob(token.split('.')[1]));
    const authenticatedUserId = payload.sub;
    
    console.log('Authenticated user ID:', authenticatedUserId);

    // Parse request body
    const body: SubscriptionRequest = await req.json();
    const { priceId, subscriptionType, successUrl, cancelUrl } = body;

    if (!priceId) {
      console.error('Missing priceId in request body');
      return new Response(
        JSON.stringify({ error: 'priceId is required' }),
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

    // Map subscription type to database value
    const dbSubscriptionType = subscriptionType === 'CUSTOMER_SOS' ? 'customer_sos' : 'provider_premium';

    console.log('Creating subscription for priceId:', priceId);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Initialize Stripe
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')!;
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
    });

    // Get or create Stripe customer
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_customer_id, email, first_name, last_name')
      .eq('id', authenticatedUserId)
      .single();

    if (profileError) {
      console.error('Profile fetch error:', profileError);
      throw new Error(`Failed to fetch user profile: ${profileError.message}`);
    }

    let customerId = profile.stripe_customer_id;

    if (!customerId) {
      // Create Stripe customer
      console.log('Creating new Stripe customer');
      const customer = await stripe.customers.create({
        email: profile.email,
        name: `${profile.first_name} ${profile.last_name}`.trim(),
        metadata: {
          supabase_user_id: authenticatedUserId,
        },
      });
      customerId = customer.id;

      // Update profile with Stripe customer ID
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', authenticatedUserId);

      if (updateError) {
        console.error('Profile update error:', updateError);
        throw new Error(`Failed to update profile: ${updateError.message}`);
      }
    }

    // Create Stripe subscription with proper payment handling
    console.log('Creating Stripe subscription');
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      metadata: {
        supabase_user_id: authenticatedUserId,
      },
      payment_behavior: 'default_incomplete',
      payment_settings: {
        save_default_payment_method: 'on_subscription',
      },
      expand: ['latest_invoice.payment_intent'],
    });

    console.log('Stripe subscription created:', subscription.id);

    // Store subscription in database
    const subscriptionData: SubscriptionData = {
      id: subscription.id,
      status: subscription.status,
      current_period_end: subscription.current_period_end,
      customer: customerId,
    };

    const { error: dbError } = await supabase
      .from('user_subscriptions')
      .upsert({
        user_id: authenticatedUserId,
        stripe_subscription_id: subscription.id,
        type: dbSubscriptionType,
        stripe_customer_id: customerId,
        price_id: priceId,
        status: subscription.status,
        current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        cancel_at_period_end: subscription.cancel_at_period_end || false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

    if (dbError) {
      console.error('Database error:', dbError);
      throw new Error(`Failed to store subscription: ${dbError.message}`);
    }

    console.log('Subscription stored in database successfully');

    // Get client secret for payment
    const clientSecret = subscription.latest_invoice?.payment_intent?.client_secret;
    
    if (!clientSecret) {
      throw new Error('No payment intent client secret found in subscription');
    }

    return new Response(
      JSON.stringify({
        subscriptionId: subscription.id,
        clientSecret: clientSecret,
        status: subscription.status,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Create subscription error:', error);
    
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
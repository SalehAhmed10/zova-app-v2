import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { userId, subscriptionType, priceId, customerEmail } = await req.json();

    if (!userId || !subscriptionType || !priceId) {
      throw new Error('Missing required parameters');
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      throw new Error('User profile not found');
    }

    // Create Stripe customer if doesn't exist
    let customerId = profile.stripe_customer_id;
    if (!customerId) {
      const customer = await fetch('https://api.stripe.com/v1/customers', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${stripeSecretKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          email: customerEmail || profile.email,
          name: `${profile.first_name} ${profile.last_name}`.trim(),
          metadata: JSON.stringify({
            user_id: userId,
            subscription_type: subscriptionType,
          }),
        }),
      });

      if (!customer.ok) {
        const error = await customer.text();
        throw new Error(`Failed to create Stripe customer: ${error}`);
      }

      const customerData = await customer.json();
      customerId = customerData.id;

      // Update profile with Stripe customer ID
      await supabase
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', userId);
    }

    // Create subscription
    const subscription = await fetch('https://api.stripe.com/v1/subscriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        customer: customerId,
        'items[0][price]': priceId,
        'payment_behavior': 'default_incomplete',
        'payment_settings[save_default_payment_method]': 'on_subscription',
        'expand[]': 'latest_invoice.payment_intent',
        'metadata[user_id]': userId,
        'metadata[subscription_type]': subscriptionType,
      }),
    });

    if (!subscription.ok) {
      const error = await subscription.text();
      throw new Error(`Failed to create subscription: ${error}`);
    }

    const subscriptionData = await subscription.json();

    // Save subscription to database
    const { error: insertError } = await supabase
      .from('user_subscriptions')
      .insert({
        user_id: userId,
        stripe_subscription_id: subscriptionData.id,
        type: subscriptionType === 'CUSTOMER_SOS' ? 'customer_sos' : 'provider_premium',
        status: subscriptionData.status,
        current_period_start: new Date(subscriptionData.current_period_start * 1000).toISOString(),
        current_period_end: new Date(subscriptionData.current_period_end * 1000).toISOString(),
        trial_end: subscriptionData.trial_end ? new Date(subscriptionData.trial_end * 1000).toISOString() : null,
        cancel_at_period_end: subscriptionData.cancel_at_period_end,
      });

    if (insertError) {
      // If subscription creation in DB fails, cancel the Stripe subscription
      await fetch(`https://api.stripe.com/v1/subscriptions/${subscriptionData.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${stripeSecretKey}`,
        },
      });
      throw new Error(`Failed to save subscription: ${insertError.message}`);
    }

    return new Response(
      JSON.stringify({
        subscriptionId: subscriptionData.id,
        clientSecret: subscriptionData.latest_invoice?.payment_intent?.client_secret,
        status: subscriptionData.status,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Create subscription error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
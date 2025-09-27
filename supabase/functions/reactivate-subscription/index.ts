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
    const { subscriptionId } = await req.json();

    if (!subscriptionId) {
      throw new Error('Subscription ID is required');
    }

    // Get subscription from database
    const { data: subscription, error: subscriptionError } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('stripe_subscription_id', subscriptionId)
      .single();

    if (subscriptionError || !subscription) {
      throw new Error('Subscription not found');
    }

    // Reactivate subscription in Stripe (remove cancel_at_period_end)
    const stripeResponse = await fetch(`https://api.stripe.com/v1/subscriptions/${subscriptionId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        'cancel_at_period_end': 'false',
      }),
    });

    if (!stripeResponse.ok) {
      const error = await stripeResponse.text();
      throw new Error(`Failed to reactivate subscription: ${error}`);
    }

    const updatedSubscription = await stripeResponse.json();

    // Update subscription in database
    const { error: updateError } = await supabase
      .from('user_subscriptions')
      .update({
        cancel_at_period_end: false,
        status: updatedSubscription.status,
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_subscription_id', subscriptionId);

    if (updateError) {
      throw new Error(`Failed to update subscription: ${updateError.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        subscriptionId: subscriptionId,
        status: updatedSubscription.status,
        cancelAtPeriodEnd: false,
        currentPeriodEnd: new Date(updatedSubscription.current_period_end * 1000).toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Reactivate subscription error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
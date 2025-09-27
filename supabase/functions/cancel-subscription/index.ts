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
    const { subscriptionId, cancelAtPeriodEnd = true } = await req.json();

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

    // Cancel subscription in Stripe
    const endpoint = cancelAtPeriodEnd 
      ? `https://api.stripe.com/v1/subscriptions/${subscriptionId}`
      : `https://api.stripe.com/v1/subscriptions/${subscriptionId}`;
    
    const body = cancelAtPeriodEnd 
      ? new URLSearchParams({ 'cancel_at_period_end': 'true' })
      : null;

    const method = cancelAtPeriodEnd ? 'POST' : 'DELETE';
    
    const stripeResponse = await fetch(endpoint, {
      method: method,
      headers: {
        'Authorization': `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body,
    });

    if (!stripeResponse.ok) {
      const error = await stripeResponse.text();
      throw new Error(`Failed to cancel subscription: ${error}`);
    }

    const updatedSubscription = await stripeResponse.json();

    // Update subscription in database
    const updateData: any = {
      cancel_at_period_end: updatedSubscription.cancel_at_period_end,
      updated_at: new Date().toISOString(),
    };

    // If immediately cancelled, update status
    if (!cancelAtPeriodEnd) {
      updateData.status = 'canceled';
    }

    const { error: updateError } = await supabase
      .from('user_subscriptions')
      .update(updateData)
      .eq('stripe_subscription_id', subscriptionId);

    if (updateError) {
      throw new Error(`Failed to update subscription: ${updateError.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        subscriptionId: subscriptionId,
        cancelAtPeriodEnd: updatedSubscription.cancel_at_period_end,
        status: updatedSubscription.status,
        currentPeriodEnd: new Date(updatedSubscription.current_period_end * 1000).toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Cancel subscription error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
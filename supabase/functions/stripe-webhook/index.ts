import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0'

console.log("Loading stripe-webhook function...");

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2025-08-27.basil'
})

const supabaseClient = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

// Simple handler that processes webhook events
const handler = async (req: Request): Promise<Response> => {
  console.log(`[WEBHOOK] 🌐 ${req.method} ${req.url}`);
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'stripe-signature, content-type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      }
    });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', {
      status: 405,
      headers: { 'Access-Control-Allow-Origin': '*' }
    });
  }

  const signature = req.headers.get('stripe-signature');
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

  console.log(`[WEBHOOK] 🎯 Signature present: ${!!signature}`);
  console.log(`[WEBHOOK] 🔐 Secret present: ${!!webhookSecret}`);

  // Allow health check requests
  if (req.url.includes('health') || req.headers.get('user-agent')?.includes('curl')) {
    console.log('[WEBHOOK] 🏥 Health check request');
    return new Response(JSON.stringify({ status: 'healthy', timestamp: new Date().toISOString() }), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*' 
      }
    });
  }

  if (!signature || !webhookSecret) {
    console.error('[WEBHOOK] ❌ Missing signature or secret');
    return new Response(JSON.stringify({ 
      error: 'Missing signature or secret',
      hasSignature: !!signature,
      hasSecret: !!webhookSecret
    }), {
      status: 400,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*' 
      }
    });
  }

  try {
    const body = await req.text();
    console.log(`[WEBHOOK] 📦 Body length: ${body.length}`);
    
    // Add debug logging for webhook secret
    if (!webhookSecret) {
      console.error('[WEBHOOK] ❌ STRIPE_WEBHOOK_SECRET not found in environment');
      return new Response(JSON.stringify({ error: 'Webhook secret not configured' }), {
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*' 
        }
      });
    }
    
    console.log(`[WEBHOOK] 🔐 Using webhook secret: ${webhookSecret.substring(0, 10)}...`);
    
    const event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    console.log(`[WEBHOOK] ✅ Event verified: ${event.type} - ${event.id}`);

    // Process different event types
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await handleSubscriptionEvent(event.data.object as Stripe.Subscription);
        break;
      case 'customer.subscription.trial_will_end':
        await handleTrialWillEnd(event.data.object as Stripe.Subscription);
        break;
      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      case 'invoice.finalized':
        console.log(`[WEBHOOK] 📄 Invoice finalized: ${event.data.object.id}`);
        break;
      case 'payment_intent.succeeded':
        console.log(`[WEBHOOK] 💳 Payment succeeded: ${event.data.object.id}`);
        break;
      case 'payment_intent.payment_failed':
        console.log(`[WEBHOOK] 💳❌ Payment failed: ${event.data.object.id}`);
        break;
      default:
        console.log(`[WEBHOOK] ⚠️ Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ success: true, eventId: event.id }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (err) {
    console.error('[WEBHOOK] ❌ Error processing:', err.message);
    console.error('[WEBHOOK] ❌ Error stack:', err.stack);
    
    // Return more detailed error information
    const errorResponse = {
      error: err.message,
      type: err.type || 'unknown',
      timestamp: new Date().toISOString()
    };
    
    return new Response(JSON.stringify(errorResponse), {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
};

async function handleSubscriptionEvent(subscription: Stripe.Subscription) {
  console.log(`[WEBHOOK] 🔄 Processing subscription ${subscription.id}`);
  console.log(`[WEBHOOK] 📊 Status: ${subscription.status}`);
  
  try {
    const customerId = subscription.customer as string;
    console.log(`[WEBHOOK] 👤 Customer ID: ${customerId}`);
    
    // Find user by Stripe customer ID
    const { data: userData, error: userError } = await supabaseClient
      .from('profiles')
      .select('id')
      .eq('stripe_customer_id', customerId)
      .single();
    
    if (userError || !userData) {
      console.error(`[WEBHOOK] ❌ User not found for customer ${customerId}:`, userError);
      return;
    }
    
    console.log(`[WEBHOOK] ✅ Found user: ${userData.id}`);
    
    // Get price ID and determine subscription type
    const priceId = subscription.items.data[0]?.price.id;
    const subscriptionType = getSubscriptionType(priceId);
    
    console.log(`[WEBHOOK] 💰 Price ID: ${priceId}`);
    console.log(`[WEBHOOK] 🏷️ Subscription type: ${subscriptionType}`);
    
    const subscriptionData = {
      user_id: userData.id,
      stripe_subscription_id: subscription.id,
      stripe_customer_id: customerId,
      type: subscriptionType,
      status: subscription.status,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
      cancel_at_period_end: subscription.cancel_at_period_end,
      price_id: priceId,
      updated_at: new Date().toISOString()
    };
    
    // Upsert subscription
    const { error } = await supabaseClient
      .from('user_subscriptions')
      .upsert(subscriptionData, {
        onConflict: 'stripe_subscription_id'
      });
    
    if (error) {
      console.error('[WEBHOOK] ❌ Database error:', error);
      throw error;
    }
    
    console.log(`[WEBHOOK] ✅ Successfully saved subscription ${subscription.id}`);
  } catch (error) {
    console.error('[WEBHOOK] ❌ Processing error:', error);
    throw error;
  }
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  console.log(`[WEBHOOK] 💰 Invoice payment succeeded: ${invoice.id}`);
  
  if (invoice.subscription) {
    const { error } = await supabaseClient
      .from('user_subscriptions')
      .update({
        status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('stripe_subscription_id', invoice.subscription);
    
    if (error) {
      console.error('[WEBHOOK] ❌ Failed to update subscription:', error);
      throw error;
    }
    
    console.log(`[WEBHOOK] ✅ Updated subscription ${invoice.subscription} to active`);
  }
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  console.log(`[WEBHOOK] 💸 Invoice payment failed: ${invoice.id}`);
  
  if (invoice.subscription) {
    const { error } = await supabaseClient
      .from('user_subscriptions')
      .update({
        status: 'past_due',
        updated_at: new Date().toISOString()
      })
      .eq('stripe_subscription_id', invoice.subscription);
    
    if (error) {
      console.error('[WEBHOOK] ❌ Failed to update subscription:', error);
      throw error;
    }
    
    console.log(`[WEBHOOK] ✅ Updated subscription ${invoice.subscription} to past_due`);
  }
}

async function handleTrialWillEnd(subscription: Stripe.Subscription) {
  const subscriptionId = subscription.id;
  console.log(`[WEBHOOK] ⏰ Trial ending soon for subscription: ${subscriptionId}`);
  
  try {
    const { error } = await supabase
      .from('user_subscriptions')
      .update({ 
        updated_at: new Date().toISOString(),
        // You could add a notification flag here if needed
        trial_ending_soon: true
      })
      .eq('stripe_subscription_id', subscriptionId);

    if (error) {
      console.error(`[WEBHOOK] ❌ Failed to update trial ending status:`, error);
      throw error;
    }

    console.log(`[WEBHOOK] ✅ Trial ending notification processed for: ${subscriptionId}`);
  } catch (error) {
    console.error(`[WEBHOOK] ❌ Error in handleTrialWillEnd:`, error);
    throw error;
  }
}

function getSubscriptionType(priceId: string): string {
  // Match your actual price IDs from .env
  if (priceId === 'price_1SBWW4ENAHMeamEYNObfzeCr') {
    return 'customer_sos';
  } else if (priceId === 'price_1SBWaVENAHMeamEYAi2o6NQg') {
    return 'provider_premium';
  } else {
    console.warn(`[WEBHOOK] ⚠️ Unknown price ID: ${priceId}`);
    return 'customer_sos'; // Default fallback
  }
}

// Export the handler
Deno.serve(handler);
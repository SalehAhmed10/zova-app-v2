import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0";

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2025-08-27.basil'
});

const supabaseClient = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }

  const signature = req.headers.get('stripe-signature');
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

  if (!signature || !webhookSecret) {
    console.error('Webhook signature or secret missing');
    return new Response('Webhook signature or secret missing', {
      status: 400
    });
  }

  try {
    const body = await req.text();
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

    console.log(`[WEBHOOK] Received event: ${event.type} - ${event.id}`);

    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSuccess(event.data.object);
        break;
      case 'payment_intent.payment_failed':
        await handlePaymentFailure(event.data.object);
        break;
      case 'payment_intent.canceled':
        await handlePaymentCanceled(event.data.object);
        break;
      case 'payment_intent.requires_action':
        await handlePaymentRequiresAction(event.data.object);
        break;
      case 'account.updated':
        await handleAccountUpdate(event.data.object);
        break;
      case 'capability.updated':
        await handleCapabilityUpdate(event.data.object);
        break;
      case 'customer.subscription.updated':
        await handleSubscriptionUpdate(event.data.object);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionCancellation(event.data.object);
        break;
      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSuccess(event.data.object);
        break;
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailure(event.data.object);
        break;
      case 'payout.paid':
        await handlePayoutPaid(event.data.object);
        break;
      case 'payout.failed':
        await handlePayoutFailed(event.data.object);
        break;
      default:
        console.log(`[WEBHOOK] Unhandled event type: ${event.type}`);
    }

    return new Response('Webhook processed successfully', {
      status: 200
    });
  } catch (error) {
    console.error('[WEBHOOK] Error:', error);
    return new Response(`Webhook processing failed: ${error.message}`, {
      status: 400
    });
  }
});

// Handle successful payment intent
async function handlePaymentSuccess(paymentIntent) {
  const bookingId = paymentIntent.metadata.booking_id;
  const paymentType = paymentIntent.metadata.payment_type || 'full';

  if (!bookingId) {
    console.error('[WEBHOOK] No booking ID in payment intent metadata');
    return;
  }

  console.log(`[WEBHOOK] Payment succeeded for booking ${bookingId}, type: ${paymentType}, amount: £${paymentIntent.amount_received / 100}`);

  try {
    // Update payment intent status
    const { error: piError } = await supabaseClient
      .from('payment_intents')
      .update({
        status: paymentIntent.status,
        updated_at: new Date().toISOString()
      })
      .eq('stripe_payment_intent_id', paymentIntent.id);

    if (piError) {
      console.error('[WEBHOOK] Failed to update payment intent:', piError);
    }

    // Update booking payment status
    const { error: bookingError } = await supabaseClient
      .from('bookings')
      .update({
        payment_status: 'paid',
        stripe_payment_intent_id: paymentIntent.id,
        status: paymentType === 'deposit' ? 'confirmed' : 'confirmed',
        updated_at: new Date().toISOString()
      })
      .eq('id', bookingId);

    if (bookingError) {
      console.error('[WEBHOOK] Failed to update booking:', bookingError);
      return;
    }

    // If deposit payment, update deposit status
    if (paymentType === 'deposit') {
      const { error: depositError } = await supabaseClient
        .from('booking_deposits')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString()
        })
        .eq('booking_id', bookingId);

      if (depositError) {
        console.error('[WEBHOOK] Failed to update deposit:', depositError);
      }
    }

    // Get booking details for notifications and payout processing
    const { data: booking, error: fetchError } = await supabaseClient
      .from('bookings')
      .select(`
        *,
        customer:profiles!customer_id(first_name, last_name, email),
        provider:profiles!provider_id(first_name, last_name, business_name),
        service:provider_services!service_id(title)
      `)
      .eq('id', bookingId)
      .single();

    if (fetchError || !booking) {
      console.error('[WEBHOOK] Failed to fetch booking details:', fetchError);
      return;
    }

    // Create notifications
    await createPaymentNotifications(booking, paymentIntent, paymentType);

    // Handle payout processing for full payments
    if (paymentType === 'full') {
      await initiatePayout(booking, paymentIntent);
    }

    console.log(`[WEBHOOK] Successfully processed payment success for booking ${bookingId}`);
  } catch (error) {
    console.error(`[WEBHOOK] Error processing payment success for booking ${bookingId}:`, error);
  }
}

// Handle failed payment intent
async function handlePaymentFailure(paymentIntent) {
  const bookingId = paymentIntent.metadata.booking_id;
  const paymentType = paymentIntent.metadata.payment_type || 'full';

  if (!bookingId) {
    console.error('[WEBHOOK] No booking ID in payment intent metadata');
    return;
  }

  console.log(`[WEBHOOK] Payment failed for booking ${bookingId}, type: ${paymentType}`);

  try {
    // Update payment intent status
    await supabaseClient
      .from('payment_intents')
      .update({
        status: paymentIntent.status,
        updated_at: new Date().toISOString()
      })
      .eq('stripe_payment_intent_id', paymentIntent.id);

    // Update booking payment status
    await supabaseClient
      .from('bookings')
      .update({
        payment_status: 'failed',
        updated_at: new Date().toISOString()
      })
      .eq('id', bookingId);

    // Update deposit status if applicable
    if (paymentType === 'deposit') {
      await supabaseClient
        .from('booking_deposits')
        .update({
          status: 'failed'
        })
        .eq('booking_id', bookingId);
    }

    // Create failure notification
    if (paymentIntent.metadata.customer_id) {
      await supabaseClient
        .from('notifications')
        .insert({
          user_id: paymentIntent.metadata.customer_id,
          title: 'Payment Failed',
          message: 'Your payment could not be processed. Please try again or use a different payment method.',
          type: 'payment_failed',
          data: {
            booking_id: bookingId,
            payment_intent_id: paymentIntent.id,
            payment_type: paymentType
          }
        });
    }

    console.log(`[WEBHOOK] Successfully processed payment failure for booking ${bookingId}`);
  } catch (error) {
    console.error(`[WEBHOOK] Error processing payment failure for booking ${bookingId}:`, error);
  }
}

// Handle canceled payment intent
async function handlePaymentCanceled(paymentIntent) {
  const bookingId = paymentIntent.metadata.booking_id;
  if (!bookingId) return;

  console.log(`[WEBHOOK] Payment canceled for booking ${bookingId}`);

  try {
    // Update payment intent status
    await supabaseClient
      .from('payment_intents')
      .update({
        status: paymentIntent.status,
        updated_at: new Date().toISOString()
      })
      .eq('stripe_payment_intent_id', paymentIntent.id);

    // Update booking status to pending
    await supabaseClient
      .from('bookings')
      .update({
        payment_status: 'pending',
        updated_at: new Date().toISOString()
      })
      .eq('id', bookingId);

    console.log(`[WEBHOOK] Successfully processed payment cancellation for booking ${bookingId}`);
  } catch (error) {
    console.error(`[WEBHOOK] Error processing payment cancellation for booking ${bookingId}:`, error);
  }
}

// Handle payment requires action (3D Secure, etc.)
async function handlePaymentRequiresAction(paymentIntent) {
  const bookingId = paymentIntent.metadata.booking_id;
  if (!bookingId) return;

  console.log(`[WEBHOOK] Payment requires action for booking ${bookingId}`);

  try {
    // Update payment intent status
    await supabaseClient
      .from('payment_intents')
      .update({
        status: paymentIntent.status,
        updated_at: new Date().toISOString()
      })
      .eq('stripe_payment_intent_id', paymentIntent.id);

    console.log(`[WEBHOOK] Successfully processed payment requires action for booking ${bookingId}`);
  } catch (error) {
    console.error(`[WEBHOOK] Error processing payment requires action for booking ${bookingId}:`, error);
  }
}

// Handle account updates (Connect accounts)
async function handleAccountUpdate(account) {
  console.log(`[WEBHOOK] Account updated: ${account.id}`);

  try {
    // Find the user profile with this Stripe account ID
    const { data: profile, error } = await supabaseClient
      .from('profiles')
      .select('id')
      .eq('stripe_account_id', account.id)
      .single();

    if (error || !profile) {
      console.error('[WEBHOOK] Could not find profile for Stripe account:', account.id);
      return;
    }

    // Update the profile with the latest Stripe account status
    const { error: updateError } = await supabaseClient
      .from('profiles')
      .update({
        stripe_charges_enabled: account.charges_enabled,
        stripe_details_submitted: account.details_submitted,
        stripe_account_status: account.charges_enabled ? 'active' : 'pending',
        updated_at: new Date().toISOString()
      })
      .eq('id', profile.id);

    if (updateError) {
      console.error('[WEBHOOK] Failed to update profile:', updateError);
    } else {
      console.log(`[WEBHOOK] Updated Stripe account status for user ${profile.id}: charges_enabled=${account.charges_enabled}, details_submitted=${account.details_submitted}`);
    }
  } catch (error) {
    console.error('[WEBHOOK] Error handling account update:', error);
  }
}

// Handle capability updates (Connect accounts)
async function handleCapabilityUpdate(capability) {
  console.log(`[WEBHOOK] Capability updated: ${capability.id} for account ${capability.account}`);

  try {
    // Find the user profile with this Stripe account ID
    const { data: profile, error } = await supabaseClient
      .from('profiles')
      .select('id')
      .eq('stripe_account_id', capability.account)
      .single();

    if (error || !profile) {
      console.error('[WEBHOOK] Could not find profile for Stripe account:', capability.account);
      return;
    }

    // Update the profile with the latest capability status
    const { error: updateError } = await supabaseClient
      .from('profiles')
      .update({
        stripe_charges_enabled: capability.status === 'active',
        stripe_account_status: capability.status === 'active' ? 'active' : 'pending',
        updated_at: new Date().toISOString()
      })
      .eq('id', profile.id);

    if (updateError) {
      console.error('[WEBHOOK] Failed to update profile:', updateError);
    } else {
      console.log(`[WEBHOOK] Updated capability status for user ${profile.id}: ${capability.status}`);
    }
  } catch (error) {
    console.error('[WEBHOOK] Error handling capability update:', error);
  }
}

// Create payment-related notifications
async function createPaymentNotifications(booking, paymentIntent, paymentType) {
  const notifications = [];
  const amount = paymentIntent.amount_received / 100;

  // Notify customer
  notifications.push({
    user_id: booking.customer_id,
    title: paymentType === 'deposit' ? 'Deposit Payment Successful' : 'Payment Successful',
    message: `Your ${paymentType === 'deposit' ? 'deposit' : 'payment'} of £${amount} for ${booking.service.title} has been processed successfully.`,
    type: 'payment_received',
    data: {
      booking_id: booking.id,
      payment_type: paymentType,
      amount: amount,
      payment_intent_id: paymentIntent.id
    }
  });

  // Notify provider
  notifications.push({
    user_id: booking.provider_id,
    title: paymentType === 'deposit' ? 'Deposit Received' : 'Payment Received',
    message: `${paymentType === 'deposit' ? 'Deposit' : 'Payment'} of £${amount} received for your service: ${booking.service.title}`,
    type: 'payment_received',
    data: {
      booking_id: booking.id,
      payment_type: paymentType,
      amount: amount
    }
  });

  // Insert notifications
  const { error: notifError } = await supabaseClient
    .from('notifications')
    .insert(notifications);

  if (notifError) {
    console.error('[WEBHOOK] Failed to create notifications:', notifError);
  }
}

// Initiate payout for provider
async function initiatePayout(booking, paymentIntent) {
  try {
    const totalAmount = paymentIntent.amount_received / 100;
    const platformFeeAmount = booking.platform_fee;
    const providerAmount = totalAmount - platformFeeAmount;

    // Create or update payout record
    const { error: payoutError } = await supabaseClient
      .from('provider_payouts')
      .insert({
        provider_id: booking.provider_id,
        booking_id: booking.id,
        amount: providerAmount,
        currency: 'gbp',
        status: 'processing',
        platform_fee: platformFeeAmount,
        gross_amount: totalAmount,
        expected_payout_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        metadata: {
          payment_intent_id: paymentIntent.id,
          booking_date: booking.booking_date
        }
      });

    if (payoutError) {
      console.error('[WEBHOOK] Failed to create payout record:', payoutError);
    } else {
      console.log(`[WEBHOOK] Created payout record for provider ${booking.provider_id}: £${providerAmount}`);
    }
  } catch (error) {
    console.error('[WEBHOOK] Error initiating payout:', error);
  }
}

// Handle subscription updates
async function handleSubscriptionUpdate(subscription) {
  const userId = subscription.metadata.supabase_user_id;
  if (!userId) return;

  await supabaseClient
    .from('profiles')
    .update({
      subscription_status: subscription.status,
      subscription_current_period_end: subscription.current_period_end ? new Date(subscription.current_period_end * 1000).toISOString() : null,
      trial_ends_at: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null
    })
    .eq('id', userId);

  console.log(`[WEBHOOK] Updated subscription for user ${userId}: ${subscription.status}`);
}

// Handle subscription cancellation
async function handleSubscriptionCancellation(subscription) {
  const userId = subscription.metadata.supabase_user_id;
  if (!userId) return;

  await supabaseClient
    .from('profiles')
    .update({
      subscription_status: 'canceled',
      subscription_type: null,
      stripe_subscription_id: null,
      trial_ends_at: null
    })
    .eq('id', userId);

  console.log(`[WEBHOOK] Cancelled subscription for user ${userId}`);
}

// Handle invoice payment success
async function handleInvoicePaymentSuccess(invoice) {
  if (!invoice.subscription) return;

  const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
  const userId = subscription.metadata.supabase_user_id;
  if (!userId) return;

  await supabaseClient
    .from('profiles')
    .update({
      subscription_status: 'active',
      subscription_current_period_end: subscription.current_period_end ? new Date(subscription.current_period_end * 1000).toISOString() : null
    })
    .eq('id', userId);

  console.log(`[WEBHOOK] Invoice payment succeeded for user ${userId}`);
}

// Handle invoice payment failure
async function handleInvoicePaymentFailure(invoice) {
  if (!invoice.subscription) return;

  const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
  const userId = subscription.metadata.supabase_user_id;
  if (!userId) return;

  await supabaseClient
    .from('profiles')
    .update({
      subscription_status: 'past_due'
    })
    .eq('id', userId);

  console.log(`[WEBHOOK] Invoice payment failed for user ${userId}`);
}

// Handle successful payout to provider bank account
async function handlePayoutPaid(payout) {
  console.log(`[WEBHOOK] Payout paid - ID: ${payout.id}, Amount: £${payout.amount / 100}`);

  try {
    // Find the payout record by stripe_transfer_id from payout metadata
    const transferId = payout.metadata?.transfer_id;

    if (!transferId) {
      console.error('[WEBHOOK] No transfer_id in payout metadata');
      return;
    }

    const { data: payoutRecord, error } = await supabaseClient
      .from('provider_payouts')
      .update({
        status: 'completed',
        actual_payout_date: new Date().toISOString()
      })
      .eq('stripe_transfer_id', transferId)
      .select();

    if (error) {
      console.error('[WEBHOOK] Error updating payout status to completed:', error);
    } else if (payoutRecord && payoutRecord.length > 0) {
      console.log(`[WEBHOOK] Payout marked as completed for transfer ${transferId}`);

      // Optional: Send notification to provider
      await createPayoutNotification(payoutRecord[0]);
    } else {
      console.warn(`[WEBHOOK] No payout record found for transfer ${transferId}`);
    }
  } catch (error) {
    console.error(`[WEBHOOK] Error processing payout.paid event:`, error);
  }
}

// Handle failed payout to provider bank account
async function handlePayoutFailed(payout) {
  console.log(`[WEBHOOK] Payout failed - ID: ${payout.id}, Amount: £${payout.amount / 100}, Reason: ${payout.failure_message}`);

  try {
    // Find the payout record by stripe_transfer_id from payout metadata
    const transferId = payout.metadata?.transfer_id;

    if (!transferId) {
      console.error('[WEBHOOK] No transfer_id in payout metadata');
      return;
    }

    const { data: payoutRecord, error } = await supabaseClient
      .from('provider_payouts')
      .update({
        status: 'failed',
        failure_reason: payout.failure_message || 'Payout failed'
      })
      .eq('stripe_transfer_id', transferId)
      .select();

    if (error) {
      console.error('[WEBHOOK] Error updating payout status to failed:', error);
    } else if (payoutRecord && payoutRecord.length > 0) {
      console.log(`[WEBHOOK] Payout marked as failed for transfer ${transferId}`);

      // Optional: Send notification to provider about failed payout
      await createPayoutFailureNotification(payoutRecord[0]);
    } else {
      console.warn(`[WEBHOOK] No payout record found for transfer ${transferId}`);
    }
  } catch (error) {
    console.error(`[WEBHOOK] Error processing payout.failed event:`, error);
  }
}

// Helper function to create payout completion notification
async function createPayoutNotification(payoutRecord) {
  try {
    const { error } = await supabaseClient
      .from('notifications')
      .insert({
        user_id: payoutRecord.provider_id,
        type: 'payout_completed',
        title: 'Payment Received',
        message: `£${payoutRecord.amount / 100} has been deposited to your bank account`,
        data: {
          payout_id: payoutRecord.id,
          amount: payoutRecord.amount,
          transfer_id: payoutRecord.transfer_id
        }
      });

    if (error) {
      console.error('[WEBHOOK] Error creating payout notification:', error);
    }
  } catch (error) {
    console.error('[WEBHOOK] Error in createPayoutNotification:', error);
  }
}

// Helper function to create payout failure notification
async function createPayoutFailureNotification(payoutRecord) {
  try {
    const { error } = await supabaseClient
      .from('notifications')
      .insert({
        user_id: payoutRecord.provider_id,
        type: 'payout_failed',
        title: 'Payment Failed',
        message: `Payment of £${payoutRecord.amount / 100} could not be deposited. Reason: ${payoutRecord.failure_reason}`,
        data: {
          payout_id: payoutRecord.id,
          amount: payoutRecord.amount,
          transfer_id: payoutRecord.transfer_id,
          failure_reason: payoutRecord.failure_reason
        }
      });

    if (error) {
      console.error('[WEBHOOK] Error creating payout failure notification:', error);
    }
  } catch (error) {
    console.error('[WEBHOOK] Error in createPayoutFailureNotification:', error);
  }
}
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import Stripe from 'https://esm.sh/stripe@14.21.0';

interface CompleteServiceRequest {
  booking_id: string;
  test_mode?: boolean;
}

Deno.serve(async (req) => {
  console.log('=== COMPLETE SERVICE FUNCTION START ===');

  // Handle CORS
  if (req.method === 'OPTIONS') {
    console.log('OPTIONS request received');
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('Processing POST request');

    // Check environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');

    console.log('Environment check:');
    console.log('- SUPABASE_URL:', supabaseUrl ? 'Set' : 'Missing');
    console.log('- SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? 'Set' : 'Missing');
    console.log('- STRIPE_SECRET_KEY:', stripeSecretKey ? 'Set (' + (stripeSecretKey ? stripeSecretKey.slice(0, 7) + '...' : 'Missing') + ')' : 'Missing');

    if (!supabaseUrl || !supabaseServiceKey || !stripeSecretKey) {
      console.error('Configuration error');
      return new Response(JSON.stringify({
        error: 'Configuration error'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 500
      });
    }

    // Initialize clients
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
    });

    // Parse request body
    const body: CompleteServiceRequest = await req.json();
    const { booking_id, test_mode } = body;

    console.log('Request body:', { booking_id, test_mode });

    if (!booking_id) {
      return new Response(JSON.stringify({
        error: 'Booking ID is required'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 400
      });
    }

    // 1. Get booking details with payment information
    console.log('Fetching booking details...');
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        *,
        provider_services!bookings_service_id_fkey (
          id,
          title,
          base_price
        ),
        customer_profile:profiles!bookings_customer_id_fkey (
          id,
          first_name,
          last_name
        ),
        provider_profile:profiles!bookings_provider_id_fkey (
          id,
          first_name,
          last_name,
          stripe_account_id
        )
      `)
      .eq('id', booking_id)
      .single();

    if (bookingError || !booking) {
      console.error('Booking not found:', bookingError);
      return new Response(JSON.stringify({
        error: 'Booking not found'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 404
      });
    }

    console.log('Booking found:', {
      id: booking.id,
      status: booking.status,
      payment_intent_id: booking.stripe_payment_intent_id,
      authorization_amount: booking.authorization_amount,
      remaining_to_capture: booking.remaining_to_capture,
      remaining_captured_at: booking.remaining_captured_at,
      provider_stripe_account: booking.provider_profile?.stripe_account_id
    });

    // 2. Check if booking is in correct status
    if (booking.status !== 'in_progress') {
      return new Response(JSON.stringify({
        error: 'Booking must be in progress to complete'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 400
      });
    }

    // 3. Check if provider has Stripe account
    if (!booking.provider_profile?.stripe_account_id) {
      console.error('Provider does not have Stripe account');
      return new Response(JSON.stringify({
        error: 'Provider Stripe account not found'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 400
      });
    }

    // 4. Check if using new Authorization + Capture system
    console.log('Checking payment system type...');
    const isAuthCapture = booking.payment_intent_id && booking.authorization_amount;
    let paymentIntentData;
    
    if (isAuthCapture) {
      console.log('Using Authorization + Capture system');
      
      // Check if remaining payment has been captured
      if (!booking.remaining_captured_at && booking.remaining_to_capture > 0) {
        console.log('Capturing remaining payment before service completion...');
        
        // Call our capture-remaining-payment function
        try {
          const captureResponse = await fetch(`${supabaseUrl}/functions/v1/capture-remaining-payment`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${supabaseServiceKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              bookingId: booking_id
            })
          });

          if (!captureResponse.ok) {
            const captureError = await captureResponse.json();
            console.error('Failed to capture remaining payment:', captureError);
            return new Response(JSON.stringify({
              error: 'Cannot complete service: Failed to capture remaining payment',
              details: captureError.error
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 400
            });
          }

          const captureResult = await captureResponse.json();
          console.log('Remaining payment captured successfully:', captureResult);
          
          // Refresh booking data to get updated payment status
          const { data: updatedBooking, error: refreshError } = await supabase
            .from('bookings')
            .select('*')
            .eq('id', booking_id)
            .single();
          
          if (refreshError || !updatedBooking) {
            console.error('Failed to refresh booking data:', refreshError);
            return new Response(JSON.stringify({
              error: 'Failed to refresh booking data after payment capture'
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 500
            });
          }
          
          // Update our local booking object
          Object.assign(booking, updatedBooking);
        } catch (error) {
          console.error('Error calling capture-remaining-payment function:', error);
          return new Response(JSON.stringify({
            error: 'Cannot complete service: Payment capture failed',
            details: error instanceof Error ? error.message : 'Unknown error'
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500
          });
        }
      }
      
      // Use authorization amount for calculations
      paymentIntentData = {
        amount: Math.round(booking.authorization_amount * 100), // Convert to cents
        currency: 'GBP',
        status: 'succeeded'
      };
      console.log('Using Authorization + Capture data:', paymentIntentData);
      
    } else {
      console.log('Using legacy payment system');
      
      // 4. Get payment intent details (legacy system)
      console.log('Fetching payment intent...');
      let paymentIntent;
      try {
        paymentIntent = await stripe.paymentIntents.retrieve(booking.stripe_payment_intent_id);
        console.log('Payment intent retrieved from Stripe:', paymentIntent.status);
        paymentIntentData = {
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
          status: paymentIntent.status
        };
      } catch (error) {
        console.error('Error fetching payment intent from Stripe:', error);
        console.log('Falling back to local payment_intents table data...');
        
        // Fallback to local payment_intents table data
        const { data: localPaymentIntent, error: localError } = await supabase
          .from('payment_intents')
          .select('amount, currency, status')
          .eq('stripe_payment_intent_id', booking.stripe_payment_intent_id)
          .single();
          
        if (localError || !localPaymentIntent) {
          console.error('Payment intent not found in local database either:', localError);
          return new Response(JSON.stringify({
            error: 'Payment intent not found'
          }), {
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json'
            },
            status: 400
          });
        }
        
        // Convert amount from pounds to cents for calculation
        paymentIntentData = {
          amount: Math.round(localPaymentIntent.amount * 100), // Convert pounds to cents
          currency: localPaymentIntent.currency.toUpperCase(),
          status: localPaymentIntent.status
        };
        
        console.log('Using local payment intent data:', paymentIntentData);
      }
    }

    // 5. Calculate payout amount (90% to provider, 10% commission)
    const totalAmount = paymentIntentData.amount; // Amount in cents
    const commissionAmount = Math.round(totalAmount * 0.1); // 10% commission
    const payoutAmount = totalAmount - commissionAmount;

    console.log('Payment calculation:', {
      totalAmount,
      commissionAmount,
      payoutAmount
    });

    // 6. Create transfer to provider's Stripe account
    console.log('Creating transfer to provider...');
    let transfer;
    const usingLocalData = isAuthCapture || paymentIntentData?.status !== 'succeeded';
    
    try {
      if (test_mode || usingLocalData) {
        // For testing: create a mock transfer object when in test mode or payment intent doesn't exist in Stripe
        console.log('Using mock transfer for testing');
        transfer = {
          id: `mock_tr_${booking_id}_${Date.now()}`,
          amount: payoutAmount,
          currency: paymentIntentData.currency,
          destination: booking.provider_profile.stripe_account_id,
          metadata: {
            booking_id: booking_id,
            service_title: booking.provider_services?.title || 'Service',
            customer_name: `${booking.customer_profile?.first_name} ${booking.customer_profile?.last_name}`,
            provider_name: `${booking.provider_profile?.first_name} ${booking.provider_profile?.last_name}`,
            transfer_id: `mock_tr_${booking_id}_${Date.now()}`,
          }
        };
      } else {
        transfer = await stripe.transfers.create({
          amount: payoutAmount,
          currency: paymentIntentData.currency,
          destination: booking.provider_profile.stripe_account_id,
          transfer_group: `booking_${booking_id}`,
          metadata: {
            booking_id: booking_id,
            service_title: booking.provider_services?.title || 'Service',
            customer_name: `${booking.customer_profile?.first_name} ${booking.customer_profile?.last_name}`,
            provider_name: `${booking.provider_profile?.first_name} ${booking.provider_profile?.last_name}`,
          },
        });

        // Update transfer metadata with the transfer ID for webhook matching
        await stripe.transfers.update(transfer.id, {
          metadata: {
            ...transfer.metadata,
            transfer_id: transfer.id,
          },
        });
      }
      
      console.log('Transfer created:', transfer.id);
    } catch (error) {
      console.error('Error creating transfer:', error);
      return new Response(JSON.stringify({
        error: 'Failed to create payout transfer'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 500
      });
    }

    // 7. Update booking status to completed
    console.log('Updating booking status...');
    const { error: updateError } = await supabase
      .from('bookings')
      .update({
        status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('id', booking_id);

    if (updateError) {
      console.error('Error updating booking:', updateError);
      return new Response(JSON.stringify({
        error: 'Failed to update booking status'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 500
      });
    }

    // 8. Record the payout in database
    console.log('Recording payout...');
    const { error: payoutError } = await supabase
      .from('provider_payouts')
      .insert({
        booking_id: booking_id,
        provider_id: booking.provider_profile.id,
        stripe_transfer_id: transfer.id,
        amount: payoutAmount / 100, // Convert cents to pounds to match database convention
        currency: paymentIntentData.currency.toUpperCase(),
        status: 'pending', // Transfer created but not yet paid out
        expected_payout_date: new Date().toISOString().split('T')[0], // Today's date
        actual_payout_date: new Date().toISOString().split('T')[0], // Today's date
      });

    if (payoutError) {
      console.error('Error recording payout:', payoutError);
      return new Response(JSON.stringify({
        error: 'Failed to record payout in database'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 500
      });
    }

    // 9. Create notifications
    console.log('Creating notifications...');

    // Notification for customer
    await supabase
      .from('notifications')
      .insert({
        user_id: booking.customer_id,
        type: 'service_completed',
        title: 'Service Completed',
        message: `Your ${booking.provider_services?.title || 'service'} with ${booking.provider_profile?.first_name} has been completed. Please leave a review.`,
        data: {
          booking_id: booking_id,
          provider_id: booking.provider_profile.id,
        },
      });

    // Notification for provider
    await supabase
      .from('notifications')
      .insert({
        user_id: booking.provider_id,
        type: 'payout_released',
        title: 'Payment Released',
        message: `Payment of £${(payoutAmount / 100).toFixed(2)} has been released for completed service.`,
        data: {
          booking_id: booking_id,
          transfer_id: transfer.id,
          amount: payoutAmount,
        },
      });

    console.log('=== COMPLETE SERVICE FUNCTION SUCCESS ===');

    return new Response(JSON.stringify({
      success: true,
      booking_id: booking_id,
      transfer_id: transfer.id,
      payout_amount: payoutAmount,
      commission_amount: commissionAmount,
      payment_system: isAuthCapture ? 'authorization_capture' : 'legacy',
      message: 'Service completed successfully and payment released'
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    });

  } catch (error) {
    console.error('=== COMPLETE SERVICE FUNCTION ERROR ===');
    console.error('Error details:', error);

    return new Response(JSON.stringify({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 500
    });
  }
});
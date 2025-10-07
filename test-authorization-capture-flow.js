#!/usr/bin/env node

/**
 * Test script for Payment Authorization + Capture system
 * Tests the complete flow: Authorization → Deposit Capture → Service Completion → Remaining Payment Capture
 */

import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

// Initialize clients
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!supabaseUrl || !supabaseServiceKey || !stripeSecretKey) {
  console.error('❌ Missing environment variables');
  console.log('Required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, STRIPE_SECRET_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const stripe = new Stripe(stripeSecretKey);

// Test configuration
const TEST_CONFIG = {
  customerId: '39ad48d5-cfeb-46bd-85e1-7b4b93b6e6b5', // Replace with actual customer ID
  providerId: 'aba51e58-7a83-4dea-8c30-5a72cfbf44ba', // Replace with actual provider ID  
  serviceId: '0e9d9c5c-26e3-4906-8a17-2e7f28d60f7c', // Replace with actual service ID
  servicePrice: 100.00, // £100 service
  platformFee: 10.00, // 10% platform fee
  depositPercentage: 0.2 // 20% deposit
};

async function testAuthorizationCaptureFlow() {
  console.log('🧪 Testing Authorization + Capture Payment Flow\n');

  try {
    // Step 1: Test create-payment-intent with Authorization + Capture
    console.log('📝 Step 1: Creating PaymentIntent with Authorization + Capture...');
    
    const totalAmount = TEST_CONFIG.servicePrice + TEST_CONFIG.platformFee;
    const depositAmount = TEST_CONFIG.servicePrice * TEST_CONFIG.depositPercentage;
    
    console.log(`   Service Price: £${TEST_CONFIG.servicePrice}`);
    console.log(`   Platform Fee: £${TEST_CONFIG.platformFee}`);
    console.log(`   Total Authorization: £${totalAmount}`);
    console.log(`   Deposit to Capture: £${depositAmount}`);

    const { data: paymentData, error: paymentError } = await supabase.functions.invoke('create-payment-intent', {
      body: {
        amount: Math.round(totalAmount * 100), // Full amount in pence
        depositAmount: Math.round(depositAmount * 100), // Deposit in pence
        currency: 'gbp',
        serviceId: TEST_CONFIG.serviceId,
        providerId: TEST_CONFIG.providerId,
        customerId: TEST_CONFIG.customerId,
      },
    });

    if (paymentError) {
      console.error('❌ PaymentIntent creation failed:', paymentError);
      return;
    }

    console.log('✅ PaymentIntent created successfully');
    console.log(`   PaymentIntent ID: ${paymentData.paymentIntentId}`);
    console.log(`   Client Secret: ${paymentData.clientSecret.substring(0, 30)}...`);

    const paymentIntentId = paymentData.paymentIntentId;

    // Step 2: Verify PaymentIntent details
    console.log('\n🔍 Step 2: Verifying PaymentIntent configuration...');
    
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    console.log(`   Status: ${paymentIntent.status}`);
    console.log(`   Capture Method: ${paymentIntent.capture_method}`);
    console.log(`   Amount: £${paymentIntent.amount / 100}`);
    console.log(`   Amount Capturable: £${paymentIntent.amount_capturable / 100}`);
    console.log(`   Amount Received: £${paymentIntent.amount_received / 100}`);

    if (paymentIntent.capture_method !== 'manual') {
      console.error('❌ PaymentIntent should use manual capture method');
      return;
    }

    if (paymentIntent.amount !== totalAmount * 100) {
      console.error(`❌ PaymentIntent amount mismatch. Expected: ${totalAmount * 100}, Got: ${paymentIntent.amount}`);
      return;
    }

    console.log('✅ PaymentIntent configured correctly for Authorization + Capture');

    // Step 3: Simulate PaymentSheet confirmation (this would normally be done by the user)
    console.log('\n💳 Step 3: Simulating PaymentSheet confirmation...');
    console.log('   (In real app, user would complete payment in PaymentSheet)');
    console.log('   (For testing, we\'ll manually confirm with test payment method)');

    // Confirm the PaymentIntent with a test payment method
    const confirmedPaymentIntent = await stripe.paymentIntents.confirm(paymentIntentId, {
      payment_method: 'pm_card_visa', // Test card
      return_url: 'https://example.com/return', // Required for some payment methods
    });

    console.log(`   PaymentIntent Status: ${confirmedPaymentIntent.status}`);
    
    if (confirmedPaymentIntent.status !== 'requires_capture') {
      console.error(`❌ Expected status 'requires_capture', got '${confirmedPaymentIntent.status}'`);
      return;
    }

    console.log('✅ PaymentIntent confirmed and ready for capture');

    // Step 4: Test deposit capture
    console.log('\n💰 Step 4: Testing deposit capture...');
    
    const { data: captureData, error: captureError } = await supabase.functions.invoke('capture-deposit', {
      body: {
        paymentIntentId: paymentIntentId,
        depositAmount: Math.round(depositAmount * 100),
      },
    });

    if (captureError) {
      console.error('❌ Deposit capture failed:', captureError);
      return;
    }

    console.log('✅ Deposit captured successfully');
    console.log(`   Captured Amount: £${captureData.capturedAmount / 100}`);
    console.log(`   Remaining Capturable: £${captureData.remainingCapturable / 100}`);

    // Verify the capture in Stripe
    const capturedPaymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    console.log(`   Stripe Status: ${capturedPaymentIntent.status}`);
    console.log(`   Amount Received: £${capturedPaymentIntent.amount_received / 100}`);

    // Step 5: Create booking with authorization details
    console.log('\n📋 Step 5: Creating booking with authorization details...');
    
    const bookingDate = new Date();
    bookingDate.setDate(bookingDate.getDate() + 7); // Book for next week
    
    const { data: bookingData, error: bookingError } = await supabase.functions.invoke('create-booking', {
      body: {
        service_id: TEST_CONFIG.serviceId,
        provider_id: TEST_CONFIG.providerId,
        customer_id: TEST_CONFIG.customerId,
        booking_date: bookingDate.toISOString().split('T')[0],
        start_time: '10:00',
        payment_intent_id: paymentIntentId,
        authorization_amount: totalAmount,
        captured_deposit: depositAmount,
      },
    });

    if (bookingError) {
      console.error('❌ Booking creation failed:', bookingError);
      return;
    }

    console.log('✅ Booking created successfully');
    console.log(`   Booking ID: ${bookingData.booking.id}`);
    console.log(`   Status: ${bookingData.booking.status}`);

    const bookingId = bookingData.booking.id;

    // Step 6: Verify booking data in database
    console.log('\n🔍 Step 6: Verifying booking authorization data...');
    
    const { data: booking, error: fetchError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single();

    if (fetchError) {
      console.error('❌ Failed to fetch booking:', fetchError);
      return;
    }

    console.log('   Authorization Details:');
    console.log(`     Payment Intent ID: ${booking.payment_intent_id}`);
    console.log(`     Authorization Amount: £${booking.authorization_amount}`);
    console.log(`     Captured Deposit: £${booking.captured_deposit}`);
    console.log(`     Remaining to Capture: £${booking.remaining_to_capture}`);
    console.log(`     Deposit Captured At: ${booking.deposit_captured_at}`);
    console.log(`     Authorization Expires At: ${booking.authorization_expires_at}`);

    // Step 7: Test service completion and remaining payment capture
    console.log('\n🎯 Step 7: Testing service completion and remaining payment capture...');
    
    const { data: completionData, error: completionError } = await supabase.functions.invoke('complete-service', {
      body: {
        booking_id: bookingId,
      },
    });

    if (completionError) {
      console.error('❌ Service completion failed:', completionError);
      return;
    }

    console.log('✅ Service completed successfully');
    console.log(`   Remaining Payment Captured: £${completionData.remainingPaymentCaptured / 100}`);
    console.log(`   Final Payment Status: ${completionData.paymentStatus}`);

    // Step 8: Final verification
    console.log('\n✅ Step 8: Final verification...');
    
    const { data: finalBooking, error: finalError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single();

    if (finalError) {
      console.error('❌ Final booking fetch failed:', finalError);
      return;
    }

    const finalPaymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    console.log('   Final State:');
    console.log(`     Booking Status: ${finalBooking.status}`);
    console.log(`     Payment Status: ${finalBooking.payment_status}`);
    console.log(`     Remaining Payment Captured At: ${finalBooking.remaining_captured_at}`);
    console.log(`     Stripe PaymentIntent Status: ${finalPaymentIntent.status}`);
    console.log(`     Total Amount Received: £${finalPaymentIntent.amount_received / 100}`);

    if (finalPaymentIntent.status === 'succeeded' && finalBooking.payment_status === 'completed') {
      console.log('\n🎉 Authorization + Capture flow completed successfully!');
      console.log('   ✅ Full amount authorized');
      console.log('   ✅ Deposit captured immediately');
      console.log('   ✅ Booking created with authorization tracking');
      console.log('   ✅ Remaining payment captured on service completion');
      console.log('   ✅ All payment statuses updated correctly');
    } else {
      console.log('\n❌ Flow completed but final state incorrect');
      console.log(`   Expected: PaymentIntent 'succeeded' + Booking 'completed'`);
      console.log(`   Actual: PaymentIntent '${finalPaymentIntent.status}' + Booking '${finalBooking.payment_status}'`);
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
testAuthorizationCaptureFlow()
  .then(() => {
    console.log('\n🏁 Test completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Test crashed:', error);
    process.exit(1);
  });
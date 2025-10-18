# 🔧 Escrow System Fix - Implementation Plan

## 🎯 Objective
Convert current two-part payment system into proper escrow with full authorization hold until service completion.

---

## 🚨 Current Problem

**What Happens Now:**
```
1. Customer card authorized for £99.00
2. Platform captures £18.00 (deposit)
3. Stripe RELEASES remaining £81.00 back to customer ❌
4. At service completion: Need NEW payment authorization ❌
```

**What Should Happen:**
```
1. Customer card authorized for £99.00
2. Platform captures £18.00 (deposit)
3. Remaining £81.00 STAYS AUTHORIZED (held in escrow) ✅
4. At service completion: Capture remaining £81.00 automatically ✅
```

---

## 🔍 Root Cause Analysis

### Stripe Payment Intent Behavior

When you call `capture` with `amount_to_capture` less than authorized amount:
- Stripe captures the specified amount
- **Automatically releases the remaining authorization** ❌
- This is default Stripe behavior for partial captures

**From Stripe Docs:**
> "When you partially capture a payment, the remaining uncaptured amount is automatically released back to the customer."

**Our Code (capture-deposit/index.ts line 57-67):**
```typescript
const captureParams = new URLSearchParams({
  amount_to_capture: depositAmount.toString(), // Only £18
});

const captureResponse = await fetch(
  `https://api.stripe.com/v1/payment_intents/${paymentIntentId}/capture`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${stripeSecretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: captureParams,
  }
);
```

**This causes Stripe to:**
1. Capture £18.00 ✅
2. Release £81.00 automatically ❌

---

## ✅ Solution: Multi-Capture Payment Intents

### Stripe Feature: Separate Charges and Transfers

Stripe Connect with **Separate Charges and Transfers** allows:
- Multiple captures on same authorization
- Keep authorization active between captures
- Perfect for escrow/marketplace models

### How It Works:

#### Step 1: Create Payment Intent (Already Correct)
```typescript
// create-payment-intent/index.ts
const paymentIntent = await stripe.paymentIntents.create({
  amount: 9900, // £99.00 total
  currency: 'gbp',
  capture_method: 'manual', // ✅ Already correct
  metadata: {
    deposit_amount: '1800',
    remaining_amount: '8100',
  },
});
```

#### Step 2: Capture Deposit (NEEDS FIX)
**Current Code:**
```typescript
// Captures deposit but releases remaining
await stripe.paymentIntents.capture(paymentIntentId, {
  amount_to_capture: 1800, // £18
});
// Result: £81 released ❌
```

**Fixed Code:**
```typescript
// Create a SEPARATE charge for deposit from the authorization
await stripe.charges.create({
  amount: 1800, // £18 deposit
  currency: 'gbp',
  customer: customerId,
  source: paymentMethod, // Same payment method
  capture: true, // Capture immediately
  metadata: {
    type: 'deposit',
    booking_id: bookingId,
    payment_intent_id: paymentIntentId,
  },
});

// Original payment intent STAYS authorized at £99 ✅
// We just created a separate charge for deposit
```

**Wait, this won't work because it's a new charge...**

---

## 🎯 CORRECT Solution: Don't Use Partial Capture

### The Real Fix: Capture Full Amount Immediately

**Change Strategy:**
Instead of:
- Authorize £99 → Capture £18 → Release £81 ❌

Do this:
- Authorize £99 → Capture £99 immediately → Hold in platform account → Transfer at completion ✅

### Implementation:

#### Step 1: Capture Full Amount Immediately
**Update capture-deposit/index.ts:**
```typescript
// Capture FULL amount immediately
const captureParams = new URLSearchParams({
  // No amount_to_capture = captures full authorized amount
});

const captureResponse = await fetch(
  `https://api.stripe.com/v1/payment_intents/${paymentIntentId}/capture`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${stripeSecretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: captureParams, // Captures full £99.00
  }
);
```

#### Step 2: Hold Funds in Platform Account
**Database Tracking:**
```sql
UPDATE bookings SET
  payment_status = 'funds_held_in_escrow',
  captured_amount = 99.00,
  amount_held_for_provider = 90.00, -- Will transfer at completion
  platform_fee_held = 9.00,
  funds_held_at = NOW()
WHERE id = booking_id;
```

#### Step 3: Transfer to Provider at Completion
**Create complete-booking edge function:**
```typescript
// supabase/functions/complete-booking/index.ts

export async function completeBooking(bookingId: string) {
  // Get booking details
  const booking = await getBooking(bookingId);
  
  // Transfer £90 to provider via Stripe Connect
  await stripe.transfers.create({
    amount: 9000, // £90.00 to provider
    currency: 'gbp',
    destination: booking.provider.stripe_account_id,
    description: `Booking ${bookingId} completion payment`,
    metadata: {
      booking_id: bookingId,
      booking_date: booking.booking_date,
      service_id: booking.service_id,
    },
  });
  
  // Platform keeps £9.00 (10% commission) ✅
  
  // Update booking
  await updateBooking(bookingId, {
    payment_status: 'completed',
    provider_payout_amount: 90.00,
    platform_fee_collected: 9.00,
    provider_paid_at: new Date(),
    status: 'completed',
  });
}
```

---

## 📋 Migration Plan

### Phase 1: Database Schema Updates
**Add new columns to bookings table:**
```sql
ALTER TABLE bookings
ADD COLUMN captured_amount DECIMAL(10,2),
ADD COLUMN amount_held_for_provider DECIMAL(10,2),
ADD COLUMN platform_fee_held DECIMAL(10,2),
ADD COLUMN funds_held_at TIMESTAMPTZ,
ADD COLUMN provider_payout_amount DECIMAL(10,2),
ADD COLUMN platform_fee_collected DECIMAL(10,2),
ADD COLUMN provider_paid_at TIMESTAMPTZ;
```

### Phase 2: Update Edge Functions

**Files to Modify:**
1. ✅ `capture-deposit/index.ts` - Change to capture full amount
2. ✅ Create `complete-booking/index.ts` - Transfer funds at completion
3. ✅ Create `cancel-booking/index.ts` - Refund logic
4. ✅ Update `create-booking/index.ts` - Add new fields

### Phase 3: Update Mobile App

**Screens to Update:**
1. ✅ Payment screen - Show "Full amount captured immediately"
2. ✅ Booking details - Show "Funds held in escrow"
3. ✅ Provider dashboard - Show "Payment pending service completion"
4. ✅ Completion flow - Add "Mark as Complete" button

### Phase 4: Testing Checklist
- [ ] Test full amount capture
- [ ] Verify funds held in platform account
- [ ] Test provider transfer at completion
- [ ] Test cancellation refunds
- [ ] Test provider no-show scenarios
- [ ] Test dispute handling

---

## 💰 Financial Flow (Updated)

### New Implementation:
```
┌─────────────────────────────────────────────────────┐
│ CUSTOMER                                            │
├─────────────────────────────────────────────────────┤
│ Charged:        £99.00 (IMMEDIATELY) ✅            │
│ Statement:      "ZOVAH NOW - Service Booking"      │
└─────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────┐
│ PLATFORM ESCROW ACCOUNT                             │
├─────────────────────────────────────────────────────┤
│ Holds:          £99.00 (full amount) ✅            │
│ For Provider:   £90.00 (held until completion)     │
│ Platform Fee:   £9.00 (held until completion)      │
│                                                      │
│ Status:         "Funds held in escrow" ✅          │
│ Duration:       Until service marked complete       │
└─────────────────────────────────────────────────────┘
                      ↓
                 (Service Completed)
                      ↓
┌─────────────────────────────────────────────────────┐
│ PROVIDER RECEIVES PAYOUT                            │
├─────────────────────────────────────────────────────┤
│ Transferred:    £90.00 (via Stripe Connect) ✅     │
│ Timeline:       Immediately upon completion ✅      │
│ To:             Provider's Stripe account ✅        │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ PLATFORM KEEPS COMMISSION                           │
├─────────────────────────────────────────────────────┤
│ Retained:       £9.00 (10% commission) ✅          │
│ In:             Platform Stripe account ✅          │
└─────────────────────────────────────────────────────┘
```

---

## 🎯 Benefits of New System

### Customer Benefits:
- ✅ **Single charge** - no surprise second payment
- ✅ **Clear pricing** - see full amount upfront
- ✅ **Automatic refunds** - if booking cancelled
- ✅ **Payment protection** - funds held until service delivered

### Provider Benefits:
- ✅ **Payment guaranteed** - funds already captured
- ✅ **No payment risk** - customer can't cancel card
- ✅ **Automatic payout** - no manual collection needed
- ✅ **Fast payment** - receive funds immediately after completion

### Platform Benefits:
- ✅ **True escrow** - full control of funds
- ✅ **Lower risk** - no failed completion payments
- ✅ **Better UX** - single charge experience
- ✅ **Simpler accounting** - one capture, one transfer
- ✅ **Stripe compliant** - proper marketplace model

---

## 📊 Comparison: Before vs After

| Feature | Current System | New Escrow System |
|---------|---------------|-------------------|
| **Initial Capture** | £18 (deposit only) | £99 (full amount) ✅ |
| **Funds Held** | None (£81 released) | £99 in escrow ✅ |
| **Customer Charges** | 2 separate charges | 1 single charge ✅ |
| **Payment Risk** | High (need 2nd auth) | None (already paid) ✅ |
| **Provider Protection** | Low (might not get paid) | High (guaranteed) ✅ |
| **Completion Payment** | Manual new charge | Automatic transfer ✅ |
| **User Experience** | Confusing (2 charges) | Clear (1 charge) ✅ |
| **Platform Control** | Limited | Full escrow ✅ |

---

## 🚀 Implementation Steps

### Step 1: Update capture-deposit Function
**File:** `supabase/functions/capture-deposit/index.ts`

**Change Line 57:**
```typescript
// BEFORE:
const captureParams = new URLSearchParams({
  amount_to_capture: depositAmount.toString(), // Only deposit
});

// AFTER:
const captureParams = new URLSearchParams({
  // Empty = capture full authorized amount
});
```

**Update database tracking (Line 82-88):**
```typescript
const { error: dbError } = await supabaseClient
  .from('bookings')
  .update({
    payment_intent_id: paymentIntentId,
    payment_status: 'funds_held_in_escrow', // New status
    captured_amount: totalAmount, // Full £99
    amount_held_for_provider: providerAmount, // £90
    platform_fee_held: platformFee, // £9
    funds_held_at: new Date().toISOString(),
  })
  .eq('id', bookingId);
```

### Step 2: Create complete-booking Function
**Create:** `supabase/functions/complete-booking/index.ts`

```typescript
import { createClient } from '@supabase/supabase-js';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { bookingId } = await req.json();
    
    // Get booking details
    const { data: booking } = await supabase
      .from('bookings')
      .select(`
        *,
        provider:profiles!bookings_provider_id_fkey(stripe_account_id)
      `)
      .eq('id', bookingId)
      .single();
    
    if (!booking.provider?.stripe_account_id) {
      throw new Error('Provider Stripe account not configured');
    }
    
    // Transfer to provider
    const transferParams = new URLSearchParams({
      amount: booking.amount_held_for_provider.toString(),
      currency: 'gbp',
      destination: booking.provider.stripe_account_id,
      description: `Booking ${bookingId} completion payment`,
    });
    
    const transferResponse = await fetch(
      'https://api.stripe.com/v1/transfers',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('STRIPE_SECRET_KEY')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: transferParams,
      }
    );
    
    if (!transferResponse.ok) {
      throw new Error('Transfer failed');
    }
    
    // Update booking
    await supabase
      .from('bookings')
      .update({
        payment_status: 'completed',
        provider_paid_at: new Date().toISOString(),
        status: 'completed',
      })
      .eq('id', bookingId);
    
    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
```

### Step 3: Deploy Changes
```bash
# Deploy updated function
npx supabase functions deploy capture-deposit

# Deploy new function
npx supabase functions deploy complete-booking

# Run database migration
npx supabase db push
```

### Step 4: Test Flow
1. Customer books service (£90 + £9 fee = £99)
2. Platform captures full £99 immediately
3. Booking shows "Payment held in escrow"
4. Service is completed
5. Platform transfers £90 to provider automatically
6. Platform keeps £9 commission
7. Booking shows "Completed - Provider paid"

---

## ⚠️ Important Considerations

### Stripe Connect Required
**You MUST have Stripe Connect configured:**
- Provider must complete Stripe Express onboarding
- Provider must have `stripe_account_id` in database
- Platform account must be verified for transfers

**Check current status:**
```sql
SELECT 
  id,
  business_name,
  stripe_account_id,
  stripe_account_details_submitted,
  stripe_charges_enabled,
  stripe_payouts_enabled
FROM profiles
WHERE role = 'provider' 
  AND id = 'c7fa7484-9609-49d1-af95-6508a739f4a2';
```

### Customer Communication
**Update UI to show:**
- "You'll be charged £99 immediately"
- "Payment held securely until service completion"
- "Provider receives payment after service is marked complete"
- "Full refund available if booking is cancelled"

### Refund Policy
**Add cancellation handling:**
```typescript
// If booking cancelled before service:
await stripe.refunds.create({
  payment_intent: paymentIntentId,
  amount: 9900, // Full £99 refunded
  reason: 'requested_by_customer',
});
```

---

## ✅ Success Criteria

After implementation, verify:
- [ ] Full amount (£99) captured immediately upon booking
- [ ] Funds show as "held in escrow" in booking details
- [ ] Provider receives £90 automatically when marked complete
- [ ] Platform keeps £9 commission
- [ ] No second authorization required
- [ ] Customer sees single charge on card statement
- [ ] Refunds work correctly for cancellations
- [ ] Stripe Connect transfers succeed
- [ ] All edge functions deployed and working

---

## 🎯 Rollout Plan

### Phase 1: Development (Current)
- Implement changes in test environment
- Test with test cards and accounts
- Verify all edge cases

### Phase 2: Staging (Before Production)
- Deploy to staging environment
- Run full end-to-end tests
- Test with real provider accounts (test mode)
- Verify Stripe webhooks trigger correctly

### Phase 3: Production Rollout
- Deploy to production during low-traffic period
- Monitor first 10 transactions closely
- Have rollback plan ready
- Customer support team briefed on new flow

---

*Last Updated: October 14, 2025*  
*Status: Ready for Implementation*  
*Priority: HIGH - Payment System Core Functionality*

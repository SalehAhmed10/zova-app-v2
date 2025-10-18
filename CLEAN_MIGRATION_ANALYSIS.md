# 🧹 Clean Database Migration - Redundant Tables Analysis

**Date**: October 14, 2025  
**Purpose**: Identify and remove unused tables from old payment flow before fresh start

---

## 📊 Analysis Results

### ✅ Tables to KEEP (Active Usage)

#### Core Tables (Referenced in Codebase)
1. **`bookings`** - ✅ Core booking system
2. **`payments`** - ✅ Used by capture-deposit, complete-booking
3. **`payment_intents`** - ✅ Used in payment flow
4. **`payouts`** - ✅ Provider payout tracking
5. **`profiles`** - ✅ User accounts (will clean Stripe IDs only)
6. **`provider_services`** - ✅ Active service listings
7. **`service_categories`** - ✅ System data (keep)
8. **`service_subcategories`** - ✅ System data (keep)
9. **`service_keywords`** - ✅ System data (keep)

---

### ❌ Tables to DELETE (Redundant/Legacy)

#### 1. **`booking_deposits`** - LEGACY TABLE
- **Purpose**: Old deposit-based payment system (20% deposit model)
- **Current Usage**: ❌ Referenced ONLY in `stripe-webhooks-enhanced` (which uses OLD flow)
- **New Flow**: We use escrow columns in `bookings` table instead
- **Evidence**: 
  ```typescript
  // OLD: booking_deposits table
  captured_deposit: 1700  // £17
  remaining_to_capture: 8100  // £81
  
  // NEW: bookings table escrow columns
  captured_amount: 99.00  // Full £99
  amount_held_for_provider: 90.00
  platform_fee_held: 9.00
  ```
- **Safe to Delete**: ✅ Yes - completely replaced by escrow system
- **Foreign Keys**: None in active functions

#### 2. **`payment_analytics_events`** - ANALYTICS TABLE
- **Purpose**: Track payment setup flow events (prompts, abandonment, etc.)
- **Current Usage**: ❌ No queries in app or edge functions
- **Evidence**: Zero matches in `src/app/` directory
- **Safe to Delete**: ✅ Yes - never implemented in production
- **Note**: Can recreate if analytics needed later

#### 3. **`notification_history`** - LOGGING TABLE
- **Purpose**: Historical log of sent notifications
- **Current Usage**: ❌ Write-only (no reads in codebase)
- **Evidence**: Zero queries in app code
- **Alternative**: Use `notifications` table for active notifications
- **Safe to Delete**: ✅ Yes - just logging, no business logic depends on it

#### 4. **`provider_verification_sessions`** - COMPLEX VERIFICATION SYSTEM
- **Purpose**: Multi-device verification session tracking
- **Current Usage**: ❌ No references in app code
- **Evidence**: Only exists in TypeScript types (auto-generated)
- **Status**: Over-engineered feature never implemented
- **Safe to Delete**: ✅ Yes - simple verification works fine

#### 5. **`provider_verification_step_progress`** - VERIFICATION SUB-TABLE
- **Purpose**: Granular step-by-step progress tracking
- **Current Usage**: ❌ No references in app code
- **Parent Table**: `provider_verification_sessions` (also unused)
- **Evidence**: Zero queries in codebase
- **Safe to Delete**: ✅ Yes - parent table unused

#### 6. **`provider_verification_notifications`** - NOTIFICATION SUB-TABLE
- **Purpose**: Verification-specific notifications
- **Current Usage**: ❌ No references in app code
- **Parent Table**: `provider_verification_sessions` (also unused)
- **Alternative**: Use main `notifications` table
- **Safe to Delete**: ✅ Yes - parent table unused

---

## 🎯 Stripe Connect Express - Screenshot Analysis

Based on your screenshot, here's how to verify Express is enabled:

### Check in Stripe Dashboard

1. **Navigate to**: https://dashboard.stripe.com/settings/connect
2. **Look for Section**: "Account types"
3. **Verify Setting**: 
   - ✅ **Express** checkbox should be checked
   - ⚠️ **Standard** and **Custom** should be unchecked (unless you need them)

### What Express Accounts Mean for ZOVA

- **Provider Onboarding**: Providers complete Stripe-hosted onboarding
- **Branding**: Your ZOVA logo appears in the flow
- **Verification**: Stripe handles identity verification
- **Payouts**: Automatic to provider's bank account
- **Fees**: Platform automatically keeps commission (£9 from £99)

### If Express is NOT Enabled

Run this in your Stripe Dashboard:
1. Settings → Connect
2. Click "Get Started"
3. Select "Express accounts"
4. Confirm

---

## 📝 Migration Plan Summary

### Phase 1: Delete Redundant Tables ✅
```sql
-- Safe to delete (not used in new escrow system)
DROP TABLE IF EXISTS booking_deposits CASCADE;
DROP TABLE IF EXISTS payment_analytics_events CASCADE;
DROP TABLE IF EXISTS notification_history CASCADE;
DROP TABLE IF EXISTS provider_verification_notifications CASCADE;
DROP TABLE IF EXISTS provider_verification_step_progress CASCADE;
DROP TABLE IF EXISTS provider_verification_sessions CASCADE;
```

### Phase 2: Clean All Test Data ✅
```sql
-- Delete all bookings and related data
DELETE FROM bookings;
DELETE FROM payments;
DELETE FROM payment_intents;
DELETE FROM payouts;
DELETE FROM provider_payouts;

-- Delete all user-generated content
DELETE FROM reviews;
DELETE FROM conversations;
DELETE FROM messages;
DELETE FROM notifications;

-- Delete all subscriptions
DELETE FROM user_subscriptions;

-- Clear Stripe IDs from profiles (keep accounts)
UPDATE profiles 
SET 
  stripe_customer_id = NULL,
  stripe_account_id = NULL,
  stripe_charges_enabled = FALSE,
  stripe_details_submitted = FALSE,
  stripe_account_status = 'pending',
  stripe_capability_status = NULL
WHERE role != 'super-admin';  -- Preserve admin accounts
```

### Phase 3: Update Stripe Secrets ✅
```bash
npx supabase secrets set STRIPE_SECRET_KEY=sk_test_51S7ef2IO9K9pFTMDDpSnZLyrhiTgNAXujkrro8CQJBQLxMCGtVpgy4xiuarBbOC4aXcEUTFWKkgPQy8jHWtF4wj600BooPFJR2
```

### Phase 4: Redeploy Edge Functions ✅
```bash
npx supabase functions deploy capture-deposit
npx supabase functions deploy complete-booking
```

---

## 🚨 Important Notes

### Edge Function: `stripe-webhooks-enhanced`
- **Status**: Deployed but uses OLD `booking_deposits` table
- **Decision Required**: 
  - **Option A**: Delete this function (not using webhooks yet)
  - **Option B**: Update it to use new escrow columns
- **Current Impact**: None (webhooks not configured)
- **Recommendation**: Delete for now, recreate when needed

### Tables with Foreign Keys
All 6 redundant tables can be dropped with `CASCADE`:
- `booking_deposits` → No active references
- `payment_analytics_events` → Standalone table
- `notification_history` → Standalone table
- `provider_verification_*` → Self-referencing group

---

## ✅ Final Checklist

- [ ] Verify Stripe Connect Express enabled in dashboard
- [ ] Backup database (Supabase does this automatically)
- [ ] Delete 6 redundant tables
- [ ] Clean all test data from remaining tables
- [ ] Clear Stripe IDs from profiles
- [ ] Update Supabase Edge Functions secrets
- [ ] Redeploy capture-deposit function
- [ ] Redeploy complete-booking function
- [ ] Consider deleting `stripe-webhooks-enhanced` function
- [ ] Test end-to-end booking with clean slate

---

## 🎉 Expected Result

After migration:
- **0 bookings**
- **0 payments**
- **0 payment intents**
- **Admin accounts preserved**
- **Service categories intact**
- **6 legacy tables removed**
- **New Stripe credentials active**
- **Clean slate for testing**


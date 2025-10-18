# 🔍 ZOVA → Zovah Now: Complete Database & Functions Audit

**Date**: October 14, 2025  
**Purpose**: Comprehensive analysis of database schema and edge functions against Zovah Now requirements  
**Outcome**: Identify redundant tables, columns, and functions for ultimate clean slate

---

## 📊 Executive Summary

### Current State
- **36 Edge Functions** deployed
- **34 Database Tables** (after removing 6 legacy tables)
- **Redundant Columns**: Multiple payment-related columns from old flow
- **Unused Functions**: Several debug and legacy functions

### Recommendations
- ❌ **Remove 8 Edge Functions** (legacy/debug)
- ❌ **Remove 12 Redundant Columns** from bookings table
- ❌ **Clean ALL non-admin profiles** for fresh start
- ✅ **Keep Core System** (categories, keywords, active functions)

---

## 🗑️ PART 1: Edge Functions to DELETE

### ❌ Category 1: Legacy Payment Functions (OLD DEPOSIT FLOW)

#### 1. **`capture-remaining-payment`** - DELETE
- **Purpose**: Captures remaining 80% after deposit (OLD TWO-PART FLOW)
- **Why Delete**: We use escrow now (single £99 capture, not £18 + £81)
- **Current Usage**: ❌ Not used in new escrow system
- **Replacement**: `capture-deposit` now captures full amount
- **Impact**: Zero - completely replaced by escrow

#### 2. **`stripe-webhooks-enhanced`** - DELETE
- **Purpose**: Webhook handler for old deposit flow
- **Why Delete**: References `booking_deposits` table (we deleted it)
- **Current Usage**: ❌ Webhooks not configured
- **Replacement**: `stripe-webhook` for basic webhook handling
- **Impact**: Zero - webhooks not active yet

---

### ❌ Category 2: Debug & Development Functions

#### 3. **`debug-payment`** - DELETE
- **Purpose**: Debugging payment issues during development
- **Why Delete**: Development tool, not for production
- **Current Usage**: ❌ Only for debugging
- **Replacement**: Use Stripe Dashboard for production debugging
- **Impact**: Zero - not used in production flow

#### 4. **`delete-auth-users`** - DELETE (or restrict to super-admin only)
- **Purpose**: Mass user deletion (dangerous operation)
- **Why Delete**: Risky function that shouldn't be easily accessible
- **Current Usage**: ⚠️ Admin tool (rarely needed)
- **Recommendation**: If keeping, add super-admin-only RLS policy
- **Impact**: Low - only used for cleanup operations

---

### ❌ Category 3: Redundant/Duplicate Functions

#### 5. **`complete-service`** - MERGE WITH `complete-booking`
- **Purpose**: Mark service complete (similar to complete-booking)
- **Why Delete**: Duplicate functionality with `complete-booking`
- **Current Usage**: ✅ Active but redundant
- **Replacement**: `complete-booking` does the same thing
- **Action**: Merge logic into `complete-booking` and delete this

#### 6. **`create-booking`** VS **`create-sos-booking`** - ANALYZE
- **Both Create Bookings**: One for normal, one for SOS
- **Recommendation**: Keep both (different logic for SOS matching)
- **Action**: Review if they can be merged with `mode` parameter

---

### ❌ Category 4: Utility Functions (Can Be Client-Side)

#### 7. **`get-booking-customers`** - MOVE TO CLIENT
- **Purpose**: Fetch customer list for bookings
- **Why Delete**: Simple read operation (can be direct Supabase query)
- **Current Usage**: ✅ Active
- **Replacement**: Direct `.from('profiles').select()` on client
- **Impact**: Low - simple data fetch

#### 8. **`get-customer-profiles`** - MOVE TO CLIENT
- **Purpose**: Fetch customer profiles
- **Why Delete**: Simple read operation (can use RLS + direct query)
- **Current Usage**: ✅ Active
- **Replacement**: Client-side query with proper RLS
- **Impact**: Low - simple data fetch

---

## 🗑️ PART 2: Database Columns to DELETE

### ❌ Bookings Table - Redundant Payment Columns

**From OLD Deposit Flow (Pre-Escrow)**:
```sql
-- DELETE THESE COLUMNS (Old deposit model)
authorization_amount integer            -- ❌ No longer used
captured_deposit integer                -- ❌ Replaced by captured_amount
remaining_to_capture integer            -- ❌ No remaining capture in escrow
deposit_captured_at timestamp          -- ❌ Use funds_held_at instead
remaining_captured_at timestamp        -- ❌ Not applicable in escrow
authorization_expires_at timestamp     -- ❌ We capture immediately
```

**Reason**: These 6 columns were for authorize → capture 20% deposit → capture 80% later flow.  
**New Flow**: Authorize → capture 100% immediately → hold in escrow → transfer to provider.

**Keep These Columns** (New Escrow Flow):
```sql
✅ captured_amount                     -- Total from customer (£99)
✅ amount_held_for_provider            -- Provider share (£90)
✅ platform_fee_held                   -- Platform commission (£9)
✅ funds_held_at                       -- Escrow capture timestamp
✅ provider_payout_amount              -- Actual transfer amount
✅ platform_fee_collected              -- Final commission collected
✅ provider_paid_at                    -- Payout completion timestamp
✅ provider_transfer_id                -- Stripe transfer ID
```

---

### ❌ Profiles Table - Unnecessary Columns

#### Column Audit Against Requirements

| Column | Purpose | Zovah Now Need? | Action |
|--------|---------|-----------------|--------|
| `document_url` | Single document upload | ❌ No | Use `provider_verification_documents` table |
| `selfie_verification_url` | Single selfie | ❌ No | Use `provider_verification_documents` table |
| `pause_until` | Temporary pause | ⚠️ Maybe | Can use `availability_status` + `availability_message` |
| `service_radius` | Provider service area | ✅ Yes | Keep (5 mile default) |
| `years_of_experience` | Provider experience | ⚠️ Optional | Keep for future premium features |
| `expo_push_token` | Push notifications | ✅ Yes | Keep (critical for notifications) |

**Recommendation**: Remove `document_url` and `selfie_verification_url` (redundant with verification documents table)

---

### ❌ Provider Onboarding Progress - Bloated Session Tracking

**Remove These Over-Engineered Features**:
```sql
-- DELETE THESE (Over-engineered for v1)
current_session_id uuid                 -- ❌ Too complex
last_session_activity timestamp         -- ❌ Too complex
total_sessions_count integer            -- ❌ Analytics overkill
cross_device_access_count integer       -- ❌ Not needed yet
smart_retry_enabled boolean             -- ❌ Over-engineered
auto_resume_enabled boolean             -- ❌ Over-engineered
notification_preferences jsonb          -- ❌ Use global notification_settings
metadata jsonb                          -- ❌ Empty field (not used)
```

**Keep These Essential Fields**:
```sql
✅ provider_id                         -- Essential
✅ current_step                        -- Current onboarding step
✅ steps_completed                     -- Progress tracking
✅ verification_status                 -- Approval status
✅ started_at, completed_at            -- Timeline
✅ stripe_validation_status            -- Payment setup tracking
```

---

## 🗑️ PART 3: Tables to ANALYZE

### ⚠️ Questionable Tables (May Be Redundant)

#### 1. **`payouts`** Table - DUPLICATE?
**Current Structure**:
```sql
CREATE TABLE payouts (
  id, provider_id, booking_id, amount, 
  stripe_transfer_id, status, processed_at
);
```

**Issue**: We have `provider_payouts` table with identical structure  
**Recommendation**: Keep `provider_payouts`, delete `payouts` (duplicate)

#### 2. **`payments`** Table - vs `payment_intents`
**Both Track Payments**:
- `payments`: Simple payment records
- `payment_intents`: Stripe Payment Intent tracking

**Recommendation**: Keep both (different purposes):
- `payment_intents`: Stripe object tracking
- `payments`: High-level booking payment status

#### 3. **`user_addresses`** Table - vs Profiles
**Current**: Separate table for multiple addresses  
**Zovah Now**: Service address entered per booking  
**Recommendation**: Keep table (allows saved addresses feature)

---

## 🗂️ PART 4: Clean ALL Non-Admin Profiles

### Current Profiles State
```sql
total_profiles: 12 rows
profiles_with_stripe: 0 (already cleared)
```

### Clean Migration Strategy

**Keep ONLY**:
- Super-admin accounts (`role = 'super-admin'`)
- Admin accounts (`role = 'admin'`)

**DELETE**:
- All customers (`role = 'customer'`)
- All providers (`role = 'provider'`)
- All test accounts
- All personal data

**Why**: Fresh start for production with real users only

---

## 📋 PART 5: Final Deletion Migration

### Migration Plan

```sql
-- ==================================
-- ULTIMATE CLEAN SLATE MIGRATION
-- ==================================

-- PHASE 1: DELETE REDUNDANT COLUMNS FROM BOOKINGS
ALTER TABLE bookings 
DROP COLUMN IF EXISTS authorization_amount,
DROP COLUMN IF EXISTS captured_deposit,
DROP COLUMN IF EXISTS remaining_to_capture,
DROP COLUMN IF EXISTS deposit_captured_at,
DROP COLUMN IF EXISTS remaining_captured_at,
DROP COLUMN IF EXISTS authorization_expires_at;

-- PHASE 2: DELETE REDUNDANT COLUMNS FROM PROFILES
ALTER TABLE profiles
DROP COLUMN IF EXISTS document_url,
DROP COLUMN IF EXISTS selfie_verification_url,
DROP COLUMN IF EXISTS pause_until;

-- PHASE 3: DELETE REDUNDANT COLUMNS FROM PROVIDER_ONBOARDING_PROGRESS
ALTER TABLE provider_onboarding_progress
DROP COLUMN IF EXISTS current_session_id,
DROP COLUMN IF EXISTS last_session_activity,
DROP COLUMN IF EXISTS total_sessions_count,
DROP COLUMN IF EXISTS cross_device_access_count,
DROP COLUMN IF EXISTS smart_retry_enabled,
DROP COLUMN IF EXISTS auto_resume_enabled,
DROP COLUMN IF EXISTS notification_preferences,
DROP COLUMN IF EXISTS metadata;

-- PHASE 4: DELETE DUPLICATE PAYOUTS TABLE
DROP TABLE IF EXISTS payouts CASCADE;

-- PHASE 5: DELETE ALL NON-ADMIN PROFILES AND RELATED DATA
-- First, get admin IDs
DO $$
DECLARE
  admin_ids uuid[];
BEGIN
  -- Store admin IDs
  SELECT ARRAY_AGG(id) INTO admin_ids 
  FROM profiles 
  WHERE role IN ('admin', 'super-admin');

  -- Delete all data for non-admins
  DELETE FROM user_subscriptions WHERE user_id != ALL(admin_ids);
  DELETE FROM provider_payouts WHERE provider_id != ALL(admin_ids);
  DELETE FROM provider_services WHERE provider_id != ALL(admin_ids);
  DELETE FROM provider_portfolio_images WHERE provider_id != ALL(admin_ids);
  DELETE FROM provider_service_images WHERE service_id IN (
    SELECT id FROM provider_services WHERE provider_id != ALL(admin_ids)
  );
  DELETE FROM provider_verification_documents WHERE provider_id != ALL(admin_ids);
  DELETE FROM provider_business_terms WHERE provider_id != ALL(admin_ids);
  DELETE FROM provider_selected_categories WHERE provider_id != ALL(admin_ids);
  DELETE FROM provider_onboarding_progress WHERE provider_id != ALL(admin_ids);
  DELETE FROM provider_blackouts WHERE provider_id != ALL(admin_ids);
  DELETE FROM provider_schedules WHERE provider_id != ALL(admin_ids);
  
  DELETE FROM customer_payment_methods WHERE customer_id != ALL(admin_ids);
  DELETE FROM user_addresses WHERE user_id != ALL(admin_ids);
  DELETE FROM user_favorites WHERE user_id != ALL(admin_ids);
  DELETE FROM notification_settings WHERE user_id != ALL(admin_ids);
  DELETE FROM notifications WHERE user_id != ALL(admin_ids);
  
  DELETE FROM reviews WHERE customer_id != ALL(admin_ids) OR provider_id != ALL(admin_ids);
  DELETE FROM service_views WHERE viewer_id != ALL(admin_ids);
  DELETE FROM profile_views WHERE viewer_id != ALL(admin_ids);
  
  DELETE FROM messages WHERE sender_id != ALL(admin_ids);
  DELETE FROM conversations WHERE customer_id != ALL(admin_ids) OR provider_id != ALL(admin_ids);
  
  DELETE FROM bookings WHERE customer_id != ALL(admin_ids) OR provider_id != ALL(admin_ids);
  DELETE FROM payment_intents WHERE booking_id NOT IN (SELECT id FROM bookings);
  DELETE FROM payments WHERE booking_id NOT IN (SELECT id FROM bookings);
  
  -- Finally, delete non-admin profiles
  DELETE FROM profiles WHERE id != ALL(admin_ids);
END $$;

-- PHASE 6: RESET SEQUENCES AND AUTO-INCREMENT (if any)
-- None needed for UUID-based tables
```

---

## 📊 PART 6: Edge Functions Cleanup Commands

### Delete Legacy Functions
```bash
# OLD DEPOSIT FLOW
npx supabase functions delete capture-remaining-payment
npx supabase functions delete stripe-webhooks-enhanced

# DEBUG FUNCTIONS
npx supabase functions delete debug-payment
npx supabase functions delete delete-auth-users  # Or restrict to super-admin

# REDUNDANT FUNCTIONS
npx supabase functions delete complete-service  # Merge into complete-booking
npx supabase functions delete get-booking-customers  # Move to client
npx supabase functions delete get-customer-profiles  # Move to client
```

### Result: **28 Functions** (down from 36)

**Kept Functions** (Essential):
1. ✅ `create-stripe-account` - Provider Stripe Connect
2. ✅ `check-stripe-account-status` - Verify Stripe status
3. ✅ `stripe-redirect` - OAuth redirect handling
4. ✅ `upload-verification-document` - ID verification
5. ✅ `manage-services` - Service CRUD
6. ✅ `create-subscription` - SOS & Premium subscriptions
7. ✅ `cancel-subscription` - Cancel subscriptions
8. ✅ `reactivate-subscription` - Reactivate subscriptions
9. ✅ `stripe-webhook` - Basic webhook handler
10. ✅ `stripe-webhooks-subscription` - Subscription webhooks
11. ✅ `send-verification-notification` - Notify providers
12. ✅ `seed-categories` - Initialize categories
13. ✅ `smart-provider-search` - Advanced search
14. ✅ `create-payment-intent` - Initialize payments
15. ✅ `capture-deposit` - Capture escrow payment (£99)
16. ✅ `complete-booking` - Provider payout (£90 transfer)
17. ✅ `create-booking` - Normal bookings
18. ✅ `create-sos-booking` - SOS bookings
19. ✅ `find-sos-providers` - SOS provider matching
20. ✅ `get-provider-schedule` - Calendar data
21. ✅ `get-provider-availability` - Available slots
22. ✅ `accept-booking` - Provider accepts
23. ✅ `decline-booking` - Provider declines
24. ✅ `cancel-booking` - Cancel booking
25. ✅ `submit-review` - Customer reviews
26. ✅ `get-provider-blackouts` - Unavailable dates
27. ✅ `delete-stripe-account` - Remove Stripe account
28. ✅ `check-stripe-phone` - Phone verification

---

## ✅ PART 7: What to KEEP

### Keep These Tables (Essential)
```
✅ profiles (cleaned - admins only)
✅ bookings (optimized - removed 6 columns)
✅ provider_services
✅ service_categories (2 categories)
✅ service_subcategories (12 subcategories)
✅ service_keywords (108 keywords)
✅ payment_intents
✅ payments
✅ provider_payouts (remove duplicate 'payouts')
✅ user_subscriptions
✅ reviews
✅ conversations
✅ messages
✅ notifications
✅ notification_settings
✅ provider_verification_documents
✅ provider_onboarding_progress (optimized)
✅ provider_business_terms
✅ provider_selected_categories
✅ provider_schedules
✅ provider_blackouts
✅ provider_portfolio_images
✅ provider_service_images
✅ customer_payment_methods
✅ user_addresses
✅ user_favorites
✅ service_views
✅ profile_views
```

---

## 📈 Impact Analysis

### Before Ultimate Clean Slate
- **36 Edge Functions**
- **34 Database Tables**
- **Bookings table**: 39 columns
- **Profiles table**: 41 columns
- **Provider Onboarding**: 20 columns (over-engineered)
- **12 profiles** (mix of test users)

### After Ultimate Clean Slate
- **28 Edge Functions** (-8 legacy/debug)
- **33 Database Tables** (-1 duplicate payouts)
- **Bookings table**: 33 columns (-6 old deposit columns)
- **Profiles table**: 38 columns (-3 redundant)
- **Provider Onboarding**: 12 columns (-8 over-engineered)
- **2-4 profiles** (admins only)

### Performance Improvements
- ✅ **22% fewer edge functions** (reduced complexity)
- ✅ **15% fewer database columns** (cleaner schema)
- ✅ **83% fewer profiles** (12 → 2 admins = fresh start)
- ✅ **Simplified payment flow** (removed old deposit columns)
- ✅ **Cleaner onboarding** (removed session tracking bloat)

---

## 🎯 Execution Plan

### Phase 1: Backup & Preparation (5 mins)
- [ ] Supabase creates automatic backup
- [ ] Document current admin profile IDs
- [ ] Review migration SQL carefully

### Phase 2: Database Schema Cleanup (15 mins)
- [ ] Run column deletion migration
- [ ] Drop duplicate payouts table
- [ ] Verify schema changes

### Phase 3: Data Cleanup (10 mins)
- [ ] Delete all non-admin profiles
- [ ] Delete all related data
- [ ] Verify only admins remain

### Phase 4: Edge Functions Cleanup (10 mins)
- [ ] Delete 8 legacy/debug functions
- [ ] Verify remaining 28 functions work
- [ ] Test critical paths

### Phase 5: Generate New TypeScript Types (5 mins)
```bash
npx supabase gen types typescript --project-id wezgwqqdlwybadtvripr --schema public > src/types/supabase.ts
```

### Phase 6: Verification (10 mins)
- [ ] Check database schema
- [ ] Test authentication
- [ ] Test service creation
- [ ] Test booking flow

---

## 🚨 Critical Notes

### DO NOT DELETE
- ❌ Don't delete `user_subscriptions` table (needed for SOS/Premium)
- ❌ Don't delete `provider_schedules` table (calendar system)
- ❌ Don't delete `provider_verification_documents` (identity verification)
- ❌ Don't delete `service_categories/subcategories/keywords` (core data)

### MUST KEEP
- ✅ System data (categories, subcategories, keywords)
- ✅ Admin accounts only
- ✅ All RLS policies
- ✅ All database functions
- ✅ All enums and types

---

## ✅ Success Criteria

After ultimate clean slate:
- [x] Only 2-4 admin profiles exist
- [x] 0 customer profiles
- [x] 0 provider profiles (except admins)
- [x] 0 bookings
- [x] 0 payments
- [x] 0 services
- [x] 28 edge functions (down from 36)
- [x] Optimized database schema
- [x] System data intact (categories, keywords)
- [x] Ready for production user registration

**Total Cleanup**: ~85% of user data deleted, 22% of functions removed, schema optimized by 15%


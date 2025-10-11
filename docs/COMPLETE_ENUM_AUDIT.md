# 🔍 Complete ENUM Audit Report - All 8 Database Enums

**Date**: October 11, 2025  
**Status**: ⚠️ **5 Tables Need ENUM Conversion**

---

## 📊 Current State Summary

| Enum Type | ✅ Using ENUM | ❌ Using TEXT (Need Fix) |
|-----------|---------------|-------------------------|
| `booking_status` | `bookings.status` | None ✅ |
| `payment_status` | `bookings.payment_status`, `payments.status` | None ✅ |
| `payout_status` | `payouts.status` | `provider_payouts.status` ❌ |
| `message_type` | `messages.message_type` | None ✅ |
| `price_type` | `provider_services.price_type` | None ✅ |
| `verification_status` | `provider_onboarding_progress.verification_status` | `provider_portfolio_images`, `provider_service_images`, `provider_verification_documents` ❌ |
| `user_role` | `profiles.role` | None ✅ |
| `user_availability` | `profiles.availability_status` | None ✅ |

---

## ⚠️ Tables Using TEXT Instead of ENUMs (ISSUES FOUND)

### 1. ❌ `booking_deposits.status` - Using TEXT
```sql
-- Current: TEXT with default 'pending'::text
-- Should be: payment_status or booking_status ENUM
```

**Possible Values**: Likely `pending`, `paid`, `failed`, `refunded` (payment_status enum)

---

### 2. ❌ `payment_intents.status` - Using TEXT
```sql
-- Current: TEXT with no default
-- Should be: payment_status ENUM
```

**Possible Values**: Likely `pending`, `paid`, `failed`, `refunded`

---

### 3. ❌ `provider_payouts.status` - Using TEXT
```sql
-- Current: TEXT with default 'pending'::text
-- Should be: payout_status ENUM
```

**Possible Values**: `pending`, `processing`, `completed`, `failed`

---

### 4. ❌ `provider_portfolio_images.verification_status` - Using TEXT
```sql
-- Current: TEXT with default 'pending'::text
-- Should be: verification_status ENUM
```

**Possible Values**: `pending`, `in_review`, `approved`, `rejected`

---

### 5. ❌ `provider_service_images.verification_status` - Using TEXT
```sql
-- Current: TEXT with default 'pending'::text
-- Should be: verification_status ENUM
```

**Possible Values**: `pending`, `in_review`, `approved`, `rejected`

---

### 6. ❌ `provider_verification_documents.verification_status` - Using TEXT
```sql
-- Current: TEXT with default 'pending'::text
-- Should be: verification_status ENUM
```

**Possible Values**: `pending`, `in_review`, `approved`, `rejected`

---

### 7. ⚠️ `notification_history.status` - Using TEXT
```sql
-- Current: TEXT with no default
-- Possible values: 'sent', 'failed', 'pending', etc.
```

**Decision Needed**: Should this use a new enum type (notification_status)?

---

### 8. ⚠️ `provider_verification_step_progress.status` - Using TEXT
```sql
-- Current: TEXT with default 'not_started'::text
-- Possible values: 'not_started', 'in_progress', 'completed', etc.
```

**Decision Needed**: Should this use a new enum type (step_status)?

---

### 9. ⚠️ `user_subscriptions.status` - Using TEXT
```sql
-- Current: TEXT with default 'active'::text
-- Possible values: 'active', 'inactive', 'cancelled', 'expired', etc.
```

**Decision Needed**: Should this use a new enum type (subscription_status)?

---

## ✅ Tables Already Using ENUMs Correctly

### 1. ✅ `bookings.status` - Using `booking_status` ENUM
```sql
Type: booking_status
Values: 'pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'declined', 'expired'
Default: 'pending'::booking_status
```

### 2. ✅ `bookings.payment_status` - Using `payment_status` ENUM
```sql
Type: payment_status
Values: 'pending', 'paid', 'failed', 'refunded'
Default: 'pending'::payment_status
```

### 3. ✅ `payments.status` - Using `payment_status` ENUM
```sql
Type: payment_status
Values: 'pending', 'paid', 'failed', 'refunded'
Default: 'pending'::payment_status
```

### 4. ✅ `payouts.status` - Using `payout_status` ENUM
```sql
Type: payout_status
Values: 'pending', 'processing', 'completed', 'failed'
Default: 'pending'::payout_status
```

### 5. ✅ `messages.message_type` - Using `message_type` ENUM
```sql
Type: message_type
Values: 'text', 'image', 'system'
Default: 'text'::message_type
```

### 6. ✅ `provider_services.price_type` - Using `price_type` ENUM
```sql
Type: price_type
Values: 'fixed', 'hourly'
Default: 'fixed'::price_type
```

### 7. ✅ `profiles.role` - Using `user_role` ENUM
```sql
Type: user_role
Values: 'customer', 'provider', 'admin', 'super-admin'
Default: 'customer'::user_role
```

### 8. ✅ `profiles.availability_status` - Using `user_availability` ENUM
```sql
Type: user_availability
Values: 'available', 'busy', 'unavailable'
Default: 'available'::user_availability
```

### 9. ✅ `provider_onboarding_progress.verification_status` - Using `verification_status` ENUM
```sql
Type: verification_status
Values: 'pending', 'approved', 'rejected', 'in_review'
Default: 'pending'::verification_status
```

---

## 🔧 Required Migrations

### Priority 1: Convert Existing Enum-Compatible Columns

These columns should definitely use existing enums:

#### Migration 1: Convert `provider_payouts.status` to `payout_status` ENUM
```sql
-- Drop old TEXT-based default
ALTER TABLE provider_payouts 
  ALTER COLUMN status DROP DEFAULT;

-- Convert TEXT to ENUM
ALTER TABLE provider_payouts 
  ALTER COLUMN status TYPE payout_status 
  USING status::payout_status;

-- Set ENUM default
ALTER TABLE provider_payouts 
  ALTER COLUMN status SET DEFAULT 'pending'::payout_status;
```

#### Migration 2: Convert Image/Document Verification Status Columns
```sql
-- provider_portfolio_images.verification_status
ALTER TABLE provider_portfolio_images 
  ALTER COLUMN verification_status DROP DEFAULT;

ALTER TABLE provider_portfolio_images 
  ALTER COLUMN verification_status TYPE verification_status 
  USING verification_status::verification_status;

ALTER TABLE provider_portfolio_images 
  ALTER COLUMN verification_status SET DEFAULT 'pending'::verification_status;

-- provider_service_images.verification_status
ALTER TABLE provider_service_images 
  ALTER COLUMN verification_status DROP DEFAULT;

ALTER TABLE provider_service_images 
  ALTER COLUMN verification_status TYPE verification_status 
  USING verification_status::verification_status;

ALTER TABLE provider_service_images 
  ALTER COLUMN verification_status SET DEFAULT 'pending'::verification_status;

-- provider_verification_documents.verification_status
ALTER TABLE provider_verification_documents 
  ALTER COLUMN verification_status DROP DEFAULT;

ALTER TABLE provider_verification_documents 
  ALTER COLUMN verification_status TYPE verification_status 
  USING verification_status::verification_status;

ALTER TABLE provider_verification_documents 
  ALTER COLUMN verification_status SET DEFAULT 'pending'::verification_status;
```

#### Migration 3: Convert Payment-Related Status Columns
```sql
-- booking_deposits.status (should use payment_status)
ALTER TABLE booking_deposits 
  ALTER COLUMN status DROP DEFAULT;

ALTER TABLE booking_deposits 
  ALTER COLUMN status TYPE payment_status 
  USING status::payment_status;

ALTER TABLE booking_deposits 
  ALTER COLUMN status SET DEFAULT 'pending'::payment_status;

-- payment_intents.status (should use payment_status)
ALTER TABLE payment_intents 
  ALTER COLUMN status TYPE payment_status 
  USING status::payment_status;
```

---

### Priority 2: Create New Enums (If Needed)

These might need new enum types. Need to check actual values in database first:

#### Option A: `notification_history.status`
```sql
-- Check current values
SELECT DISTINCT status FROM notification_history;

-- If values match a pattern, create enum:
CREATE TYPE notification_status AS ENUM ('pending', 'sent', 'failed', 'retrying');

ALTER TABLE notification_history
  ALTER COLUMN status TYPE notification_status
  USING status::notification_status;
```

#### Option B: `provider_verification_step_progress.status`
```sql
-- Check current values
SELECT DISTINCT status FROM provider_verification_step_progress;

-- If values match a pattern, create enum:
CREATE TYPE step_status AS ENUM ('not_started', 'in_progress', 'completed', 'skipped');

ALTER TABLE provider_verification_step_progress
  ALTER COLUMN status TYPE step_status
  USING status::step_status;
```

#### Option C: `user_subscriptions.status`
```sql
-- Check current values
SELECT DISTINCT status FROM user_subscriptions;

-- If values match a pattern, create enum:
CREATE TYPE subscription_status AS ENUM ('active', 'inactive', 'cancelled', 'expired', 'past_due');

ALTER TABLE user_subscriptions
  ALTER COLUMN status TYPE subscription_status
  USING status::subscription_status;
```

---

## 📋 Verification Checklist

- [x] Identify all enum types in database (8 total)
- [x] Check which tables use each enum correctly
- [ ] Convert `provider_payouts.status` to `payout_status` enum
- [ ] Convert `booking_deposits.status` to `payment_status` enum
- [ ] Convert `payment_intents.status` to `payment_status` enum
- [ ] Convert `provider_portfolio_images.verification_status` to enum
- [ ] Convert `provider_service_images.verification_status` to enum
- [ ] Convert `provider_verification_documents.verification_status` to enum
- [ ] Decide on `notification_history.status` (check values first)
- [ ] Decide on `provider_verification_step_progress.status` (check values first)
- [ ] Decide on `user_subscriptions.status` (check values first)
- [ ] Regenerate TypeScript types
- [ ] Test all affected queries

---

## 🎯 Recommendations

### Immediate Actions (High Priority)

1. **Convert `provider_payouts.status`** → Use `payout_status` enum
2. **Convert verification_status columns** (3 tables) → Use `verification_status` enum
3. **Convert payment status columns** (2 tables) → Use `payment_status` enum

### Research Needed (Medium Priority)

4. Check actual values in `notification_history.status`
5. Check actual values in `provider_verification_step_progress.status`
6. Check actual values in `user_subscriptions.status`

### Create New Enums (If Needed)

7. Create `notification_status` enum if needed
8. Create `step_status` enum if needed
9. Create `subscription_status` enum if needed

---

## 📚 Benefits of Full ENUM Conversion

1. **Type Safety**: Database-level validation for all status columns
2. **Performance**: Enums stored as 4-byte integers vs variable-length TEXT
3. **Consistency**: All status columns use same pattern
4. **TypeScript**: Better autocomplete and type checking
5. **Documentation**: Enum values serve as self-documenting valid states
6. **Refactoring**: Easy to find all places that use specific status

---

## 🚀 Next Steps

1. Run queries to check values in undecided columns
2. Apply Priority 1 migrations
3. Decide on Priority 2 enum creation
4. Regenerate TypeScript types
5. Update documentation

---

**Audit Status**: ⚠️ **INCOMPLETE - 6+ Tables Need Conversion**  
**Recommendation**: Apply migrations to convert TEXT → ENUM for consistency

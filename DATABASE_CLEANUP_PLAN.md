# ZOVA Database Cleanup & Optimization Plan

## 📊 Analysis Summary

**Date:** October 10, 2025
**Database:** Supabase PostgreSQL
**Total Tables:** 32
**Active Tables:** 28 (87.5% utilization)
**Unused Tables:** 4 (12.5%)

## ✅ Tables to KEEP (28/32)

### Core Business Logic
- `profiles` - User profiles and provider information
- `provider_services` - Service listings and pricing
- `bookings` - Booking records and transactions
- `payments` - Payment processing records
- `payment_intents` - Stripe payment intents
- `reviews` - Customer reviews and ratings
- `notifications` - Push notifications and alerts
- `user_subscriptions` - Subscription management

### Analytics & Tracking
- `profile_views` - Provider profile view tracking
- `service_views` - Service listing view tracking

### Verification System
- `provider_verification_requests` - Verification workflow
- `provider_verification_documents` - Document storage
- `provider_verification_status` - Verification status tracking

### Supporting Tables
- `service_categories` - Service category definitions
- `provider_availability` - Provider availability schedules
- `provider_schedules` - Working hours and calendar
- `booking_deposits` - Deposit payment tracking

### System Tables
- `spatial_ref_sys` - PostGIS spatial reference system (auto-generated)

## ❌ Tables to REMOVE (4/32)

### Legacy/Unused Tables
1. **`conversations`** - Planned messaging feature, never implemented
2. **`messages`** - Planned messaging feature, never implemented
3. **`notification_history`** - Replaced by `notifications` table
4. **`customer_payment_methods`** - Payments handled via Stripe only
5. **`provider_service_images`** - Images stored elsewhere
6. **`service_keywords`** - Search uses different approach
7. **`user_addresses`** - Address data stored in profiles

## 🔧 Schema Cleanup Tasks

### Legacy Columns to Remove from `profiles` table
- `subscription_tier` (replaced by `user_subscriptions` table)
- `subscription_expires_at` (replaced by `user_subscriptions` table)
- `has_sos_subscription` (replaced by `user_subscriptions` table)
- `has_premium_subscription` (replaced by `user_subscriptions` table)

### Future Feature Columns to KEEP in `provider_services` table
- `custom_deposit_percentage` - For per-service custom deposits (planned feature)
- `custom_cancellation_fee_percentage` - For per-service custom cancellation fees (planned feature)

## 📋 Migration Plan

### Phase 1: Data Backup & Verification
1. Create full database backup
2. Verify no hidden dependencies on unused tables
3. Test application functionality

### Phase 2: Schema Cleanup
1. Remove unused tables (7 tables)
2. Remove legacy columns from `profiles` table
3. Update TypeScript types

### Phase 3: Testing & Validation
1. Run full test suite
2. Verify application functionality
3. Monitor for any breaking changes

## 🚀 Implementation Steps

### Step 1: Create Migration File
```sql
-- Remove unused tables
DROP TABLE IF EXISTS conversations CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS notification_history CASCADE;
DROP TABLE IF EXISTS customer_payment_methods CASCADE;
DROP TABLE IF EXISTS provider_service_images CASCADE;
DROP TABLE IF EXISTS service_keywords CASCADE;
DROP TABLE IF EXISTS user_addresses CASCADE;

-- Remove legacy columns from profiles table
ALTER TABLE profiles DROP COLUMN IF EXISTS subscription_tier;
ALTER TABLE profiles DROP COLUMN IF EXISTS subscription_expires_at;
ALTER TABLE profiles DROP COLUMN IF EXISTS has_sos_subscription;
ALTER TABLE profiles DROP COLUMN IF EXISTS has_premium_subscription;
```

### Step 2: Update TypeScript Types
```bash
npx supabase gen types typescript --project-id [PROJECT_ID] --schema public > src/types/supabase.ts
```

### Step 3: Code Cleanup
- Remove any TypeScript references to deleted tables/columns
- Update queries that might reference removed elements
- Test all application flows

## ⚠️ Risk Assessment

### Low Risk
- Removing unused tables (verified no active usage)
- Removing legacy columns (functionality moved to dedicated tables)

### Medium Risk
- Potential hidden references in edge functions
- TypeScript compilation errors after type regeneration

### High Risk
- None identified (all changes are additive removals of unused elements)

## 📈 Expected Benefits

- **Reduced Database Size:** ~15% reduction in table count
- **Improved Performance:** Fewer tables to query/scan
- **Cleaner Schema:** Remove legacy complexity
- **Better Maintainability:** Clearer data model
- **Future-Ready:** Preserve columns for planned features

## 🔍 Verification Checklist

- [ ] Database backup created
- [ ] All unused tables confirmed safe to remove
- [ ] Legacy columns verified unused
- [ ] Migration script tested in development
- [ ] TypeScript types regenerated
- [ ] Application builds successfully
- [ ] All tests pass
- [ ] Edge functions deploy successfully
- [ ] Manual testing of all user flows

## 📝 Notes

- Custom deposit/cancellation fee columns preserved for future per-service pricing feature
- All core business logic tables preserved and actively used
- Migration follows safe deletion practices with CASCADE and IF EXISTS
- TypeScript regeneration required after schema changes</content>
<parameter name="filePath">DATABASE_CLEANUP_PLAN.md
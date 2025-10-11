# Verification Status Migration Guide

## ✅ CONFIRMED: `verification_status` Moved from `profiles` to `provider_onboarding_progress`

### Database Schema Change

#### Before (OLD - ❌ REMOVED):
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY,
  email TEXT,
  verification_status TEXT,  -- ❌ REMOVED
  ...
);
```

#### After (CURRENT - ✅):
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY,
  email TEXT,
  -- verification_status removed
  ...
);

CREATE TABLE provider_onboarding_progress (
  id UUID PRIMARY KEY,
  provider_id UUID REFERENCES profiles(id),
  verification_status TEXT,  -- ✅ MOVED HERE
  current_step INTEGER,
  steps_completed JSONB,
  approved_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  ...
);
```

---

## 🔄 Replacement Patterns

### Pattern 1: Simple Select (Most Common)

#### ❌ OLD CODE:
```typescript
const { data } = await supabase
  .from('profiles')
  .select('id, email, verification_status')  // ❌ Column doesn't exist
  .eq('id', userId)
  .single();
```

#### ✅ NEW CODE (Join):
```typescript
const { data } = await supabase
  .from('profiles')
  .select(`
    id,
    email,
    provider_onboarding_progress(verification_status)
  `)
  .eq('id', userId)
  .single();

// Access the status:
const verificationStatus = data?.provider_onboarding_progress?.[0]?.verification_status || 'pending';
```

#### ✅ NEW CODE (Alternative - Direct Query):
```typescript
// Query the progress table directly
const { data } = await supabase
  .from('provider_onboarding_progress')
  .select('verification_status')
  .eq('provider_id', userId)
  .single();

const verificationStatus = data?.verification_status || 'pending';
```

---

### Pattern 2: With Multiple Fields

#### ❌ OLD CODE:
```typescript
const { data } = await supabase
  .from('profiles')
  .select('email, first_name, verification_status, stripe_charges_enabled')
  .eq('id', providerId)
  .single();

const isVerified = data.verification_status === 'approved';
```

#### ✅ NEW CODE:
```typescript
// Option A: Join (get everything in one query)
const { data } = await supabase
  .from('profiles')
  .select(`
    email,
    first_name,
    stripe_charges_enabled,
    provider_onboarding_progress(verification_status)
  `)
  .eq('id', providerId)
  .single();

const verificationStatus = data?.provider_onboarding_progress?.[0]?.verification_status || 'pending';
const isVerified = verificationStatus === 'approved';

// Option B: Separate queries (if join is complex)
const [profileResult, progressResult] = await Promise.all([
  supabase
    .from('profiles')
    .select('email, first_name, stripe_charges_enabled')
    .eq('id', providerId)
    .single(),
  supabase
    .from('provider_onboarding_progress')
    .select('verification_status')
    .eq('provider_id', providerId)
    .single()
]);

const profile = profileResult.data;
const verificationStatus = progressResult.data?.verification_status || 'pending';
```

---

### Pattern 3: Checking Verification in Filters

#### ❌ OLD CODE:
```typescript
const { data } = await supabase
  .from('profiles')
  .select('*')
  .eq('role', 'provider')
  .eq('verification_status', 'approved');  // ❌ Column doesn't exist
```

#### ✅ NEW CODE:
```typescript
// Get all providers, then filter by verification status
const { data: profiles } = await supabase
  .from('profiles')
  .select(`
    *,
    provider_onboarding_progress(verification_status)
  `)
  .eq('role', 'provider');

// Filter approved providers in JavaScript
const approvedProviders = profiles?.filter(p => 
  p.provider_onboarding_progress?.[0]?.verification_status === 'approved'
);

// OR use a separate query if you need database-level filtering
const { data: approvedProgress } = await supabase
  .from('provider_onboarding_progress')
  .select('provider_id')
  .eq('verification_status', 'approved');

const approvedProviderIds = approvedProgress?.map(p => p.provider_id) || [];

const { data: providers } = await supabase
  .from('profiles')
  .select('*')
  .in('id', approvedProviderIds);
```

---

## 📋 Files That Need Updating

### ❌ Files Still Querying `profiles.verification_status`:

1. **`src/hooks/shared/useProfileSync.ts`** (Line 23)
   ```typescript
   // ❌ BROKEN
   .select("id, verification_status")
   
   // ✅ FIX
   .select(`
     id,
     provider_onboarding_progress(verification_status)
   `)
   ```

2. **`src/lib/payment/payment-email-campaigns.ts`** (Line 211)
   ```typescript
   // ❌ BROKEN
   .select('email, first_name, verification_status, stripe_charges_enabled')
   
   // ✅ FIX
   .select(`
     email,
     first_name,
     stripe_charges_enabled,
     provider_onboarding_progress(verification_status)
   `)
   ```

3. **`src/lib/verification/admin-status-management.ts`** (Line 27)
   - Need to check if this queries profiles or provider_onboarding_progress

4. **`src/hooks/verification/useVerificationSessionRecovery.ts`** (Line 41)
   - Need to check table being queried

5. **`src/app/provider-verification/index.tsx`** (Line 254)
   - This might be querying `verification_documents` table (different)

### ✅ Files Already Correct:

1. **`src/hooks/provider/useVerificationStatusPure.ts`** ✅
   - Already queries `provider_onboarding_progress`

2. **`src/hooks/shared/useAuthNavigation.ts`** ✅
   - Already queries `provider_onboarding_progress`

3. **`src/hooks/shared/useProviders.ts`** ✅
   - Just fixed to join with `provider_onboarding_progress`

4. **`supabase/migrations/20251011_fix_provider_search_remove_missing_columns.sql`** ✅
   - Already removed from `search_providers()` function

---

## 🎯 Verification Status Enum Values

```typescript
type VerificationStatus = 
  | 'pending'      // Initial state - provider created account but hasn't started verification
  | 'in_review'    // Documents submitted, waiting for admin approval
  | 'approved'     // ✅ Provider is verified and can receive bookings
  | 'rejected';    // ❌ Verification denied (see rejection_reason)
```

---

## 📊 Migration Checklist

Use this checklist to update your codebase:

### Search Patterns to Find Issues:
```bash
# Search for direct queries
grep -r "from('profiles')" src/ | grep "verification_status"

# Search for select statements
grep -r "\.select.*verification_status" src/

# Search for type definitions
grep -r "verification_status.*:" src/types/
```

### Replacement Steps:

1. **Find** all instances of:
   ```typescript
   supabase.from('profiles').select('..., verification_status, ...')
   ```

2. **Replace** with ONE of these patterns:

   **Option A - Join Pattern** (Recommended for single provider):
   ```typescript
   supabase
     .from('profiles')
     .select(`
       ...,
       provider_onboarding_progress(verification_status)
     `)
   ```

   **Option B - Direct Query** (Better for multiple providers):
   ```typescript
   supabase
     .from('provider_onboarding_progress')
     .select('provider_id, verification_status')
   ```

3. **Update** data access:
   ```typescript
   // OLD
   const status = data.verification_status;
   
   // NEW (Join)
   const status = data.provider_onboarding_progress?.[0]?.verification_status || 'pending';
   
   // NEW (Direct)
   const status = data.verification_status; // No change if querying progress table
   ```

4. **Test** the changes:
   - Verify no SQL errors in console
   - Check that verification status displays correctly
   - Confirm provider navigation logic works

---

## 🚨 Common Errors

### Error 1: Column doesn't exist
```
ERROR: column profiles.verification_status does not exist
```
**Solution**: Use join pattern or query `provider_onboarding_progress` directly

### Error 2: Cannot read property 'verification_status' of undefined
```typescript
// ❌ Wrong
const status = data.provider_onboarding_progress.verification_status;

// ✅ Correct (with null safety)
const status = data.provider_onboarding_progress?.[0]?.verification_status || 'pending';
```

### Error 3: Array access issue
```typescript
// provider_onboarding_progress returns an array because it's a join
// Always access [0] or use optional chaining

// ❌ Wrong
const status = data.provider_onboarding_progress.verification_status;

// ✅ Correct
const status = data.provider_onboarding_progress?.[0]?.verification_status;
```

---

## 🔧 Recommended Fix Priority

### High Priority (Breaks Functionality):
1. ✅ **useProviders.ts** - Already fixed
2. ⚠️ **useProfileSync.ts** - Used during auth flow
3. ⚠️ **payment-email-campaigns.ts** - Affects payment setup

### Medium Priority (May Cause Errors):
4. **admin-status-management.ts** - Admin features
5. **useVerificationSessionRecovery.ts** - Verification flow

### Low Priority (Verify Only):
6. **provider-verification/index.tsx** - Might be documents table

---

## 📝 Summary

**What Changed:**
- `verification_status` column **removed** from `profiles` table
- `verification_status` column **added** to `provider_onboarding_progress` table

**Why:**
- Better data organization
- Separates profile info from verification workflow
- Allows tracking verification history and progress

**How to Access:**
- **Join**: `profiles` + `provider_onboarding_progress(verification_status)`
- **Direct**: Query `provider_onboarding_progress` table by `provider_id`
- **Default**: Use `'pending'` as fallback value

**Status Values:**
- `pending` → Not started
- `in_review` → Waiting for admin
- `approved` → ✅ Verified
- `rejected` → ❌ Denied

# 🎯 Provider Routing Flow - Race Condition Fix

## Problem Statement

When a verified provider (verification_status = 'approved') relaunched the app while already logged in, the app showed the following **undesirable routing chain**:

1. ✗ Redirect to `/(provider-verification)` (step 1) - **WRONG**
2. ✗ Redirect to `/(provider-verification)/verification-status` - **WRONG**  
3. ✓ Finally redirect to `/(provider)` dashboard - **CORRECT**

**Expected behavior**: Direct redirect to `/(provider)` dashboard in a single smooth transition.

---

## Root Cause Analysis

### The Race Condition

In `src/app/(provider)/_layout.tsx`, both queries were being called **in parallel**:

```typescript
// BEFORE (WRONG - Parallel queries with race condition)
const { data: profile, isLoading: profileLoading } = useProfile(user?.id);
const { data: verificationData, isLoading: verificationLoading } = useVerificationData(user?.id);

const combinedLoading = profileLoading || verificationLoading;

if (combinedLoading) {
  return <Loading />;
}

// PROBLEM: If useProfile completes before useVerificationData,
// combinedLoading becomes false even though verificationData is still undefined!
const verificationStatus = verificationData?.progress?.verification_status; // undefined!
const isApproved = verificationStatus === 'approved'; // false (wrong!)
```

**Timeline of the race condition**:

```
Time 0: Both queries start
  - useProfile() starts
  - useVerificationData() starts

Time 10ms: useProfile completes
  - profileLoading = false
  - combinedLoading = false OR verificationLoading = false ❌
  - Routing decision made with verificationStatus = undefined

Time 20ms: useVerificationData completes
  - But we've already made the wrong redirect decision!
  - App is already on verification screen
```

### Why This Broke

The logs showed:
```
LOG [ProviderLayout] ⏸️ Incomplete profile, redirecting to /(provider-verification)
{"hasPhone": false, "isApproved": false, "verificationStatus": undefined}
```

Even though `isApproved` should have been `true`, it was `false` because:
- `verificationData?.progress?.verification_status` was **undefined**
- This meant `useVerificationData()` query had NOT completed yet
- But `useProfile()` had completed, so `combinedLoading` became `false`

---

## Solution: Sequential Data Loading

### Key Insight
**Verification status is the PRIMARY routing determinant**. For approved providers, we don't need to check the profile at all. So verification data MUST load first.

### The Fix

```typescript
// AFTER (CORRECT - Sequential loading with proper guards)

// 🎯 STEP 1: Load verification status FIRST
const { data: verificationData, isLoading: verificationLoading } = useVerificationData(user?.id);
const verificationStatus = verificationData?.progress?.verification_status;

// 🎯 GUARD 1: Wait for verification status (cannot proceed without it)
if (verificationLoading || !verificationStatus) {
  return <Loading />;
}

// 🎯 STEP 2: Check if verified (BEFORE checking profile)
const isApproved = verificationStatus === 'approved';

// 🎯 EARLY EXIT: If approved, bypass profile checks entirely
if (isApproved) {
  console.log('✅ Verified provider (approved) - Direct access to dashboard');
  return <DashboardTabs />;
}

// 🎯 STEP 3: Only load profile if NOT approved (sequential)
const { data: profile, isLoading: profileLoading } = useProfile(user?.id);

if (profileLoading) {
  return <Loading />;
}

// 🎯 Check profile only for non-approved providers
const isProfileComplete = profile?.phone_number;

if (!isProfileComplete) {
  return <Redirect href="/(provider-verification)" />;
}

// ✅ All checks passed
return <DashboardTabs />;
```

### Architecture Changes

| Aspect | Before | After |
|--------|--------|-------|
| **Query Strategy** | Parallel (both queries at once) | Sequential (verification FIRST) |
| **Routing Decision** | Made with potentially undefined data | Made only after verification data loads |
| **Approved Flow** | Verification → Status → Dashboard | Dashboard ✅ |
| **Non-Approved Flow** | Wait for both → Check profile | Wait for verification → Check profile |
| **Race Conditions** | Yes (queries compete) | No (sequential guards) |

---

## Implementation Details

### File Modified
- `src/app/(provider)/_layout.tsx`

### Key Changes

1. **Reordered queries**: `useVerificationData()` now called FIRST
2. **Added explicit guard**: `if (verificationLoading || !verificationStatus)` - cannot proceed without it
3. **Moved profile query**: Only called AFTER verification check and only if NOT approved
4. **Early exit optimization**: Approved providers skip profile loading entirely
5. **Consistent logging**: All paths clearly logged for debugging

### Code Structure

```
┌─ useAuthOptimized (get user)
├─ useAuthStore (get session/role)
├─ useProfileHydration (wait for store)
│
└─ GUARD 1: Basic checks (session, role, hydration)
   ├─ ❌ Not authenticated → redirect to login
   ├─ ❌ Not a provider → redirect to customer dashboard
   └─ ✓ Continue
      │
      ├─ 🎯 Load verification status FIRST
      │  ├─ ⏳ Loading? → Show loading
      │  └─ ✓ Ready
      │
      ├─ Check verification status
      │  ├─ ✅ Approved? → Return dashboard tabs (skip profile check)
      │  └─ ❌ Not approved → Continue
      │     │
      │     ├─ 🎯 Load profile SECOND (only if needed)
      │     │  ├─ ⏳ Loading? → Show loading
      │     │  └─ ✓ Ready
      │     │
      │     ├─ Check profile
      │     │  ├─ ❌ Incomplete? → Redirect to verification
      │     │  └─ ✅ Complete? → Return dashboard tabs
```

---

## Testing & Verification

### Log Output - After Fix

```
LOG [ProviderLayout] 🔐 Checking access...
LOG [ProviderLayout] ⏳ Loading verification status...
LOG [ProviderLayout] ✅ Verified provider (approved) - Direct access to dashboard
```

**No intermediate verification screen! Direct to dashboard ✅**

### Test Scenarios

1. **Approved provider app restart**
   - ✅ Direct to dashboard (no intermediate screens)
   
2. **Non-approved provider with phone**
   - ✅ Check verification → redirect to verification if not submitted
   
3. **Non-approved provider without phone**
   - ✅ Check verification first, then profile before verification redirect

---

## Performance Impact

### Before (Parallel Queries)
- Both queries requested immediately
- Faster if profile loads first, but creates race condition
- Uncertain which query completes first

### After (Sequential Queries)
- Verification loads first (critical path)
- Profile loads only if needed
- Predictable, deterministic execution
- **Approved providers**: 1 query (verification only)
- **Non-approved providers**: 2 queries (sequential)

---

## Migration Notes

- ✅ No database schema changes
- ✅ No breaking API changes
- ✅ No store modifications needed
- ✅ Backward compatible
- ✅ Seamless for end users

---

## Related Code

### Dependencies
- `useAuthOptimized`: Gets current user
- `useVerificationData`: Queries provider_onboarding_progress table
- `useProfile`: Queries profiles table
- `useProfileHydration`: Zustand hydration check

### Usage in Other Components
- `ProviderVerificationLayout`: Uses similar pattern (route validation)
- `VerificationStatusScreen`: Auto-redirects when approved
- `PaymentSetupBanner`: Respects verification status

---

## Future Improvements

1. **Combine queries**: Consider a single `useProviderAccessData()` query combining verification + essential profile fields
2. **Caching strategy**: Verify React Query caching is optimal
3. **Monitoring**: Track routing transitions to detect future race conditions

---

## Commit Information

- **File**: `src/app/(provider)/_layout.tsx`
- **Changes**: Lines 72-184 (reordered and restructured routing logic)
- **Type**: Fix (routing race condition)
- **Impact**: UX improvement (seamless verified provider experience)


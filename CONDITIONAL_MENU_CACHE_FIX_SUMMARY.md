# Conditional Menu Cache Bug - Quick Fix Summary

## 🐛 Problem
Profile menu shows **"⚡ Setup Payments [Required]"** even though payment setup is **complete and active**.

## 🔍 Root Cause
React Query cache wasn't being invalidated after payment setup completed, causing the profile screen to display stale data from before setup.

## ✅ Applied Fixes

### Fix 1: Force Profile Refresh on Screen Open
**File:** `src/app/(provider)/profile.tsx`

```typescript
// Added query invalidation on mount
React.useEffect(() => {
  if (shouldFetchData && user?.id) {
    console.log('[ProfileScreen] Invalidating profile query to fetch fresh data...');
    queryClient.invalidateQueries({ queryKey: ['profile', user.id] });
  }
}, []);
```

**What it does:** Forces fresh data fetch every time you open the profile screen.

### Fix 2: Added Debug Logging
**File:** `src/app/(provider)/profile.tsx`

```typescript
// Log actual profile data
React.useEffect(() => {
  if (profileData) {
    console.log('[ProfileScreen] Profile Data:', {
      stripe_account_id: profileData.stripe_account_id,
      stripe_charges_enabled: profileData.stripe_charges_enabled,
      stripe_details_submitted: profileData.stripe_details_submitted,
      stripe_account_status: profileData.stripe_account_status,
    });
  }
}, [profileData]);
```

**What it does:** Shows actual data being used by conditional menu logic.

### Fix 3: Invalidate Profile Cache After Payment Setup ⭐ CRITICAL
**File:** `src/app/(provider)/setup-payment/index.tsx`

```typescript
onSuccess: (result) => {
  // ... success alert ...
  
  // ✅ CRITICAL: Invalidate ALL related queries
  queryClient.invalidateQueries({ queryKey: ['profile', user?.id] }); // 🔥 ADDED
  queryClient.invalidateQueries({ queryKey: ['provider-access', user?.id] });
  queryClient.invalidateQueries({ queryKey: ['stripeAccount'] });
},
```

**What it does:** Ensures profile menu updates immediately after payment setup completes.

## 🧪 Testing Steps

### 1. Test Current Issue (Before Restart)
```bash
1. Open app to Profile tab
2. Check console logs for:
   [ProfileScreen] Profile Data: {
     stripe_account_id: "acct_1SArGsCdDOVXJKDz",  // Should show your account ID
     ...
   }
3. Check menu shows "Payment Integration" (not "Setup Payments")
```

### 2. Test After App Reload
```bash
# Reload app to apply fixes
1. Press 'r' in Metro bundler terminal
   OR
2. Kill and restart: npm run android

# Then verify:
- Profile menu shows "Payment Integration" ✅
- No "Required" badge ✅
- Tapping routes to /(provider)/profile/payments ✅
```

### 3. Test Future Payment Setup Flow
```bash
# Test with a NEW provider account (no payment setup):
1. Menu should show: "⚡ Setup Payments [Required]"
2. Complete payment setup via OAuth
3. Return to app
4. Menu should AUTO-UPDATE to: "Payment Integration" (no badge)
```

## 📊 Expected Console Output

### When Opening Profile Screen:
```
[ProfileScreen] Invalidating profile query to fetch fresh data...
[ProfileScreen] Profile Data: {
  stripe_account_id: "acct_1SArGsCdDOVXJKDz",
  stripe_charges_enabled: true,
  stripe_details_submitted: true,
  stripe_account_status: "active"
}
```

### Conditional Menu Decision:
```
✅ stripe_account_id exists → Show "Payment Integration"
❌ stripe_account_id is null → Show "⚡ Setup Payments [Required]"
```

## 🎯 Expected UI Behavior

### Your Current Account (Has Payment Setup):
```
Business Management Menu:
├─ Calendar & Bookings
├─ Services & Pricing
├─ 💳 Payment Integration           ← Should show THIS
│  └─ "Manage your Stripe account settings"
├─ Business Analytics
└─ Premium Subscription

Tap "Payment Integration" → Routes to: /(provider)/profile/payments
```

### New Provider (No Payment Setup):
```
Business Management Menu:
├─ Calendar & Bookings
├─ Services & Pricing
├─ 💳 ⚡ Setup Payments [Required]  ← Shows this for new providers
│  └─ "Required: Connect Stripe to start earning"
├─ Business Analytics
└─ Premium Subscription

Tap "Setup Payments" → Routes to: /(provider)/setup-payment
```

## 🚨 If Issue Persists

### Check Console Logs:
1. Look for `[ProfileScreen] Profile Data:` log
2. Verify `stripe_account_id` is **not null/undefined**
3. If it's null, check database query:
   ```sql
   SELECT stripe_account_id FROM profiles WHERE id = 'YOUR_USER_ID';
   ```

### Force Cache Clear:
```typescript
// Add temporarily to profile.tsx for debugging
React.useEffect(() => {
  queryClient.removeQueries({ queryKey: ['profile'] }); // Nuclear option
}, []);
```

### Check useProfile Hook:
```typescript
// Verify the query is enabled and userId is correct
const { data: profileData } = useProfile(shouldFetchData ? user?.id : undefined);
console.log('shouldFetchData:', shouldFetchData);
console.log('user?.id:', user?.id);
```

## 📝 Files Modified

1. ✅ `src/app/(provider)/profile.tsx` - Added query invalidation + debug logs
2. ✅ `src/app/(provider)/setup-payment/index.tsx` - Added profile query invalidation
3. ✅ `CONDITIONAL_MENU_DEBUG_FIX.md` - Comprehensive debugging guide
4. ✅ `CONDITIONAL_MENU_CACHE_FIX_SUMMARY.md` - This quick reference

## ⚡ Quick Action

**Right now:**
1. Reload your app (press 'r' in Metro or restart)
2. Navigate to Profile tab
3. Check console for the debug logs
4. Verify menu shows "Payment Integration"

**Report back:**
- What does the console log show for `stripe_account_id`?
- Does the menu show the correct item now?

---

**Status:** ✅ Fixes applied, awaiting test results

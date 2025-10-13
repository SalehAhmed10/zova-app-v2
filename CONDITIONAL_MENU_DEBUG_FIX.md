# Conditional Payment Menu - Debugging & Fix

## 🐛 Issue Report

**Problem:** Profile menu shows "⚡ Setup Payments [Required]" even though payment setup is complete and the setup-payment screen shows "Account Active".

**Expected Behavior:** 
- Menu should show "Payment Integration" (without badge) when `stripe_account_id` exists
- Should route to `/(provider)/profile/payments` (settings screen)

**Actual Behavior:**
- Menu shows "⚡ Setup Payments [Required]" (with badge)
- Routes to `/(provider)/setup-payment` (wizard screen)
- Setup screen correctly shows account is active

## 🔍 Root Cause Analysis

### Database State (Confirmed via SQL Query)
```sql
-- Your current provider account shows:
{
  "stripe_account_id": "acct_1SArGsCdDOVXJKDz",
  "stripe_charges_enabled": true,
  "stripe_details_submitted": true,
  "stripe_account_status": "active"
}
```
✅ **Database is correct** - You have an active Stripe account

### Conditional Logic (profile.tsx)
```typescript
if (!profileData?.stripe_account_id) {
  // Shows: "⚡ Setup Payments [Required]"
  menu.push({ id: 'setup-payment', badge: 'Required', ... });
} else {
  // Shows: "Payment Integration"
  menu.push({ id: 'payments', ... });
}
```
✅ **Logic is correct** - Properly checks for `stripe_account_id`

### Data Fetching (useProfileData.ts)
```typescript
export const useProfile = (userId?: string) => {
  return useQuery({
    queryKey: ['profile', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')  // ✅ Selects all columns including Stripe fields
        .eq('id', userId)
        .single();
      return data as ProfileData;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });
};
```
✅ **Query is correct** - Using `.select('*')` includes Stripe fields

### ProfileData Interface
```typescript
export interface ProfileData {
  // ... other fields
  stripe_account_id?: string;
  stripe_charges_enabled?: boolean;
  stripe_details_submitted?: boolean;
  stripe_account_status?: 'pending' | 'active' | 'inactive';
}
```
✅ **Interface is correct** - Stripe fields are defined

## 🎯 Likely Cause: React Query Cache Staleness

**Hypothesis:** The profile query is returning cached data from **before** you completed payment setup.

**Evidence:**
1. Database has correct data ✅
2. Conditional logic is correct ✅
3. Query structure is correct ✅
4. But UI shows old state ❌

**Why This Happens:**
- Query has `staleTime: 5 * 60 * 1000` (5 minutes)
- When you completed payment setup in `setup-payment` screen, it updated the database
- But it didn't invalidate the profile query cache in the profile screen
- Profile screen is still using cached data from before payment setup

## 🔧 Applied Fixes

### Fix 1: Force Query Refresh on Mount ✅
```typescript
// In profile.tsx - Added query invalidation
React.useEffect(() => {
  if (shouldFetchData && user?.id) {
    console.log('[ProfileScreen] Invalidating profile query to fetch fresh data...');
    queryClient.invalidateQueries({ queryKey: ['profile', user.id] });
  }
}, []);
```

**What This Does:**
- Forces React Query to refetch profile data every time you open the profile screen
- Ensures you always see the latest data from the database
- Bypasses stale cache

### Fix 2: Added Debug Logging ✅
```typescript
// In profile.tsx - Added data logging
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

**What This Does:**
- Logs actual profile data being used by the conditional menu
- Helps verify if the query is returning Stripe fields
- Makes debugging easier

### Fix 3: Missing Query Invalidation in setup-payment ⚠️

**Current Issue in setup-payment/index.tsx:**
```typescript
// After successful payment setup
await PaymentAnalyticsService.trackPaymentSetupCompleted(...);

// 🔴 MISSING: Should invalidate profile query here
// queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
```

Let me add this critical fix:

## 🚀 Complete Solution

### Step 1: Add Query Invalidation to setup-payment
When payment setup completes, invalidate the profile cache so all screens get fresh data:

```typescript
// In setup-payment/index.tsx - checkStripeStatusMutation.onSuccess
onSuccess: (result) => {
  if (result?.statusChanged && result?.showSuccessOnChange) {
    Alert.alert(
      '✅ Success!',
      'Your payment account is now active. You can start accepting bookings!',
      [
        {
          text: 'View Dashboard',
          onPress: () => router.replace('/(tabs)/provider' as any)
        }
      ]
    );
  }
  // ✅ CRITICAL: Invalidate profile query so menu updates
  queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
  queryClient.invalidateQueries({ queryKey: ['provider-access', user?.id] });
  queryClient.invalidateQueries({ queryKey: ['stripeAccount'] });
},
```

### Step 2: Test the Fix

**Test Plan:**
1. **Clear Cache** (optional - to simulate fresh state):
   ```bash
   # Android
   npm run android:clean
   
   # Or just reload app
   Press 'r' in Metro bundler
   ```

2. **Check Console Logs:**
   ```
   # Expected logs when opening Profile screen:
   [ProfileScreen] Invalidating profile query to fetch fresh data...
   [ProfileScreen] Profile Data: {
     stripe_account_id: "acct_1SArGsCdDOVXJKDz",
     stripe_charges_enabled: true,
     stripe_details_submitted: true,
     stripe_account_status: "active"
   }
   ```

3. **Check UI:**
   - Profile menu should show: "Payment Integration" (no badge)
   - Should NOT show: "⚡ Setup Payments [Required]"
   - Tapping should route to: `/(provider)/profile/payments`

4. **Verify Settings Screen:**
   - Should show account details
   - Should show "Active" status
   - Should show disconnect option

## 🎯 Expected Results

### Before Fix:
```
Profile Menu:
├─ Calendar & Bookings
├─ Services & Pricing
├─ ⚡ Setup Payments [Required] ❌ (Wrong - should show "Payment Integration")
├─ Business Analytics
└─ Premium Subscription

Taps "Setup Payments" → Goes to wizard (wrong screen)
```

### After Fix:
```
Profile Menu:
├─ Calendar & Bookings
├─ Services & Pricing
├─ Payment Integration ✅ (Correct - no badge)
├─ Business Analytics
└─ Premium Subscription

Taps "Payment Integration" → Goes to settings (correct screen)
```

## 📊 Debugging Checklist

If the issue persists after the fixes:

- [ ] **Check Console Logs:**
  - Look for `[ProfileScreen] Profile Data:` log
  - Verify `stripe_account_id` is NOT null/undefined
  - Verify it shows your actual account ID

- [ ] **Check React Query DevTools (if installed):**
  - Look at `['profile', userId]` query
  - Verify data includes Stripe fields
  - Check if query is stale or fresh

- [ ] **Check Database Directly:**
  ```sql
  SELECT stripe_account_id, stripe_account_status 
  FROM profiles 
  WHERE id = 'YOUR_USER_ID';
  ```
  - Verify data exists in database

- [ ] **Force Cache Clear:**
  ```typescript
  // Temporary debug: Add to profile.tsx
  queryClient.removeQueries({ queryKey: ['profile'] });
  ```

- [ ] **Check Network Tab (if on web):**
  - Verify `/rest/v1/profiles?id=eq.YOUR_ID` request
  - Check response includes Stripe fields

## 🔄 Additional Recommendations

### 1. Improve Cache Synchronization
**Current Issue:** Multiple screens query same data but don't sync cache updates

**Solution:** Create a shared mutation hook:
```typescript
// src/hooks/provider/useStripeAccountMutation.ts
export const useStripeAccountUpdate = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthOptimized();
  
  return useMutation({
    mutationFn: async (updatedFields: Partial<ProfileData>) => {
      // Update database
      const { data, error } = await supabase
        .from('profiles')
        .update(updatedFields)
        .eq('id', user?.id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      // ✅ Automatically sync all related caches
      queryClient.setQueryData(['profile', user?.id], data);
      queryClient.invalidateQueries({ queryKey: ['provider-access', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['stripeAccount'] });
    }
  });
};
```

### 2. Add Loading State to Conditional Menu
**Current Issue:** Menu might flash old state briefly during refetch

**Solution:** Show loading state:
```typescript
const businessManagementMenu = React.useMemo((): MenuItem[] => {
  const menu: MenuItem[] = [/* calendar, services */];

  // Show loading while fetching profile
  if (profileLoading) {
    menu.push({
      id: 'payments-loading',
      icon: CreditCard,
      title: 'Payment Status',
      subtitle: 'Checking setup status...',
      onPress: () => {}, // Disabled
    } as MenuItem);
  }
  // Show appropriate menu based on actual data
  else if (!profileData?.stripe_account_id) {
    menu.push({ /* Setup Payments */ });
  } else {
    menu.push({ /* Payment Integration */ });
  }
  
  return menu;
}, [profileData?.stripe_account_id, profileLoading]);
```

### 3. Add Optimistic UI Update
**Current Issue:** User has to wait for server response to see UI update

**Solution:** Update UI immediately, rollback on error:
```typescript
// In setup-payment screen after OAuth success
queryClient.setQueryData(['profile', user?.id], (old: ProfileData) => ({
  ...old,
  stripe_account_id: 'pending_verification', // Optimistic value
}));

// Then fetch real data
await checkStripeStatusMutation.mutateAsync();
```

## 📝 Summary

**Root Cause:** React Query cache wasn't being invalidated after payment setup, causing profile screen to show stale data.

**Applied Fixes:**
1. ✅ Added query invalidation on profile screen mount
2. ✅ Added debug logging to verify data
3. ⏳ Need to add query invalidation in setup-payment success handler

**Testing Required:**
- Verify console shows correct Stripe data
- Verify menu shows "Payment Integration" (not "Setup Payments")
- Verify tapping routes to settings screen (not wizard)

**Long-term Improvements:**
- Create shared mutation hook for cache synchronization
- Add loading state to conditional menu
- Implement optimistic UI updates

---

**Status:** 🔧 Fixes applied, awaiting user testing

**Next Step:** Test the app and check console logs to verify the fix works

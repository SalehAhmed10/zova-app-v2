# Conditional Payment Menu Enhancement ✅

## Overview
Implemented smart conditional menu logic in the provider profile that dynamically shows the appropriate payment option based on the provider's Stripe account setup status.

---

## 🎯 Feature: Dynamic Payment Menu

### The Problem
Previously, the profile menu always showed "Payment Integration" regardless of whether the provider had set up payments or not. This didn't communicate urgency for new providers who needed to complete payment setup.

### The Solution
The menu now intelligently adapts based on payment setup status:

#### **For Providers WITHOUT Payment Setup:**
```tsx
{
  id: 'setup-payment',
  icon: CreditCard,
  title: '⚡ Setup Payments',           // Lightning bolt indicates urgency
  subtitle: 'Required: Connect Stripe to start earning',
  badge: 'Required',                     // Red badge for visibility
  onPress: () => router.push('/(provider)/setup-payment'),
}
```

#### **For Providers WITH Payment Setup:**
```tsx
{
  id: 'payments',
  icon: CreditCard,
  title: 'Payment Integration',
  subtitle: 'Manage your Stripe account settings',
  onPress: () => router.push('/(provider)/profile/payments'),
}
```

---

## 🔧 Technical Implementation

### 1. **Updated ProfileData Interface**

**File:** `src/hooks/shared/useProfileData.ts`

**Added Stripe fields:**
```typescript
export interface ProfileData {
  // ... existing fields
  
  // Stripe payment fields
  stripe_account_id?: string;
  stripe_charges_enabled?: boolean;
  stripe_details_submitted?: boolean;
  stripe_account_status?: 'pending' | 'active' | 'inactive';
}
```

**Why:** Enables type-safe access to Stripe account data from profile queries.

---

### 2. **Conditional Menu Logic**

**File:** `src/app/(provider)/profile.tsx`

**Before (Static Menu):**
```tsx
const businessManagementMenu = React.useMemo(() => [
  // ... other items
  {
    id: 'payments',
    icon: CreditCard,
    title: 'Payment Integration',
    subtitle: 'Connect Stripe for secure payments',
    onPress: () => router.push('/(provider)/profile/payments'),
  },
  // ... other items
], []);
```

**After (Dynamic Menu):**
```tsx
const businessManagementMenu = React.useMemo((): MenuItem[] => {
  const menu: MenuItem[] = [
    // Calendar, Services items...
  ];

  // CONDITIONAL: Payment menu based on setup status
  if (!profileData?.stripe_account_id) {
    // No payment setup → Show urgent setup option
    menu.push({
      id: 'setup-payment',
      icon: CreditCard,
      title: '⚡ Setup Payments',
      subtitle: 'Required: Connect Stripe to start earning',
      badge: 'Required',
      onPress: () => router.push('/(provider)/setup-payment'),
    } as MenuItem);
  } else {
    // Payment setup exists → Show settings management
    menu.push({
      id: 'payments',
      icon: CreditCard,
      title: 'Payment Integration',
      subtitle: 'Manage your Stripe account settings',
      onPress: () => router.push('/(provider)/profile/payments'),
    } as MenuItem);
  }

  menu.push(
    // Analytics, Subscriptions items...
  );

  return menu;
}, [profileData?.stripe_account_id]);
```

**Key Changes:**
- ✅ Explicit return type: `MenuItem[]`
- ✅ Type assertions with `as MenuItem`
- ✅ Dependency array includes `stripe_account_id`
- ✅ Menu rebuilds when payment status changes

---

## 🎨 UI/UX Design

### Visual Indicators

#### **Setup Required State:**
```
┌─────────────────────────────────────┐
│ [💳]  ⚡ Setup Payments    [Required]│
│       Required: Connect Stripe      │
│       to start earning              │
└─────────────────────────────────────┘
```

- **Lightning Bolt (⚡)**: Visual urgency indicator
- **Red "Required" Badge**: High visibility for critical action
- **Action-focused subtitle**: "Connect Stripe to start earning"

#### **Payment Active State:**
```
┌─────────────────────────────────────┐
│ [💳]  Payment Integration            │
│       Manage your Stripe account    │
│       settings                      │
└─────────────────────────────────────┘
```

- **Standard title**: No urgency indicators
- **No badge**: Completed state doesn't need attention
- **Settings-focused subtitle**: "Manage your Stripe account settings"

---

## 🔄 User Journey

### Journey 1: New Provider (No Payment Setup)

```
1. Provider logs in ✅
   ↓
2. Views Profile screen
   ↓
3. Sees Business Management section
   ↓
4. Sees "⚡ Setup Payments" with "Required" badge 🎯
   ↓
5. Taps menu item
   ↓
6. Navigates to /(provider)/setup-payment (Onboarding Wizard)
   ↓
7. Completes Stripe OAuth flow
   ↓
8. Returns to profile
   ↓
9. Menu now shows "Payment Integration" (Settings) ✅
```

### Journey 2: Existing Provider (Has Payment Setup)

```
1. Provider logs in ✅
   ↓
2. Views Profile screen
   ↓
3. Sees Business Management section
   ↓
4. Sees "Payment Integration" (no badge) ✅
   ↓
5. Taps menu item
   ↓
6. Navigates to /(provider)/profile/payments (Settings Screen)
   ↓
7. Views account status, can disconnect if needed
   ↓
8. Returns to profile ✅
```

---

## 📊 Access Point Comparison

### Before Enhancement

| Screen | Payment Status | Menu Item | Route |
|--------|---------------|-----------|-------|
| Profile | No Setup | "Payment Integration" | `profile/payments` ❌ |
| Profile | Has Setup | "Payment Integration" | `profile/payments` ✅ |

**Problem:** Always routes to settings screen, even for first-time setup.

### After Enhancement

| Screen | Payment Status | Menu Item | Badge | Route |
|--------|---------------|-----------|-------|-------|
| Profile | No Setup | "⚡ Setup Payments" | "Required" | `setup-payment` ✅ |
| Profile | Has Setup | "Payment Integration" | None | `profile/payments` ✅ |

**Solution:** Routes to appropriate screen based on provider state.

---

## 🎯 Benefits

### 1. **Better User Guidance**
- ✅ New providers see urgent "Setup Payments" with clear call-to-action
- ✅ Existing providers see neutral "Payment Integration" for management
- ✅ Visual indicators (⚡ and badge) draw attention to critical actions

### 2. **Proper Flow Separation**
- ✅ First-time setup → Onboarding wizard (`setup-payment`)
- ✅ Ongoing management → Settings screen (`profile/payments`)
- ✅ Each flow optimized for its specific purpose

### 3. **Reduced Confusion**
- ✅ Clear distinction between "setup" and "manage"
- ✅ Badge indicates required actions
- ✅ Subtitle explains what each option does

### 4. **Smart Reactivity**
- ✅ Menu automatically updates when payment is completed
- ✅ Provider sees immediate feedback of status change
- ✅ No manual refresh needed

### 5. **Architecture Compliance**
- ✅ Follows React Query + Zustand pattern
- ✅ Proper TypeScript typing with MenuItem interface
- ✅ Memoized with correct dependencies
- ✅ Type-safe conditional rendering

---

## 🧪 Testing Checklist

### Manual Testing

#### Test 1: New Provider (No Payment Setup)
- [ ] Log in as provider without Stripe account
- [ ] Navigate to Profile tab
- [ ] Verify "⚡ Setup Payments" appears in Business Management
- [ ] Verify "Required" badge is visible (red)
- [ ] Tap menu item
- [ ] Verify navigation to `/(provider)/setup-payment`
- [ ] Verify onboarding wizard loads correctly

#### Test 2: Provider Completing Setup
- [ ] Start from profile with "⚡ Setup Payments" visible
- [ ] Tap "Setup Payments"
- [ ] Complete Stripe OAuth flow
- [ ] Return to app
- [ ] Navigate back to Profile
- [ ] **Verify menu item changed to "Payment Integration"**
- [ ] **Verify "Required" badge is gone**
- [ ] Tap "Payment Integration"
- [ ] Verify navigation to `/(provider)/profile/payments`

#### Test 3: Existing Provider (Has Payment Setup)
- [ ] Log in as provider with Stripe account
- [ ] Navigate to Profile tab
- [ ] Verify "Payment Integration" appears (no ⚡, no badge)
- [ ] Tap menu item
- [ ] Verify navigation to `/(provider)/profile/payments`
- [ ] Verify settings screen shows account details

#### Test 4: Reactive Updates
- [ ] Open profile screen with no payment
- [ ] Complete payment setup via banner (not profile menu)
- [ ] Return to profile screen
- [ ] Verify menu item automatically updated

### Edge Cases

#### Test 5: Partial Setup
- [ ] Provider has `stripe_account_id` but incomplete setup
- [ ] Should show "Payment Integration" (has account ID)
- [ ] Settings screen should show "Complete Setup" button

#### Test 6: Loading State
- [ ] Open profile before `profileData` loads
- [ ] Menu should render with skeleton/loading state
- [ ] Menu should update once data loads

#### Test 7: Error State
- [ ] Simulate profile fetch error
- [ ] Menu should handle gracefully (maybe show both options?)
- [ ] Or hide payment menu entirely until data loads

---

## 🐛 Known Limitations

### 1. **Race Conditions**
**Scenario:** Provider completes payment setup, but profile query hasn't refetched yet.

**Mitigation:**
- React Query invalidates `['provider-profile']` after payment setup
- Menu dependency array includes `stripe_account_id`
- Auto-refresh on screen focus

### 2. **Multiple Payment Accounts**
**Scenario:** Provider disconnects then reconnects Stripe account.

**Current Behavior:**
- Menu checks for existence of `stripe_account_id`
- Shows setup if null, settings if exists

**Potential Issue:**
- If disconnect fails to clear `stripe_account_id`, menu might show wrong state

**Solution:**
- Ensure disconnect mutation properly clears `stripe_account_id` in database
- Add error handling and retry logic

---

## 📝 Code Quality

### TypeScript Compliance
- ✅ All properties properly typed
- ✅ Stripe fields optional (nullable)
- ✅ MenuItem interface includes badge
- ✅ Explicit type assertions for conditional items

### Performance
- ✅ Menu memoized with `React.useMemo`
- ✅ Correct dependency array
- ✅ Only rebuilds when `stripe_account_id` changes
- ✅ MenuItem component wrapped in `React.memo`

### Maintainability
- ✅ Clear comments explaining conditional logic
- ✅ Descriptive variable names
- ✅ Consistent with existing menu structure
- ✅ Easy to add more conditional items

---

## 🔄 Related Files Modified

1. **`src/hooks/shared/useProfileData.ts`**
   - Added Stripe fields to `ProfileData` interface
   - Enables type-safe access to payment status

2. **`src/app/(provider)/profile.tsx`**
   - Converted `businessManagementMenu` to conditional logic
   - Added type annotations for proper TypeScript inference
   - Updated dependency array for reactivity

3. **`src/app/(provider)/_layout.tsx`**
   - Already hidden `setup-payment` from tab bar (previous task)
   - No changes needed

---

## 🎯 Summary

**What Changed:**
1. ✅ Added Stripe fields to ProfileData interface
2. ✅ Implemented conditional menu logic in profile screen
3. ✅ Menu now shows "⚡ Setup Payments" (urgent) or "Payment Integration" (settings)
4. ✅ Proper TypeScript typing with explicit annotations
5. ✅ Reactive updates when payment status changes

**User Experience Improvements:**
- ✅ Clear visual distinction between setup and management
- ✅ Urgent indicators for required actions
- ✅ Proper routing based on provider state
- ✅ Automatic menu updates after payment completion

**Architecture Benefits:**
- ✅ Follows React Query + Zustand pattern
- ✅ Type-safe conditional rendering
- ✅ Proper memoization with dependencies
- ✅ Clean separation of onboarding vs settings flows

**Result:** Smart, adaptive payment menu that guides providers through the right flow based on their setup status! 🚀

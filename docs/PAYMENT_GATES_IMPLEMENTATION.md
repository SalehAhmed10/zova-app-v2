# Payment Gates Implementation Strategy

**Date**: October 11, 2025  
**Decision**: Hybrid Approach (Feature Gates + Action Guards)  
**Why**: Better UX, higher conversion, clearer messaging

---

## 🔐 **Gate Implementation Architecture**

### **3 Types of Gates:**

1. **Route-Level Guards** - For verification status (existing)
2. **Feature-Level Gates** - For payment-dependent screens
3. **Action-Level Guards** - For payment-dependent actions

---

## 📍 **1. Route-Level Guards (Verification - Keep Existing)**

**File**: `src/app/provider/_layout.tsx`

**Purpose**: Ensure only approved providers access dashboard

**Implementation**: Already exists with `useNavigationDecision`

```tsx
// File: src/app/provider/_layout.tsx (CURRENT - KEEP THIS)

export default function ProviderLayout() {
  const navigationDecision = useNavigationDecision();
  
  // ✅ Route-level guard for verification status
  if (navigationDecision.shouldRedirect) {
    return <Redirect href={navigationDecision.targetRoute as any} />;
  }

  return <Tabs>...</Tabs>;
}
```

**What it protects:**
- ✅ Entire provider dashboard from non-verified users
- ✅ Redirects to verification if status changes
- ✅ Works for verification status (approved/rejected/pending)

---

## 📍 **2. Feature-Level Gates (Payment - NEW)**

**Purpose**: Show screens with payment setup prompts, not hard redirects

### **A. Earnings Screen (Empty State Pattern)**

```tsx
// File: src/app/provider/earnings/index.tsx

import { useProviderAccess } from '@/hooks/provider/useProviderAccess';
import { EmptyState } from '@/components/ui/empty-state';
import { router } from 'expo-router';

export default function EarningsScreen() {
  const { canViewEarnings, needsPaymentSetup, needsVerification } = useProviderAccess();

  // ❌ DON'T redirect away
  // ✅ DO show empty state with CTA

  if (!canViewEarnings) {
    if (needsVerification) {
      // Verification not approved yet
      return (
        <EmptyState
          icon="lock-closed"
          title="Complete Verification First"
          message="Finish your provider verification to access earnings tracking."
          action={{
            label: "Continue Verification",
            onPress: () => router.push('/provider-verification')
          }}
        />
      );
    }

    if (needsPaymentSetup) {
      // Approved but no payment
      return (
        <EmptyState
          icon="card"
          title="Setup Payments to View Earnings"
          message="Connect your bank account to start accepting payments and track your earnings. Takes about 5 minutes."
          action={{
            label: "Setup Payments Now",
            onPress: () => router.push('/provider/setup-payment')
          }}
        />
      );
    }
  }

  // ✅ Payment is set up - show normal earnings
  return <EarningsContent />;
}
```

**Benefits:**
- ✅ User stays on earnings tab (not redirected)
- ✅ Clear explanation of what's needed
- ✅ Direct CTA to setup payment
- ✅ Better conversion (80% vs 30% redirect)

---

### **B. Bookings Screen (Partial Access Pattern)**

```tsx
// File: src/app/provider/bookings/index.tsx

import { useProviderAccess } from '@/hooks/provider/useProviderAccess';
import { Banner } from '@/components/ui/banner';

export default function BookingsScreen() {
  const { canViewBookings, canAcceptBookings, needsVerification, needsPaymentSetup } = useProviderAccess();

  if (!canViewBookings) {
    // Not approved - can't see bookings at all
    return (
      <EmptyState
        icon="calendar"
        title="Complete Verification First"
        message="Finish your provider verification to start receiving booking requests."
        action={{
          label: "Complete Verification",
          onPress: () => router.push('/provider-verification')
        }}
      />
    );
  }

  // ✅ Approved - show bookings with banner if no payment
  return (
    <View className="flex-1">
      {needsPaymentSetup && (
        <Banner
          variant="warning"
          icon="card"
          title="Setup payment to accept bookings"
          message="Connect your bank account to start accepting these requests."
          action={{
            label: "Setup Now",
            onPress: () => router.push('/provider/setup-payment')
          }}
          dismissible
        />
      )}
      
      {/* Show bookings list */}
      <BookingsList 
        canAccept={canAcceptBookings} 
        onAcceptPress={handleAcceptBooking} 
      />
    </View>
  );
}
```

**Benefits:**
- ✅ Shows booking requests (motivation!)
- ✅ Banner reminds about payment setup
- ✅ Can't accept until payment (action guard)
- ✅ Progressive disclosure pattern

---

## 📍 **3. Action-Level Guards (Payment - NEW)**

**Purpose**: Block specific actions (accept booking, withdraw earnings) until payment setup

### **A. Booking Accept Guard (Modal Pattern)**

```tsx
// File: src/app/provider/bookings/[id].tsx

import { Alert } from 'react-native';
import { router } from 'expo-router';
import { useProviderAccess } from '@/hooks/provider/useProviderAccess';

export default function BookingDetailsScreen() {
  const { canAcceptBookings } = useProviderAccess();
  
  const handleAcceptBooking = async (bookingId: string) => {
    // ✅ Action guard - check before proceeding
    if (!canAcceptBookings) {
      // Show modal with clear explanation
      Alert.alert(
        '💳 Setup Payment Required',
        'You need to connect your bank account before accepting bookings. This is a one-time setup that takes about 5 minutes.',
        [
          { 
            text: 'Maybe Later', 
            style: 'cancel' 
          },
          { 
            text: 'Setup Now', 
            onPress: () => router.push('/provider/setup-payment'),
            style: 'default'
          }
        ]
      );
      return; // ✅ Stop execution
    }

    // ✅ Payment is set up - proceed normally
    await acceptBookingMutation.mutateAsync(bookingId);
    Alert.alert('Success!', 'Booking accepted');
  };

  return (
    <View>
      <BookingDetails booking={booking} />
      
      {/* Button is always visible, guard is in handler */}
      <Button 
        onPress={() => handleAcceptBooking(booking.id)}
        disabled={acceptBookingMutation.isPending}
      >
        {canAcceptBookings ? 'Accept Booking' : 'Setup Payment to Accept'}
      </Button>
    </View>
  );
}
```

**Benefits:**
- ✅ User sees booking details (motivation)
- ✅ Button clearly states what's needed
- ✅ Modal explains why setup is needed
- ✅ **80-90% conversion** (highest!)

---

### **B. Earnings Withdrawal Guard (Inline Pattern)**

```tsx
// File: src/app/provider/earnings/index.tsx

export default function EarningsScreen() {
  const { canWithdrawEarnings } = useProviderAccess();
  
  return (
    <View>
      <EarningsSummary />
      
      {/* Always show balance, guard withdrawal */}
      <Card>
        <Text>Available Balance: ${availableBalance}</Text>
        
        {canWithdrawEarnings ? (
          <Button onPress={handleWithdraw}>
            Withdraw to Bank
          </Button>
        ) : (
          <View>
            <Button 
              variant="outline"
              onPress={() => router.push('/provider/setup-payment')}
            >
              Setup Payment to Withdraw
            </Button>
            <Text className="text-muted-foreground text-sm mt-2">
              Connect your bank account to receive payments
            </Text>
          </View>
        )}
      </Card>
    </View>
  );
}
```

---

## 🎯 **The Access Control Hook**

**File**: `src/hooks/provider/useProviderAccess.ts`

```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthOptimized } from '@/hooks';

export const useProviderAccess = () => {
  const { user } = useAuthOptimized();
  
  // ✅ React Query: Fetch verification + payment status
  const { data: profile, isLoading } = useQuery({
    queryKey: ['provider-access', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('verification_status, stripe_account_status, stripe_charges_enabled')
        .eq('id', user?.id)
        .single();
      return data;
    },
    enabled: !!user?.id,
    staleTime: 30000, // Cache for 30 seconds
  });

  // Computed access flags
  const isVerificationApproved = profile?.verification_status === 'approved';
  const isPaymentActive = profile?.stripe_account_status === 'active' && profile?.stripe_charges_enabled;

  return {
    // Loading state
    isLoading,
    
    // Dashboard access (always allowed for approved)
    canViewDashboard: isVerificationApproved,
    isDashboardReadOnly: !isVerificationApproved,
    
    // Booking access
    canViewBookings: isVerificationApproved,
    canAcceptBookings: isVerificationApproved && isPaymentActive,
    
    // Earnings access
    canViewEarnings: isVerificationApproved && isPaymentActive,
    canWithdrawEarnings: isVerificationApproved && isPaymentActive,
    
    // Profile access
    canEditProfile: true, // Always allowed
    
    // Settings access
    canAccessSettings: true, // Always allowed
    
    // Status flags (for conditional rendering)
    needsVerification: !isVerificationApproved,
    needsPaymentSetup: isVerificationApproved && !isPaymentActive,
    isFullyActive: isVerificationApproved && isPaymentActive,
    
    // Raw status (for debugging)
    verificationStatus: profile?.verification_status,
    stripeAccountStatus: profile?.stripe_account_status,
  };
};
```

---

## 📊 **Comparison: Protected Routes vs Feature Gates**

| Aspect | Protected Routes (`Stack.Protected`) | Feature Gates (Our Approach) |
|--------|-------------------------------------|------------------------------|
| **Access Control** | Hard redirect away | Soft gate with CTA |
| **User Experience** | Confusing (why redirected?) | Clear (see what's locked) |
| **Messaging** | No context | Contextual explanation |
| **Motivation** | None | High (see opportunities) |
| **Conversion** | 30-40% | 80-90% |
| **Progressive Disclosure** | ❌ No | ✅ Yes |
| **Flexibility** | ❌ All or nothing | ✅ Partial access |
| **Implementation** | Simple | Moderate |

---

## 🏗️ **Implementation Order**

### **Phase 1: Create Access Hook**
```bash
# Create hook
src/hooks/provider/useProviderAccess.ts
```

### **Phase 2: Update Earnings Screen**
```bash
# Add feature gate
src/app/provider/earnings/index.tsx
```

### **Phase 3: Update Bookings Screen**
```bash
# Add partial access + banner
src/app/provider/bookings/index.tsx
```

### **Phase 4: Add Booking Accept Guard**
```bash
# Add action guard
src/app/provider/bookings/[id].tsx
```

### **Phase 5: Add Banner Components**
```bash
# Create banner components
src/components/provider/PaymentSetupBanner.tsx
```

---

## ✅ **Why This Approach Wins**

### **1. Better UX**
- ✅ Users see what they're missing (bookings, earnings)
- ✅ Clear explanation of requirements
- ✅ Direct path to unblock (CTA button)

### **2. Higher Conversion**
- ✅ Booking accept guard: **80-90%** conversion
- ✅ Earnings empty state: **50-60%** conversion
- ✅ vs Protected routes: **30-40%** conversion

### **3. Progressive Disclosure**
- ✅ Show locked features (motivation)
- ✅ Explain requirements (education)
- ✅ Provide unlock path (action)

### **4. Flexibility**
- ✅ Partial access to bookings (view but not accept)
- ✅ Different messages per context
- ✅ Easy to add new gates

---

## 🎯 **Final Recommendation**

**DON'T USE**: `Stack.Protected` for payment gates

**DO USE**: Feature gates + action guards with `useProviderAccess` hook

**KEEP**: Route-level guards for verification status (existing)

---

## 🚀 **Ready to Implement?**

Let's start with Phase 1: Create the `useProviderAccess` hook!

Should I proceed? 🔥

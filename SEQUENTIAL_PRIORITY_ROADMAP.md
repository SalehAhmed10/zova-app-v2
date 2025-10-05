# 🚀 Priority Roadmap - Sequential Implementation Plan

## 📋 Current Status
- **Overall Progress**: 78% Complete
- **Backend**: ✅ 100% Complete
- **Provider UI**: ✅ 100% Complete
- **Navigation Tab**: ✅ 100% Complete
- **Current Blocker**: Metro bundler cache issue (date-fns not resolving)

---

## 🔧 IMMEDIATE FIX REQUIRED

### Issue: Metro Bundler Not Resolving date-fns
**Error**:
```
Unable to resolve "date-fns" from "src\components\provider\CountdownTimer.tsx"
```

**Status**: `date-fns@4.1.0` is installed in package.json ✅

**Solution** (3 steps):

#### Step 1: Stop All Running Processes
```powershell
# Press Ctrl+C in terminal running Metro
# OR close VS Code terminal
```

#### Step 2: Clear All Caches
```powershell
# Clear Metro bundler cache
npx expo start --clear

# OR more aggressive approach:
rm -rf node_modules
npm install
npx expo start --clear
```

#### Step 3: Rebuild Android
```powershell
# If still not working, rebuild Android app:
cd android
./gradlew clean
cd ..
npx expo run:android
```

**Expected Result**: App builds successfully, date-fns imports work ✅

---

## 🎯 SEQUENTIAL IMPLEMENTATION PLAN

### User's Request
> "put notification at the end of priority and do rest in sequence"

**Adjusted Priority Order**:
1. ✅ **Fix Metro bundler issue** (RIGHT NOW)
2. 🧪 **Test current implementation** (1 hour)
3. 🎨 **Build Customer UI** (Week 2 - 3-5 days)
4. ⏰ **Create Timeout Cron Function** (Week 3 - 1 day)
5. 🔔 **Implement Push Notifications** (MOVED TO END - 1 week)

---

## 📅 Week-by-Week Breakdown

### Week 1: Testing & Validation (THIS WEEK)

#### Day 1 (Today - October 3, 2025)
- [x] ✅ Provider booking requests UI complete
- [x] ✅ Navigation tab with badge added
- [ ] 🔧 **FIX: Metro bundler issue** (30 minutes)
- [ ] 🧪 **TEST: All 10 test scenarios** (1 hour)
  - Accept booking flow
  - Decline booking flow with Stripe refunds
  - Countdown timer behavior
  - Badge count updates
  - Error handling
  - Multiple bookings

**Success Criteria**:
- [ ] App builds on Android without errors
- [ ] Can navigate to "Requests" tab
- [ ] Badge count shows correctly
- [ ] Accept booking works
- [ ] Decline booking creates Stripe refund
- [ ] All tests pass from `BOOKING_REQUESTS_TESTING_GUIDE.md`

**Blockers**: Metro bundler cache issue (fixing now)

---

### Week 2: Customer Experience (October 4-8, 2025)

#### Priority A: Customer UI - Pending Status Display (2 days)

**Goal**: Let customers see booking status and understand waiting period

**Files to Create**:

1. **`src/components/customer/BookingStatusCard.tsx`** (NEW)
   ```typescript
   // Card showing booking status with different states:
   // - Pending (with countdown)
   // - Confirmed (success state)
   // - Declined (with reason + refund info)
   // - Expired (with refund info)
   ```

2. **`src/hooks/customer/useBookingDetails.ts`** (NEW)
   ```typescript
   // React Query hook to fetch single booking details
   export function useBookingDetails(bookingId: string) {
     return useQuery({
       queryKey: ['booking', bookingId],
       queryFn: async () => {
         const { data, error } = await supabase
           .from('bookings')
           .select(`
             *,
             provider:profiles!provider_id(id, full_name, email),
             service:provider_services!service_id(id, title, price)
           `)
           .eq('id', bookingId)
           .single();
         
         if (error) throw error;
         return data;
       },
       refetchInterval: 30000, // Refresh every 30 seconds
     });
   }
   ```

3. **Update `src/app/customer/bookings/[id].tsx`** (MODIFY)
   ```typescript
   // Add status display based on booking.status:
   // - pending: Show countdown + "Waiting for provider response"
   // - confirmed: Show success message
   // - declined: Show reason + refund notice
   // - expired: Show refund notice
   ```

**Implementation Steps**:

**Day 1: Create BookingStatusCard Component**
```typescript
// src/components/customer/BookingStatusCard.tsx
import { View } from 'react-native';
import { Card, CardContent } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { CountdownTimer } from '@/components/provider/CountdownTimer';

interface BookingStatusCardProps {
  status: 'pending' | 'confirmed' | 'declined' | 'expired';
  providerResponseDeadline?: string | null;
  declinedReason?: string | null;
}

export function BookingStatusCard({ 
  status, 
  providerResponseDeadline, 
  declinedReason 
}: BookingStatusCardProps) {
  if (status === 'pending' && providerResponseDeadline) {
    return (
      <Card className="mb-4 border-primary/20 bg-primary/5">
        <CardContent className="p-4">
          <View className="flex-row items-center mb-2">
            <Text className="text-lg font-semibold">⏳ Awaiting Confirmation</Text>
          </View>
          <Text className="text-sm text-muted-foreground mb-3">
            Your provider has been notified and will respond within:
          </Text>
          <CountdownTimer deadline={providerResponseDeadline} />
          <Text className="text-xs text-muted-foreground mt-2">
            If they don't respond in time, you'll receive a full refund automatically.
          </Text>
        </CardContent>
      </Card>
    );
  }

  if (status === 'confirmed') {
    return (
      <Card className="mb-4 border-green-500/20 bg-green-500/5">
        <CardContent className="p-4">
          <Text className="text-lg font-semibold text-green-600">✅ Booking Confirmed!</Text>
          <Text className="text-sm text-muted-foreground mt-2">
            Your provider has accepted your booking. They'll see you soon!
          </Text>
        </CardContent>
      </Card>
    );
  }

  if (status === 'declined') {
    return (
      <Card className="mb-4 border-destructive/20 bg-destructive/5">
        <CardContent className="p-4">
          <Text className="text-lg font-semibold text-destructive">❌ Booking Declined</Text>
          {declinedReason && (
            <View className="mt-2 p-3 bg-background rounded-lg">
              <Text className="text-xs text-muted-foreground mb-1">Provider's reason:</Text>
              <Text className="text-sm">{declinedReason}</Text>
            </View>
          )}
          <View className="mt-3 p-3 bg-green-500/10 rounded-lg">
            <Text className="text-sm font-medium text-green-600">💰 Full Refund Issued</Text>
            <Text className="text-xs text-muted-foreground mt-1">
              Your payment has been refunded. It may take 5-7 business days to appear in your account.
            </Text>
          </View>
        </CardContent>
      </Card>
    );
  }

  if (status === 'expired') {
    return (
      <Card className="mb-4 border-orange-500/20 bg-orange-500/5">
        <CardContent className="p-4">
          <Text className="text-lg font-semibold text-orange-600">⏰ Booking Expired</Text>
          <Text className="text-sm text-muted-foreground mt-2">
            Your provider didn't respond within 24 hours.
          </Text>
          <View className="mt-3 p-3 bg-green-500/10 rounded-lg">
            <Text className="text-sm font-medium text-green-600">💰 Full Refund Issued</Text>
            <Text className="text-xs text-muted-foreground mt-1">
              Your payment has been automatically refunded.
            </Text>
          </View>
        </CardContent>
      </Card>
    );
  }

  return null;
}
```

**Day 2: Create Hook and Update Booking Details Screen**
```typescript
// src/hooks/customer/useBookingDetails.ts
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export function useBookingDetails(bookingId: string) {
  return useQuery({
    queryKey: ['booking', bookingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          provider:profiles!provider_id(id, full_name, email),
          service:provider_services!service_id(id, title, price)
        `)
        .eq('id', bookingId)
        .single();
      
      if (error) throw error;
      return data;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
    refetchOnWindowFocus: true,
  });
}
```

```typescript
// Update src/app/customer/bookings/[id].tsx
import { BookingStatusCard } from '@/components/customer/BookingStatusCard';
import { useBookingDetails } from '@/hooks/customer/useBookingDetails';
import { useLocalSearchParams } from 'expo-router';

export default function BookingDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: booking, isLoading } = useBookingDetails(id);

  if (isLoading) return <LoadingScreen />;
  if (!booking) return <ErrorScreen />;

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView className="flex-1 p-4">
        {/* Add status card at top */}
        <BookingStatusCard
          status={booking.status}
          providerResponseDeadline={booking.provider_response_deadline}
          declinedReason={booking.declined_reason}
        />

        {/* Rest of booking details... */}
        <Card>
          <CardHeader>
            <Text variant="h3">{booking.service.title}</Text>
          </CardHeader>
          <CardContent>
            {/* Existing booking details */}
          </CardContent>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
```

**Testing Checklist**:
- [ ] Pending status shows countdown timer
- [ ] Confirmed status shows success message
- [ ] Declined status shows reason + refund info
- [ ] Expired status shows refund info
- [ ] Status updates automatically (30s refresh)
- [ ] Pull-to-refresh works

**Estimated Time**: 2 days (16 hours)

---

#### Priority B: Customer Booking List - Status Badges (1 day)

**Goal**: Show status badges in customer's "My Bookings" list

**Files to Modify**:

1. **`src/app/customer/bookings/index.tsx`** (UPDATE)
   ```typescript
   // Add status badge to each booking card:
   {booking.status === 'pending' && (
     <View className="px-2 py-1 bg-yellow-500/20 rounded-full">
       <Text className="text-xs font-medium text-yellow-700">Pending</Text>
     </View>
   )}
   {booking.status === 'confirmed' && (
     <View className="px-2 py-1 bg-green-500/20 rounded-full">
       <Text className="text-xs font-medium text-green-700">Confirmed</Text>
     </View>
   )}
   // ... etc for declined, expired
   ```

**Implementation**:
```typescript
// Create reusable component
// src/components/customer/BookingStatusBadge.tsx
export function BookingStatusBadge({ status }: { status: string }) {
  const config = {
    pending: { bg: 'bg-yellow-500/20', text: 'text-yellow-700', label: 'Pending', icon: '⏳' },
    confirmed: { bg: 'bg-green-500/20', text: 'text-green-700', label: 'Confirmed', icon: '✅' },
    declined: { bg: 'bg-red-500/20', text: 'text-red-700', label: 'Declined', icon: '❌' },
    expired: { bg: 'bg-orange-500/20', text: 'text-orange-700', label: 'Expired', icon: '⏰' },
    completed: { bg: 'bg-blue-500/20', text: 'text-blue-700', label: 'Completed', icon: '🎉' },
  }[status] || { bg: 'bg-gray-500/20', text: 'text-gray-700', label: status, icon: '📌' };

  return (
    <View className={`flex-row items-center px-2 py-1 rounded-full ${config.bg}`}>
      <Text className="text-xs mr-1">{config.icon}</Text>
      <Text className={`text-xs font-medium ${config.text}`}>{config.label}</Text>
    </View>
  );
}
```

**Testing**:
- [ ] Badge shows correct status
- [ ] Badge colors match design
- [ ] Badge updates when status changes

**Estimated Time**: 1 day (8 hours)

---

#### Priority C: Customer Notifications in Booking Confirmation (1 day)

**Goal**: Show helpful messages after booking creation

**Files to Modify**:

1. **`src/app/customer/booking-confirmation.tsx`** (UPDATE)
   ```typescript
   // After successful booking, show different messages based on auto_confirmed:
   
   if (booking.auto_confirmed) {
     // Instant confirmation (provider has auto-accept enabled)
     return (
       <View>
         <Text variant="h2">✅ Booking Confirmed!</Text>
         <Text>Your booking is confirmed. The provider will see you soon!</Text>
       </View>
     );
   } else {
     // Pending confirmation (provider has auto-accept disabled)
     return (
       <View>
         <Text variant="h2">⏳ Booking Pending</Text>
         <Text>Your booking is awaiting provider confirmation.</Text>
         <CountdownTimer deadline={booking.provider_response_deadline} />
         <Text>If they don't respond within 24 hours, you'll get a full refund.</Text>
       </View>
     );
   }
   ```

**Testing**:
- [ ] Auto-confirmed bookings show success immediately
- [ ] Pending bookings show countdown and explanation
- [ ] Messages are clear and reassuring

**Estimated Time**: 1 day (8 hours)

---

### Week 3: Automation & Reliability (October 9-11, 2025)

#### Priority: Timeout Cron Function (CRITICAL - 1 day)

**Goal**: Automatically expire bookings after 24 hours and refund customers

**Why Critical**: Prevents indefinite "pending" bookings, ensures customer refunds

**Files to Create**:

1. **`supabase/functions/check-booking-timeouts/index.ts`** (NEW)

```typescript
// Complete Edge Function implementation
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  try {
    console.log('[TIMEOUT-CHECK] Starting booking timeout check...');

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find expired bookings (past deadline, still pending)
    const { data: expiredBookings, error: fetchError } = await supabase
      .from('bookings')
      .select(`
        id,
        status,
        provider_response_deadline,
        stripe_payment_intent_id,
        base_amount,
        total_amount,
        customer:profiles!customer_id(id, email, full_name, expo_push_token),
        provider:profiles!provider_id(id, email, full_name),
        service:provider_services!service_id(id, title)
      `)
      .eq('status', 'pending')
      .not('provider_response_deadline', 'is', null)
      .lt('provider_response_deadline', new Date().toISOString())
      // Only process bookings from last 48 hours (safety limit)
      .gte('provider_response_deadline', new Date(Date.now() - 48*60*60*1000).toISOString());

    if (fetchError) {
      console.error('[TIMEOUT-CHECK] Error fetching expired bookings:', fetchError);
      throw fetchError;
    }

    console.log(`[TIMEOUT-CHECK] Found ${expiredBookings?.length || 0} expired bookings`);

    if (!expiredBookings || expiredBookings.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No expired bookings found',
          processed: 0 
        }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    const results = [];

    // Process each expired booking
    for (const booking of expiredBookings) {
      console.log(`[TIMEOUT-CHECK] Processing booking ${booking.id}`);

      try {
        // Step 1: Create Stripe refund
        console.log(`[TIMEOUT-CHECK] Creating Stripe refund for ${booking.stripe_payment_intent_id}`);
        
        const refundResponse = await fetch('https://api.stripe.com/v1/refunds', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${stripeSecretKey}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            payment_intent: booking.stripe_payment_intent_id,
            reason: 'requested_by_customer',
            metadata: {
              booking_id: booking.id,
              reason: 'Provider did not respond within 24 hours (automatic expiration)',
            },
          }),
        });

        if (!refundResponse.ok) {
          const errorData = await refundResponse.json();
          console.error(`[TIMEOUT-CHECK] Stripe refund failed for booking ${booking.id}:`, errorData);
          results.push({
            booking_id: booking.id,
            status: 'error',
            error: `Stripe refund failed: ${errorData.error?.message || 'Unknown error'}`,
          });
          continue;
        }

        const refund = await refundResponse.json();
        console.log(`[TIMEOUT-CHECK] Refund created: ${refund.id}`);

        // Step 2: Update booking status to expired
        const { error: updateBookingError } = await supabase
          .from('bookings')
          .update({
            status: 'expired',
            payment_status: 'refunded',
            declined_reason: 'Provider did not respond within 24 hours',
            updated_at: new Date().toISOString(),
          })
          .eq('id', booking.id);

        if (updateBookingError) {
          console.error(`[TIMEOUT-CHECK] Error updating booking ${booking.id}:`, updateBookingError);
          results.push({
            booking_id: booking.id,
            status: 'error',
            error: `Database update failed: ${updateBookingError.message}`,
            refund_id: refund.id,
          });
          continue;
        }

        // Step 3: Update payment record
        const { error: updatePaymentError } = await supabase
          .from('payments')
          .update({
            status: 'refunded',
            refunded_at: new Date().toISOString(),
            stripe_refund_id: refund.id,
          })
          .eq('booking_id', booking.id);

        if (updatePaymentError) {
          console.error(`[TIMEOUT-CHECK] Error updating payment for booking ${booking.id}:`, updatePaymentError);
        }

        // Step 4: Send push notification to customer (if token available)
        if (booking.customer?.expo_push_token) {
          console.log(`[TIMEOUT-CHECK] Sending notification to customer`);
          
          try {
            await fetch('https://exp.host/--/api/v2/push/send', {
              method: 'POST',
              headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                to: booking.customer.expo_push_token,
                title: 'Booking Expired',
                body: `Your booking for "${booking.service?.title}" expired. Full refund issued.`,
                data: {
                  type: 'booking_expired',
                  booking_id: booking.id,
                  screen: `/customer/bookings/${booking.id}`,
                },
              }),
            });
          } catch (notifError) {
            console.error(`[TIMEOUT-CHECK] Push notification failed:`, notifError);
            // Don't fail the whole operation if notification fails
          }
        }

        // Success!
        results.push({
          booking_id: booking.id,
          status: 'success',
          refund_id: refund.id,
          amount_refunded: refund.amount / 100,
          customer_email: booking.customer?.email,
        });

        console.log(`[TIMEOUT-CHECK] ✅ Successfully processed booking ${booking.id}`);

      } catch (error) {
        console.error(`[TIMEOUT-CHECK] Error processing booking ${booking.id}:`, error);
        results.push({
          booking_id: booking.id,
          status: 'error',
          error: error.message,
        });
      }
    }

    // Summary
    const successCount = results.filter(r => r.status === 'success').length;
    const errorCount = results.filter(r => r.status === 'error').length;

    console.log(`[TIMEOUT-CHECK] Complete: ${successCount} success, ${errorCount} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${results.length} expired bookings`,
        summary: {
          total: results.length,
          successful: successCount,
          failed: errorCount,
        },
        results,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[TIMEOUT-CHECK] Fatal error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
```

**Deployment Steps**:
```bash
# 1. Deploy the Edge Function
supabase functions deploy check-booking-timeouts

# 2. Test manually first
supabase functions invoke check-booking-timeouts

# 3. Add cron schedule (runs every 15 minutes)
# In Supabase Dashboard → Edge Functions → check-booking-timeouts → Settings
# Set cron schedule: */15 * * * *
```

**Testing Checklist**:
- [ ] Manually set booking deadline to past
- [ ] Run function manually
- [ ] Verify booking status changed to 'expired'
- [ ] Verify Stripe refund created
- [ ] Verify payment status changed to 'refunded'
- [ ] Verify customer notification sent (if implemented)
- [ ] Deploy with 15-minute cron schedule
- [ ] Monitor for 24 hours

**Estimated Time**: 1 day (8 hours)

---

### Week 4+: Push Notifications (MOVED TO END)

#### Full Push Notification Implementation (1 week)

**Files to Create**:

1. **`src/lib/notifications/push.ts`** - Setup and registration
2. **`src/lib/notifications/handlers.ts`** - Notification handlers
3. **`supabase/functions/_shared/send-push-notification.ts`** - Utility function
4. Update all Edge Functions to send notifications

**Estimated Time**: 1 week (40 hours)

**Details**: Deferred to end of priority list per user request

---

## 📊 Progress Tracking

### Current Status (October 3, 2025)

| Task | Status | Days | Notes |
|------|--------|------|-------|
| Backend Edge Functions | ✅ Complete | - | accept-booking, decline-booking |
| Database Migration | ✅ Complete | - | add_booking_acceptance_flow |
| Provider Mobile UI | ✅ Complete | - | 7 files created |
| Navigation Tab | ✅ Complete | - | Badge count integrated |
| **Metro Bundler Fix** | 🔧 IN PROGRESS | 0.5 | date-fns resolution issue |
| **Testing Phase** | ⏳ NEXT | 1 | All 10 test scenarios |
| Customer UI | ⏳ Week 2 | 3-5 | BookingStatusCard + hooks |
| Timeout Cron | ⏳ Week 3 | 1 | Auto-expire + refund |
| Push Notifications | ⏳ Week 4+ | 5 | Moved to end |

**Overall**: 78% → 100% (3-4 weeks remaining)

---

## ✅ Definition of Done

### Feature 100% Complete When:
- [x] Backend deployed ✅
- [x] Provider UI implemented ✅
- [x] Navigation tab added ✅
- [ ] Metro bundler working ← **RIGHT NOW**
- [ ] All tests pass ← **Next**
- [ ] Customer UI implemented ← **Week 2**
- [ ] Timeout cron deployed ← **Week 3**
- [ ] Push notifications working ← **Week 4+**
- [ ] 0 critical bugs in production
- [ ] 100+ successful bookings processed

---

## 🚨 Critical Path

**Must Complete in Order**:
1. Fix Metro bundler (BLOCKING)
2. Test Provider UI (validation)
3. Customer UI (customer awareness)
4. Timeout Cron (data integrity)
5. Push Notifications (UX enhancement)

**Cannot Skip**: Steps 1-4 are mandatory for production
**Can Defer**: Step 5 (notifications) can be added later

---

## 📞 Support & Resources

- **Testing Guide**: `BOOKING_REQUESTS_TESTING_GUIDE.md`
- **Implementation Details**: `PROVIDER_BOOKING_REQUESTS_IMPLEMENTATION.md`
- **Navigation Details**: `NAVIGATION_TAB_ADDED.md`

---

**Last Updated**: October 3, 2025
**Current Milestone**: Fix Metro bundler → Test → Customer UI
**Timeline**: 3-4 weeks to 100% complete
**Status**: ON TRACK ✅

// Payment Setup Status Card for Provider Dashboard
// ✅ MIGRATED: Now uses React Query + Zustand architecture (copilot-rules.md compliant)
// ❌ REMOVED: useState + useEffect patterns - ALL useEffect eliminated per copilot-rules.md
// ✅ ADDED: React Query for server state management

import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PaymentAnalyticsService } from '@/lib/payment/payment-analytics';

// ✅ NEW: Using React Query hook instead of useState + useEffect
import { usePaymentStatus } from '@/hooks/provider/usePaymentStatus';

interface PaymentSetupStatusProps {
  userId: string;
}

export const PaymentSetupStatusCard: React.FC<PaymentSetupStatusProps> = ({ userId }) => {
  // ✅ PURE REACT QUERY: Server state management (replaces useState + useEffect)
  const { 
    data: paymentStatus, 
    isLoading: loading, 
    error 
  } = usePaymentStatus(userId);

  // ✅ PURE ANALYTICS: Track payment prompt on render (replaces useEffect)
  React.useMemo(() => {
    if (userId && paymentStatus !== undefined && !paymentStatus?.accountSetupComplete) {
      PaymentAnalyticsService.trackPaymentPromptShown(userId, 'dashboard');
    }
  }, [userId, paymentStatus?.accountSetupComplete]);

  // Handle loading state
  if (loading) {
    return (
      <Card className="mb-6">
        <CardContent className="p-4">
          <Text className="text-muted-foreground">Checking payment status...</Text>
        </CardContent>
      </Card>
    );
  }

  // Handle error state
  if (error) {
    return (
      <Card className="mb-6">
        <CardContent className="p-4">
          <Text className="text-destructive text-sm">
            Error checking payment status. Please try again later.
          </Text>
        </CardContent>
      </Card>
    );
  }

  // Payment setup complete
  if (paymentStatus?.accountSetupComplete && paymentStatus?.chargesEnabled) {
    return (
      <Card className="mb-6">
        <CardContent className="p-4">
          <View className="flex-row items-center mb-2">
            <Text className="text-2xl mr-3">✅</Text>
            <Text className="font-semibold text-foreground">Payments Ready</Text>
          </View>
          <Text className="text-muted-foreground text-sm">
            Your payment account is set up and ready to receive earnings.
          </Text>
          {paymentStatus.accountId && (
            <Text className="text-xs text-muted-foreground mt-2">
              Account: {paymentStatus.accountId}
            </Text>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-6">
      <CardContent className="p-4">
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center">
            <Text className="text-2xl mr-3">💳</Text>
            <Text className="font-semibold text-foreground">Payment Setup</Text>
          </View>
          <View className="bg-orange-100 dark:bg-orange-900/20 px-2 py-1 rounded">
            <Text className="text-orange-600 dark:text-orange-400 text-xs font-medium">
              ACTION NEEDED
            </Text>
          </View>
        </View>
        
        <Text className="text-muted-foreground text-sm mb-4">
          {paymentStatus?.hasStripeAccount 
            ? "Complete your Stripe account setup to start receiving payments from customers."
            : "Set up your payment account to start earning from bookings. Quick and secure with Stripe."
          }
        </Text>

        <View className="gap-2 mb-4">
          <View className="flex-row items-center">
            <Text className="text-lg mr-2">⚡</Text>
            <Text className="text-sm text-muted-foreground">Fast 2-3 minute setup</Text>
          </View>
          <View className="flex-row items-center">
            <Text className="text-lg mr-2">🔒</Text>
            <Text className="text-sm text-muted-foreground">Bank-level security with Stripe</Text>
          </View>
          <View className="flex-row items-center">
            <Text className="text-lg mr-2">💰</Text>
            <Text className="text-sm text-muted-foreground">Automatic transfers to your bank</Text>
          </View>
        </View>

        <Button
          size="sm"
          onPress={async () => {
            // Track payment setup started from dashboard
            await PaymentAnalyticsService.trackPaymentSetupStarted(userId, 'dashboard');
            // Navigate to provider payment setup screen
            router.push('/(provider)/setup-payment');
          }}
          className="w-full"
        >
          <Text className="font-medium text-primary-foreground">
            {paymentStatus?.hasStripeAccount ? 'Complete Setup' : 'Set Up Payments'}
          </Text>
        </Button>
      </CardContent>
    </Card>
  );
};
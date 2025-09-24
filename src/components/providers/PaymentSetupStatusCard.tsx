// Payment Setup Status Card for Provider Dashboard
// Add this to your provider dashboard to show payment setup status

import React, { useState, useEffect } from 'react';
import { View, Alert } from 'react-native';
import { router } from 'expo-router';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { PaymentAnalyticsService } from '@/lib/payment-analytics';

interface PaymentSetupStatusProps {
  userId: string;
}

export const PaymentSetupStatusCard: React.FC<PaymentSetupStatusProps> = ({ userId }) => {
  const [paymentStatus, setPaymentStatus] = useState<{
    hasStripeAccount: boolean;
    accountSetupComplete: boolean;
    chargesEnabled: boolean;
    accountId?: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkPaymentStatus();
    
    // Track that payment prompt was shown in dashboard
    if (userId && !paymentStatus?.accountSetupComplete) {
      PaymentAnalyticsService.trackPaymentPromptShown(userId, 'dashboard');
    }
  }, [userId]);

  const checkPaymentStatus = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('check-stripe-account-status');
      
      if (!error && data) {
        setPaymentStatus({
          hasStripeAccount: data.hasStripeAccount,
          accountSetupComplete: data.accountSetupComplete,
          chargesEnabled: data.charges_enabled,
          accountId: data.accountId
        });
      }
    } catch (error) {
      console.error('Error checking payment status:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="mb-6">
        <CardContent className="p-4">
          <Text className="text-muted-foreground">Checking payment status...</Text>
        </CardContent>
      </Card>
    );
  }

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

        <View className="space-y-2 mb-4">
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
            router.push('/provider-verification/payment');
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
import React, { useState } from 'react';
import { View, Alert } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { ScreenWrapper } from '@/components/ui/screen-wrapper';
import { useProviderVerificationStore } from '@/stores/provider-verification';

export default function PaymentSetupScreen() {
  const [loading, setLoading] = useState(false);
  
  const { 
    paymentData,
    updatePaymentData,
    completeStep,
    nextStep,
    previousStep 
  } = useProviderVerificationStore();

  const handleStripeSetup = async () => {
    setLoading(true);
    try {
      // In a real app, this would integrate with Stripe Connect
      // For now, we'll simulate the account setup
      
      Alert.alert(
        'Stripe Account Setup',
        'In a production app, this would redirect you to Stripe to set up your account. For now, we\'ll mark the setup as complete.',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Continue',
            onPress: async () => {
              // Update verification store with simulated Stripe account
              const data = {
                stripeAccountId: `acct_${Date.now()}`, // Simulated account ID
                accountSetupComplete: true,
              };
              
              updatePaymentData(data);
              completeStep(9, data);
              
              nextStep();
              router.push('/provider-verification/complete' as any);
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error setting up payment:', error);
      Alert.alert('Setup Failed', 'Failed to set up payment account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenWrapper scrollable={true} contentContainerClassName="px-6 py-4">
      {/* Header */}
      <Animated.View 
        entering={FadeIn.delay(200).springify()}
        className="items-center mb-8"
      >
        <View className="w-16 h-16 bg-primary rounded-2xl justify-center items-center mb-4">
          <Text className="text-2xl">💳</Text>
        </View>
        <Text className="text-2xl font-bold text-foreground mb-2">
          Payment Setup
        </Text>
        <Text className="text-base text-muted-foreground text-center">
          Set up your Stripe account to receive payments from customers
        </Text>
      </Animated.View>

      {/* Current Status */}
      <Animated.View entering={SlideInDown.delay(300).springify()} className="mb-6">
        {paymentData.accountSetupComplete ? (
          <View className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
            <Text className="font-semibold text-green-900 dark:text-green-100 mb-2">
              ✅ Account Setup Complete
            </Text>
            <Text className="text-green-800 dark:text-green-200 text-sm">
              Your Stripe account is configured and ready to receive payments.
            </Text>
            {paymentData.stripeAccountId && (
              <Text className="text-green-700 dark:text-green-300 text-xs mt-2">
                Account ID: {paymentData.stripeAccountId}
              </Text>
            )}
          </View>
        ) : (
          <View className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <Text className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
              🔗 Stripe Connect Required
            </Text>
            <Text className="text-blue-800 dark:text-blue-200 text-sm">
              You'll need to connect your Stripe account to receive payments. This process is secure and takes just a few minutes.
            </Text>
          </View>
        )}
      </Animated.View>

      {/* Stripe Features */}
      <Animated.View entering={SlideInDown.delay(400).springify()} className="mb-6">
        <Text className="text-lg font-semibold text-foreground mb-4">
          Why Stripe?
        </Text>
        <View className="space-y-3">
          <View className="flex-row items-start space-x-3">
            <View className="w-6 h-6 bg-green-100 dark:bg-green-900 rounded-full items-center justify-center mt-0.5">
              <Text className="text-green-600 dark:text-green-400 text-xs font-bold">✓</Text>
            </View>
            <View className="flex-1">
              <Text className="font-medium text-foreground">Fast & Secure Payments</Text>
              <Text className="text-sm text-muted-foreground">
                Industry-leading security with instant payment processing
              </Text>
            </View>
          </View>
          
          <View className="flex-row items-start space-x-3">
            <View className="w-6 h-6 bg-green-100 dark:bg-green-900 rounded-full items-center justify-center mt-0.5">
              <Text className="text-green-600 dark:text-green-400 text-xs font-bold">✓</Text>
            </View>
            <View className="flex-1">
              <Text className="font-medium text-foreground">Automatic Transfers</Text>
              <Text className="text-sm text-muted-foreground">
                Funds transferred to your bank account in 2-3 business days
              </Text>
            </View>
          </View>

          <View className="flex-row items-start space-x-3">
            <View className="w-6 h-6 bg-green-100 dark:bg-green-900 rounded-full items-center justify-center mt-0.5">
              <Text className="text-green-600 dark:text-green-400 text-xs font-bold">✓</Text>
            </View>
            <View className="flex-1">
              <Text className="font-medium text-foreground">Global Support</Text>
              <Text className="text-sm text-muted-foreground">
                Accept payments from customers worldwide
              </Text>
            </View>
          </View>

          <View className="flex-row items-start space-x-3">
            <View className="w-6 h-6 bg-green-100 dark:bg-green-900 rounded-full items-center justify-center mt-0.5">
              <Text className="text-green-600 dark:text-green-400 text-xs font-bold">✓</Text>
            </View>
            <View className="flex-1">
              <Text className="font-medium text-foreground">Detailed Analytics</Text>
              <Text className="text-sm text-muted-foreground">
                Track your earnings and payment history
              </Text>
            </View>
          </View>
        </View>
      </Animated.View>

      {/* Setup Button */}
      <Animated.View entering={SlideInDown.delay(600).springify()} className="mb-6">
        {!paymentData.accountSetupComplete ? (
          <Button
            size="lg"
            onPress={handleStripeSetup}
            disabled={loading}
            className="w-full"
          >
            <Text className="font-semibold text-primary-foreground">
              {loading ? 'Setting up...' : 'Set up Stripe Account'}
            </Text>
          </Button>
        ) : (
          <Button
            size="lg"
            onPress={() => {
              nextStep();
              router.push('/provider-verification/complete' as any);
            }}
            className="w-full"
          >
            <Text className="font-semibold text-primary-foreground">
              Complete Verification
            </Text>
          </Button>
        )}
      </Animated.View>

      {/* Important Notice */}
      <Animated.View entering={SlideInDown.delay(700).springify()} className="mb-6">
        <View className="p-4 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
          <Text className="font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
            ⚠️ Important Information
          </Text>
          <View className="space-y-1">
            <Text className="text-yellow-800 dark:text-yellow-200 text-sm">
              • Standard Stripe processing fees apply (2.9% + $0.30 per transaction)
            </Text>
            <Text className="text-yellow-800 dark:text-yellow-200 text-sm">
              • You'll need a valid government ID and bank account
            </Text>
            <Text className="text-yellow-800 dark:text-yellow-200 text-sm">
              • Account verification typically takes 1-2 business days
            </Text>
            <Text className="text-yellow-800 dark:text-yellow-200 text-sm">
              • You can modify your account settings anytime
            </Text>
          </View>
        </View>
      </Animated.View>

      {/* Back Button */}
      <Animated.View entering={SlideInDown.delay(800).springify()}>
        <Button
          variant="outline"
          size="lg"
          onPress={() => {
            previousStep();
            router.back();
          }}
          className="w-full"
        >
          <Text>Back to Terms</Text>
        </Button>
      </Animated.View>
    </ScreenWrapper>
  );
}
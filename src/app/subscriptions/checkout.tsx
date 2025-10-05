import React, { useState } from 'react';
import { View, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Text } from '@/components/ui/text';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

import { 
  useCreateSubscription,
  useSubscriptionPrice,
  type CreateSubscriptionRequest
} from '@/hooks/shared/useSubscription';
import { useAuthPure } from '@/hooks/shared/useAuthPure';
import { Shield, Check, ArrowLeft, CreditCard, Calendar, RefreshCw, Zap } from 'lucide-react-native';
import { useStripe } from '@stripe/stripe-react-native';
import { useColorScheme } from '@/lib/core/useColorScheme';

export default function SubscriptionCheckoutScreen() {
  const { type } = useLocalSearchParams<{ type: 'CUSTOMER_SOS' | 'PROVIDER_PREMIUM' }>();  
  const { user } = useAuthPure();
  const { presentPaymentSheet, initPaymentSheet } = useStripe();
  const { isDarkColorScheme } = useColorScheme();
  
  const [isProcessing, setIsProcessing] = useState(false);
  
  const createSubscriptionMutation = useCreateSubscription();
  const priceInfo = useSubscriptionPrice(type || 'CUSTOMER_SOS');

  const handleSubscribe = async () => {
    if (!user?.email || !type) {
      Alert.alert('Error', 'Missing user information');
      return;
    }

    setIsProcessing(true);

    try {
      // Step 1: Create subscription with Stripe
      const subscriptionRequest: CreateSubscriptionRequest = {
        subscriptionType: type,
        priceId: priceInfo.priceId,
        customerEmail: user.email,
      };

      const response = await createSubscriptionMutation.mutateAsync(subscriptionRequest);

      // Step 2: Initialize payment sheet
      const { error: initError } = await initPaymentSheet({
        paymentIntentClientSecret: response.clientSecret,
        merchantDisplayName: 'ZOVA',
        appearance: {
          colors: {
            primary: '#007AFF',
          }
        },
        returnURL: 'zova://checkout-complete',
        allowsDelayedPaymentMethods: false,
      });

      if (initError) {
        throw new Error(initError.message);
      }

      // Step 3: Present payment sheet
      const { error: paymentError } = await presentPaymentSheet();

      if (paymentError) {
        if (paymentError.code !== 'Canceled') {
          throw new Error(paymentError.message);
        }
        return;
      }

      // Success - navigation handled by webhook/polling
      Alert.alert(
        'Subscription Active! 🎉',
        `Your ${priceInfo.displayName} subscription is now active. You can now access all premium features.`,
        [
          {
            text: 'Continue',
            onPress: () => {
              if (type === 'CUSTOMER_SOS') {
                router.replace('/customer/subscriptions');
              } else {
                router.replace('/provider/subscriptions');
              }
            }
          }
        ]
      );

    } catch (error) {
      console.error('Subscription error:', error);
      Alert.alert(
        'Subscription Failed', 
        error instanceof Error ? error.message : 'Failed to create subscription. Please try again.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const isCustomerSOS = type === 'CUSTOMER_SOS';
  const features = isCustomerSOS ? [
    'SOS emergency booking access',
    'Priority provider matching',
    '24/7 priority support', 
    'Instant booking confirmation',
    'Emergency service guarantee',
    'Skip regular booking queues'
  ] : [
    'Priority search placement',
    'Advanced analytics dashboard',
    'Customer insights & trends',
    'Custom business branding',
    'Enhanced profile visibility',
    'Premium customer support'
  ];

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="p-4 gap-6">
          {/* Header */}
          <View className="flex-row items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onPress={() => router.back()}
              className="p-2"
            >
              <ArrowLeft size={20} className="text-foreground" />
            </Button>
            <View className="flex-1">
              <Text className="text-xl font-bold text-foreground">Subscribe to {priceInfo.displayName}</Text>
              <Text className="text-sm text-muted-foreground mt-1">
                {isCustomerSOS ? 'Get emergency booking access' : 'Boost your business visibility'}
              </Text>
            </View>
          </View>

          {/* Plan Overview */}
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <View className="flex-row items-center gap-3">
                <View className="p-3 rounded-full bg-primary/10">
                  <Shield size={24} className="text-primary" />
                </View>
                <View className="flex-1">
                  <CardTitle className="text-lg">{priceInfo.displayName}</CardTitle>
                  <CardDescription className="text-sm">
                    {priceInfo.description}
                  </CardDescription>
                </View>
                <Badge variant="default" className="bg-primary">
                  <Text className="text-xs font-semibold text-primary-foreground">Premium</Text>
                </Badge>
              </View>
            </CardHeader>

            <CardContent className="pt-0 gap-4">
              {/* Pricing */}
              <View className="flex-row items-baseline gap-2">
                <Text className="text-3xl font-bold text-foreground">
                  £{(priceInfo.amount / 100).toFixed(2)}
                </Text>
                <Text className="text-base text-muted-foreground">per month</Text>
              </View>

              {/* Features */}
              <View className="gap-3">
                <Text className="text-sm font-semibold text-foreground">What's included:</Text>
                {features.map((feature, index) => (
                  <View key={index} className="flex-row items-center gap-3">
                    <View className="w-5 h-5 rounded-full bg-primary/10 items-center justify-center">
                      <Check size={12} className="text-primary" />
                    </View>
                    <Text className="text-sm text-foreground flex-1">{feature}</Text>
                  </View>
                ))}
              </View>
            </CardContent>
          </Card>

          {/* Billing Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex-row items-center gap-2">
                <CreditCard size={16} className="text-foreground" />
                Billing Details
              </CardTitle>
            </CardHeader>
            <CardContent className="gap-3">
              <View className="flex-row justify-between items-center">
                <Text className="text-sm text-muted-foreground">Plan</Text>
                <Text className="text-sm font-medium text-foreground">{priceInfo.displayName}</Text>
              </View>
              
              <View className="flex-row justify-between items-center">
                <Text className="text-sm text-muted-foreground">Billing cycle</Text>
                <View className="flex-row items-center gap-1">
                  <Calendar size={12} className="text-muted-foreground" />
                  <Text className="text-sm font-medium text-foreground">Monthly</Text>
                </View>
              </View>

              <View className="flex-row justify-between items-center">
                <Text className="text-sm text-muted-foreground">Next payment</Text>
                <Text className="text-sm font-medium text-foreground">
                  {new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}
                </Text>
              </View>

              <View className="h-0.5 bg-border my-2" />

              <View className="flex-row justify-between items-center">
                <Text className="text-base font-semibold text-foreground">Total per month</Text>
                <Text className="text-lg font-bold text-foreground">
                  £{(priceInfo.amount / 100).toFixed(2)}
                </Text>
              </View>
            </CardContent>
          </Card>

          {/* Important Notes */}
          <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20">
            <CardContent className="p-4">
              <View className="flex-row gap-3">
                <View className="w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-900 items-center justify-center mt-0.5">
                  <RefreshCw size={12} className="text-amber-600 dark:text-amber-400" />
                </View>
                <View className="flex-1 gap-1">
                  <Text className="text-sm font-medium text-amber-900 dark:text-amber-100">
                    Auto-renewal
                  </Text>
                  <Text className="text-xs text-amber-700 dark:text-amber-200">
                    Your subscription will automatically renew monthly. You can cancel anytime from your account settings.
                  </Text>
                </View>
              </View>
            </CardContent>
          </Card>

          {/* Subscribe Button */}
          <View className="gap-3">
            <Button 
              onPress={handleSubscribe}
              disabled={isProcessing || createSubscriptionMutation.isPending}
              className="h-12"
            >
              <View className="flex-row items-center gap-2">
                {(isProcessing || createSubscriptionMutation.isPending) && (
                  <RefreshCw size={16} className="text-primary-foreground animate-spin" />
                )}
                <Text className="text-base font-semibold text-primary-foreground">
                  {isProcessing ? 'Processing...' : `Subscribe for £${(priceInfo.amount / 100).toFixed(2)}/month`}
                </Text>
              </View>
            </Button>

            <Text className="text-xs text-center text-muted-foreground px-4">
              By subscribing, you agree to our Terms of Service and Privacy Policy. 
              Your subscription will be charged monthly and can be cancelled at any time.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
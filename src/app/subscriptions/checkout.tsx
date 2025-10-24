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
import { useAuthStore } from '@/stores/auth';
import {
  ArrowLeft,
  RefreshCw,
  ArrowRight,
  Lock,
  Zap,
  CheckCircle,
  Sparkles,
  CreditCard,
  Calendar
} from 'lucide-react-native';
import { useStripe } from '@stripe/stripe-react-native';
import { useColorScheme } from '@/lib/core/useColorScheme';
import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils';
import { THEME } from '@/lib/theme';

export default function SubscriptionCheckoutScreen() {
  const { type } = useLocalSearchParams<{ type: 'CUSTOMER_SOS' | 'PROVIDER_PREMIUM' }>();  
  const user = useAuthStore((state) => state.user);
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
                router.replace('/(customer)/subscriptions');
              } else {
                router.replace('/(provider)/profile/subscriptions');
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
      {/* Modern Header */}
      <View className="px-4 py-4 border-b border-border/50 bg-card/50">
        <View className="flex-row items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onPress={() => router.back()}
            className="w-10 h-10 p-0"
          >
            <Icon as={ArrowLeft} size={24} className="text-primary" />
          </Button>
          <View className="flex-1">
            <Text className="text-xl font-bold text-foreground">
              Upgrade Plan
            </Text>
            <Text className="text-xs text-muted-foreground">
              {isCustomerSOS ? 'Get instant emergency access' : 'Boost your visibility'}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-4 py-6 gap-6">
          {/* Hero Card */}
          <View>
            <Card className="bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border-primary/20 overflow-hidden">
              <View className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-50" />
              
              <CardContent className="p-6 relative z-10">
                <View className="flex-row items-start justify-between mb-6">
                  <View className="flex-row items-center gap-3 flex-1">
                    <View className="w-16 h-16 bg-primary/15 rounded-2xl items-center justify-center">
                      <Icon as={Sparkles} size={32} className="text-primary" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-xl font-bold text-foreground">{priceInfo.displayName}</Text>
                      <Text className="text-sm text-muted-foreground mt-1">
                        {priceInfo.description}
                      </Text>
                    </View>
                  </View>
                  <Badge className="bg-success/15 border-success/30">
                    <Text className="text-xs font-bold text-success">Popular</Text>
                  </Badge>
                </View>

                {/* Pricing */}
                <View className="mb-1">
                  <View className="flex-row items-baseline gap-2 mb-2">
                    <Text className="text-5xl font-bold text-foreground">
                      £{(priceInfo.amount / 100).toFixed(2)}
                    </Text>
                    <Text className="text-lg text-muted-foreground font-semibold">/month</Text>
                  </View>
                  <Text className="text-sm text-muted-foreground">
                    {isCustomerSOS 
                      ? '7 days free • Full access to SOS booking'
                      : 'Full access to premium analytics & features'}
                  </Text>
                </View>
              </CardContent>
            </Card>
          </View>

          {/* What's Included */}
          <View>
            <View className="gap-3">
              <Text className="text-lg font-bold text-foreground px-1">What's Included</Text>
              {features.map((feature, index) => (
                <Card key={index} className="border-border/50">
                  <CardContent className="p-4 flex-row items-center gap-3">
                    <View className="w-6 h-6 bg-success/15 rounded-full items-center justify-center flex-shrink-0">
                      <Icon as={CheckCircle} size={16} className="text-success" />
                    </View>
                    <Text className="text-sm text-foreground flex-1 font-medium">{feature}</Text>
                  </CardContent>
                </Card>
              ))}
            </View>
          </View>

          {/* Billing Details */}
          <View>
            <Card className="border-border/50">
              <CardHeader>
                <View className="flex-row items-center gap-2">
                  <Icon as={CreditCard} size={20} className="text-foreground" />
                  <CardTitle className="text-base">Billing Details</CardTitle>
                </View>
              </CardHeader>
              <CardContent className="gap-4">
                {[
                  { label: 'Plan', value: priceInfo.displayName, icon: Sparkles },
                  { label: 'Cycle', value: 'Monthly', icon: Calendar },
                  { label: 'Next Payment', value: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString(), icon: Calendar }
                ].map((item, i) => (
                  <View key={i}>
                    <View className="flex-row items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <Text className="text-sm text-muted-foreground font-medium">{item.label}</Text>
                      <Text className="text-sm font-bold text-foreground">{item.value}</Text>
                    </View>
                  </View>
                ))}

                {/* Total */}
                <View className="border-t border-border/50 pt-4 mt-2">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-base font-bold text-foreground">Total per month</Text>
                    <Text className="text-2xl font-bold text-primary">
                      £{(priceInfo.amount / 100).toFixed(2)}
                    </Text>
                  </View>
                </View>
              </CardContent>
            </Card>
          </View>

          {/* Trust Signals */}
          <View>
            <View className="flex-row gap-2">
              {[
                { icon: Lock, text: 'Secure payment' },
                { icon: Zap, text: 'Instant access' },
                { icon: CheckCircle, text: 'Cancel anytime' }
              ].map((item, i) => (
                <View key={i} className="flex-1 p-3 bg-card border border-border/50 rounded-lg items-center gap-2">
                  <Icon as={item.icon} size={16} className="text-primary" />
                  <Text className="text-xs font-medium text-center text-foreground">{item.text}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Auto-Renewal Notice */}
          <View>
            <Card className="border-warning/20 bg-warning/5">
              <CardContent className="p-4 flex-row items-start gap-3">
                <Icon as={Zap} size={18} className="text-warning mt-0.5 flex-shrink-0" />
                <View className="flex-1 gap-1">
                  <Text className="text-sm font-bold text-foreground">Auto-renewal</Text>
                  <Text className="text-xs text-muted-foreground leading-relaxed">
                    Your subscription renews monthly. You can cancel anytime from your account settings and maintain access until the period ends.
                  </Text>
                </View>
              </CardContent>
            </Card>
          </View>

          {/* CTA Button */}
          <View>
            <Button 
              onPress={handleSubscribe}
              disabled={isProcessing || createSubscriptionMutation.isPending}
              className="h-14 mb-4"
            >
              <View className="flex-row items-center gap-2">
                {(isProcessing || createSubscriptionMutation.isPending) && (
                  <Icon as={RefreshCw} size={18} className="text-primary-foreground animate-spin" />
                )}
                <Text className="text-base font-bold text-primary-foreground">
                  {isProcessing ? 'Processing...' : `Subscribe for £${(priceInfo.amount / 100).toFixed(2)}/month`}
                </Text>
                {!isProcessing && <Icon as={ArrowRight} size={18} className="text-primary-foreground" />}
              </View>
            </Button>
          </View>

          {/* Legal Text */}
          <Text className="text-xs text-center text-muted-foreground px-2 pb-8">
            By subscribing, you agree to our Terms of Service and Privacy Policy.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
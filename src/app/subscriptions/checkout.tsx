import React, { useState } from 'react';
import { View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/text';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLocalSearchParams, router } from 'expo-router';
import { 
  useSubscriptionPrice,
  useCreateSubscription,
} from '@/hooks/shared/useSubscription';
import { Shield, Star, Check, ArrowLeft } from 'lucide-react-native';

export default function SubscriptionCheckoutScreen() {
  const { type } = useLocalSearchParams<{ type: 'CUSTOMER_SOS' | 'PROVIDER_PREMIUM' }>();
  const [isProcessing, setIsProcessing] = useState(false);
  
  const priceInfo = useSubscriptionPrice(type || 'CUSTOMER_SOS');
  const createMutation = useCreateSubscription();
  
  const isCustomerSOS = type === 'CUSTOMER_SOS';
  const Icon = isCustomerSOS ? Shield : Star;
  const title = isCustomerSOS ? 'SOS Emergency Access' : 'Premium Provider Features';
  
  const handleSubscribe = async () => {
    if (!type) return;
    
    setIsProcessing(true);
    try {
      await createMutation.mutateAsync({
        subscriptionType: type,
        priceId: priceInfo.priceId,
        customerEmail: 'test@example.com', // This would come from user profile
      });
      
      // Navigate back to subscriptions screen
      router.back();
    } catch (error) {
      console.error('Subscription error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const features = isCustomerSOS 
    ? [
        'SOS emergency booking access',
        'Priority provider matching',
        '24/7 priority support',
        'Instant booking confirmation',
        'Emergency service guarantee',
      ]
    : [
        'Priority placement in search',
        'Advanced analytics dashboard',
        'Customer insights & trends',
        'Enhanced profile features',
        'Priority customer support',
      ];

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1">
        {/* Header */}
        <View className="p-4 border-b border-border">
          <View className="flex-row items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon"
              onPress={() => router.back()}
            >
              <ArrowLeft size={20} className="text-foreground" />
            </Button>
            <Text className="text-lg font-semibold text-foreground">Subscribe</Text>
          </View>
        </View>

        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          <View className="p-4 space-y-6">
            {/* Plan Summary */}
            <Card className="border-primary">
              <CardHeader>
                <View className="flex-row items-center gap-3">
                  <View className="p-3 rounded-full bg-primary/10">
                    <Icon size={24} className="text-primary" />
                  </View>
                  <View className="flex-1">
                    <CardTitle className="text-xl">{title}</CardTitle>
                    <Text className="text-sm text-muted-foreground mt-1">
                      {priceInfo.description}
                    </Text>
                  </View>
                </View>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Pricing */}
                <View className="flex-row items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <Text className="text-sm text-muted-foreground">Monthly subscription</Text>
                  <View className="flex-row items-baseline gap-1">
                    <Text className="text-2xl font-bold text-foreground">
                      £{(priceInfo.amount / 100).toFixed(2)}
                    </Text>
                    <Text className="text-sm text-muted-foreground">/month</Text>
                  </View>
                </View>

                {/* Features */}
                <View className="space-y-3">
                  <Text className="text-base font-medium text-foreground">What's included:</Text>
                  <View className="space-y-2">
                    {features.map((feature, index) => (
                      <View key={index} className="flex-row items-center gap-3">
                        <View className="w-5 h-5 rounded-full bg-primary/10 items-center justify-center">
                          <Check size={12} className="text-primary" />
                        </View>
                        <Text className="text-sm text-foreground flex-1">{feature}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </CardContent>
            </Card>

            {/* Billing Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Billing Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <View className="p-4 bg-muted/30 rounded-lg">
                  <Text className="text-sm text-center text-muted-foreground">
                    🚧 Payment Method Collection
                  </Text>
                  <Text className="text-xs text-center text-muted-foreground mt-1">
                    In production, this would integrate with Stripe Payment Sheet
                    to securely collect payment method details.
                  </Text>
                </View>
                
                <View className="space-y-2">
                  <View className="flex-row justify-between">
                    <Text className="text-sm text-muted-foreground">Subtotal</Text>
                    <Text className="text-sm text-foreground">
                      £{(priceInfo.amount / 100).toFixed(2)}
                    </Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-sm text-muted-foreground">Tax</Text>
                    <Text className="text-sm text-foreground">£0.00</Text>
                  </View>
                  <View className="h-px bg-border" />
                  <View className="flex-row justify-between">
                    <Text className="text-base font-medium text-foreground">Total</Text>
                    <Text className="text-base font-bold text-foreground">
                      £{(priceInfo.amount / 100).toFixed(2)}
                    </Text>
                  </View>
                </View>
              </CardContent>
            </Card>

            {/* Terms */}
            <View className="space-y-2">
              <Text className="text-xs text-muted-foreground text-center">
                By subscribing, you agree to our Terms of Service and Privacy Policy.
                You can cancel anytime from your subscription settings.
              </Text>
              <Text className="text-xs text-muted-foreground text-center">
                Subscriptions renew automatically each month.
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* Subscribe Button */}
        <View className="p-4 border-t border-border">
          <Button 
            onPress={handleSubscribe}
            disabled={isProcessing || createMutation.isPending}
            className="w-full h-12"
          >
            <Text className="text-primary-foreground font-medium text-base">
              {isProcessing || createMutation.isPending 
                ? 'Creating Subscription...' 
                : `Subscribe for £${(priceInfo.amount / 100).toFixed(2)}/month`
              }
            </Text>
          </Button>
        </View>
      </View>
    </SafeAreaView>
  );
}
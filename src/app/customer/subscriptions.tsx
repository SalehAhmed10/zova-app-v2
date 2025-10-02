import React from 'react';
import { View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/text';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  useUserSubscriptions,
  useActiveSubscription,
  useSubscriptionPrice,
  useCancelSubscription,
  useReactivateSubscription,
  formatSubscriptionStatus,
  getSubscriptionPeriod,
  hasActiveSubscription,
  type UserSubscription
} from '@/hooks/shared/useSubscription';
import { Shield, Calendar, CreditCard, Plus } from 'lucide-react-native';
import { router } from 'expo-router';

export default function CustomerSubscriptionsScreen() {
  const { data: allSubscriptions, isLoading } = useUserSubscriptions();
  const { data: customerSubscription } = useActiveSubscription('customer_sos');
  
  const hasCustomerSOS = hasActiveSubscription(allSubscriptions, 'customer_sos');

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 justify-center items-center">
          <Text className="text-muted-foreground">Loading subscriptions...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="p-4 gap-6">
          {/* Header */}
          <View>
            <Text className="text-2xl font-bold text-foreground">SOS Subscription</Text>
            <Text className="text-sm text-muted-foreground mt-1">
              Emergency booking access and priority support
            </Text>
          </View>

          {/* Active Subscription */}
          {customerSubscription && (
            <View className="gap-3">
              <Text className="text-lg font-semibold text-foreground">Current Plan</Text>
              <CustomerSubscriptionCard subscription={customerSubscription} />
            </View>
          )}

          {/* Available Plan */}
          {!hasCustomerSOS && (
            <View className="gap-3">
              <Text className="text-lg font-semibold text-foreground">Available Plan</Text>
              <CustomerAvailablePlanCard />
            </View>
          )}

          {/* Features */}
          <View className="gap-3">
            <Text className="text-lg font-semibold text-foreground">SOS Features</Text>
            <Card>
              <CardContent className="p-4 gap-3">
                {[
                  'SOS emergency booking access',
                  'Priority provider matching',
                  '24/7 priority support',
                  'Instant booking confirmation',
                  'Emergency service guarantee',
                ].map((feature, index) => (
                  <View key={index} className="flex-row items-center gap-3">
                    <View className="w-2 h-2 rounded-full bg-primary" />
                    <Text className="text-sm text-foreground flex-1">{feature}</Text>
                  </View>
                ))}
              </CardContent>
            </Card>
          </View>

          {/* Subscription History */}
          {allSubscriptions && allSubscriptions.filter(s => s.type === 'customer_sos').length > 0 && (
            <View className="gap-3">
              <Text className="text-lg font-semibold text-foreground">History</Text>
              
              {allSubscriptions
                .filter(s => s.type === 'customer_sos')
                .map((subscription) => (
                  <HistorySubscriptionCard 
                    key={subscription.id}
                    subscription={subscription}
                  />
                ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function CustomerSubscriptionCard({ subscription }: { subscription: UserSubscription }) {
  const priceInfo = useSubscriptionPrice('CUSTOMER_SOS');
  const cancelMutation = useCancelSubscription();
  const reactivateMutation = useReactivateSubscription();
  
  const handleCancel = async () => {
    try {
      await cancelMutation.mutateAsync({
        subscriptionId: subscription.stripe_subscription_id,
        cancelAtPeriodEnd: true,
      });
    } catch (error) {
      console.error('Cancel subscription error:', error);
    }
  };

  const handleReactivate = async () => {
    try {
      await reactivateMutation.mutateAsync(subscription.stripe_subscription_id);
    } catch (error) {
      console.error('Reactivate subscription error:', error);
    }
  };

  const isActive = ['active', 'trialing'].includes(subscription.status);
  const period = getSubscriptionPeriod(subscription);

  return (
    <Card className={`relative ${isActive ? 'border-primary' : 'border-border'}`}>
      {isActive && (
        <View className="absolute -top-2 -right-2">
          <Badge variant="default">
            <Text className="text-xs font-medium text-primary-foreground">Active</Text>
          </Badge>
        </View>
      )}
      
      <CardHeader>
        <View className="flex-row items-center gap-3">
          <View className="p-2 rounded-full bg-primary/10">
            <Shield size={20} className="text-primary" />
          </View>
          <View className="flex-1">
            <CardTitle className="text-base">{priceInfo.displayName}</CardTitle>
            <View className="flex-row items-center gap-2 mt-1">
              <View className={`w-2 h-2 rounded-full ${
                isActive ? 'bg-green-500' : 'bg-yellow-500'
              }`} />
              <Text className="text-xs text-muted-foreground">
                {formatSubscriptionStatus(subscription.status)}
              </Text>
              {subscription.cancel_at_period_end && (
                <Badge variant="secondary" className="ml-auto">
                  <Text className="text-xs">Ending Soon</Text>
                </Badge>
              )}
            </View>
          </View>
        </View>
      </CardHeader>

      <CardContent className="pt-0 gap-3">
        {/* Pricing */}
        <View className="flex-row items-baseline gap-1">
          <Text className="text-xl font-bold text-foreground">
            £{(priceInfo.amount / 100).toFixed(2)}
          </Text>
          <Text className="text-xs text-muted-foreground">per month</Text>
        </View>

        {/* Billing Period */}
        <View className="flex-row items-center gap-2 p-2 bg-muted/50 rounded">
          <Calendar size={14} className="text-muted-foreground" />
          <View className="flex-1">
            <Text className="text-xs text-muted-foreground">Next billing</Text>
            <Text className="text-sm text-foreground">
              {period.end.toLocaleDateString()}
            </Text>
          </View>
          <Text className="text-xs text-muted-foreground">
            {period.daysRemaining} days
          </Text>
        </View>

        {/* Actions */}
        <View className="flex-row gap-2">
          {subscription.cancel_at_period_end ? (
            <Button 
              onPress={handleReactivate}
              disabled={reactivateMutation.isPending}
              className="flex-1"
            >
              <Text className="text-primary-foreground font-medium text-sm">
                {reactivateMutation.isPending ? 'Reactivating...' : 'Reactivate'}
              </Text>
            </Button>
          ) : (
            <Button 
              variant="outline"
              onPress={handleCancel}
              disabled={cancelMutation.isPending}
              className="flex-1"
            >
              <Text className="text-foreground font-medium text-sm">
                {cancelMutation.isPending ? 'Cancelling...' : 'Cancel'}
              </Text>
            </Button>
          )}
          
          <Button 
            variant="ghost"
            onPress={() => router.push('/customer/profile')}
          >
            <CreditCard size={16} className="text-muted-foreground" />
          </Button>
        </View>
      </CardContent>
    </Card>
  );
}

function CustomerAvailablePlanCard() {
  const priceInfo = useSubscriptionPrice('CUSTOMER_SOS');
  
  const handleSubscribe = () => {
    // Navigate to checkout screen with subscription type
    router.push({
      pathname: '/subscriptions/checkout',
      params: { type: 'CUSTOMER_SOS' }
    });
  };

  return (
    <Card className="border-dashed border-2 border-muted-foreground/30">
      <CardHeader>
        <View className="flex-row items-center gap-3">
          <View className="p-2 rounded-full bg-muted">
            <Shield size={20} className="text-muted-foreground" />
          </View>
          <View className="flex-1">
            <CardTitle className="text-base text-muted-foreground">
              {priceInfo.displayName}
            </CardTitle>
            <CardDescription className="text-xs">
              {priceInfo.description}
            </CardDescription>
          </View>
        </View>
      </CardHeader>

      <CardContent className="pt-0 gap-3">
        <View className="flex-row items-baseline gap-1">
          <Text className="text-xl font-bold text-foreground">
            £{(priceInfo.amount / 100).toFixed(2)}
          </Text>
          <Text className="text-xs text-muted-foreground">per month</Text>
        </View>

        <Button onPress={handleSubscribe} className="w-full">
          <Plus size={16} className="text-primary-foreground mr-2" />
          <Text className="text-primary-foreground font-medium">Subscribe to SOS</Text>
        </Button>
      </CardContent>
    </Card>
  );
}

function HistorySubscriptionCard({ subscription }: { subscription: UserSubscription }) {
  const priceInfo = useSubscriptionPrice('CUSTOMER_SOS');
  const isActive = ['active', 'trialing'].includes(subscription.status);

  return (
    <Card className="opacity-75">
      <CardContent className="p-3">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <Shield size={16} className="text-muted-foreground" />
            <View>
              <Text className="text-sm font-medium text-foreground">
                {priceInfo.displayName}
              </Text>
              <Text className="text-xs text-muted-foreground">
                {new Date(subscription.created_at).toLocaleDateString()}
              </Text>
            </View>
          </View>
          
          <Badge variant={isActive ? 'default' : 'secondary'}>
            <Text className="text-xs">
              {formatSubscriptionStatus(subscription.status)}
            </Text>
          </Badge>
        </View>
      </CardContent>
    </Card>
  );
}
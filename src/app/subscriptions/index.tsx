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
import { Shield, Star, CreditCard, Calendar, Plus } from 'lucide-react-native';
import { router } from 'expo-router';

export default function SubscriptionsScreen() {
  const { data: allSubscriptions, isLoading } = useUserSubscriptions();
  const { data: customerSubscription } = useActiveSubscription('customer_sos');
  const { data: providerSubscription } = useActiveSubscription('provider_premium');
  
  const hasCustomerSOS = hasActiveSubscription(allSubscriptions, 'customer_sos');
  const hasProviderPremium = hasActiveSubscription(allSubscriptions, 'provider_premium');

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
        <View className="p-4 space-y-6">
          {/* Header */}
          <View>
            <Text className="text-2xl font-bold text-foreground">Subscriptions</Text>
            <Text className="text-sm text-muted-foreground mt-1">
              Manage your ZOVA subscription plans
            </Text>
          </View>

          {/* Active Subscriptions */}
          {(customerSubscription || providerSubscription) && (
            <View className="space-y-3">
              <Text className="text-lg font-semibold text-foreground">Active Subscriptions</Text>
              
              {customerSubscription && (
                <SubscriptionCard 
                  subscription={customerSubscription}
                  type="customer_sos"
                />
              )}
              
              {providerSubscription && (
                <SubscriptionCard 
                  subscription={providerSubscription}
                  type="provider_premium"
                />
              )}
            </View>
          )}

          {/* Available Plans */}
          <View className="space-y-3">
            <Text className="text-lg font-semibold text-foreground">Available Plans</Text>
            
            {!hasCustomerSOS && (
              <AvailablePlanCard type="customer_sos" />
            )}
            
            {!hasProviderPremium && (
              <AvailablePlanCard type="provider_premium" />
            )}
          </View>

          {/* Subscription History */}
          {allSubscriptions && allSubscriptions.length > 0 && (
            <View className="space-y-3">
              <Text className="text-lg font-semibold text-foreground">Subscription History</Text>
              
              {allSubscriptions.map((subscription) => (
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

interface SubscriptionCardProps {
  subscription: UserSubscription;
  type: 'customer_sos' | 'provider_premium';
}

function SubscriptionCard({ subscription, type }: SubscriptionCardProps) {
  const subscriptionType = type === 'customer_sos' ? 'CUSTOMER_SOS' : 'PROVIDER_PREMIUM';
  const priceInfo = useSubscriptionPrice(subscriptionType);
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

  const Icon = type === 'customer_sos' ? Shield : Star;
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
            <Icon size={20} className="text-primary" />
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

      <CardContent className="pt-0 space-y-3">
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

function AvailablePlanCard({ type }: { type: 'customer_sos' | 'provider_premium' }) {
  const subscriptionType = type === 'customer_sos' ? 'CUSTOMER_SOS' : 'PROVIDER_PREMIUM';
  const priceInfo = useSubscriptionPrice(subscriptionType);
  const Icon = type === 'customer_sos' ? Shield : Star;
  
  const handleSubscribe = () => {
    // Navigate to checkout screen
    router.push({
      pathname: '/subscriptions/checkout',
      params: { type: subscriptionType }
    });
  };

  return (
    <Card className="border-dashed border-2 border-muted-foreground/30">
      <CardHeader>
        <View className="flex-row items-center gap-3">
          <View className="p-2 rounded-full bg-muted">
            <Icon size={20} className="text-muted-foreground" />
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

      <CardContent className="pt-0 space-y-3">
        <View className="flex-row items-baseline gap-1">
          <Text className="text-xl font-bold text-foreground">
            £{(priceInfo.amount / 100).toFixed(2)}
          </Text>
          <Text className="text-xs text-muted-foreground">per month</Text>
        </View>

        <Button onPress={handleSubscribe} className="w-full">
          <Plus size={16} className="text-primary-foreground mr-2" />
          <Text className="text-primary-foreground font-medium">Subscribe</Text>
        </Button>
      </CardContent>
    </Card>
  );
}

function HistorySubscriptionCard({ subscription }: { subscription: UserSubscription }) {
  const subscriptionType = subscription.type === 'customer_sos' ? 'CUSTOMER_SOS' : 'PROVIDER_PREMIUM';
  const priceInfo = useSubscriptionPrice(subscriptionType);
  const Icon = subscription.type === 'customer_sos' ? Shield : Star;
  const isActive = ['active', 'trialing'].includes(subscription.status);

  return (
    <Card className="opacity-75">
      <CardContent className="p-3">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <Icon size={16} className="text-muted-foreground" />
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
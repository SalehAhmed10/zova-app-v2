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
import { Star, Calendar, CreditCard, Plus, TrendingUp } from 'lucide-react-native';
import { router } from 'expo-router';
import { useColorScheme } from '@/lib/core/useColorScheme';
import { THEME } from '@/lib/theme';
import { formatCurrency } from '@/lib/utils';

export default function ProviderSubscriptionsScreen() {
  const { data: allSubscriptions, isLoading } = useUserSubscriptions();
  const { data: providerSubscription } = useActiveSubscription('provider_premium');
  const { isDarkColorScheme } = useColorScheme();
  const colors = THEME[isDarkColorScheme ? 'dark' : 'light'];
  
  // Check if provider has active premium subscription - multiple checks for reliability
  const activeProviderSub = allSubscriptions?.find(
    sub => sub.type === 'provider_premium' && 
           ['active', 'trialing'].includes(sub.status)
           // Note: Don't check cancel_at_period_end - users have access until period ends
  );
  
  const hasProviderPremium = !!providerSubscription || !!activeProviderSub || hasActiveSubscription(allSubscriptions, 'provider_premium');

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
            <Text className="text-2xl font-bold text-foreground">Premium Subscription</Text>
            <Text className="text-sm text-muted-foreground mt-1">
              Boost your business with premium provider features
            </Text>
          </View>

          {/* Active Subscription */}
          {providerSubscription && (
            <View className="gap-3">
              <Text className="text-lg font-semibold text-foreground">Current Plan</Text>
              <ProviderSubscriptionCard subscription={providerSubscription} />
            </View>
          )}

          {/* Available Plan - Only show if no active subscription */}
          {!hasProviderPremium && !providerSubscription && !activeProviderSub && (
            <View className="gap-3">
              <Text className="text-lg font-semibold text-foreground">Available Plan</Text>
              <ProviderAvailablePlanCard />
            </View>
          )}

          {/* Benefits */}
          <View className="gap-3">
            <Text className="text-lg font-semibold text-foreground">Premium Benefits</Text>
            <View className="gap-2">
              <Card>
                <CardContent className="p-4">
                  <View className="flex-row items-center gap-3 mb-3">
                    <View className="p-2 rounded-full bg-primary/10">
                      <TrendingUp size={20} color={colors.success} />
                    </View>
                    <Text className="text-base font-medium text-foreground">Business Growth</Text>
                  </View>
                  <View className="gap-2">
                    {[
                      'Priority placement in search results',
                      'Featured provider badge',
                      'Advanced analytics dashboard',
                    ].map((feature, index) => (
                      <View key={index} className="flex-row items-center gap-3">
                        <View className="w-2 h-2 rounded-full bg-primary" />
                        <Text className="text-sm text-foreground flex-1">{feature}</Text>
                      </View>
                    ))}
                  </View>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <View className="flex-row items-center gap-3 mb-3">
                    <View className="p-2 rounded-full bg-primary/10">
                      <Star size={20} color={colors.success} />
                    </View>
                    <Text className="text-base font-medium text-foreground">Enhanced Features</Text>
                  </View>
                  <View className="gap-2">
                    {[
                      'Customer insights & booking trends',
                      'Enhanced profile customization',
                      'Priority customer support',
                    ].map((feature, index) => (
                      <View key={index} className="flex-row items-center gap-3">
                        <View className="w-2 h-2 rounded-full bg-primary" />
                        <Text className="text-sm text-foreground flex-1">{feature}</Text>
                      </View>
                    ))}
                  </View>
                </CardContent>
              </Card>
            </View>
          </View>

          {/* Subscription History */}
          {allSubscriptions && allSubscriptions.filter(s => s.type === 'provider_premium').length > 0 && (
            <View className="gap-3">
              <Text className="text-lg font-semibold text-foreground">History</Text>
              
              {allSubscriptions
                .filter(s => s.type === 'provider_premium')
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

function ProviderSubscriptionCard({ subscription }: { subscription: UserSubscription }) {
  const priceInfo = useSubscriptionPrice('PROVIDER_PREMIUM');
  const cancelMutation = useCancelSubscription();
  const reactivateMutation = useReactivateSubscription();
  const { isDarkColorScheme } = useColorScheme();
  const colors = THEME[isDarkColorScheme ? 'dark' : 'light'];
  
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
            <Star size={20} color={colors.success} />
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
            {formatCurrency(priceInfo.amount / 100)}
          </Text>
          <Text className="text-xs text-muted-foreground">per month</Text>
        </View>

        {/* Billing Period */}
        <View className="flex-row items-center gap-2 p-2 bg-muted/50 rounded">
          <Calendar size={14} color={colors.mutedForeground} />
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
            onPress={() => router.push('/(provider)/profile')}
          >
            <CreditCard size={16} color={colors.mutedForeground} />
          </Button>
        </View>
      </CardContent>
    </Card>
  );
}

function ProviderAvailablePlanCard() {
  const priceInfo = useSubscriptionPrice('PROVIDER_PREMIUM');
  const { isDarkColorScheme } = useColorScheme();
  const colors = THEME[isDarkColorScheme ? 'dark' : 'light'];
  
  const handleSubscribe = () => {
    // Navigate to checkout screen with subscription type
    router.push({
      pathname: '/subscriptions/checkout',
      params: { type: 'PROVIDER_PREMIUM' }
    });
  };

  return (
    <Card className="border-dashed border-2 border-muted-foreground/30">
      <CardHeader>
        <View className="flex-row items-center gap-3">
          <View className="p-2 rounded-full bg-muted">
            <Star size={20} color={colors.mutedForeground} />
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
            {formatCurrency(priceInfo.amount / 100)}
          </Text>
          <Text className="text-xs text-muted-foreground">per month</Text>
        </View>

        <Button onPress={handleSubscribe} className="w-full">
          <Plus size={16} color={colors.primaryForeground} className="mr-2" />
          <Text className="text-primary-foreground font-medium">Upgrade to Premium</Text>
        </Button>
      </CardContent>
    </Card>
  );
}

function HistorySubscriptionCard({ subscription }: { subscription: UserSubscription }) {
  const priceInfo = useSubscriptionPrice('PROVIDER_PREMIUM');
  const isActive = ['active', 'trialing'].includes(subscription.status);
  const { isDarkColorScheme } = useColorScheme();
  const colors = THEME[isDarkColorScheme ? 'dark' : 'light'];

  return (
    <Card className="opacity-75">
      <CardContent className="p-3">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <Star size={16} color={colors.mutedForeground} />
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
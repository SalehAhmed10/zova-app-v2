import React from 'react';
import { View, ScrollView, TouchableOpacity } from 'react-native';
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
import {
  Star,
  Calendar,
  Zap,
  CheckCircle,
  ArrowRight,
  Sparkles,
  TrendingUp
} from 'lucide-react-native';
import { router } from 'expo-router';
import { useColorScheme } from '@/lib/core/useColorScheme';
import { THEME } from '@/lib/theme';
import { formatCurrency } from '@/lib/utils';
import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils';
import Animated, { FadeIn, SlideInUp } from 'react-native-reanimated';

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
      {/* Modern Header */}
      <Animated.View entering={FadeIn} className="px-4 py-5 border-b border-border/50 bg-card/50 backdrop-blur-sm">
        <View className="flex-row items-center gap-3">
          <View className="w-12 h-12 bg-primary/10 rounded-xl items-center justify-center">
            <Icon as={Sparkles} size={24} className="text-primary" />
          </View>
          <View className="flex-1">
            <Text className="text-2xl font-bold text-foreground">Premium Plan</Text>
            <Text className="text-xs text-muted-foreground mt-0.5">
              Unlock advanced business features
            </Text>
          </View>
        </View>
      </Animated.View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="p-4 gap-5">
          {/* Active Subscription */}
          {providerSubscription && (
            <Animated.View entering={SlideInUp}>
              <ProviderSubscriptionCard subscription={providerSubscription} />
            </Animated.View>
          )}

          {/* Available Plan - Only show if no active subscription */}
          {!hasProviderPremium && !providerSubscription && !activeProviderSub && (
            <Animated.View entering={SlideInUp.delay(100)}>
              <ProviderAvailablePlanCard />
            </Animated.View>
          )}

          {/* Benefits Section */}
          <Animated.View entering={SlideInUp.delay(200)}>
            <View className="gap-3">
              <Text className="text-lg font-bold text-foreground px-1">Premium Benefits</Text>
              
              {/* Business Growth Benefits */}
              <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
                <CardContent className="p-5">
                  <View className="flex-row items-start gap-4">
                    <View className="w-12 h-12 bg-primary/10 rounded-xl items-center justify-center flex-shrink-0">
                      <Icon as={TrendingUp} size={24} className="text-primary" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-base font-bold text-foreground mb-3">Business Growth</Text>
                      <View className="gap-2.5">
                        {[
                          { icon: CheckCircle, text: 'Priority search placement' },
                          { icon: CheckCircle, text: 'Featured provider badge' },
                          { icon: CheckCircle, text: 'Advanced analytics' }
                        ].map((item, i) => (
                          <View key={i} className="flex-row items-center gap-2">
                            <Icon as={item.icon} size={14} className="text-primary flex-shrink-0" />
                            <Text className="text-sm text-foreground">{item.text}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  </View>
                </CardContent>
              </Card>

              {/* Enhanced Features Benefits */}
              <Card className="border-secondary/20 bg-gradient-to-br from-secondary/5 to-transparent">
                <CardContent className="p-5">
                  <View className="flex-row items-start gap-4">
                    <View className="w-12 h-12 bg-secondary/10 rounded-xl items-center justify-center flex-shrink-0">
                      <Icon as={Star} size={24} className="text-secondary" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-base font-bold text-foreground mb-3">Enhanced Features</Text>
                      <View className="gap-2.5">
                        {[
                          { icon: CheckCircle, text: 'Customer insights' },
                          { icon: CheckCircle, text: 'Profile customization' },
                          { icon: CheckCircle, text: 'Priority support' }
                        ].map((item, i) => (
                          <View key={i} className="flex-row items-center gap-2">
                            <Icon as={item.icon} size={14} className="text-secondary flex-shrink-0" />
                            <Text className="text-sm text-foreground">{item.text}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  </View>
                </CardContent>
              </Card>
            </View>
          </Animated.View>

          {/* Subscription History */}
          {allSubscriptions && allSubscriptions.filter(s => s.type === 'provider_premium').length > 0 && (
            <Animated.View entering={SlideInUp.delay(300)}>
              <View className="gap-3">
                <Text className="text-lg font-bold text-foreground px-1">Subscription History</Text>
                {allSubscriptions
                  .filter(s => s.type === 'provider_premium')
                  .map((subscription) => (
                    <HistorySubscriptionCard 
                      key={subscription.id}
                      subscription={subscription}
                    />
                  ))}
              </View>
            </Animated.View>
          )}

          {/* Footer Spacing */}
          <View className="h-4" />
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
    <Animated.View entering={FadeIn}>
      <Card className={cn(
        'relative overflow-hidden border-2',
        isActive ? 'bg-gradient-to-br from-primary/10 to-primary/5 border-primary/30' : 'bg-card border-border'
      )}>
        {/* Animated Background Gradient */}
        {isActive && (
          <View className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-50" />
        )}

        <CardContent className="p-5 relative z-10">
          {/* Header */}
          <View className="flex-row items-center justify-between mb-5">
            <View className="flex-row items-center gap-3 flex-1">
              <View className={cn(
                "w-12 h-12 rounded-xl items-center justify-center",
                isActive ? 'bg-primary/15' : 'bg-secondary/15'
              )}>
                <Icon as={Star} size={24} className={isActive ? 'text-primary' : 'text-secondary'} />
              </View>
              <View className="flex-1">
                <Text className="text-base font-bold text-foreground">{priceInfo.displayName}</Text>
                <View className="flex-row items-center gap-2 mt-1">
                  <View className={cn(
                    "w-2 h-2 rounded-full",
                    isActive ? 'bg-success' : 'bg-warning'
                  )} />
                  <Text className="text-xs text-muted-foreground font-medium">
                    {formatSubscriptionStatus(subscription.status)}
                  </Text>
                </View>
              </View>
            </View>
            {isActive && (
              <Badge className="bg-success/15 border-success/30">
                <Text className="text-xs font-bold text-success">Active</Text>
              </Badge>
            )}
          </View>

          {/* Pricing */}
          <View className="mb-5 pb-5 border-b border-border/50">
            <View className="flex-row items-baseline gap-2">
              <Text className="text-3xl font-bold text-foreground">
                {formatCurrency(priceInfo.amount / 100)}
              </Text>
              <Text className="text-sm text-muted-foreground font-medium">/month</Text>
            </View>
          </View>

          {/* Billing Period */}
          <View className="flex-row items-center gap-3 p-4 bg-card/50 border border-border/50 rounded-xl mb-5">
            <View className="w-10 h-10 bg-primary/10 rounded-lg items-center justify-center">
              <Icon as={Calendar} size={20} className="text-primary" />
            </View>
            <View className="flex-1">
              <Text className="text-xs text-muted-foreground">Next billing</Text>
              <Text className="text-sm font-bold text-foreground">{period.end.toLocaleDateString()}</Text>
            </View>
            <View className="items-end">
              <Badge className="bg-primary/10 border-primary/20">
                <Text className="text-xs font-semibold text-primary">{period.daysRemaining}d</Text>
              </Badge>
            </View>
          </View>

          {subscription.cancel_at_period_end && (
            <View className="flex-row items-start gap-3 p-4 bg-warning/10 border border-warning/20 rounded-xl mb-5">
              <Icon as={Zap} size={16} className="text-warning mt-0.5 flex-shrink-0" />
              <Text className="text-xs text-warning font-medium">
                Your subscription will end on {period.end.toLocaleDateString()}
              </Text>
            </View>
          )}

          {/* Actions */}
          <View className="flex-row gap-2">
            {subscription.cancel_at_period_end ? (
              <Button 
                onPress={handleReactivate}
                disabled={reactivateMutation.isPending}
                className="flex-1"
              >
                <Icon as={Sparkles} size={16} className="text-primary-foreground mr-2" />
                <Text className="text-primary-foreground font-bold text-sm">
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
                <Text className="text-foreground font-bold text-sm">
                  {cancelMutation.isPending ? 'Cancelling...' : 'Cancel'}
                </Text>
              </Button>
            )}
          </View>
        </CardContent>
      </Card>
    </Animated.View>
  );
}

function ProviderAvailablePlanCard() {
  const priceInfo = useSubscriptionPrice('PROVIDER_PREMIUM');
  const { isDarkColorScheme } = useColorScheme();
  const colors = THEME[isDarkColorScheme ? 'dark' : 'light'];
  
  const handleSubscribe = () => {
    router.push({
      pathname: '/subscriptions/checkout',
      params: { type: 'PROVIDER_PREMIUM' }
    });
  };

  return (
    <Animated.View entering={FadeIn}>
      <Card className="bg-gradient-to-br from-primary/15 to-primary/5 border-2 border-dashed border-primary/30">
        <CardContent className="p-6">
          <View className="flex-row items-start justify-between mb-6">
            <View className="flex-row items-center gap-3 flex-1">
              <View className="w-14 h-14 bg-primary/20 rounded-xl items-center justify-center">
                <Icon as={Sparkles} size={28} className="text-primary" />
              </View>
              <View className="flex-1">
                <Text className="text-base font-bold text-foreground">{priceInfo.displayName}</Text>
                <Text className="text-xs text-muted-foreground mt-1">
                  {priceInfo.description}
                </Text>
              </View>
            </View>
          </View>

          {/* Pricing Display */}
          <View className="mb-6 pb-6 border-b border-primary/20">
            <View className="flex-row items-baseline gap-2">
              <Text className="text-4xl font-bold text-primary">
                {formatCurrency(priceInfo.amount / 100)}
              </Text>
              <Text className="text-sm text-muted-foreground font-medium">/month</Text>
            </View>
            <Text className="text-xs text-muted-foreground mt-2">
              First 7 days free • Cancel anytime
            </Text>
          </View>

          {/* Quick Features */}
          <View className="gap-3 mb-6">
            {[
              'Advanced analytics dashboard',
              'Priority customer support',
              'Enhanced profile visibility'
            ].map((feature, i) => (
              <View key={i} className="flex-row items-center gap-3">
                <View className="w-5 h-5 bg-primary/20 rounded-full items-center justify-center flex-shrink-0">
                  <Icon as={CheckCircle} size={12} className="text-primary" />
                </View>
                <Text className="text-sm text-foreground">{feature}</Text>
              </View>
            ))}
          </View>

          {/* CTA Button */}
          <Button onPress={handleSubscribe} className="w-full h-12">
            <Icon as={Sparkles} size={18} className="text-primary-foreground mr-2" />
            <Text className="text-primary-foreground font-bold">Upgrade Now</Text>
            <Icon as={ArrowRight} size={16} className="text-primary-foreground ml-auto" />
          </Button>
        </CardContent>
      </Card>
    </Animated.View>
  );
}

function HistorySubscriptionCard({ subscription }: { subscription: UserSubscription }) {
  const priceInfo = useSubscriptionPrice('PROVIDER_PREMIUM');
  const isActive = ['active', 'trialing'].includes(subscription.status);
  const { isDarkColorScheme } = useColorScheme();
  const colors = THEME[isDarkColorScheme ? 'dark' : 'light'];

  return (
    <Card className="opacity-70 border-border/50">
      <CardContent className="p-4">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-3 flex-1">
            <View className={cn(
              "w-10 h-10 rounded-lg items-center justify-center",
              isActive ? 'bg-success/10' : 'bg-muted/50'
            )}>
              <Icon 
                as={Star} 
                size={18} 
                className={isActive ? 'text-success' : 'text-muted-foreground'} 
              />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-semibold text-foreground">
                {priceInfo.displayName}
              </Text>
              <Text className="text-xs text-muted-foreground">
                {new Date(subscription.created_at).toLocaleDateString()}
              </Text>
            </View>
          </View>
          
          <Badge variant={isActive ? 'default' : 'secondary'} className={cn(
            isActive ? 'bg-success/15 border-success/30' : 'bg-muted border-border'
          )}>
            <Text className={cn(
              'text-xs font-bold',
              isActive && 'text-success'
            )}>
              {formatSubscriptionStatus(subscription.status)}
            </Text>
          </Badge>
        </View>
      </CardContent>
    </Card>
  );
}
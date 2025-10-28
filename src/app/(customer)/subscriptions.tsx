import React from 'react';
import { View, ScrollView, Alert } from 'react-native';
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
  findIncompleteSubscription,
  type UserSubscription
} from '@/hooks/shared/useSubscription';
import { Shield, Calendar, CreditCard, CheckCircle, Clock, Zap, Star, Sparkles, ArrowRight, Lock, AlertCircle, Users } from 'lucide-react-native';
import { router } from 'expo-router';
import { useColorScheme } from '@/lib/core/useColorScheme';
import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils';
import Animated, { FadeIn, SlideInUp } from 'react-native-reanimated';

export default function CustomerSubscriptionsScreen() {
  const { data: allSubscriptions, isLoading, error: subscriptionsError } = useUserSubscriptions();
  const { data: customerSubscription, error: activeSubscriptionError } = useActiveSubscription('customer_sos');
  const { isDarkColorScheme } = useColorScheme();
  
  const hasCustomerSOS = hasActiveSubscription(allSubscriptions, 'customer_sos');
  const incompleteSubscription = findIncompleteSubscription(allSubscriptions, 'customer_sos');

  // Debug subscription errors
  React.useEffect(() => {
    if (subscriptionsError) {
      console.error('❌ [Subscriptions] Error fetching user subscriptions:', subscriptionsError);
    }
    if (activeSubscriptionError && (activeSubscriptionError as any)?.code !== 'PGRST116') {
      // PGRST116 is "not found" which is expected when no subscription exists
      console.error('❌ [Subscriptions] Error fetching active subscription:', activeSubscriptionError);
    }
    
    // Log successful data fetch
    if (allSubscriptions) {
      console.log('✅ [Subscriptions] User subscriptions loaded:', allSubscriptions.length);
    }
    if (customerSubscription) {
      console.log('✅ [Subscriptions] Active customer subscription found:', customerSubscription.id);
    }
  }, [subscriptionsError, activeSubscriptionError, allSubscriptions, customerSubscription]);
  
  // Using theme classes instead of hardcoded colors

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 justify-center items-center">
          <View className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <Text className="text-muted-foreground mt-4">Loading subscriptions...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Show error state if subscriptions query failed
  if (subscriptionsError) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 justify-center items-center p-4">
          <AlertCircle size={48} className="text-destructive mb-4" />
          <Text className="text-lg font-semibold text-foreground mb-2">Unable to Load Subscriptions</Text>
          <Text className="text-sm text-muted-foreground text-center mb-4">
            There was an error loading your subscription information. Please try again later.
          </Text>
          <Button onPress={() => router.back()} variant="outline">
            <Text className="text-foreground">Go Back</Text>
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Modern Header */}
      <Animated.View entering={FadeIn} className="px-4 py-5 border-b border-border/50 bg-card/50">
        <View className="flex-row items-center gap-3">
          <View className="w-12 h-12 bg-destructive/10 rounded-xl items-center justify-center">
            <Icon as={Shield} size={24} className="text-destructive" />
          </View>
          <View className="flex-1">
            <Text className="text-2xl font-bold text-foreground">SOS Emergency Access</Text>
            <Text className="text-xs text-muted-foreground mt-0.5">
              Priority emergency booking service
            </Text>
          </View>
        </View>
      </Animated.View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="p-4 gap-5">
          {/* Active Subscription OR Incomplete OR Available */}
          {hasCustomerSOS && customerSubscription ? (
            <Animated.View entering={SlideInUp}>
              <CustomerSubscriptionCard subscription={customerSubscription} />
            </Animated.View>
          ) : incompleteSubscription ? (
            <Animated.View entering={SlideInUp}>
              <IncompleteSubscriptionCard subscription={incompleteSubscription} />
            </Animated.View>
          ) : (
            <Animated.View entering={SlideInUp.delay(100)}>
              <CustomerAvailablePlanCard />
            </Animated.View>
          )}

          {/* SOS Features Showcase */}
          <Animated.View entering={SlideInUp.delay(200)}>
            <View className="gap-3">
              <Text className="text-lg font-bold text-foreground px-1">SOS Benefits</Text>
              
              {/* Emergency Response Benefits */}
              <Card className="border-destructive/20 bg-gradient-to-br from-destructive/5 to-transparent">
                <CardContent className="p-5">
                  <View className="flex-row items-start gap-4">
                    <View className="w-12 h-12 bg-destructive/10 rounded-xl items-center justify-center flex-shrink-0">
                      <Icon as={Zap} size={24} className="text-destructive" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-base font-bold text-foreground mb-3">Instant Emergency Access</Text>
                      <View className="gap-2.5">
                        {[
                          { icon: CheckCircle, text: 'Emergency booking available' },
                          { icon: CheckCircle, text: 'Priority provider matching' },
                          { icon: CheckCircle, text: 'Instant confirmations' }
                        ].map((item, i) => (
                          <View key={i} className="flex-row items-center gap-2">
                            <Icon as={item.icon} size={14} className="text-destructive flex-shrink-0" />
                            <Text className="text-sm text-foreground">{item.text}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  </View>
                </CardContent>
              </Card>

              {/* Support Benefits */}
              <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
                <CardContent className="p-5">
                  <View className="flex-row items-start gap-4">
                    <View className="w-12 h-12 bg-primary/10 rounded-xl items-center justify-center flex-shrink-0">
                      <Icon as={Clock} size={24} className="text-primary" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-base font-bold text-foreground mb-3">24/7 Support</Text>
                      <View className="gap-2.5">
                        {[
                          { icon: CheckCircle, text: 'Round-the-clock support' },
                          { icon: CheckCircle, text: 'Emergency service guarantee' },
                          { icon: CheckCircle, text: 'Skip regular booking queues' }
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
            </View>
          </Animated.View>

          {/* Subscription History */}
          {allSubscriptions && allSubscriptions.filter(s => s.type === 'customer_sos').length > 1 && (
            <Animated.View entering={SlideInUp.delay(300)}>
              <View className="gap-3">
                <Text className="text-lg font-bold text-foreground px-1">Subscription History</Text>
                
                {allSubscriptions
                  .filter(s => s.type === 'customer_sos')
                  .filter(s => s.id !== customerSubscription?.id)
                  .map((subscription) => (
                    <HistorySubscriptionCard 
                      key={subscription.id}
                      subscription={subscription}
                    />
                  ))}
              </View>
            </Animated.View>
          )}

          {/* Bottom Padding */}
          <View className="h-4" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function CustomerSubscriptionCard({ subscription }: { subscription: UserSubscription }) {
  const priceInfo = useSubscriptionPrice('CUSTOMER_SOS');
  const cancelMutation = useCancelSubscription();
  const reactivateMutation = useReactivateSubscription();
  const { isDarkColorScheme } = useColorScheme();
  
  const handleCancel = async () => {
    if (!subscription?.stripe_subscription_id) {
      Alert.alert('Error', 'Invalid subscription. Please refresh and try again.');
      return;
    }

    Alert.alert(
      'Cancel Subscription',
      'Are you sure you want to cancel your SOS subscription? You\'ll lose access to emergency booking features at the end of your current billing period.',
      [
        { text: 'Keep Subscription', style: 'cancel' },
        {
          text: 'Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelMutation.mutateAsync({
                subscriptionId: subscription.stripe_subscription_id,
                cancelAtPeriodEnd: true,
              });
              Alert.alert('Success!', 'Your subscription has been scheduled for cancellation at the end of the current billing period.');
            } catch (error) {
              console.error('Cancel subscription error:', error);
              const errorMessage = error instanceof Error ? error.message : 'Failed to cancel subscription. Please try again.';
              Alert.alert('Error', errorMessage);
            }
          }
        }
      ]
    );
  };

  const handleReactivate = async () => {
    if (!subscription?.stripe_subscription_id) {
      Alert.alert('Error', 'Invalid subscription. Please refresh and try again.');
      return;
    }

    try {
      await reactivateMutation.mutateAsync(subscription.stripe_subscription_id);
      Alert.alert('Success!', 'Your SOS subscription has been reactivated.');
    } catch (error) {
      console.error('Reactivate subscription error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to reactivate subscription. Please try again.';
      Alert.alert('Error', errorMessage);
    }
  };

  const isActive = ['active', 'trialing'].includes(subscription.status);
  const period = getSubscriptionPeriod(subscription);

  return (
    <Animated.View entering={FadeIn}>
      <Card className={cn(
        'relative overflow-hidden border-2',
        isActive ? 'bg-gradient-to-br from-destructive/10 to-destructive/5 border-destructive/30' : 'bg-card border-border'
      )}>
        <CardContent className="p-5 relative z-10">
          {/* Header */}
          <View className="flex-row items-center justify-between mb-5">
            <View className="flex-row items-center gap-3 flex-1">
              <View className={cn(
                "w-12 h-12 rounded-xl items-center justify-center",
                isActive ? 'bg-destructive/15' : 'bg-secondary/15'
              )}>
                <Icon as={Shield} size={24} className={isActive ? 'text-destructive' : 'text-secondary'} />
              </View>
              <View className="flex-1 pr-20">
                <Text className="text-lg font-bold text-foreground">{priceInfo.displayName}</Text>
                <Text className="text-xs text-muted-foreground mt-1">Emergency access active</Text>
              </View>
            </View>
            
            {/* Status Badge */}
            <Badge className={cn(
              isActive ? 'bg-destructive text-destructive-foreground' : 'bg-warning text-warning-foreground'
            )}>
              <View className="flex-row items-center gap-1">
                <CheckCircle size={10} />
                <Text className="text-xs font-medium">
                  {isActive ? 'Active' : 'Ending'}
                </Text>
              </View>
            </Badge>
          </View>

          {/* Pricing Display */}
          <View className="flex-row items-center justify-between p-4 bg-card/50 border border-border/50 rounded-xl mb-5">
            <View>
              <Text className="text-xs text-muted-foreground">Monthly fee</Text>
              <View className="flex-row items-baseline gap-1 mt-1">
                <Text className="text-3xl font-bold text-foreground">
                  £{(priceInfo.amount / 100).toFixed(2)}
                </Text>
                <Text className="text-sm text-muted-foreground">/month</Text>
              </View>
            </View>
            <View className="items-end">
              <Text className="text-xs text-muted-foreground">Status</Text>
              <Text className="text-sm font-bold text-foreground mt-1">
                {formatSubscriptionStatus(subscription.status)}
              </Text>
            </View>
          </View>

          {/* Billing Information */}
          <View className="flex-row items-center gap-3 p-4 bg-card/50 border border-border/50 rounded-xl mb-5">
            <View className="w-10 h-10 bg-primary/10 rounded-lg items-center justify-center">
              <Icon as={Calendar} size={20} className="text-primary" />
            </View>
            <View className="flex-1">
              <Text className="text-xs text-muted-foreground">Next billing</Text>
              <Text className="text-sm font-bold text-foreground">
                {period.end.toLocaleDateString('en-GB', { 
                  year: 'numeric', 
                  month: 'short', 
                  day: 'numeric' 
                })}
              </Text>
            </View>
            <View className="items-end">
              <Text className="text-xs text-muted-foreground">Days left</Text>
              <Text className="text-sm font-bold text-foreground">{period.daysRemaining} days</Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View className="flex-row gap-2">
            {subscription.cancel_at_period_end ? (
              <Button 
                onPress={handleReactivate}
                disabled={reactivateMutation.isPending}
                className="flex-1 bg-success hover:bg-success/90"
              >
                <View className="flex-row items-center gap-2">
                  {reactivateMutation.isPending && <View className="w-3 h-3 rounded-full border border-primary-foreground border-t-transparent animate-spin" />}
                  <Text className="text-primary-foreground font-bold text-sm">
                    {reactivateMutation.isPending ? 'Reactivating...' : 'Reactivate'}
                  </Text>
                </View>
              </Button>
            ) : (
              <>
                <Button 
                  onPress={handleCancel}
                  disabled={cancelMutation.isPending}
                  variant="outline"
                  className="flex-1 border-destructive/30"
                >
                  <View className="flex-row items-center gap-2">
                    {cancelMutation.isPending && <View className="w-3 h-3 rounded-full border border-foreground border-t-transparent animate-spin" />}
                    <Text className="text-foreground font-bold text-sm">
                      {cancelMutation.isPending ? 'Cancelling...' : 'Cancel'}
                    </Text>
                  </View>
                </Button>
                <Button 
                  variant="ghost"
                  onPress={() => router.push('/(customer)/profile')}
                  className="px-3"
                >
                  <Icon as={CreditCard} size={16} className="text-muted-foreground" />
                </Button>
              </>
            )}
          </View>
        </CardContent>
      </Card>
    </Animated.View>
  );
}

function CustomerAvailablePlanCard() {
  const priceInfo = useSubscriptionPrice('CUSTOMER_SOS');
  const { isDarkColorScheme } = useColorScheme();
  
  const handleSubscribe = () => {
    router.push({
      pathname: '/subscriptions/checkout',
      params: { type: 'CUSTOMER_SOS' }
    });
  };

  return (
    <Animated.View entering={FadeIn}>
      <Card className="bg-gradient-to-br from-destructive/15 to-destructive/5 border-2 border-dashed border-destructive/30">
        <CardContent className="p-6">
          <View className="flex-row items-start justify-between mb-6">
            <View className="flex-row items-center gap-3 flex-1">
              <View className="w-14 h-14 bg-destructive/20 rounded-xl items-center justify-center">
                <Icon as={Zap} size={28} className="text-destructive" />
              </View>
              <View className="flex-1">
                <Text className="text-lg font-bold text-foreground">{priceInfo.displayName}</Text>
                <Text className="text-xs text-muted-foreground mt-1">
                  {priceInfo.description}
                </Text>
              </View>
            </View>
          </View>

          {/* Pricing Preview */}
          <View className="p-4 bg-card/50 border border-border/50 rounded-xl mb-5">
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-xs text-muted-foreground">Starting at</Text>
                <View className="flex-row items-baseline gap-1 mt-1">
                  <Text className="text-3xl font-bold text-foreground">
                    £{(priceInfo.amount / 100).toFixed(2)}
                  </Text>
                  <Text className="text-sm text-muted-foreground">/month</Text>
                </View>
              </View>
              <View className="items-center">
                <View className="w-12 h-12 bg-destructive/10 rounded-xl items-center justify-center">
                  <Icon as={Shield} size={24} className="text-destructive" />
                </View>
              </View>
            </View>
          </View>

          {/* Key Features */}
          <View className="gap-3 mb-6">
            {[
              { icon: Zap, text: 'Emergency booking access' },
              { icon: Clock, text: '24/7 priority support' },
              { icon: CheckCircle, text: 'Instant confirmations' },
              { icon: Star, text: 'Priority provider matching' }
            ].map((feature, i) => (
              <View key={i} className="flex-row items-center gap-3">
                <View className="w-5 h-5 bg-destructive/20 rounded-full items-center justify-center flex-shrink-0">
                  <Icon as={feature.icon} size={12} className="text-destructive" />
                </View>
                <Text className="text-sm text-foreground">{feature.text}</Text>
              </View>
            ))}
          </View>

          {/* CTA Button */}
          <Button onPress={handleSubscribe} className="w-full h-12 bg-destructive hover:bg-destructive/90">
            <Icon as={Sparkles} size={18} className="text-destructive-foreground mr-2" />
            <Text className="text-destructive-foreground font-bold">Unlock SOS Access</Text>
            <Icon as={ArrowRight} size={16} className="text-destructive-foreground ml-auto" />
          </Button>

          {/* Fine Print */}
          <Text className="text-xs text-muted-foreground text-center mt-4">
            Cancel anytime • No setup fees • Instant activation
          </Text>
        </CardContent>
      </Card>
    </Animated.View>
  );
}

function HistorySubscriptionCard({ subscription }: { subscription: UserSubscription }) {
  const priceInfo = useSubscriptionPrice('CUSTOMER_SOS');
  const { isDarkColorScheme } = useColorScheme();
  const isActive = ['active', 'trialing'].includes(subscription.status);
  
  return (
    <Animated.View entering={FadeIn}>
      <Card className="opacity-75 border-border/50">
        <CardContent className="p-3">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <View className="w-8 h-8 bg-muted/50 rounded-lg items-center justify-center">
                <Icon as={Shield} size={16} className="text-muted-foreground" />
              </View>
              <View>
                <Text className="text-sm font-bold text-foreground">
                  {priceInfo.displayName}
                </Text>
                <Text className="text-xs text-muted-foreground">
                  {new Date(subscription.created_at).toLocaleDateString('en-GB', { 
                    year: 'numeric', 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </Text>
              </View>
            </View>
            
            <Badge variant={isActive ? 'default' : 'secondary'} className={isActive ? 'bg-success' : 'bg-warning'}>
              <Text className="text-xs font-medium">
                {formatSubscriptionStatus(subscription.status)}
              </Text>
            </Badge>
          </View>
        </CardContent>
      </Card>
    </Animated.View>
  );
}

function IncompleteSubscriptionCard({ subscription }: { subscription: UserSubscription }) {
  const priceInfo = useSubscriptionPrice('CUSTOMER_SOS');
  const { isDarkColorScheme } = useColorScheme();
  
  const handleCompletePayment = () => {
    router.push({
      pathname: '/subscriptions/checkout',
      params: { 
        type: 'CUSTOMER_SOS',
        subscriptionId: subscription.stripe_subscription_id
      }
    });
  };

  return (
    <Animated.View entering={FadeIn}>
      <Card className="border-2 border-warning/30 bg-gradient-to-br from-warning/10 to-transparent">
        <CardContent className="p-5">
          <View className="flex-row items-center gap-4 mb-5">
            <View className="w-12 h-12 bg-warning/15 rounded-xl items-center justify-center flex-shrink-0">
              <Icon as={Clock} size={24} className="text-warning" />
            </View>
            <View className="flex-1 pr-16">
              <Text className="text-lg font-bold text-foreground">{priceInfo.displayName}</Text>
              <Text className="text-xs text-warning mt-1 font-medium">
                Payment Required to Activate
              </Text>
            </View>
            <Badge className="bg-warning/20">
              <Text className="text-xs text-warning font-medium">Pending</Text>
            </Badge>
          </View>

          {/* Information Box */}
          <View className="p-3 bg-warning/10 rounded-lg border border-warning/20 mb-4">
            <Text className="text-xs text-warning font-medium">
              Finish setting up your emergency access
            </Text>
            <Text className="text-xs text-muted-foreground mt-1">
              Complete payment to activate all SOS emergency booking features.
            </Text>
          </View>

          {/* Pricing Reminder */}
          <View className="flex-row items-center justify-between p-3 bg-card/50 border border-border/50 rounded-lg mb-4">
            <View>
              <Text className="text-xs text-muted-foreground">Monthly fee</Text>
              <View className="flex-row items-baseline gap-1 mt-1">
                <Text className="text-lg font-bold text-foreground">
                  £{(priceInfo.amount / 100).toFixed(2)}
                </Text>
                <Text className="text-xs text-muted-foreground">/month</Text>
              </View>
            </View>
            <View className="items-end">
              <Text className="text-xs text-muted-foreground">Created</Text>
              <Text className="text-xs font-medium text-foreground mt-1">
                {new Date(subscription.created_at).toLocaleDateString('en-GB', { 
                  year: 'numeric', 
                  month: 'short', 
                  day: 'numeric' 
                })}
              </Text>
            </View>
          </View>

          {/* Action Button */}
          <Button onPress={handleCompletePayment} className="w-full h-12 bg-warning hover:bg-warning/90">
            <Icon as={CreditCard} size={16} className="text-warning-foreground mr-2" />
            <Text className="text-warning-foreground font-bold">Complete Payment</Text>
          </Button>

          <Text className="text-xs text-muted-foreground text-center mt-3">
            Secure payment • Cancel anytime • Instant activation
          </Text>
        </CardContent>
      </Card>
    </Animated.View>
  );
}
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
import { Shield, Calendar, CreditCard, Plus, CheckCircle, XCircle, Clock, Zap, Star, Sparkles } from 'lucide-react-native';
import { router } from 'expo-router';
import { useColorScheme } from '@/lib/core/useColorScheme';

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
          <XCircle size={48} className="text-destructive mb-4" />
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
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="p-4 gap-6">
          {/* Hero Header */}
          <View className="items-center text-center gap-2 pt-4">
            <View className="p-4 rounded-full bg-primary">
              <Shield size={32} className="text-primary-foreground" />
            </View>  
            <Text className="text-2xl font-bold text-foreground">SOS Emergency Access</Text>
            <Text className="text-sm text-muted-foreground text-center max-w-sm">
              Get priority access to trusted providers when you need them most
            </Text>
          </View>

          {/* Current Subscription Status */}
          {hasCustomerSOS ? (
            <View className="gap-4">
              <View className="flex-row items-center gap-2">
                <CheckCircle size={16} className="text-success" />
                <Text className="text-lg font-semibold text-foreground">Your Plan</Text>
              </View>
              {customerSubscription && <CustomerSubscriptionCard subscription={customerSubscription} />}
            </View>
          ) : incompleteSubscription ? (
            <View className="gap-4">
              <View className="flex-row items-center gap-2">
                <Clock size={16} className="text-warning" />
                <Text className="text-lg font-semibold text-foreground">Payment Required</Text>
              </View>
              <IncompleteSubscriptionCard subscription={incompleteSubscription} />
            </View>
          ) : (
            <View className="gap-4">
              <View className="flex-row items-center gap-2">
                <XCircle size={16} className="text-muted-foreground" />
                <Text className="text-lg font-semibold text-foreground">No Active Plan</Text>
              </View>
              <CustomerAvailablePlanCard />
            </View>
          )}

          {/* SOS Features Showcase */}
          <View className="gap-4">
            <Text className="text-lg font-semibold text-foreground">SOS Benefits</Text>
            
            <View className="gap-3">
              {[
                { icon: Zap, title: 'Instant SOS Access', desc: 'Emergency booking when you need it most' },
                { icon: Star, title: 'Priority Matching', desc: 'Get matched with top-rated providers first' },
                { icon: Clock, title: '24/7 Support', desc: 'Round-the-clock priority customer service' },
                { icon: CheckCircle, title: 'Guaranteed Response', desc: 'Instant booking confirmations' },
                { icon: Shield, title: 'Emergency Protection', desc: 'Dedicated emergency service guarantee' },
                { icon: Sparkles, title: 'Skip the Queue', desc: 'Bypass regular booking wait times' }
              ].map((feature, index) => (
                <Card key={index} className="border-l-4 border-l-primary/50">
                  <CardContent className="p-4">
                    <View className="flex-row items-center gap-3">
                      <View className="p-2 rounded-lg bg-primary/10">
                        <feature.icon size={16} className="text-primary" />
                      </View>
                      <View className="flex-1">
                        <Text className="text-sm font-semibold text-foreground">{feature.title}</Text>
                        <Text className="text-xs text-muted-foreground">{feature.desc}</Text>
                      </View>
                    </View>
                  </CardContent>
                </Card>
              ))}
            </View>
          </View>

          {/* Subscription History */}
          {allSubscriptions && allSubscriptions.filter(s => s.type === 'customer_sos').length > 1 && (
            <View className="gap-3">
              <Text className="text-lg font-semibold text-foreground">Subscription History</Text>
              
              {allSubscriptions
                .filter(s => s.type === 'customer_sos')
                .filter(s => s.id !== customerSubscription?.id) // Don't show current subscription in history
                .map((subscription) => (
                  <HistorySubscriptionCard 
                    key={subscription.id}
                    subscription={subscription}
                  />
                ))}
            </View>
          )}

          {/* Bottom Padding */}
          <View className="h-8" />
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
  
  // Using theme classes instead of hardcoded colors
  
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
    <Card className={`relative overflow-hidden ${isActive ? 'border-success/20 bg-success/10' : 'border-warning/20 bg-warning/10'}`}>
      {/* Status Badge */}
      <View className="absolute top-3 right-3">
        <Badge variant={isActive ? 'default' : 'secondary'} className={isActive ? 'bg-success' : 'bg-warning'}>
          <View className="flex-row items-center gap-1">
            {isActive ? <CheckCircle size={10} className="text-primary-foreground" /> : <Clock size={10} className="text-primary-foreground" />}
            <Text className="text-xs font-medium text-primary-foreground">
              {isActive ? 'Active' : 'Ending Soon'}
            </Text>
          </View>
        </Badge>
      </View>
      
      <CardHeader className="pb-3">
        <View className="flex-row items-center gap-3">
          <View className="p-3 rounded-full bg-primary">
            <Shield size={20} className="text-primary-foreground" />
          </View>
          <View className="flex-1 pr-20">
            <CardTitle className="text-lg">{priceInfo.displayName}</CardTitle>
            <Text className="text-xs text-muted-foreground mt-1">
              Emergency booking access
            </Text>
          </View>
        </View>
      </CardHeader>

      <CardContent className="pt-0 gap-4">
        {/* Pricing Display */}
        <View className="flex-row items-center justify-between p-3 bg-card rounded-lg border">
          <View>
            <Text className="text-xs text-muted-foreground">Monthly fee</Text>
            <View className="flex-row items-baseline gap-1">
              <Text className="text-2xl font-bold text-foreground">
                £{(priceInfo.amount / 100).toFixed(2)}
              </Text>
              <Text className="text-xs text-muted-foreground">/month</Text>
            </View>
          </View>
          <View className="items-end">
            <Text className="text-xs text-muted-foreground">Status</Text>
            <Text className="text-sm font-medium text-foreground">
              {formatSubscriptionStatus(subscription.status)}
            </Text>
          </View>
        </View>

        {/* Billing Information */}
        <View className="gap-2">
          <View className="flex-row items-center justify-between">
            <Text className="text-xs text-muted-foreground">Current period</Text>
            <Text className="text-xs font-medium text-foreground">
              {period.start.toLocaleDateString()} - {period.end.toLocaleDateString()}
            </Text>
          </View>
          
          <View className="flex-row items-center justify-between">
            <Text className="text-xs text-muted-foreground">Next billing</Text>
            <View className="flex-row items-center gap-1">
              <Calendar size={12} className="text-muted-foreground" />
              <Text className="text-xs font-medium text-foreground">
                {period.end.toLocaleDateString()} ({period.daysRemaining} days)
              </Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View className="flex-row gap-2 pt-2">
          {subscription.cancel_at_period_end ? (
            <Button 
              onPress={handleReactivate}
              disabled={reactivateMutation.isPending}
              className="flex-1 bg-success hover:bg-success/90"
            >
              <View className="flex-row items-center gap-2">
                {reactivateMutation.isPending && <View className="w-3 h-3 rounded-full border border-primary-foreground border-t-transparent animate-spin" />}
                <Text className="text-primary-foreground font-medium text-sm">
                  {reactivateMutation.isPending ? 'Reactivating...' : 'Reactivate Plan'}
                </Text>
              </View>
            </Button>
          ) : (
            <Button 
              variant="outline"
              onPress={handleCancel}
              disabled={cancelMutation.isPending}
              className="flex-1 border-red-200 dark:border-red-800"
            >
              <View className="flex-row items-center gap-2">
                {cancelMutation.isPending && <View className="w-3 h-3 rounded-full border border-foreground border-t-transparent animate-spin" />}
                <Text className="text-foreground font-medium text-sm">
                  {cancelMutation.isPending ? 'Cancelling...' : 'Cancel Plan'}
                </Text>
              </View>
            </Button>
          )}
          
          <Button 
            variant="ghost"
            onPress={() => router.push('/customer/profile')}
            className="px-3"
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
  const { isDarkColorScheme } = useColorScheme();
  
  // Using theme classes instead of hardcoded colors
  
  const handleSubscribe = () => {
    // Navigate to checkout screen with subscription type
    router.push({
      pathname: '/subscriptions/checkout',
      params: { type: 'CUSTOMER_SOS' }
    });
  };

  return (
    <Card className="border-2 border-dashed border-muted-foreground/30 bg-muted/20">
      <CardHeader className="pb-4">
        <View className="flex-row items-center gap-3">
          <View className="p-3 rounded-full bg-muted border-2 border-dashed border-muted-foreground/30">
            <Shield size={20} className="text-muted-foreground" />
          </View>
          <View className="flex-1">
            <CardTitle className="text-lg text-foreground">
              {priceInfo.displayName}
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              {priceInfo.description}
            </CardDescription>
          </View>
        </View>
      </CardHeader>

      <CardContent className="pt-0 gap-4">
        {/* Pricing Preview */}
        <View className="p-4 bg-muted/50 rounded-lg border border-dashed border-muted-foreground/20">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-xs text-muted-foreground">Starting at</Text>
              <View className="flex-row items-baseline gap-1">
                <Text className="text-2xl font-bold text-foreground">
                  £{(priceInfo.amount / 100).toFixed(2)}
                </Text>
                <Text className="text-sm text-muted-foreground">/month</Text>
              </View>
            </View>
            <View className="items-center">
              <View className="w-12 h-12 rounded-full border-2 border-dashed border-muted-foreground/30 items-center justify-center">
                <Zap size={20} className="text-muted-foreground" />
              </View>
            </View>
          </View>
        </View>

        {/* Quick Benefits */}
        <View className="gap-2">
          <Text className="text-xs font-semibold text-foreground">What you'll get:</Text>
          <View className="flex-row flex-wrap gap-1">
            {['Emergency Access', '24/7 Support', 'Priority Matching', 'Instant Confirmation'].map((benefit, index) => (
              <Badge key={index} variant="secondary" className="bg-muted/50">
                <Text className="text-xs text-muted-foreground">{benefit}</Text>
              </Badge>
            ))}
          </View>
        </View>

        {/* Subscribe Button */}
        <Button onPress={handleSubscribe} className="w-full h-12 bg-primary hover:bg-primary/90">
          <View className="flex-row items-center gap-2">
            <Zap size={16} className="text-primary-foreground" />
            <Text className="text-primary-foreground font-semibold">Unlock SOS Access</Text>
          </View>
        </Button>

        {/* Fine Print */}
        <Text className="text-xs text-muted-foreground text-center">
          Cancel anytime • No setup fees • Instant activation
        </Text>
      </CardContent>
    </Card>
  );
}

function HistorySubscriptionCard({ subscription }: { subscription: UserSubscription }) {
  const priceInfo = useSubscriptionPrice('CUSTOMER_SOS');
  const { isDarkColorScheme } = useColorScheme();
  const isActive = ['active', 'trialing'].includes(subscription.status);
  
  // Using theme classes instead of hardcoded colors

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

function IncompleteSubscriptionCard({ subscription }: { subscription: UserSubscription }) {
  const priceInfo = useSubscriptionPrice('CUSTOMER_SOS');
  const { isDarkColorScheme } = useColorScheme();
  
  const handleCompletePayment = () => {
    // Navigate to checkout with the existing incomplete subscription
    router.push({
      pathname: '/subscriptions/checkout',
      params: { 
        type: 'CUSTOMER_SOS',
        subscriptionId: subscription.stripe_subscription_id
      }
    });
  };

  return (
    <Card className="border-2 border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20">
      <CardHeader className="pb-3">
        <View className="flex-row items-center gap-3">
          <View className="p-3 rounded-full bg-amber-100 dark:bg-amber-900/50">
            <Clock size={20} className="text-amber-600 dark:text-amber-400" />
          </View>
          <View className="flex-1 pr-12">
            <CardTitle className="text-lg text-foreground">{priceInfo.displayName}</CardTitle>
            <Text className="text-xs text-amber-600 dark:text-amber-400 mt-1 font-medium">
              Payment Required to Activate
            </Text>
          </View>
          <Badge variant="secondary" className="bg-amber-200 dark:bg-amber-900/50">
            <Text className="text-xs text-amber-700 dark:text-amber-300">Pending</Text>
          </Badge>
        </View>
      </CardHeader>

      <CardContent className="pt-0 gap-4">
        {/* Information */}
        <View className="p-3 bg-amber-100/50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
          <Text className="text-sm text-amber-800 dark:text-amber-200 font-medium mb-1">
            Complete Your Subscription
          </Text>
          <Text className="text-xs text-amber-600 dark:text-amber-400">
            Your SOS subscription was created but payment wasn't completed. Finish the payment process to activate your emergency access benefits.
          </Text>
        </View>

        {/* Pricing Reminder */}
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-xs text-muted-foreground">Monthly fee</Text>
            <View className="flex-row items-baseline gap-1">
              <Text className="text-lg font-bold text-foreground">
                £{(priceInfo.amount / 100).toFixed(2)}
              </Text>
              <Text className="text-xs text-muted-foreground">/month</Text>
            </View>
          </View>
          <View className="items-end">
            <Text className="text-xs text-muted-foreground">Created</Text>
            <Text className="text-xs font-medium text-foreground">
              {new Date(subscription.created_at).toLocaleDateString()}
            </Text>
          </View>
        </View>

        {/* Action Button */}
        <Button onPress={handleCompletePayment} className="w-full h-12 bg-warning hover:bg-warning/90">
          <View className="flex-row items-center gap-2">
            <CreditCard size={16} className="text-primary-foreground" />
            <Text className="text-primary-foreground font-semibold">Complete Payment</Text>
          </View>
        </Button>

        <Text className="text-xs text-muted-foreground text-center">
          Secure payment • Cancel anytime • Instant activation
        </Text>
      </CardContent>
    </Card>
  );
}
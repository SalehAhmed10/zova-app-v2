import React from 'react';
import { View } from 'react-native';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Text } from '@/components/ui/text';
import { 
  useActiveSubscription, 
  useSubscriptionPrice,
  useCancelSubscription,
  useReactivateSubscription,
  formatSubscriptionStatus,
  getSubscriptionPeriod,
  type UserSubscription
} from '@/hooks/shared/useSubscription';
import { Shield, Star, AlertCircle, Calendar, CreditCard } from 'lucide-react-native';

interface SubscriptionCardProps {
  type: 'customer_sos' | 'provider_premium';
  onSubscribe?: () => void;
}

export function SubscriptionCard({ type, onSubscribe }: SubscriptionCardProps) {
  const { data: subscription, isLoading } = useActiveSubscription(type);
  const subscriptionType = type === 'customer_sos' ? 'CUSTOMER_SOS' : 'PROVIDER_PREMIUM';
  const priceInfo = useSubscriptionPrice(subscriptionType);
  const cancelMutation = useCancelSubscription();
  const reactivateMutation = useReactivateSubscription();

  const handleCancel = async () => {
    if (!subscription) return;
    
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
    if (!subscription) return;
    
    try {
      await reactivateMutation.mutateAsync(subscription.stripe_subscription_id);
    } catch (error) {
      console.error('Reactivate subscription error:', error);
    }
  };

  const Icon = type === 'customer_sos' ? Shield : Star;
  const isActive = subscription && ['active', 'trialing'].includes(subscription.status);
  
  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardContent className="p-6">
          <View className="h-20 bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`relative ${isActive ? 'border-primary' : 'border-border'}`}>
      {isActive && (
        <View className="absolute -top-2 -right-2">
          <Badge variant="default" className="bg-primary text-primary-foreground">
            <Text className="text-xs font-medium">Active</Text>
          </Badge>
        </View>
      )}
      
      <CardHeader>
        <View className="flex-row items-center gap-3">
          <View className="p-2 rounded-full bg-primary/10">
            <Icon size={24} className="text-primary" />
          </View>
          <View className="flex-1">
            <CardTitle className="text-lg">{priceInfo.displayName}</CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              {priceInfo.description}
            </CardDescription>
          </View>
        </View>
      </CardHeader>

      <CardContent className="pt-0 space-y-4">
        {/* Pricing */}
        <View className="flex-row items-baseline gap-1">
          <Text className="text-2xl font-bold text-foreground">
            £{(priceInfo.amount / 100).toFixed(2)}
          </Text>
          <Text className="text-sm text-muted-foreground">per month</Text>
        </View>

        {/* Subscription Status */}
        {subscription && (
          <View className="space-y-2">
            <View className="flex-row items-center gap-2">
              <View className={`w-2 h-2 rounded-full ${
                isActive ? 'bg-green-500' : 'bg-yellow-500'
              }`} />
              <Text className="text-sm font-medium text-foreground">
                {formatSubscriptionStatus(subscription.status)}
              </Text>
              {subscription.cancel_at_period_end && (
                <Badge variant="secondary" className="ml-auto">
                  <Text className="text-xs">Ending Soon</Text>
                </Badge>
              )}
            </View>

            {/* Subscription Period */}
            <SubscriptionPeriodInfo subscription={subscription} />
          </View>
        )}

        {/* Features */}
        <View className="space-y-2">
          <Text className="text-sm font-medium text-foreground">Features:</Text>
          <View className="space-y-1">
            {getFeaturesList(type).map((feature, index) => (
              <View key={index} className="flex-row items-center gap-2">
                <View className="w-1 h-1 rounded-full bg-primary" />
                <Text className="text-sm text-muted-foreground flex-1">{feature}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Action Buttons */}
        <View className="pt-2 space-y-2">
          {!subscription ? (
            <Button onPress={onSubscribe} className="w-full">
              <Text className="text-primary-foreground font-medium">Subscribe Now</Text>
            </Button>
          ) : (
            <View className="space-y-2">
              {subscription.cancel_at_period_end ? (
                <Button 
                  onPress={handleReactivate}
                  disabled={reactivateMutation.isPending}
                  className="w-full"
                >
                  <Text className="text-primary-foreground font-medium">
                    {reactivateMutation.isPending ? 'Reactivating...' : 'Reactivate'}
                  </Text>
                </Button>
              ) : (
                <Button 
                  variant="outline"
                  onPress={handleCancel}
                  disabled={cancelMutation.isPending}
                  className="w-full"
                >
                  <Text className="text-foreground font-medium">
                    {cancelMutation.isPending ? 'Cancelling...' : 'Cancel Subscription'}
                  </Text>
                </Button>
              )}
            </View>
          )}
        </View>
      </CardContent>
    </Card>
  );
}

function SubscriptionPeriodInfo({ subscription }: { subscription: UserSubscription }) {
  const period = getSubscriptionPeriod(subscription);
  
  return (
    <View className="p-3 bg-muted/50 rounded-lg space-y-1">
      <View className="flex-row items-center gap-2">
        <Calendar size={14} className="text-muted-foreground" />
        <Text className="text-xs font-medium text-muted-foreground">Billing Period</Text>
      </View>
      <Text className="text-sm text-foreground">
        {period.start.toLocaleDateString()} - {period.end.toLocaleDateString()}
      </Text>
      
      {period.daysRemaining > 0 && (
        <View className="flex-row items-center gap-2">
          <CreditCard size={14} className="text-muted-foreground" />
          <Text className="text-xs text-muted-foreground">
            {period.daysRemaining} days remaining
          </Text>
          {period.isExpiringSoon && (
            <AlertCircle size={12} className="text-yellow-500" />
          )}
        </View>
      )}
    </View>
  );
}

function getFeaturesList(type: 'customer_sos' | 'provider_premium'): string[] {
  if (type === 'customer_sos') {
    return [
      'SOS emergency booking access',
      'Priority provider matching',
      '24/7 priority support',
      'Instant booking confirmation',
      'Emergency service guarantee',
    ];
  }
  
  return [
    'Priority placement in search',
    'Advanced analytics dashboard',
    'Customer insights & trends',
    'Enhanced profile features',
    'Priority customer support',
  ];
}
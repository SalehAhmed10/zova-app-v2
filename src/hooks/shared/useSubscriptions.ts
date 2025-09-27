/**
 * ZOVA Subscription Hooks
 * 
 * React Query hooks for managing user subscriptions using existing Stripe integration.
 * Follows the established React Query + Zustand architecture pattern.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/core/supabase';
import { useAuthPure } from '@/hooks/shared/useAuthPure';
import { 
  SUBSCRIPTION_PRODUCTS, 
  UserSubscription, 
  SubscriptionStatus,
  SubscriptionFeatures,
  getSubscriptionFeatures,
  isSubscriptionActive
} from '@/lib/payment/subscription-config';

// Get user's active subscriptions
export const useUserSubscriptions = () => {
  const { user } = useAuthPure();
  
  return useQuery({
    queryKey: ['user-subscriptions', user?.id],
    queryFn: async (): Promise<UserSubscription[]> => {
      if (!user?.id) throw new Error('User ID is required');
      
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Get specific subscription type status
export const useSubscriptionStatus = (type: 'customer_sos' | 'provider_premium') => {
  const { data: subscriptions = [], isLoading } = useUserSubscriptions();
  
  const subscription = subscriptions.find(sub => sub.type === type && isSubscriptionActive(sub.status));
  
  return {
    hasSubscription: !!subscription,
    subscription,
    status: subscription?.status || 'none' as SubscriptionStatus,
    features: getSubscriptionFeatures(type, !!subscription),
    isLoading
  };
};

// Convenient hooks for specific subscription types
export const useCustomerSOSStatus = () => useSubscriptionStatus('customer_sos');
export const useProviderPremiumStatus = () => useSubscriptionStatus('provider_premium');

// Create a new subscription
export const useCreateSubscription = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthPure();

  return useMutation({
    mutationFn: async ({
      type,
      priceId,
      trialDays
    }: {
      type: 'customer_sos' | 'provider_premium';
      priceId: string;
      trialDays?: number;
    }) => {
      if (!user?.id) throw new Error('User must be logged in');

      // Call your existing Edge Function for creating subscriptions
      const { data, error } = await supabase.functions.invoke('create-subscription', {
        body: {
          userId: user.id,
          priceId,
          type,
          trialDays,
          metadata: {
            supabase_user_id: user.id,
            subscription_type: type,
            app_name: 'ZOVA'
          }
        }
      });

      if (error) throw new Error(`Subscription creation failed: ${error.message}`);
      return data;
    },
    onSuccess: (data, variables) => {
      // Invalidate subscription queries to refetch fresh data
      queryClient.invalidateQueries({ queryKey: ['user-subscriptions', user?.id] });
      
      // Update profile subscription status
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
      
      console.log(`[Subscription] Created ${variables.type} subscription:`, data);
    },
    onError: (error) => {
      console.error('[Subscription] Creation failed:', error);
    }
  });
};

// Cancel a subscription
export const useCancelSubscription = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthPure();

  return useMutation({
    mutationFn: async ({
      subscriptionId,
      cancelAtPeriodEnd = true
    }: {
      subscriptionId: string;
      cancelAtPeriodEnd?: boolean;
    }) => {
      const { data, error } = await supabase.functions.invoke('cancel-subscription', {
        body: {
          subscriptionId,
          cancelAtPeriodEnd
        }
      });

      if (error) throw new Error(`Subscription cancellation failed: ${error.message}`);
      return data;
    },
    onSuccess: (data, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['user-subscriptions', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
      
      console.log('[Subscription] Cancelled subscription:', variables.subscriptionId);
    },
    onError: (error) => {
      console.error('[Subscription] Cancellation failed:', error);
    }
  });
};

// Reactivate a cancelled subscription
export const useReactivateSubscription = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthPure();

  return useMutation({
    mutationFn: async ({ subscriptionId }: { subscriptionId: string }) => {
      const { data, error } = await supabase.functions.invoke('reactivate-subscription', {
        body: { subscriptionId }
      });

      if (error) throw new Error(`Subscription reactivation failed: ${error.message}`);
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user-subscriptions', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
      
      console.log('[Subscription] Reactivated subscription:', variables.subscriptionId);
    }
  });
};

// Get subscription billing information
export const useSubscriptionBilling = (subscriptionId?: string) => {
  return useQuery({
    queryKey: ['subscription-billing', subscriptionId],
    queryFn: async () => {
      if (!subscriptionId) throw new Error('Subscription ID is required');

      const { data, error } = await supabase.functions.invoke('get-subscription-details', {
        body: { subscriptionId }
      });

      if (error) throw error;
      return data;
    },
    enabled: !!subscriptionId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Helper hook to get all subscription features for a user
export const useUserFeatures = () => {
  const { data: subscriptions = [] } = useUserSubscriptions();
  const { user } = useAuthPure();
  
  // Combine features from all active subscriptions
  const features: SubscriptionFeatures = subscriptions.reduce((acc, subscription) => {
    if (isSubscriptionActive(subscription.status)) {
      const subFeatures = getSubscriptionFeatures(subscription.type, true);
      return { ...acc, ...subFeatures };
    }
    return acc;
  }, {} as SubscriptionFeatures);

  const hasAnyActiveSubscription = subscriptions.some(sub => isSubscriptionActive(sub.status));

  return {
    features,
    hasAnyActiveSubscription,
    hasSOSAccess: features.emergencyBooking || false,
    hasPremiumFeatures: features.priorityPlacement || false,
    subscriptionCount: subscriptions.filter(sub => isSubscriptionActive(sub.status)).length
  };
};
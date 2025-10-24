import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth';
import { getSubscriptionConfig } from '@/lib/payment/subscription-config';

export interface UserSubscription {
  id: string;
  user_id: string;
  stripe_subscription_id: string;
  type: 'customer_sos' | 'provider_premium';
  status: 'active' | 'canceled' | 'past_due' | 'incomplete' | 'trialing';
  current_period_start: string;
  current_period_end: string;
  trial_end: string | null;
  cancel_at_period_end: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateSubscriptionRequest {
  subscriptionType: 'CUSTOMER_SOS' | 'PROVIDER_PREMIUM';
  priceId: string;
  customerEmail?: string;
}

export interface SubscriptionResponse {
  subscriptionId: string;
  clientSecret: string;
  status: string;
}

export interface CancelSubscriptionRequest {
  subscriptionId: string;
  cancelAtPeriodEnd?: boolean;
}

export function useUserSubscriptions() {
  const user = useAuthStore((state) => state.user);
  
  return useQuery({
    queryKey: ['subscriptions', user?.id],
    queryFn: async (): Promise<UserSubscription[]> => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });
}

export function useActiveSubscription(type: 'customer_sos' | 'provider_premium') {
  const user = useAuthStore((state) => state.user);
  
  return useQuery({
    queryKey: ['subscription', user?.id, type],
    queryFn: async (): Promise<UserSubscription | null> => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('type', type)
        .in('status', ['active', 'trialing', 'past_due'])
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data || null;
    },
    enabled: !!user?.id,
  });
}

export function useCreateSubscription() {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (request: CreateSubscriptionRequest): Promise<SubscriptionResponse> => {
      if (!user?.id) throw new Error('User not authenticated');
      
      const { data, error } = await supabase.functions.invoke('create-subscription', {
        body: {
          priceId: request.priceId,
          subscriptionType: request.subscriptionType,
        },
      });
      
      if (error) {
        // Handle FunctionsHttpError and extract meaningful error message
        let errorMessage = 'Failed to create subscription';
        try {
          if (error.context && typeof error.context.json === 'function') {
            const errorResponse = await error.context.json();
            errorMessage = errorResponse.error || errorMessage;
          }
        } catch {
          // If we can't parse the error response, use the generic message
        }
        throw new Error(errorMessage);
      }
      return data;
    },
    onSuccess: () => {
      // Invalidate subscription queries
      queryClient.invalidateQueries({ queryKey: ['subscriptions', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['subscription', user?.id] });
    },
  });
}

export function useCancelSubscription() {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (request: CancelSubscriptionRequest) => {
      const { data, error } = await supabase.functions.invoke('cancel-subscription', {
        body: request,
      });
      
      if (error) {
        // Handle FunctionsHttpError and extract meaningful error message
        let errorMessage = 'Failed to cancel subscription';
        try {
          if (error.context && typeof error.context.json === 'function') {
            const errorResponse = await error.context.json();
            errorMessage = errorResponse.error || errorMessage;
          }
        } catch {
          // If we can't parse the error response, use the generic message
        }
        throw new Error(errorMessage);
      }
      return data;
    },
    onSuccess: () => {
      // Invalidate subscription queries
      queryClient.invalidateQueries({ queryKey: ['subscriptions', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['subscription', user?.id] });
    },
  });
}

export function useReactivateSubscription() {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (subscriptionId: string) => {
      const { data, error } = await supabase.functions.invoke('reactivate-subscription', {
        body: { subscriptionId },
      });
      
      if (error) {
        // Handle FunctionsHttpError and extract meaningful error message
        let errorMessage = 'Failed to reactivate subscription';
        try {
          if (error.context && typeof error.context.json === 'function') {
            const errorResponse = await error.context.json();
            errorMessage = errorResponse.error || errorMessage;
          }
        } catch {
          // If we can't parse the error response, use the generic message
        }
        throw new Error(errorMessage);
      }
      return data;
    },
    onSuccess: () => {
      // Invalidate subscription queries
      queryClient.invalidateQueries({ queryKey: ['subscriptions', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['subscription', user?.id] });
    },
  });
}

export function useSubscriptionPrice(type: 'CUSTOMER_SOS' | 'PROVIDER_PREMIUM') {
  const configType = type === 'CUSTOMER_SOS' ? 'customer_sos' : 'provider_premium';
  const config = getSubscriptionConfig(configType);
  return {
    priceId: config.priceId,
    amount: config.amount,
    currency: 'GBP', // From config
    interval: config.interval,
    displayName: config.displayName,
    description: config.description,
  };
}

// Helper function to check if user has active subscription
export function hasActiveSubscription(
  subscriptions: UserSubscription[] | undefined,
  type: 'customer_sos' | 'provider_premium'
): boolean {
  if (!subscriptions) return false;
  
  return subscriptions.some(
    sub => 
      sub.type === type && 
      ['active', 'trialing'].includes(sub.status)
      // Note: We don't check cancel_at_period_end because users should have access
      // until the subscription actually expires, even if set to cancel
  );
}

// Helper function to find incomplete subscription that needs payment
export function findIncompleteSubscription(
  subscriptions: UserSubscription[] | undefined,
  type: 'customer_sos' | 'provider_premium'
): UserSubscription | null {
  if (!subscriptions) return null;
  
  return subscriptions.find(
    sub => 
      sub.type === type && 
      sub.status === 'incomplete'
  ) || null;
}

// Helper function to format subscription status for display
export function formatSubscriptionStatus(status: string): string {
  switch (status) {
    case 'active':
      return 'Active';
    case 'trialing':
      return 'Trial Period';
    case 'past_due':
      return 'Payment Due';
    case 'canceled':
      return 'Cancelled';
    case 'incomplete':
      return 'Setup Required';
    default:
      return status.charAt(0).toUpperCase() + status.slice(1);
  }
}

// Helper function to get subscription period info
export function getSubscriptionPeriod(subscription: UserSubscription) {
  const start = new Date(subscription.current_period_start);
  const end = new Date(subscription.current_period_end);
  
  return {
    start,
    end,
    daysRemaining: Math.ceil((end.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
    isExpiringSoon: end.getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000, // 7 days
  };
}

// Convenient hooks for specific subscription types
export function useCustomerSOSStatus() {
  const { data: subscriptions = [], isLoading } = useUserSubscriptions();
  const subscription = subscriptions.find(sub => sub.type === 'customer_sos' && ['active', 'trialing'].includes(sub.status));
  
  return {
    hasSubscription: !!subscription,
    subscription,
    status: subscription?.status || 'none',
    isLoading
  };
}

export function useProviderPremiumStatus() {
  const { data: subscriptions = [], isLoading } = useUserSubscriptions();
  const subscription = subscriptions.find(sub => sub.type === 'provider_premium' && ['active', 'trialing'].includes(sub.status));
  
  return {
    hasSubscription: !!subscription,
    subscription,
    status: subscription?.status || 'none',
    isLoading
  };
}
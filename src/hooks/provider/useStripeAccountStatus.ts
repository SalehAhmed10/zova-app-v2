/**
 * Stripe Account Status Hook - React Query + Zustand Architecture
 * 
 * ✅ Follows copilot-rules.md patterns
 * ❌ NO useState + useEffect patterns  
 * ✅ Uses React Query for server state
 * ✅ Proper caching and background updates
 * ✅ Mutation support for status updates
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

// Stripe account status interface
export interface StripeAccountStatus {
  charges_enabled: boolean;
  details_submitted: boolean;
  requirements: {
    currently_due: string[];
    eventually_due: string[];
    past_due: string[];
    pending_verification: string[];
  };
}

// Query key factory for Stripe account queries
const stripeAccountKeys = {
  all: ['stripe-account'] as const,
  status: (accountId: string) => [...stripeAccountKeys.all, 'status', accountId] as const,
};

/**
 * ✅ Stripe Account Status Hook - React Query Implementation
 * Replaces useState + useEffect pattern in StripeOnboardingComplete
 */
export const useStripeAccountStatus = (accountId: string) => {
  return useQuery({
    queryKey: stripeAccountKeys.status(accountId),
    queryFn: async (): Promise<StripeAccountStatus> => {
      console.log('[StripeAccountStatus] Fetching status for account:', accountId);
      
      const { data, error } = await supabase.functions.invoke('check-stripe-account-status', {
        body: { account_id: accountId }
      });

      if (error) {
        console.error('[StripeAccountStatus] Error checking account status:', error);
        throw new Error(`Stripe account status check failed: ${error.message}`);
      }

      if (!data) {
        throw new Error('No Stripe account status data returned');
      }

      const status: StripeAccountStatus = {
        charges_enabled: data.charges_enabled || false,
        details_submitted: data.details_submitted || false,
        requirements: {
          currently_due: data.requirements?.currently_due || [],
          eventually_due: data.requirements?.eventually_due || [],
          past_due: data.requirements?.past_due || [],
          pending_verification: data.requirements?.pending_verification || [],
        },
      };

      console.log('[StripeAccountStatus] Retrieved status:', status);
      return status;
    },
    enabled: !!accountId,
    staleTime: 2 * 60 * 1000, // 2 minutes (Stripe data changes frequently during onboarding)
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

/**
 * ✅ Mutation for refreshing Stripe account status
 * Use this when user completes onboarding steps
 */
export const useRefreshStripeAccountStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (accountId: string) => {
      console.log('[StripeAccountStatus] Refreshing status for account:', accountId);
      
      // Invalidate and refetch the query
      await queryClient.invalidateQueries({
        queryKey: stripeAccountKeys.status(accountId)
      });
      
      return true;
    },
    onSuccess: (_, accountId) => {
      console.log('[StripeAccountStatus] Successfully refreshed status for:', accountId);
    },
    onError: (error) => {
      console.error('[StripeAccountStatus] Error refreshing status:', error);
    },
  });
};

/**
 * Helper to check if account setup is complete
 */
export const useIsStripeAccountComplete = (accountId: string) => {
  const { data: accountStatus } = useStripeAccountStatus(accountId);
  
  return {
    isComplete: accountStatus?.charges_enabled && accountStatus?.details_submitted,
    hasRequirements: (accountStatus?.requirements?.currently_due?.length ?? 0) > 0 ||
                     (accountStatus?.requirements?.past_due?.length ?? 0) > 0,
    accountStatus,
  };
};
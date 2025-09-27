/**
 * Payment Status Hook - React Query + Zustand Architecture
 * 
 * ✅ Follows copilot-rules.md patterns
 * ❌ NO useState + useEffect patterns
 * ✅ Uses React Query for server state
 * ✅ Proper caching and background updates
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/core/supabase';

// Payment status interface
export interface PaymentStatus {
  hasStripeAccount: boolean;
  accountSetupComplete: boolean;
  chargesEnabled: boolean;
  accountId?: string;
}

// Query key factory for payment queries
const paymentKeys = {
  all: ['payment'] as const,
  status: (userId: string) => [...paymentKeys.all, 'status', userId] as const,
};

/**
 * ✅ Payment Status Hook - React Query Implementation
 * Replaces useState + useEffect pattern in PaymentSetupStatusCard
 */
export const usePaymentStatus = (userId: string) => {
  return useQuery({
    queryKey: paymentKeys.status(userId),
    queryFn: async (): Promise<PaymentStatus> => {
      console.log('[PaymentStatus] Fetching payment status for user:', userId);
      
      const { data, error } = await supabase.functions.invoke('check-stripe-account-status');
      
      if (error) {
        console.error('[PaymentStatus] Error checking payment status:', error);
        throw new Error(`Payment status check failed: ${error.message}`);
      }
      
      if (!data) {
        throw new Error('No payment status data returned');
      }

      const status: PaymentStatus = {
        hasStripeAccount: data.hasStripeAccount || false,
        accountSetupComplete: data.accountSetupComplete || false,
        chargesEnabled: data.charges_enabled || false,
        accountId: data.accountId,
      };

      console.log('[PaymentStatus] Retrieved status:', status);
      return status;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

/**
 * Helper to check if payment setup is complete
 */
export const useIsPaymentSetupComplete = (userId: string) => {
  const { data: paymentStatus } = usePaymentStatus(userId);
  
  return {
    isComplete: paymentStatus?.accountSetupComplete && paymentStatus?.chargesEnabled,
    hasAccount: paymentStatus?.hasStripeAccount,
    paymentStatus,
  };
};
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib//supabase';
import { useAuthStore } from '@/stores/auth';
import { useProviderVerificationStore } from '@/stores/verification/provider-verification';

/**
 * React Query mutation for sign out
 * 
 * Features:
 * - Handles sign out
 * - Clears auth store
 * - Clears verification store
 * - Clears React Query cache
 */
export const useSignOut = () => {
  const reset = useAuthStore((state) => state.reset);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      console.log('[useSignOut] 🚪 Signing out...');

      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error('[useSignOut] ❌ Error:', error);
        throw error;
      }

      console.log('[useSignOut] ✅ Signed out successfully');
    },
    onSuccess: () => {
      // Clear auth store
      reset();
      
      // ✅ NEW: Clear verification store
      useProviderVerificationStore.setState({ providerId: null });
      
      // Clear all React Query cache
      queryClient.clear();
      
      console.log('[useSignOut] 🧹 All stores and cache cleared');
    },
    onError: (error) => {
      console.error('[useSignOut] ❌ Mutation error:', error);
    }
  });
};

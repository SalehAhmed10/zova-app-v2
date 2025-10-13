import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/core/supabase';
import { useAuthStore } from '@/stores/auth';

/**
 * React Query mutation for sign out
 * 
 * Features:
 * - Handles sign out
 * - Clears auth store
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
      
      // Clear all React Query cache
      queryClient.clear();
      
      console.log('[useSignOut] 🧹 Cache cleared');
    },
  });
};

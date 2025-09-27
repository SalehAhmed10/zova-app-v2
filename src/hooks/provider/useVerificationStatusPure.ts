/**
 * ✅ PURE VERIFICATION STATUS HOOKS - Following copilot-rules.md STRICTLY
 * 
 * ARCHITECTURE:
 * - ZERO useEffect patterns - Pure React Query + Zustand ONLY
 * - Real-time subscriptions handled at app level, NOT in hooks
 * - Pure data fetching and state management
 * - NO side effects in hooks - pure data flow
 * 
 * ELIMINATES: All useEffect patterns from verification system
 */

import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useCallback } from 'react';
import { supabase } from '@/lib/core/supabase';
import { useVerificationStatusStore } from '@/stores/verification/useVerificationStatusStore';

type VerificationStatus = 'pending' | 'in_review' | 'approved' | 'rejected';

/**
 * ✅ PURE REACT QUERY: Verification status fetching
 * NO useEffect patterns - pure data fetching
 */
export const useVerificationStatusPure = (userId: string | undefined) => {
  return useQuery({
    queryKey: ['verification-status', userId],
    queryFn: async (): Promise<{ status: VerificationStatus }> => {
      if (!userId) throw new Error('User ID is required');

      console.log('[useVerificationStatusPure] Fetching from database for user:', userId);

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('verification_status')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('[useVerificationStatusPure] Database error:', error);
        throw error;
      }

      if (!profile?.verification_status) {
        console.warn('[useVerificationStatusPure] No verification status found');
        throw new Error('No verification status found');
      }

      const status = profile.verification_status as VerificationStatus;
      console.log('[useVerificationStatusPure] Fetched status:', status);

      // ✅ PURE: Sync with Zustand store (no side effects)
      useVerificationStatusStore.getState().setStatus(status);

      return { status };
    },
    enabled: !!userId,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error) => {
      console.log(`[useVerificationStatusPure] Retry ${failureCount}, error:`, error?.message);
      
      // Don't retry on auth errors
      if (error?.message?.includes('User ID is required') || 
          error?.message?.includes('No verification status found')) {
        return false;
      }
      return failureCount < 3;
    },
  });
};

/**
 * ✅ PURE ZUSTAND SELECTORS: Global state access
 * NO useEffect - pure state selection
 */
export const useVerificationStatusSelector = () => {
  return useVerificationStatusStore((state) => ({
    status: state.currentStatus,
    lastUpdated: state.lastUpdated,
    isSubscribed: state.isSubscribed,
  }));
};

/**
 * ✅ PURE REACT QUERY MUTATION: Status refresh
 * NO useEffect - pure mutation pattern
 */
export const useRefreshVerificationStatusPure = (userId: string | undefined) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error('User ID required for refresh');
      
      console.log('[useRefreshVerificationStatusPure] Refreshing status for:', userId);
      
      // Invalidate and refetch
      await queryClient.invalidateQueries({
        queryKey: ['verification-status', userId],
      });
      
      // Update store timestamp
      useVerificationStatusStore.getState().updateLastUpdated();
      
      return { success: true };
    },
    onSuccess: () => {
      console.log('[useRefreshVerificationStatusPure] Refresh completed successfully');
    },
    onError: (error) => {
      console.error('[useRefreshVerificationStatusPure] Refresh failed:', error);
    },
  });
};

/**
 * ✅ PURE CALLBACK PATTERN: Manual subscription setup
 * Used by app-level real-time subscription, NOT component level
 */
export const useVerificationStatusActions = () => {
  const queryClient = useQueryClient();

  const handleStatusChange = useCallback((userId: string, newStatus: VerificationStatus) => {
    console.log('[useVerificationStatusActions] Status changed:', newStatus);
    
    // ✅ PURE: Update both React Query and Zustand
    queryClient.setQueryData(
      ['verification-status', userId],
      { status: newStatus }
    );
    
    useVerificationStatusStore.getState().setStatus(newStatus);
  }, [queryClient]);

  const setupRealtimeSubscription = useCallback((userId: string) => {
    console.log('[useVerificationStatusActions] Setting up subscription for:', userId);
    
    return useVerificationStatusStore.getState().setupSubscription(
      userId,
      (newStatus) => handleStatusChange(userId, newStatus)
    );
  }, [handleStatusChange]);

  const cleanupSubscription = useCallback(() => {
    console.log('[useVerificationStatusActions] Cleaning up subscription');
    useVerificationStatusStore.getState().cleanup();
  }, []);

  return {
    handleStatusChange,
    setupRealtimeSubscription,
    cleanupSubscription,
  };
};
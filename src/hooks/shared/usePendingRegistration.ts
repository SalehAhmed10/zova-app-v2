/**
 * usePendingRegistration - Pending registration check with React Query
 * ✅ Follows copilot-rules.md - NO useEffect patterns
 * ✅ Pure React Query + Zustand architecture
 */

import { useQuery } from '@tanstack/react-query';
import { checkPendingRegistration, clearPendingRegistration, type PendingRegistration } from '@/lib/auth/pending-registration';

/**
 * Handles pending registration detection with React Query
 * ✅ No useEffect - pure React Query logic
 */
export const usePendingRegistration = () => {
  // ✅ React Query handles pending registration check
  const { 
    data: pendingRegistration, 
    isLoading, 
    error,
    refetch: recheckPending
  } = useQuery({
    queryKey: ['pending-registration'],
    queryFn: async (): Promise<PendingRegistration | null> => {
      console.log('[PendingRegistration] Auth layout checking for pending registration...');
      
      try {
        const pending = await checkPendingRegistration();
        
        if (pending) {
          console.log('[PendingRegistration] Found pending registration:', {
            email: pending.email,
            role: pending.role
          });
          return pending;
        }
        
        console.log('[PendingRegistration] No pending registration found - auth layout ready');
        return null;
      } catch (error) {
        console.error('[PendingRegistration] Error checking pending registration:', error);
        throw error;
      }
    },
    staleTime: 0, // Always check fresh
    gcTime: 1000 * 60 * 5, // Cache for 5 minutes
    retry: 2,
  });

  // ✅ Pure function for clearing pending registration
  const clearPending = async () => {
    console.log('[PendingRegistration] Clearing pending registration');
    await clearPendingRegistration();
    // Invalidate the query to refresh state
    recheckPending();
  };

  return {
    pendingRegistration,
    hasPendingRegistration: !!pendingRegistration,
    isCheckingPending: isLoading,
    pendingError: error,
    clearPending,
    recheckPending
  };
};
/**
 * ✅ VERIFICATION STATUS HOOKS - Following copilot-rules.md STRICTLY
 *
 * ARCHITECTURE:
 * - ZERO useEffect patterns - Pure React Query + Zustand ONLY
 * - Real-time subscriptions handled at app level, NOT in hooks
 * - Pure data fetching and state management
 * - NO side effects in hooks - pure data flow
 *
 * ELIMINATES: All useEffect patterns from verification system
 */

import React, { useCallback } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useVerificationStatusStore } from '@/stores/verification/useVerificationStatusStore';
import { useProfileStore } from '@/stores/verification/useProfileStore';
import { useAuthPure } from '@/hooks/shared/useAuthPure';
import { router } from 'expo-router';
import { VerificationFlowManager } from '@/lib/verification/verification-flow-manager';
import { useProviderVerificationStore } from '@/stores/verification/provider-verification';

type VerificationStatus = 'pending' | 'submitted' | 'in_review' | 'approved' | 'rejected';

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
        .from('provider_onboarding_progress')
        .select('verification_status')
        .eq('provider_id', userId)
        .maybeSingle(); // ✅ FIX: Use maybeSingle() instead of single() to handle new providers

      // ✅ NEW PROVIDER: If no row exists, return 'pending' as default
      if (error) {
        // Only throw on real database errors, not "no rows" errors
        if (error.code !== 'PGRST116') {
          console.error('[useVerificationStatusPure] Database error:', error);
          throw error;
        }
        console.log('[useVerificationStatusPure] No progress row found - new provider with pending status');
      }

      // Handle new provider (no row in database yet)
      if (!profile || !profile.verification_status) {
        console.log('[useVerificationStatusPure] New provider detected - returning pending status');
        const defaultStatus: VerificationStatus = 'pending';
        
        // ✅ SYNC: Update profile store with default status
        useProfileStore.getState().setProfile(userId, defaultStatus);
        
        return { status: defaultStatus };
      }

      const status = profile.verification_status as VerificationStatus;
      console.log('[useVerificationStatusPure] Fetched status:', status);

      // ✅ SYNC: Update profile store to keep navigation in sync
      useProfileStore.getState().setProfile(userId, status);

      return { status };
    },
    enabled: !!userId,
    staleTime: 0, // ✅ FIX: Always fetch fresh data to prevent banner cache issues
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnMount: 'always', // ✅ FIX: Always refetch on component mount
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
 * ✅ VERIFICATION STATUS SELECTOR - Pure store access
 * Provides typed access to verification status store state
 */
export const useVerificationStatusSelector = () => {
  const store = useVerificationStatusStore();

  return React.useMemo(() => ({
    status: store.currentStatus,
    lastUpdated: store.lastUpdated,
    isSubscribed: store.isSubscribed,
  }), [store.currentStatus, store.lastUpdated, store.isSubscribed]);
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

/**
 * ✅ PURE NAVIGATION HOOK - No useEffect in components
 * Handles auto-navigation based on verification status changes
 */
export const useVerificationNavigationPure = (currentStatus: VerificationStatus | undefined, isLoading: boolean) => {
  const { user } = useAuthPure();

  // ✅ PURE COMPUTATION: Determine if navigation should occur
  const shouldNavigateToProvider = React.useMemo(() => {
    return currentStatus === 'approved' && !isLoading && !!user;
  }, [currentStatus, isLoading, user]);

  // ✅ PURE COMPUTATION: Determine if auth redirect should occur
  const shouldRedirectToAuth = React.useMemo(() => {
    return !user;
  }, [user]);

  return {
    shouldNavigateToProvider,
    shouldRedirectToAuth,
  };
};

/**
 * ✅ VERIFICATION NAVIGATION HANDLER COMPONENT - Encapsulates navigation useEffect
 * Handles navigation side effects without cluttering main components
 */
export const VerificationNavigationHandler: React.FC<{
  shouldNavigateToProvider: boolean;
  shouldRedirectToAuth: boolean;
}> = ({ shouldNavigateToProvider, shouldRedirectToAuth }) => {
  // ✅ ENCAPSULATED useEffect: Navigation side effect isolated here
  React.useEffect(() => {
    if (shouldNavigateToProvider) {
      console.log('[VerificationNavigationHandler] Navigating to provider dashboard');
      router.replace('/(provider)');
    } else if (shouldRedirectToAuth) {
      console.log('[VerificationNavigationHandler] Redirecting to auth');
      router.replace('/(auth)');
    }
  }, [shouldNavigateToProvider, shouldRedirectToAuth]);

  // This component renders nothing - it only handles navigation
  return null;
};

/**
 * ✅ VERIFICATION STATE INITIALIZER - Pure initialization without useEffect
 * Initializes verification state based on existing data and flow requirements
 */
export const useVerificationStateInitializer = (userId: string | undefined) => {
  const { data: verificationData, isLoading } = useVerificationStatusPure(userId);
  const store = useProviderVerificationStore();

  // ✅ PURE COMPUTATION: Determine correct initial step
  const correctInitialStep = React.useMemo(() => {
    if (!store._hasHydrated || isLoading) return null;

    // Use VerificationFlowManager to find first incomplete step
    const firstIncompleteStep = VerificationFlowManager.findFirstIncompleteStep({
      bioData: store.bioData,
      businessData: store.businessData,
      categoryData: store.categoryData,
      documentData: store.documentData,
      portfolioData: store.portfolioData,
      selfieData: store.selfieData,
      servicesData: store.servicesData,
      termsData: store.termsData
      // ✅ REMOVED: paymentData (step 9 removed - now handled in dashboard)
    });

    return firstIncompleteStep;
  }, [store, isLoading]);

  // ✅ PURE COMPUTATION: Check if initialization is needed
  const needsInitialization = React.useMemo(() => {
    return correctInitialStep !== null &&
           store.currentStep !== correctInitialStep &&
           store._hasHydrated &&
           !isLoading;
  }, [correctInitialStep, store.currentStep, store._hasHydrated, isLoading]);

  return {
    correctInitialStep,
    needsInitialization,
    initialize: React.useCallback(() => {
      if (needsInitialization && correctInitialStep !== null) {
        console.log('[VerificationStateInitializer] Setting current step to:', correctInitialStep);
        store.setCurrentStep(correctInitialStep);
      }
    }, [needsInitialization, correctInitialStep, store])
  };
};

/**
 * ✅ VERIFICATION STATE INITIALIZER COMPONENT - Encapsulates initialization useEffect
 * Handles verification state initialization without cluttering main components
 */
export const VerificationStateInitializer: React.FC<{
  userId: string | undefined;
}> = ({ userId }) => {
  const { needsInitialization, initialize } = useVerificationStateInitializer(userId);

  // ✅ ENCAPSULATED useEffect: Initialization side effect isolated here
  React.useEffect(() => {
    if (needsInitialization) {
      initialize();
    }
  }, [needsInitialization, initialize]);

  // This component renders nothing - it only handles initialization
  return null;
};

// ❌ REMOVED: useVerificationStatus wrapper hook with 3 useEffect calls
// This was causing infinite loops due to unstable dependencies and circular updates
// Components should use useVerificationStatusPure + useVerificationStatusStore separately
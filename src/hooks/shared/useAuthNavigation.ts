/**
 * useAuthNavigation - Navigation logic with React Query
 * ✅ Follows copilot-rules.md - NO useEffect patterns
 * ✅ Pure React Query + Zustand architecture
 */

import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useCallback } from 'react';
import { useAppStore } from '@/stores/auth/app';
import { useProviderVerificationStore } from '@/stores/verification/provider-verification';
import { useProfileStore, useProfileHydration } from '@/stores/verification/useProfileStore';
import { supabase } from '@/lib/core/supabase';
import { VerificationFlowManager } from '@/lib/verification/verification-flow-manager';
import { useLoadVerificationData } from '@/hooks/provider/useProviderVerificationQueries';
import { useVerificationStatusPure } from '@/hooks/provider/useVerificationStatusPure';
import { useAuthOptimized } from '@/hooks';

interface NavigationDecision {
  destination: string;
  shouldNavigate: boolean;
  reason: string;
}

/**
 * useAuthStateNavigation - Handles ongoing authentication state changes
 * ✅ Pure React Query approach - no useEffect
 * ✅ Automatically navigates on auth state changes (login/logout)
 */
export const useAuthStateNavigation = () => {
  const { isAuthenticated, isLoggingOut, isOnboardingComplete } = useAppStore();

  // ✅ React Query monitors auth state and handles navigation automatically
  const { data: shouldNavigateToAuth } = useQuery({
    queryKey: ['auth-state-navigation', isAuthenticated, isLoggingOut, isOnboardingComplete],
    queryFn: async () => {
      // Only navigate to auth if:
      // 1. Not authenticated
      // 2. Not currently logging out
      // 3. Onboarding is complete (don't navigate to auth if onboarding needed)
      if (!isAuthenticated && !isLoggingOut && isOnboardingComplete) {
        console.log('[AuthStateNavigation] User not authenticated and onboarding complete, navigating to auth');
        router.replace('/auth');
        return true;
      }
      return false;
    },
    enabled: true,
    staleTime: 0, // Always check on state changes
    gcTime: 0,
  });

  return {
    shouldNavigateToAuth,
  };
};

/**
 * Determines navigation destination based on app state
 * ✅ No useEffect - pure React Query logic
 */
export const useAuthNavigation = () => {
  const appStore = useAppStore();
  const { isOnboardingComplete, isAuthenticated, userRole } = appStore;
  
  // ✅ Get current user from auth hook
  const { user } = useAuthOptimized();
  
  // ✅ Get verification data from Zustand store
  const {
    documentData,
    selfieData,
    businessData,
    categoryData,
    servicesData,
    portfolioData,
    bioData,
    termsData
  } = useProviderVerificationStore();

  // ✅ Get profile verification status from Zustand store
  const { verificationStatus } = useProfileStore();
  const isProfileHydrated = useProfileHydration();

  // ✅ LOAD VERIFICATION DATA: Load saved verification data from database when provider logs in
  const { data: loadedVerificationData } = useLoadVerificationData(
    isAuthenticated && userRole === 'provider' ? user?.id : undefined
  );

  // ✅ FETCH VERIFICATION STATUS: Ensure verification status is synced for providers
  const { data: verificationStatusData } = useVerificationStatusPure(
    isAuthenticated && userRole === 'provider' ? user?.id : undefined
  );

  // ✅ React Query handles the navigation decision logic with direct state dependency
  const { data: navigationDecision } = useQuery({
    queryKey: ['navigation-decision', isOnboardingComplete, isAuthenticated, userRole, verificationStatus, isProfileHydrated, documentData, selfieData, businessData, categoryData, servicesData, portfolioData, bioData, termsData],
    queryFn: async (): Promise<NavigationDecision> => {
      // Temporarily disabled verbose logging to reduce console noise during form input
      // console.log('[AuthNavigation] Computing navigation decision');
      // console.log('[AuthNavigation] Current state:', { isOnboardingComplete, isAuthenticated, userRole });

      // Not completed onboarding
      if (!isOnboardingComplete) {
        return {
          destination: '/onboarding',
          shouldNavigate: true,
          reason: 'onboarding-incomplete'
        };
      }

      // Not authenticated
      if (!isAuthenticated) {
        return {
          destination: '/auth',
          shouldNavigate: true,
          reason: 'unauthenticated'
        };
      }

      // Customer flow
      if (userRole === 'customer') {
        return {
          destination: '/customer',
          shouldNavigate: true,
          reason: 'customer-authenticated'
        };
      }

      // Provider flow - check verification
      if (userRole === 'provider') {
        console.log('[AuthNavigation] Provider flow - verificationStatus:', verificationStatus, 'isProfileHydrated:', isProfileHydrated);
        
        // ✅ RESET VERIFICATION STORE FOR NEW PROVIDERS ONLY
        // Only reset if no verification status AND no existing verification data in store
        // This prevents wiping out progress during the verification flow
        const hasAnyVerificationData = documentData?.documentUrl || selfieData?.selfieUrl || 
                                     businessData?.businessName || categoryData?.selectedCategoryId ||
                                     servicesData?.selectedServices?.length > 0 || 
                                     portfolioData?.images?.length > 0 || bioData?.businessDescription ||
                                     termsData?.termsAccepted;
        
        if (isProfileHydrated && !verificationStatus && !hasAnyVerificationData) {
          console.log('[AuthNavigation] New provider detected with no existing data - resetting verification store');
          const { resetVerification } = useProviderVerificationStore.getState();
          resetVerification();
        }
        
        // ✅ If profile is hydrated and has verification status, use it for navigation
        if (isProfileHydrated && verificationStatus) {
          if (verificationStatus === 'approved') {
            console.log('[AuthNavigation] Provider verification approved - granting dashboard access');
            return {
              destination: '/provider',
              shouldNavigate: true,
              reason: 'provider-approved'
            };
          } else if (verificationStatus === 'in_review' || verificationStatus === 'pending') {
            console.log('[AuthNavigation] Provider verification', verificationStatus, '- redirecting to status screen');
            return {
              destination: '/provider-verification/verification-status',
              shouldNavigate: true,
              reason: `provider-${verificationStatus}-waiting-approval`
            };
          } else if (verificationStatus === 'rejected') {
            console.log('[AuthNavigation] Provider verification rejected - redirecting to verification');
            // Redirect to first step for rejected providers
            return {
              destination: '/provider-verification',
              shouldNavigate: true,
              reason: 'provider-rejected'
            };
          }
        }
        
        // ✅ Fallback: If profile not hydrated or no verification status, check verification steps
        console.log('[AuthNavigation] Profile not hydrated or no verification status - checking verification steps');
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) {
            return {
              destination: '/auth',
              shouldNavigate: true,
              reason: 'no-user-session'
            };
          }

          const { data: profile } = await supabase
            .from('profiles')
            .select('verification_status')
            .eq('id', user.id)
            .single();

          if (profile?.verification_status === 'approved') {
            return {
              destination: '/provider',
              shouldNavigate: true,
              reason: 'provider-verified'
            };
          } else if (profile?.verification_status === 'in_review' || profile?.verification_status === 'pending') {
            return {
              destination: '/provider-verification/verification-status',
              shouldNavigate: true,
              reason: `provider-${profile.verification_status}-waiting-approval`
            };
          } else {
            // For rejected or any other status, go to verification steps
            // ✅ Use VerificationFlowManager to determine correct route based on actual data
            const verificationData = {
              documentData,
              selfieData,
              businessData,
              categoryData,
              servicesData,
              portfolioData,
              bioData,
              termsData
            };
            
            const firstIncompleteStep = VerificationFlowManager.findFirstIncompleteStep(verificationData);
            const destination = VerificationFlowManager.getRouteForStep(firstIncompleteStep as any);
            
            console.log(`[AuthNavigation] First incomplete step: ${firstIncompleteStep}, route: ${destination}`);
            
            return {
              destination,
              shouldNavigate: true,
              reason: `provider-verification-step-${firstIncompleteStep}`
            };
          }
        } catch (error) {
          console.error('[AuthNavigation] Error checking provider verification:', error);
          return {
            destination: '/provider-verification',
            shouldNavigate: true,
            reason: 'provider-verification-error-start-fresh'
          };
        }
      }

      // Fallback to auth
      return {
        destination: '/auth',
        shouldNavigate: true,
        reason: 'no-role-fallback'
      };
    },
    enabled: true,
    staleTime: 0, // Always fresh navigation decisions
    gcTime: 0, // Don't cache navigation decisions
  });

  // ✅ Navigation action - pure function, no useEffect
  const navigateToDestination = useCallback(() => {
    if (navigationDecision?.shouldNavigate) {
      console.log(`[AuthNavigation] → ${navigationDecision.destination} (${navigationDecision.reason})`);
      router.replace(navigationDecision.destination as any);
    }
  }, [navigationDecision]);

  return {
    navigationDecision,
    navigateToDestination,
    isReady: !!navigationDecision
  };
};
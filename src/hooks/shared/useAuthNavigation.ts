/**
 * useAuthNavigation - Navigation logic with React Query
 * ✅ Follows copilot-rules.md - NO useEffect patterns
 * ✅ Pure React Query + Zustand architecture
 */

import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useCallback } from 'react';
import { useAppStore } from '@/stores/auth/app';
import { supabase } from '@/lib/core/supabase';

interface NavigationDecision {
  destination: string;
  shouldNavigate: boolean;
  reason: string;
}

/**
 * Determines navigation destination based on app state
 * ✅ No useEffect - pure React Query logic
 */
export const useAuthNavigation = () => {
  const appStore = useAppStore();
  const { isOnboardingComplete, isAuthenticated, userRole } = appStore;

  // ✅ React Query handles the navigation decision logic with direct state dependency
  const { data: navigationDecision } = useQuery({
    queryKey: ['navigation-decision', isOnboardingComplete, isAuthenticated, userRole],
    queryFn: async (): Promise<NavigationDecision> => {
      console.log('[AuthNavigation] Computing navigation decision');
      console.log('[AuthNavigation] Current state:', { isOnboardingComplete, isAuthenticated, userRole });

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
          } else {
            return {
              destination: '/provider-verification/verification-status',
              shouldNavigate: true,
              reason: 'provider-needs-verification'
            };
          }
        } catch (error) {
          console.error('[AuthNavigation] Error checking provider verification:', error);
          return {
            destination: '/provider-verification/verification-status',
            shouldNavigate: true,
            reason: 'provider-verification-error'
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
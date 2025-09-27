// ✅ PURE Navigation Decision Hook - NO useEffect
// ✅ React Query + Zustand ONLY
// ✅ Centralized routing logic at app level

import { useMemo } from 'react';
import { useAppStore } from '@/stores/auth/app';
import { useAuthPure } from './useAuthPure';
import { useProfileStore } from '@/stores/verification/useProfileStore';
import { useProviderVerificationStore } from '@/stores/verification/provider-verification';

export interface NavigationDecision {
  shouldRedirect: boolean;
  targetRoute: string | null;
  reason: string;
}

/**
 * ✅ PURE Navigation Decision Hook
 * 
 * Centralized routing logic based on:
 * - Auth state (Zustand)
 * - Session data (React Query) 
 * - Verification status (Zustand)
 * 
 * NO useEffect - pure computation only
 */
export const useNavigationDecision = (): NavigationDecision => {
  const { isAuthenticated, userRole, isLoggingOut } = useAppStore();
  const { user, profile, isLoading } = useAuthPure();
  const { verificationStatus } = useProfileStore();

  console.log('[NavigationDecision] State check:', {
    isAuthenticated,
    userRole,
    user: !!user,
    profile: !!profile,
    isLoading
  });

  return useMemo(() => {
    // ✅ During logout - no redirects, let loading screen handle
    if (isLoggingOut) {
      return {
        shouldRedirect: false,
        targetRoute: null,
        reason: 'logout-in-progress'
      };
    }

    // ✅ Loading states - no redirects yet
    if (isLoading) {
      return {
        shouldRedirect: false,
        targetRoute: null,
        reason: 'loading'
      };
    }

    // ✅ No user session - redirect to auth
    // CRITICAL: Trust Zustand auth state over React Query session
    if (!isAuthenticated || !userRole) {
      return {
        shouldRedirect: true,
        targetRoute: '/auth',
        reason: 'not-authenticated'
      };
    }

    // ✅ Provider role but verification not approved
    if (userRole === 'provider' && verificationStatus !== 'approved') {
      return {
        shouldRedirect: true,
        targetRoute: '/provider-verification/verification-status',
        reason: 'provider-not-verified'
      };
    }

    // ✅ All checks passed - no redirect needed
    return {
      shouldRedirect: false,
      targetRoute: null,
      reason: 'access-granted'
    };
  }, [isAuthenticated, userRole, isLoggingOut, user, profile, isLoading, verificationStatus]);
};

/**
 * ✅ PURE Verification Navigation Hook - NO useEffect
 */
export const useVerificationNavigation = () => {
  const { currentStep, _isNavigating } = useProviderVerificationStore();
  
  return useMemo(() => {
    const routeMap = {
      1: '/provider-verification/',
      2: '/provider-verification/selfie',
      3: '/provider-verification/business-info',
      4: '/provider-verification/category',
      5: '/provider-verification/services',
      6: '/provider-verification/portfolio',
      7: '/provider-verification/bio',
      8: '/provider-verification/terms',
      9: '/provider-verification/payment',
    };

    const targetRoute = routeMap[currentStep as keyof typeof routeMap] || '/provider-verification/';
    
    return {
      targetRoute,
      shouldNavigate: _isNavigating, // Only when explicitly requested
      reason: `step-${currentStep}`
    };
  }, [currentStep, _isNavigating]);
};
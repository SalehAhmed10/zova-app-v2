import { useMemo } from 'react';
import { useAppStore } from '@/stores/auth/app';
import { useAuthPure } from './useAuthPure';
import { useProfileStore, useProfileHydration } from '@/stores/verification/useProfileStore';
import { useProviderVerificationStore } from '@/stores/verification/provider-verification';
import { useVerificationSessionRecovery } from '@/hooks/verification/useVerificationSessionRecovery';
import { VerificationFlowManager } from '@/lib/verification/verification-flow-manager';

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
 * - Session recovery (React Query)
 * - VerificationFlowManager (single source of truth)
 * 
 * NO useEffect - pure computation only
 */
export const useNavigationDecision = (): NavigationDecision => {
  const { isAuthenticated, userRole, isLoggingOut } = useAppStore();
  const { user, profile, isLoading } = useAuthPure();
  const { verificationStatus } = useProfileStore();
  const isProfileHydrated = useProfileHydration();
  const { shouldResumeVerification, hasIncompleteSession, isLoading: recoveryLoading } = useVerificationSessionRecovery();
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

  // Debug logging removed for production - was causing UI noise on every reload

  return useMemo(() => {
    /**
     * ✅ CENTRALIZED: Get verification route using flow manager
     * Uses actual data validation instead of completion flags
     */
    const getVerificationRoute = () => {
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
      const route = VerificationFlowManager.getRouteForStep(firstIncompleteStep as any);
      
      // Debug logging removed for production
      return route;
    };
    // ✅ During logout - no redirects, let loading screen handle
    if (isLoggingOut) {
      return {
        shouldRedirect: false,
        targetRoute: null,
        reason: 'logout-in-progress'
      };
    }

    // ✅ SMART OPTIMIZATION: If we already know verification status from store,
    // make immediate decisions without waiting for recovery loading
    if (userRole === 'provider' && isProfileHydrated && verificationStatus === 'approved') {
      // ✅ Only approved providers get dashboard access - skip all loading checks
      return {
        shouldRedirect: false,
        targetRoute: null,
        reason: 'access-granted'
      };
    }

    // ✅ Loading states - be smart about when to wait
    if (isLoading) {
      return {
        shouldRedirect: false,
        targetRoute: null,
        reason: 'loading'
      };
    }

    // ✅ Provider verification status checks
    if (userRole === 'provider') {
      if (verificationStatus === 'in_review' || verificationStatus === 'pending') {
        // ⏳ Pending/In review providers go to status screen
        return {
          shouldRedirect: true,
          targetRoute: '/provider-verification/verification-status',
          reason: `provider-${verificationStatus}-waiting-approval`
        };
      } else if (verificationStatus === 'rejected') {
        // ❌ Rejected providers go back to verification steps
        return {
          shouldRedirect: true,
          targetRoute: getVerificationRoute(),
          reason: 'provider-rejected'
        };
      } else if (!verificationStatus) {
        // User has no verification status - redirect to verification at first incomplete step
        return {
          shouldRedirect: true,
          targetRoute: getVerificationRoute(),
          reason: 'verification-needed-immediate-redirect'
        };
      }
    }

    // ✅ Only wait for recovery loading if we don't have enough info to decide
    if (recoveryLoading && !verificationStatus) {
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

    // ✅ FALLBACK: If we reach here for providers, handle edge cases
    if (userRole === 'provider') {
      // If verification status is unknown but recovery loading is done
      if (!recoveryLoading) {
        if (shouldResumeVerification && hasIncompleteSession) {
          return {
            shouldRedirect: true,
            targetRoute: getVerificationRoute(),
            reason: 'resume-incomplete-verification'
          };
        }
        
        // Default to starting fresh verification for providers
        return {
          shouldRedirect: true,
          targetRoute: getVerificationRoute(),
          reason: 'start-fresh-verification'
        };
      }
    }

    // ✅ All checks passed - no redirect needed
    return {
      shouldRedirect: false,
      targetRoute: null,
      reason: 'access-granted'
    };
  }, [isAuthenticated, userRole, isLoggingOut, user, profile, isLoading, verificationStatus, isProfileHydrated, shouldResumeVerification, hasIncompleteSession, recoveryLoading, documentData, selfieData, businessData, categoryData, servicesData, portfolioData, bioData, termsData]);
};
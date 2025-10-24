/**
 * ✅ LAYOUT GUARDS HOOK - Standardized guard pattern for layouts
 * 
 * Simplifies layout guard logic by providing a single hook
 * that handles all common guard scenarios
 */

import { useAuthStore } from '@/stores/auth';
import { useProfileHydration, useProfileStore } from '@/stores/verification/useProfileStore';
import { useProfile } from '@/hooks/shared/useProfileData';
import { useVerificationData } from '@/hooks/provider/useVerificationSingleSource';
import {
  checkAuthentication,
  checkRole,
  checkVerification,
  checkProfileCompletion,
  checkHydration,
  executeGuards,
  isRedirect,
  GuardResult,
} from '@/lib/routing/guards';

export interface UseLayoutGuardsOptions {
  requireAuth?: boolean;
  requireRole?: 'customer' | 'provider';
  requireVerification?: boolean;
  requireProfileCompletion?: boolean;
  requiredFields?: string[];
}

export interface UseLayoutGuardsResult {
  /**
   * Guard result - indicates what should happen next
   */
  guardResult: GuardResult;
  
  /**
   * Convenience flags
   */
  isLoading: boolean;
  isAllowed: boolean;
  isRedirecting: boolean;
  redirectHref?: string;
  
  /**
   * Raw state for advanced usage
   */
  state: {
    session: any;
    userRole: string | null;
    isHydrated: boolean;
    verificationStatus: string | undefined;
    profile: any;
  };
}

/**
 * ✅ Main layout guards hook
 * Use this in your _layout.tsx files instead of duplicate guard logic
 */
export function useLayoutGuards(options: UseLayoutGuardsOptions = {}): UseLayoutGuardsResult {
  const {
    requireAuth = true,
    requireRole,
    requireVerification = false,
    requireProfileCompletion = false,
    requiredFields = ['phone_number'],
  } = options;

  // Get all necessary state
  const session = useAuthStore((state) => state.session);
  const userRole = useAuthStore((state) => state.userRole);
  const isHydrated = useProfileHydration();
  const user = useAuthStore((state) => state.user);

  // Verification state (for providers)
  // ✅ CRITICAL: Always fetch fresh verification data from database
  // Do NOT use staleTime: Infinity - we need accurate status for routing decisions
  const cachedStatus = useProfileStore((state) => state.verificationStatus);
  const { data: verificationData, isLoading: verificationLoading } = useVerificationData(
    user?.id
    // Removed staleTime optimization - must have fresh data for routing/access control
  );
  const verificationStatus = verificationData?.progress?.verification_status || cachedStatus;
  const hasCache = cachedStatus === 'approved';

  // Profile state (for verification guard)
  const { data: profile, isLoading: profileLoading } = useProfile(
    requireProfileCompletion ? user?.id : undefined
  );

  // Execute guards in order
  const guards: GuardResult[] = [];

  // 1. Hydration (always check first)
  if (requireAuth || requireRole || requireVerification) {
    guards.push(checkHydration(isHydrated));
  }

  // 2. Authentication
  if (requireAuth) {
    guards.push(checkAuthentication(session));
  }

  // 3. Role check
  if (requireRole) {
    guards.push(checkRole(userRole, requireRole));
  }

  // 4. Verification (if provider)
  if (requireVerification) {
    guards.push(checkVerification(verificationStatus, verificationLoading, hasCache));
  }

  // 5. Profile completion
  if (requireProfileCompletion) {
    guards.push(checkProfileCompletion(profile, profileLoading, requiredFields));
  }

  // Execute all guards and get result
  const guardResult = executeGuards(...guards);

  return {
    guardResult,
    isLoading: guardResult.type === 'loading',
    isAllowed: guardResult.type === 'allow',
    isRedirecting: isRedirect(guardResult),
    redirectHref: isRedirect(guardResult) ? guardResult.href : undefined,
    state: {
      session,
      userRole,
      isHydrated,
      verificationStatus,
      profile,
    },
  };
}

/**
 * ✅ Convenience hook for provider layouts
 * Pre-configured for provider route guards
 * 
 * IMPORTANT: This includes verification check as a secondary safety net
 * If somehow an unverified provider reaches the provider dashboard,
 * this guard will redirect them back to verification
 */
export function useProviderLayoutGuards() {
  return useLayoutGuards({
    requireAuth: true,
    requireRole: 'provider',
    requireVerification: true, // ✅ Secondary verification check - safety net
  });
}

/**
 * ✅ Convenience hook for customer layouts
 * Pre-configured for customer route guards
 */
export function useCustomerLayoutGuards() {
  return useLayoutGuards({
    requireAuth: true,
    requireRole: 'customer',
  });
}

/**
 * ✅ Convenience hook for auth layouts
 * Pre-configured for auth route guards
 * 
 * Logic:
 * - If NOT authenticated: allow to see auth screens
 * - If authenticated as CUSTOMER: redirect to /(customer)
 * - If authenticated as PROVIDER (verified): redirect to /(provider)
 * - If authenticated as PROVIDER (NOT verified): redirect to /(provider-verification)
 */
export function useAuthLayoutGuards() {
  const session = useAuthStore((state) => state.session);
  const userRole = useAuthStore((state) => state.userRole);
  const isHydrated = useProfileHydration();
  const user = useAuthStore((state) => state.user);

  // ✅ For providers, check verification status to route correctly
  // CRITICAL: Always fetch fresh verification data - do NOT use staleTime: Infinity
  // We need accurate status from database, not stale cache from ProfileStore
  const cachedStatus = useProfileStore((state) => state.verificationStatus);
  const { data: verificationData, isLoading: verificationLoading } = useVerificationData(
    userRole === 'provider' && session ? user?.id : undefined
    // Removed staleTime optimization - must have fresh data for routing decisions
  );
  const verificationStatus = verificationData?.progress?.verification_status || cachedStatus;

  // If authenticated with a role, redirect to appropriate dashboard
  if (session && userRole) {
    // For customers, always go to customer dashboard
    if (userRole === 'customer') {
      return {
        guardResult: { type: 'redirect' as const, href: '/(customer)' },
        isLoading: false,
        isAllowed: false,
        isRedirecting: true,
        redirectHref: '/(customer)',
        state: { session, userRole, isHydrated, verificationStatus: undefined, profile: null },
      };
    }

    // For providers, check verification status
    if (userRole === 'provider') {
      // ✅ CRITICAL: Only use fresh verification data from React Query, NEVER stale cache for routing
      // If we don't have fresh data yet, wait for it instead of routing based on cache
      if (verificationLoading || !verificationData?.progress) {
        return {
          guardResult: { type: 'loading' as const },
          isLoading: true,
          isAllowed: false,
          isRedirecting: false,
          state: { session, userRole, isHydrated, verificationStatus, profile: null },
        };
      }

      // ✅ CRITICAL: Use ONLY fresh database data, not cache
      const freshVerificationStatus = verificationData.progress.verification_status;

      // ✅ If provider is NOT verified, route to verification flow
      if (freshVerificationStatus !== 'approved') {
        return {
          guardResult: { type: 'redirect' as const, href: '/(provider-verification)' },
          isLoading: false,
          isAllowed: false,
          isRedirecting: true,
          redirectHref: '/(provider-verification)',
          state: { session, userRole, isHydrated, verificationStatus: freshVerificationStatus, profile: null },
        };
      }

      // ✅ Provider is verified, go to provider dashboard
      return {
        guardResult: { type: 'redirect' as const, href: '/(provider)' },
        isLoading: false,
        isAllowed: false,
        isRedirecting: true,
        redirectHref: '/(provider)',
        state: { session, userRole, isHydrated, verificationStatus: freshVerificationStatus, profile: null },
      };
    }
  }

  // If session exists but role is still loading, show loading
  if (session && !userRole) {
    return {
      guardResult: { type: 'loading' as const },
      isLoading: true,
      isAllowed: false,
      isRedirecting: false,
      state: { session, userRole: null, isHydrated, verificationStatus: undefined, profile: null },
    };
  }

  // Not authenticated - allow to see auth screens
  return {
    guardResult: { type: 'allow' as const },
    isLoading: false,
    isAllowed: true,
    isRedirecting: false,
    state: { session: null, userRole: null, isHydrated, verificationStatus: undefined, profile: null },
  };
}

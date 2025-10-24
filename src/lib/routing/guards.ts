/**
 * ✅ CENTRALIZED ROUTE GUARDS - Reusable guard logic
 * 
 * Benefits:
 * - DRY: No duplication across layouts
 * - Testable: Each guard is a pure function
 * - Maintainable: Single source of truth
 * - Type-safe: Full TypeScript support
 */

/**
 * Guard result types
 */
export type GuardResult = 
  | { type: 'allow' }
  | { type: 'redirect'; href: string }
  | { type: 'loading' }
  | { type: 'error'; message: string };

/**
 * ✅ Authentication Guard
 * Ensures user is logged in
 */
export function checkAuthentication(session: any): GuardResult {
  if (!session) {
    return { type: 'redirect', href: '/(auth)' };
  }
  return { type: 'allow' };
}

/**
 * ✅ Role Guard
 * Ensures user has correct role
 */
export function checkRole(userRole: string | null, requiredRole: 'customer' | 'provider'): GuardResult {
  if (!userRole) {
    return { type: 'loading' };
  }

  if (userRole !== requiredRole) {
    const targetRoute = userRole === 'customer' ? '/(customer)' : '/(provider)';
    return { type: 'redirect', href: targetRoute };
  }

  return { type: 'allow' };
}

/**
 * ✅ Verification Guard
 * Ensures provider is verified (approved status)
 * Redirects pending/rejected providers to verification flow
 * 
 * CRITICAL: Always wait for fresh verification data to avoid flashing wrong UI
 * If approval status is cached as "approved", trust it and allow immediate access
 * Otherwise, wait for fresh data to ensure accurate routing
 */
export function checkVerification(
  verificationStatus: string | undefined,
  verificationLoading: boolean,
  hasCache: boolean
): GuardResult {
  // OPTIMIZATION: If we have cached "approved" status, trust it for instant access
  // This prevents the flash when user returns to app while already approved
  if (hasCache && verificationStatus === 'approved') {
    return { type: 'allow' };
  }

  // CRITICAL: If query is actively loading, show loading state
  // Don't rely on stale cache - we need fresh data to make routing decisions
  if (verificationLoading) {
    return { type: 'loading' };
  }

  // Once query is done loading, check the status
  // If approved, allow access
  if (verificationStatus === 'approved') {
    return { type: 'allow' };
  }

  // If pending or rejected, redirect to verification flow
  // Status can be: 'pending', 'rejected', 'approved', or undefined
  if (verificationStatus === 'pending' || verificationStatus === 'rejected' || verificationStatus === undefined) {
    return { type: 'redirect', href: '/(provider-verification)' };
  }

  // Fallback: redirect to verification if status is unknown
  return { type: 'redirect', href: '/(provider-verification)' };
}

/**
 * ✅ Profile Completion Guard
 * Ensures profile has required fields
 */
export function checkProfileCompletion(
  profile: any,
  isLoading: boolean,
  requiredFields: string[] = ['phone_number']
): GuardResult {
  if (isLoading) {
    return { type: 'loading' };
  }

  const hasAllFields = requiredFields.every(field => profile?.[field]);

  if (!hasAllFields) {
    return { type: 'redirect', href: '/(provider-verification)' };
  }

  return { type: 'allow' };
}

/**
 * ✅ Hydration Guard
 * Ensures stores are hydrated
 */
export function checkHydration(isHydrated: boolean): GuardResult {
  if (!isHydrated) {
    return { type: 'loading' };
  }
  return { type: 'allow' };
}

/**
 * ✅ Guard Chain Executor
 * Executes multiple guards in sequence
 * Stops at first non-allow result
 */
export function executeGuards(...guards: GuardResult[]): GuardResult {
  for (const guard of guards) {
    if (guard.type !== 'allow') {
      return guard;
    }
  }
  return { type: 'allow' };
}

/**
 * ✅ Guard Result Handler
 * Checks if guard result indicates a redirect
 */
export function isRedirect(result: GuardResult): result is { type: 'redirect'; href: string } {
  return result.type === 'redirect';
}

/**
 * ✅ Check if guard result indicates loading
 */
export function isLoading(result: GuardResult): result is { type: 'loading' } {
  return result.type === 'loading';
}

/**
 * ✅ Check if guard result is allowed
 */
export function isAllowed(result: GuardResult): result is { type: 'allow' } {
  return result.type === 'allow';
}

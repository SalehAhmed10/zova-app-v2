/**
 * ✅ VERIFICATION NAVIGATION HANDLER COMPONENT
 * 
 * PURPOSE: Encapsulates verification navigation side effects
 * PATTERN: Isolated useEffect for navigation logic
 * EXTRACTED FROM: useVerificationStatusPure.ts
 * 
 * RESPONSIBILITIES:
 * - Navigate to provider dashboard when verification completes
 * - Redirect to auth when user session expires
 * - Centralized location for navigation side effects
 * 
 * USAGE:
 * <VerificationNavigationHandler 
 *   shouldNavigateToProvider={isComplete}
 *   shouldRedirectToAuth={!isAuthenticated}
 * />
 */

import React, { useEffect } from 'react';
import { router } from 'expo-router';

export interface VerificationNavigationHandlerProps {
  shouldNavigateToProvider: boolean;
  shouldRedirectToAuth: boolean;
}

export const VerificationNavigationHandler: React.FC<VerificationNavigationHandlerProps> = ({
  shouldNavigateToProvider,
  shouldRedirectToAuth,
}) => {
  // ✅ ENCAPSULATED useEffect: Navigation side effect isolated here
  useEffect(() => {
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

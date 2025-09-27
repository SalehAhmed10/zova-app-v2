/**
 * ✅ APP-LEVEL AUTH MANAGER - Following copilot-rules.md STRICTLY
 * 
 * ARCHITECTURE:
 * - Handles auth state changes at app level, NOT in hooks
 * - Pure side effect management for auth listener
 * - Used in _layout.tsx to manage global auth state
 * - Eliminates ALL useEffect patterns from auth hooks
 * 
 * PURPOSE: Replace useEffect patterns in auth hooks with app-level management
 */

import { supabase } from '@/lib/core/supabase';
import { useAppStore } from '@/stores/auth/app';
import { useProviderVerificationStore } from '@/stores/verification/provider-verification';

// Global auth listener state
let globalAuthListener: { unsubscribe: () => void } | null = null;

/**
 * ✅ PURE AUTH LISTENER SETUP: App-level auth state management
 * Call this once in app _layout.tsx
 */
export const setupGlobalAuthListener = (
  refetchSession: () => void,
  onAuthStateChange?: (event: string, userId?: string) => void
) => {
  if (globalAuthListener) {
    console.log('[AppAuthManager] Auth listener already exists, skipping setup');
    return;
  }

  console.log('[AppAuthManager] Setting up global auth state listener');
  
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange(async (event, newSession) => {
    console.log('[AppAuthManager] Auth state changed:', event, newSession?.user?.id);
    
    // ✅ PURE: Only refetch React Query - no complex logic
    if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
      refetchSession();
    }

    // Handle auth state updates based on event
    if (event === 'SIGNED_OUT') {
      console.log('[AppAuthManager] User signed out, clearing auth state');
      useAppStore.getState().setAuthenticated(false);
      useProviderVerificationStore.getState().resetVerification();
    }

    // Optional callback for additional handling
    onAuthStateChange?.(event, newSession?.user?.id);
  });

  globalAuthListener = {
    unsubscribe: () => {
      console.log('[AppAuthManager] Cleaning up global auth listener');
      subscription.unsubscribe();
      globalAuthListener = null;
    }
  };
};

/**
 * ✅ CLEANUP AUTH LISTENER: Call on app cleanup
 */
export const cleanupGlobalAuthListener = () => {
  if (globalAuthListener) {
    globalAuthListener.unsubscribe();
  }
};

/**
 * ✅ AUTH STATE SYNCHRONIZER: Call when auth state needs updates
 * Use this instead of useEffect in auth hooks
 */
export const syncAuthState = (
  isAuthenticated: boolean,
  shouldUpdateAuth: boolean,
  shouldClearAuth: boolean,
  userRole?: 'customer' | 'provider'
) => {
  const { setAuthenticated } = useAppStore.getState();

  if (shouldUpdateAuth && userRole) {
    console.log('[AppAuthManager] Updating auth state:', { isAuthenticated: true, role: userRole });
    setAuthenticated(true, userRole);
  } else if (shouldClearAuth) {
    console.log('[AppAuthManager] Clearing auth state');
    setAuthenticated(false);
    useProviderVerificationStore.getState().resetVerification();
  }
};
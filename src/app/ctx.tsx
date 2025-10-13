/**
 * ⚠️ DEPRECATED: This file is kept for backward compatibility only
 * 
 * All new code should use:
 * - useAuthStore() from '@/stores/auth' for auth state
 * - useProfile() from '@/hooks/auth/useProfile' for profile data
 * - useSignIn() / useSignOut() from '@/hooks/auth' for mutations
 * 
 * This wrapper will be removed once all screens are migrated.
 */

import { useAuthStore } from '@/stores/auth';
import { useProfile } from '@/hooks/auth/useProfile';
import { useSignIn } from '@/hooks/auth/useSignIn';
import { useSignOut } from '@/hooks/auth/useSignOut';
import type { Session, User } from '@supabase/supabase-js';

interface SessionContextValue {
  // State
  isLoading: boolean;
  session: Session | null;
  user: User | null;
  userRole: 'customer' | 'provider' | null;
  isOnboardingComplete: boolean;
  isVerified: boolean;
  
  // Actions
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  completeOnboarding: () => void;
}

/**
 * ⚠️ DEPRECATED: Compatibility wrapper for useSession
 * 
 * Returns Zustand auth state in the old Context API format.
 * Use useAuthStore() directly in new code.
 */
export function useSession(): SessionContextValue {
  const session = useAuthStore((state) => state.session);
  const user = useAuthStore((state) => state.user);
  const userRole = useAuthStore((state) => state.userRole);
  const isOnboardingComplete = useAuthStore((state) => state.isOnboardingComplete);
  const completeOnboarding = useAuthStore((state) => state.completeOnboarding);
  const isInitialized = useAuthStore((state) => state.isInitialized);
  
  const { data: profile } = useProfile();
  const signInMutation = useSignIn();
  const signOutMutation = useSignOut();

  return {
    isLoading: !isInitialized,
    session,
    user,
    userRole,
    isOnboardingComplete,
    isVerified: false, // TODO: Get from verification store
    signIn: async (email: string, password: string) => {
      await signInMutation.mutateAsync({ email, password });
    },
    signOut: async () => {
      await signOutMutation.mutateAsync();
    },
    completeOnboarding,
  };
}

/**
 * ⚠️ DEPRECATED: SessionProvider no longer needed
 * 
 * Auth state is now managed by Zustand store (initialized in _layout.tsx).
 * This component exists only for backward compatibility.
 */
export function SessionProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

// ✅ Export a dummy default component to satisfy Expo Router
// This file is not meant to be a route, but Expo Router requires it
export default function CtxRoute() {
  return null;
}

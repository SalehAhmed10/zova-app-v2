import type { Session, User } from '@supabase/supabase-js';

export type UserRole = 'customer' | 'provider';
export type VerificationStatus = 'pending' | 'approved' | 'rejected';

export interface AuthState {
  // Session State
  session: Session | null;
  user: User | null;
  isInitialized: boolean;
  
  // App State (persisted)
  userRole: UserRole | null;
  isOnboardingComplete: boolean;
  
  // Actions
  setSession: (session: Session | null) => void;
  setUserRole: (role: UserRole | null) => void;
  completeOnboarding: () => void;
  initialize: () => Promise<void>;
  reset: () => void;
}

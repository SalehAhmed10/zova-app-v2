/**
 * ✅ PURE AUTH HOOK - Following copilot-rules.md STRICTLY
 * 
 * ARCHITECTURE:
 * - ZERO useEffect patterns - Pure React Query + Zustand ONLY
 * - Auth listener managed at app level, NOT in hook
 * - Pure data fetching and computed values
 * - NO side effects in hooks - pure data flow
 * 
 * ELIMINATES: All useEffect patterns from auth system
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/core/supabase';
import { useAppStore } from '@/stores/auth/app';
import { getUserProfile } from '@/lib/auth/profile';
import { useProviderVerificationStore } from '@/stores/verification/provider-verification';
import type { Session } from '@supabase/supabase-js';

// Query key factory for auth queries
const authKeys = {
  session: ['auth', 'session'] as const,
  profile: (userId: string) => ['auth', 'profile', userId] as const,
};

/**
 * ✅ PURE Auth Hook - NO useEffect patterns
 * 
 * ARCHITECTURE:
 * - React Query: session + profile data (server state)
 * - Zustand: isAuthenticated + userRole (global app state) 
 * - NO useEffect: Pure data flow only
 * - NO side effects: App-level auth listener handles auth changes
 */
export const useAuthPure = () => {
  const { 
    isAuthenticated, 
    userRole, 
    isLoggingOut,
    setAuthenticated
  } = useAppStore();
  
  const queryClient = useQueryClient();

  // ✅ PURE REACT QUERY: Session data (server state)
  const sessionQuery = useQuery({
    queryKey: authKeys.session,
    queryFn: async (): Promise<Session | null> => {
      console.log('[AuthPure] Fetching session...');
      
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        if (error.message.includes('Invalid Refresh Token') || 
            error.message.includes('Refresh Token Not Found')) {
          console.warn('[AuthPure] Invalid token, clearing session:', error.message);
          return null;
        }
        throw error;
      }
      
      return session;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  // ✅ PURE REACT QUERY: Profile data (server state)
  const profileQuery = useQuery({
    queryKey: sessionQuery.data?.user?.id 
      ? authKeys.profile(sessionQuery.data.user.id) 
      : ['auth', 'profile', 'none'],
    queryFn: async () => {
      if (!sessionQuery.data?.user?.id) return null;
      
      return await getUserProfile(sessionQuery.data.user.id);
    },
    enabled: !!sessionQuery.data?.user?.id && !!sessionQuery.data?.user?.email_confirmed_at,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  // ✅ PURE COMPUTED VALUES: Auth state derived from React Query + Zustand
  const authState = useMemo(() => {
    const user = sessionQuery.data?.user;
    const profile = profileQuery.data;
    
    // Skip updates during logout
    if (isLoggingOut) {
      console.log('[AuthPure] Skipping auth updates - logout in progress');
      return {
        isFullyAuthenticated: false,
        needsAuth: false,
        shouldClearAuth: false
      };
    }
    
    const hasValidSession = user && user.email_confirmed_at;
    const hasProfile = !!profile;
    
    return {
      isFullyAuthenticated: hasValidSession && hasProfile,
      needsAuth: hasValidSession && hasProfile && !isAuthenticated,
      shouldClearAuth: !hasValidSession && isAuthenticated,
      user,
      profile
    };
  }, [sessionQuery.data?.user, profileQuery.data, isAuthenticated, isLoggingOut]);

  // ✅ PURE AUTH ACTIONS: Simple Supabase calls with query invalidation
  const signIn = async (email: string, password: string) => {
    try {
      console.log('[AuthPure] Signing in user:', email);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Check email verification
      if (data.user && !data.user.email_confirmed_at) {
        return {
          success: false,
          error: 'Please verify your email before signing in.',
          requiresVerification: true,
          email: data.user.email
        };
      }

      // ✅ INVALIDATE QUERIES: Let React Query refetch fresh data
      if (data.user && data.session) {
        console.log('[AuthPure] Login successful, invalidating queries...');
        
        // Invalidate auth queries to refetch fresh data
        queryClient.invalidateQueries({ queryKey: authKeys.session });
        if (data.user.id) {
          queryClient.invalidateQueries({ queryKey: authKeys.profile(data.user.id) });
        }
        
        // Note: Auth listener will handle state updates
        console.log('[AuthPure] Queries invalidated, auth listener will handle state updates');
      }

      return { success: true };
    } catch (error: any) {
      console.error('[AuthPure] Sign in error:', error);
      return { success: false, error: error.message };
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      console.log('[AuthPure] Signing up user:', email);
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;

      return { 
        success: true, 
        needsVerification: !data.user?.email_confirmed_at,
        email: data.user?.email 
      };
    } catch (error: any) {
      console.error('[AuthPure] Sign up error:', error);
      return { success: false, error: error.message };
    }
  };

  const signOut = async () => {
    try {
      console.log('[AuthPure] Signing out user');
      
      // ✅ PURE: Clear auth queries immediately
      queryClient.invalidateQueries({ queryKey: authKeys.session });
      queryClient.removeQueries({ queryKey: ['auth'] });
      
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      return { success: true };
    } catch (error: any) {
      console.error('[AuthPure] Sign out error:', error);
      return { success: false, error: error.message };
    }
  };

  // ✅ PURE PENDING REGISTRATION: AsyncStorage helpers
  const checkPendingRegistration = async () => {
    try {
      const pendingData = await AsyncStorage.getItem('pending_registration');
      if (pendingData) {
        const pending = JSON.parse(pendingData);
        
        const age = Date.now() - pending.timestamp;
        const maxAge = 24 * 60 * 60 * 1000;
        
        if (age < maxAge) {
          console.log('[AuthPure] Found valid pending registration:', pending);
          return pending;
        } else {
          console.log('[AuthPure] Pending registration expired, clearing');
          await AsyncStorage.removeItem('pending_registration');
        }
      }
    } catch (error) {
      console.error('[AuthPure] Error checking pending registration:', error);
    }
    return null;
  };

  const clearPendingRegistration = async () => {
    try {
      await AsyncStorage.removeItem('pending_registration');
      console.log('[AuthPure] Cleared pending registration');
    } catch (error) {
      console.error('[AuthPure] Error clearing pending registration:', error);
    }
  };

  // ✅ PURE RETURN: React Query data + Zustand state + computed values
  return {
    // React Query server state
    user: authState.user ?? null,
    session: sessionQuery.data,
    profile: authState.profile,
    
    // Loading states
    isLoading: sessionQuery.isLoading || (sessionQuery.data?.user && profileQuery.isLoading),
    sessionLoading: sessionQuery.isLoading,
    profileLoading: profileQuery.isLoading,
    
    // Error states
    error: sessionQuery.error || profileQuery.error,
    sessionError: sessionQuery.error,
    profileError: profileQuery.error,
    
    // Zustand global state
    isAuthenticated,
    userRole,
    
    // Computed auth states  
    isFullyAuthenticated: authState.isFullyAuthenticated,
    needsAuth: authState.needsAuth,
    shouldClearAuth: authState.shouldClearAuth,
    
    // Actions
    signIn,
    signUp,
    signOut,
    refetchSession: sessionQuery.refetch,
    checkPendingRegistration,
    clearPendingRegistration,
    
    // Computed states
    hasProfile: !!authState.profile,
    emailVerified: !!sessionQuery.data?.user?.email_confirmed_at,
    
    // Auth state management (for app-level auth handler)
    setAuthenticated,
    clearAuthState: () => {
      setAuthenticated(false);
      useProviderVerificationStore.getState().resetVerification();
    },
    updateAuthState: (role: 'customer' | 'provider') => {
      setAuthenticated(true, role);
    },
  };
};
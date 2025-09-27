/**
 * ✅ AUTH LISTENER HOOK - System Integration Pattern
 * 
 * This hook encapsulates the Supabase auth listener using useEffect
 * since it's a legitimate system integration requirement.
 * This follows the pattern established in useDeepLinkHandler.
 */
import { useEffect } from 'react';
import { supabase } from '@/lib/core/supabase';
import { useAppStore } from '@/stores/auth/app';
import { getUserProfile } from '@/lib/auth/profile';

/**
 * Auth listener hook that monitors Supabase auth state changes
 * and updates the app store accordingly.
 */
export function useAuthListener() {
  const { setAuthenticated } = useAppStore();

  useEffect(() => {
    console.log('[AuthListener] Setting up Supabase auth listener...');

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[AuthListener] Auth state changed:', event, !!session);

        if (event === 'SIGNED_IN' && session?.user) {
          console.log('[AuthListener] User signed in, fetching profile...');
          
          try {
            const profile = await getUserProfile(session.user.id);
            if (profile) {
              console.log('[AuthListener] Profile loaded, setting authenticated with role:', profile.role);
              setAuthenticated(true, profile.role as 'customer' | 'provider');
            } else {
              console.error('[AuthListener] No profile found for user');
              setAuthenticated(false);
            }
          } catch (error) {
            console.error('[AuthListener] Error fetching profile:', error);
            setAuthenticated(false);
          }
        } else if (event === 'SIGNED_OUT') {
          console.log('[AuthListener] User signed out');
          setAuthenticated(false);
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          console.log('[AuthListener] Token refreshed, maintaining session');
          // Keep the current auth state, just log the refresh
        }
      }
    );

    return () => {
      console.log('[AuthListener] Cleaning up auth listener');
      subscription.unsubscribe();
    };
  }, [setAuthenticated]);
}
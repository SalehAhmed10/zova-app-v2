/**
 * ✅ AUTH LISTENER HOOK - System Integration Pattern
 * 
 * This hook encapsulates the Supabase auth listener using useEffect
 * since it's a legitimate system integration requirement.
 * This follows the pattern established in useDeepLinkHandler.
 */
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/stores/auth/app';
import { getUserProfile } from '@/lib/auth/profile';
import { useProfileStore } from '@/stores/verification/useProfileStore';
import { useProviderVerificationStore } from '@/stores/verification/provider-verification';

/**
 * Auth listener hook that monitors Supabase auth state changes
 * and updates the app store accordingly.
 */
export function useAuthListener() {
  const { setAuthenticated } = useAppStore();
  const { clear: clearProfile } = useProfileStore();

  useEffect(() => {
    console.log('[AuthListener] Setting up Supabase auth listener...');

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[AuthListener] Auth state changed:', event, !!session);

        // Handle both SIGNED_IN and INITIAL_SESSION events
        if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user) {
          console.log('[AuthListener] User session detected, waiting for session to be established...');
          
          // Wait a bit for the session to be fully established in Supabase client
          setTimeout(async () => {
            try {
              console.log('[AuthListener] Fetching profile for user:', session.user.id);
              const profile = await getUserProfile(session.user.id);
              if (profile) {
                // ✅ DEFENSIVE CHECK: Verify role consistency for providers
                // If profile says 'customer' but user has provider_onboarding_progress, fix it
                if (profile.role === 'customer') {
                  const { data: providerProgress } = await supabase
                    .from('provider_onboarding_progress')
                    .select('provider_id')
                    .eq('provider_id', session.user.id)
                    .maybeSingle();
                  
                  if (providerProgress) {
                    console.warn('[AuthListener] 🔴 Role mismatch detected! User has provider_onboarding_progress but role=customer');
                    console.log('[AuthListener] 🔧 Fixing role to provider in database...');
                    
                    // Fix the role in database
                    const { error: updateError } = await supabase
                      .from('profiles')
                      .update({ role: 'provider' })
                      .eq('id', session.user.id);
                    
                    if (!updateError) {
                      console.log('[AuthListener] ✅ Role fixed to provider');
                      setAuthenticated(true, 'provider');
                      return; // Exit early with correct role
                    } else {
                      console.error('[AuthListener] ❌ Failed to fix role:', updateError);
                    }
                  }
                }
                
                console.log('[AuthListener] Profile loaded, setting authenticated with role:', profile.role);
                setAuthenticated(true, profile.role as 'customer' | 'provider');
              } else {
                console.error('[AuthListener] No profile found for user:', session.user.id);
                // Try to create profile if it doesn't exist
                console.log('[AuthListener] Attempting to create profile for existing user...');
                const { createOrUpdateUserProfile } = await import('@/lib/auth/profile');
                const newProfile = await createOrUpdateUserProfile(
                  session.user.id, 
                  session.user.email!, 
                  'customer' // Default role
                );
                if (newProfile) {
                  console.log('[AuthListener] Profile created, setting authenticated with role:', newProfile.role);
                  setAuthenticated(true, newProfile.role as 'customer' | 'provider');
                } else {
                  console.error('[AuthListener] Failed to create profile');
                  setAuthenticated(false);
                }
              }
            } catch (error) {
              console.error('[AuthListener] Error fetching profile:', error);
              setAuthenticated(false);
            }
          }, 500); // Wait 500ms for session to be established
        } else if (event === 'SIGNED_OUT') {
          console.log('[AuthListener] User signed out');
          setAuthenticated(false);
          clearProfile(); // Clear profile store on sign out
          
          // Also clear verification store to prevent data persistence between users
          const { resetVerification } = useProviderVerificationStore.getState();
          resetVerification();
          console.log('[AuthListener] Verification store reset on sign out');
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
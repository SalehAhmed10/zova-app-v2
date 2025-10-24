import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib//supabase';
import type { AuthState } from './types';
import type { Session, AuthChangeEvent } from '@supabase/supabase-js';
import * as React from 'react';

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial State
      session: null,
      user: null,
      isInitialized: false,
      userRole: null,
      isOnboardingComplete: false,

      // Actions
      setSession: (session) => {
        console.log('[AuthStore] 📝 Setting session:', !!session);
        set({ 
          session, 
          user: session?.user ?? null 
        });
      },

      setUserRole: (role) => {
        console.log('[AuthStore] 👤 Setting role:', role);
        set({ userRole: role });
      },

      completeOnboarding: () => {
        console.log('[AuthStore] 🎉 Marking onboarding as completed');
        set({ isOnboardingComplete: true });
      },

      initialize: async () => {
        console.log('[AuthStore] 🚀 Initializing...');
        
        try {
          // Get current session
          const { data: { session } } = await supabase.auth.getSession();
          set({ 
            session, 
            user: session?.user ?? null,
            isInitialized: true 
          });

          // If we have a session, fetch the user's role from profiles table
          if (session?.user?.id) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('role')
              .eq('id', session.user.id)
              .single();
            
            if (profile?.role) {
              set({ userRole: profile.role as any });
              console.log('[AuthStore] 📝 Set role from existing session:', profile.role);
            }
          }

          // Set up auth listener
          supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
            console.log('[AuthStore] 🔔 Auth event:', event);
            set({ 
              session, 
              user: session?.user ?? null 
            });
            
            // When user signs in, fetch their role from database
            if (event === 'SIGNED_IN' && session?.user?.id) {
              (async () => {
                const { data: profile } = await supabase
                  .from('profiles')
                  .select('role')
                  .eq('id', session.user.id)
                  .single();
                
                if (profile?.role) {
                  set({ userRole: profile.role as any });
                  console.log('[AuthStore] 📝 Set role on signin:', profile.role);
                }
              })();
            }
            
            // Clear role on logout
            if (!session) {
              set({ userRole: null });
            }
          });

          console.log('[AuthStore] ✅ Initialized');
        } catch (error) {
          console.error('[AuthStore] ❌ Init error:', error);
          set({ isInitialized: true }); // Mark as initialized even on error
        }
      },

      reset: () => {
        console.log('[AuthStore] 🔄 Resetting...');
        set({
          session: null,
          user: null,
          userRole: null,
          // Keep onboarding state and isInitialized
        });
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist these fields
      partialize: (state) => ({
        userRole: state.userRole,
        isOnboardingComplete: state.isOnboardingComplete,
      }),
    }
  )
);

/**
 * Hook to check if auth store has hydrated from AsyncStorage
 */
export const useAuthHydration = () => {
  const [hydrated, setHydrated] = React.useState(false);
  
  React.useEffect(() => {
    const unsubscribe = useAuthStore.persist.onFinishHydration(() => {
      console.log('[AuthStore] 💧 Hydration complete');
      setHydrated(true);
    });
    
    // Check if already hydrated
    if (useAuthStore.persist.hasHydrated()) {
      setHydrated(true);
    }
    
    return unsubscribe;
  }, []);
  
  return hydrated;
};

// Export types
export type { AuthState, UserRole, VerificationStatus } from './types';

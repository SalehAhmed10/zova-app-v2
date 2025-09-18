import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/stores/app';
import { getUserProfile } from '@/lib/profile';
import type { User } from '@supabase/supabase-js';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { setAuthenticated, setLoading: setAppLoading } = useAppStore();

  useEffect(() => {
    // Get initial session - but don't set app loading state, let app store handle that
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          if (error.message.includes('Invalid Refresh Token') || 
              error.message.includes('Refresh Token Not Found')) {
            console.warn('[Auth] Invalid token on session check, clearing session:', error.message);
            setUser(null);
          } else {
            console.error('[Auth] Session check error:', error);
          }
        } else {
          setUser(session?.user ?? null);
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error getting session:', error);
        setUser(null);
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[Auth] Auth state changed:', event, session?.user ? 'user present' : 'no user');
      
      setUser(session?.user ?? null);
      
      // Handle sign in events - fetch user profile and set role
      if (event === 'SIGNED_IN' && session?.user) {
        console.log('[Auth] User signed in, fetching profile...');
        const profile = await getUserProfile(session.user.id);
        
        if (profile) {
          console.log('[Auth] Profile found, role:', profile.role);
          setAuthenticated(true, profile.role as 'customer' | 'provider');
        } else {
          console.warn('[Auth] No profile found for user, user needs to complete registration');
          // User exists in auth but no profile - they need to complete registration
          setAuthenticated(false);
        }
      } else if (event === 'SIGNED_OUT') {
        console.log('[Auth] User signed out');
        setAuthenticated(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [setAuthenticated]);

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });
      
      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      
      // Clear Supabase session - don't throw on refresh token errors
      const { error } = await supabase.auth.signOut();
      
      // Log but don't fail on common token errors
      if (error) {
        if (error.message.includes('Invalid Refresh Token') || 
            error.message.includes('Refresh Token Not Found')) {
          console.warn('[Auth] Token already invalid or expired:', error.message);
        } else {
          console.error('[Auth] Sign out error:', error);
        }
      }
      
      // Clear local user state regardless of Supabase response
      setUser(null);
      setAuthenticated(false);
      
      return { success: true };
    } catch (error: any) {
      console.error('[Auth] Unexpected sign out error:', error);
      // Still clear local state even if Supabase call fails
      setUser(null);
      setAuthenticated(false);
      return { success: true }; // Return success to prevent UI issues
    } finally {
      setLoading(false);
    }
  };

  return {
    user,
    loading,
    signIn,
    signUp,
    signOut,
  };
};
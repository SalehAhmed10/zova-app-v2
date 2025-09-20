import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/stores/app';
import { getUserProfile, createOrUpdateUserProfile } from '@/lib/profile';
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
      setUser(session?.user ?? null);

      // Handle sign in events - fetch user profile and set role
      if (event === 'SIGNED_IN' && session?.user) {
        console.log('[Auth] User signed in:', session.user.id);
        
        // Check if email is verified
        if (!session.user.email_confirmed_at) {
          console.log('[Auth] User signed in but email not verified');
          setAuthenticated(false);
          return;
        }

        console.log('[Auth] Email verified, fetching user profile');
        const profile = await getUserProfile(session.user.id);

        if (profile) {
          console.log('[Auth] Profile found, setting authenticated state');
          console.log('[Auth] Profile data:', { id: profile.id, email: profile.email, role: profile.role });
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
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Check if email is verified
      if (data.user && !data.user.email_confirmed_at) {
        return {
          success: false,
          error: 'Please verify your email before signing in.',
          requiresVerification: true,
          email: data.user.email
        };
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      console.log('[Auth] Starting signup process for:', email);
      setLoading(true);
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });
      
      if (error) {
        console.error('[Auth] Signup error:', error);
        throw error;
      }

      console.log('[Auth] Signup successful, OTP sent to:', email);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = async (email: string, token: string, role?: 'customer' | 'provider') => {
    try {
      console.log('[Auth] Starting OTP verification');
      console.log('[Auth] Verification params:', { email, role, token: token.replace(/./g, '*') });
      
      setLoading(true);
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'email',
      });

      if (error) {
        console.error('[Auth] OTP verification failed:', error.message);
        throw error;
      }

      // If verification succeeds and we have a role, create or update the user profile
      if (data.user && role) {
        console.log('[Auth] Creating user profile with role:', role);
        const profile = await createOrUpdateUserProfile(data.user.id, data.user.email!, role);
        
        if (profile) {
          console.log('[Auth] User profile created/updated successfully:', {
            id: profile.id,
            email: profile.email,
            role: profile.role
          });
          // Set the authenticated state with the correct role
          console.log('[Auth] Setting authenticated state with role:', role);
          setAuthenticated(true, role);
        } else {
          console.error('[Auth] Failed to create/update user profile');
        }
      } else if (!role) {
        console.warn('[Auth] No role provided, skipping profile creation');
      }

      console.log('[Auth] OTP verification process completed successfully');
      return { success: true };
    } catch (error: any) {
      console.error('[Auth] OTP verification failed:', error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const resendOTP = async (email: string) => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
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
    verifyOTP,
    resendOTP,
    signOut,
  };
};
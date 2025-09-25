import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/stores/app';
import { getUserProfile, createOrUpdateUserProfile } from '@/lib/profile';
import { useProviderVerificationStore } from '@/stores/provider-verification';
import type { User } from '@supabase/supabase-js';

// In-memory flag to prevent duplicate profile fetching during the same session
let profileHandled = false;

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { setAuthenticated, setLoading: setAppLoading } = useAppStore();
  const { resetVerification } = useProviderVerificationStore();

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
        console.log('🔑 [Auth] JWT Token (first 50 chars):', session.access_token.substring(0, 50) + '...');
        console.log('🔑 [Auth] Full JWT Token:', session.access_token);
        console.log('📅 [Auth] Token expires at:', new Date(session.expires_at * 1000));
        
        // Check if email is verified
        if (!session.user.email_confirmed_at) {
          console.log('[Auth] User signed in but email not verified');
          setAuthenticated(false);
          return;
        }

        // Check if we've already handled the profile for this session (e.g., from OTP verification)
        if (profileHandled) {
          console.log('[Auth] Profile already handled for this session, skipping fetch');
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
        // Clear the profile handled flag
        profileHandled = false;
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

  const checkNetworkConnectivity = async (): Promise<boolean> => {
    try {
      // Simple connectivity check by trying to reach Supabase
      const { error } = await supabase.from('profiles').select('count').limit(1).single();
      return !error || error.code !== 'PGRST301'; // PGRST301 is network error
    } catch (err) {
      console.warn('[Auth] Network connectivity check failed:', err);
      return false;
    }
  };

  const checkExistingSupabaseUser = async (email: string): Promise<boolean> => {
    try {
      const normalizedEmail = email.toLowerCase().trim();
      console.log('[Auth] Checking for existing Supabase user:', normalizedEmail);

      // Use admin API to check if user exists (requires service role key)
      // For now, we'll skip this check since we can't access admin APIs from client
      // The signup will fail naturally if user exists
      console.log('[Auth] Skipping Supabase Auth user check (not reliable from client)');
      return false;

    } catch (err) {
      console.error('[Auth] Error checking existing user:', err);
      return false; // Assume user doesn't exist if check fails
    }
  };

  const signUp = async (email: string, password: string, role?: 'customer' | 'provider') => {
    try {
      console.log('[Auth] Starting signup process for:', email);
      setLoading(true);

      // Check network connectivity first
      const isOnline = await checkNetworkConnectivity();
      if (!isOnline) {
        return {
          success: false,
          error: 'No internet connection. Please check your network and try again.',
          offline: true
        };
      }

      // Normalize email to lowercase for consistent handling
      const normalizedEmail = email.toLowerCase().trim();
      console.log('[Auth] Normalized email:', normalizedEmail);

      // First, check if a user profile already exists with this email
      console.log('[Auth] Checking for existing profile...');
      let existingProfile = null;
      let profileCheckError = null;

      try {
        // Use maybeSingle() instead of single() to handle 0 or 1 results properly
        const result = await Promise.race([
          supabase
            .from('profiles')
            .select('id, email, role, created_at')
            .eq('email', normalizedEmail)
            .maybeSingle(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Profile check timeout')), 10000)
          )
        ]) as any;

        existingProfile = result.data;
        profileCheckError = result.error;
      } catch (error) {
        console.error('[Auth] Profile check failed or timed out:', error);
        profileCheckError = { message: 'Network error or timeout checking profile' };
      }

      // Debug: Also try a simple query to understand what's happening
      if (!existingProfile && !profileCheckError) {
        try {
          console.log('[Auth] Debug: Trying alternative profile query...');
          const debugResult = await supabase
            .from('profiles')
            .select('id, email, role, created_at')
            .eq('email', normalizedEmail)
            .limit(1);

          if (debugResult.data && debugResult.data.length > 0) {
            console.log('[Auth] Debug: Alternative query found profile:', debugResult.data[0]);
            existingProfile = debugResult.data[0];
          } else {
            console.log('[Auth] Debug: Alternative query also found no profile');
          }
        } catch (debugError) {
          console.error('[Auth] Debug query failed:', debugError);
        }
      }

      console.log('[Auth] Profile check result:', {
        existingProfile: existingProfile ? {
          id: existingProfile.id,
          email: existingProfile.email,
          role: existingProfile.role,
          created_at: existingProfile.created_at
        } : null,
        profileCheckError
      });

      // Handle different error scenarios
      if (profileCheckError) {
        // PGRST116 is "not found" error from maybeSingle() when no rows exist - this is OK
        if (profileCheckError.code === 'PGRST116') {
          console.log('[Auth] No existing profile found (PGRST116)');
        } else if (profileCheckError.message?.includes('timeout')) {
          console.warn('[Auth] Profile check timed out, proceeding with signup anyway');
          // Continue with signup even if we can't check for existing profiles
        } else {
          // Other errors are problematic
          console.error('[Auth] Unexpected error checking for existing profile:', profileCheckError);
          return { success: false, error: 'Unable to verify account status. Please try again.' };
        }
      }

      if (existingProfile) {
        console.log('[Auth] User profile already exists for email:', normalizedEmail, 'Role:', existingProfile.role);

        // Check if user is trying to switch roles
        if (role && existingProfile.role !== role) {
          console.log('[Auth] User exists with different role. Offering role switch from', existingProfile.role, 'to', role);

          // For role switching, we need to update the profile role
          // But first, check if they have verified their email
          const { data: authUser } = await supabase.auth.getUser();
          const isEmailVerified = authUser.user?.email_confirmed_at != null;

          if (isEmailVerified) {
            // Allow role switching for verified users
            console.log('[Auth] Email verified, allowing role switch');
            return {
              success: false,
              error: `An account with this email already exists as a ${existingProfile.role}. Would you like to switch to ${role} role instead?`,
              userExists: true,
              roleSwitch: {
                currentRole: existingProfile.role,
                requestedRole: role,
                profileId: existingProfile.id
              }
            };
          } else {
            // User exists but email not verified - they need to complete verification first
            console.log('[Auth] User exists but email not verified');
            return {
              success: false,
              error: 'An account with this email already exists but is not verified. Please check your email for verification or try logging in.',
              userExists: true,
              requiresVerification: true
            };
          }
        } else {
          // Same role - block duplicate registration
          console.log('[Auth] User profile already exists with same role, blocking registration');
          return {
            success: false,
            error: 'An account with this email already exists. Please try logging in instead.',
            userExists: true
          };
        }
      }      // Also check if user exists in Supabase Auth (even if no profile exists)
      console.log('[Auth] Checking for existing Supabase Auth user...');
      // Skip this check as it's unreliable from client side
      console.log('[Auth] Skipping Supabase Auth user check (unreliable from client)');

      console.log('[Auth] No existing profile or auth user found, proceeding with Supabase signup...');
      // If no existing profile, proceed with Supabase signup
      let data = null;
      let error = null;

      try {
        const result = await Promise.race([
          supabase.auth.signUp({
            email: normalizedEmail,
            password,
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Signup timeout')), 15000)
          )
        ]) as any;

        data = result.data;
        error = result.error;
      } catch (signupError) {
        console.error('[Auth] Signup failed or timed out:', signupError);
        error = { message: 'Network error or timeout during signup' };
      }

      console.log('[Auth] Supabase signup result:', { data: !!data, error });

      if (error) {
        console.error('[Auth] Signup error:', error);

        // Handle timeout errors
        if (error.message?.includes('timeout')) {
          return { success: false, error: 'Connection timeout. Please check your internet connection and try again.' };
        }

        // Handle existing user cases - check for various Supabase error messages
        if (error.message?.includes('already registered') ||
            error.message?.includes('User already registered') ||
            error.message?.includes('already been registered') ||
            error.message?.includes('already exists') ||
            error.message?.includes('email already in use') ||
            error.message?.includes('Email already in use')) {
          console.log('[Auth] User already exists in Supabase Auth');
          return {
            success: false,
            error: 'An account with this email already exists. Please try logging in instead.',
            userExists: true
          };
        }

        throw error;
      }

      console.log('[Auth] Signup successful, OTP sent to:', normalizedEmail);
      
      // Save registration state for session recovery
      await AsyncStorage.setItem('pending_registration', JSON.stringify({
        email: normalizedEmail,
        role,
        timestamp: Date.now(),
        step: 'otp_verification'
      }));
      
      return { success: true };
    } catch (error: any) {
      console.error('[Auth] Unexpected error in signUp:', error);
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
        
        // Handle specific OTP expiry and invalid token errors
        if (error.message?.includes('expired') || error.message?.includes('Expired')) {
          return { 
            success: false, 
            error: 'This verification code has expired. Please request a new one.',
            code: 'OTP_EXPIRED'
          };
        }
        
        if (error.message?.includes('invalid') || error.message?.includes('Invalid')) {
          return { 
            success: false, 
            error: 'Invalid verification code. Please check and try again.',
            code: 'OTP_INVALID'
          };
        }
        
        // Handle network/timeout errors
        if (error.message?.includes('network') || error.message?.includes('timeout') || error.message?.includes('fetch')) {
          return { 
            success: false, 
            error: 'Network error. Please check your connection and try again.',
            code: 'NETWORK_ERROR'
          };
        }
        
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
          
          // Reset provider verification if switching to provider role
          if (role === 'provider') {
            console.log('[Auth] Resetting provider verification for new provider');
            resetVerification();
          }
          
          // Set the authenticated state with the correct role
          console.log('[Auth] Setting authenticated state with role:', role);
          setAuthenticated(true, role);
          
          // Mark that we've handled the profile for this session to avoid duplicate fetching
          profileHandled = true;
        } else {
          console.error('[Auth] Failed to create/update user profile');
        }
      } else if (!role) {
        console.warn('[Auth] No role provided, skipping profile creation');
      }

      console.log('[Auth] OTP verification process completed successfully');
      
      // Clear pending registration state on successful verification
      await AsyncStorage.removeItem('pending_registration');
      
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
      
      // Clear profile store on logout
      const { useProfileStore } = await import('@/stores/useProfileStore');
      useProfileStore.getState().clear();
      
      return { success: true };
    } catch (error: any) {
      console.error('[Auth] Unexpected sign out error:', error);
      // Still clear local state even if Supabase call fails
      setUser(null);
      setAuthenticated(false);
      
      // Clear profile store on logout even on error
      const { useProfileStore } = await import('@/stores/useProfileStore');
      useProfileStore.getState().clear();
      
      return { success: true }; // Return success to prevent UI issues
    } finally {
      setLoading(false);
    }
  };

  const checkPendingRegistration = async () => {
    try {
      const pendingData = await AsyncStorage.getItem('pending_registration');
      if (pendingData) {
        const pending = JSON.parse(pendingData);
        
        // Check if the pending registration is still valid (within 24 hours)
        const age = Date.now() - pending.timestamp;
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
        
        if (age < maxAge) {
          console.log('[Auth] Found valid pending registration:', pending);
          return pending;
        } else {
          console.log('[Auth] Pending registration expired, clearing');
          await AsyncStorage.removeItem('pending_registration');
        }
      }
    } catch (error) {
      console.error('[Auth] Error checking pending registration:', error);
    }
    return null;
  };

  const clearPendingRegistration = async () => {
    await AsyncStorage.removeItem('pending_registration');
  };

  const switchUserRole = async (profileId: string, newRole: 'customer' | 'provider') => {
    try {
      console.log('[Auth] Switching user role for profile:', profileId, 'to:', newRole);
      setLoading(true);

      const { data, error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', profileId)
        .select()
        .single();

      if (error) {
        console.error('[Auth] Role switch failed:', error);
        throw error;
      }

      console.log('[Auth] Role switched successfully:', data);
      return { success: true, profile: data };
    } catch (error: any) {
      console.error('[Auth] Unexpected error in role switch:', error);
      return { success: false, error: error.message };
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
    checkPendingRegistration,
    clearPendingRegistration,
    switchUserRole,
  };
};
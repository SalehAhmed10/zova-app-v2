import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/core/supabase';
import { useAuthStore } from '@/stores/auth';

interface SignInCredentials {
  email: string;
  password: string;
}

/**
 * React Query mutation for sign in
 * 
 * Features:
 * - Handles sign in with email/password
 * - Updates auth store on success
 * - Returns error on failure
 */
export const useSignIn = () => {
  const setSession = useAuthStore((state) => state.setSession);

  return useMutation({
    mutationFn: async ({ email, password }: SignInCredentials) => {
      console.log('[useSignIn] 🔐 Signing in:', email);

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('[useSignIn] ❌ Error:', error);
        throw error;
      }

      console.log('[useSignIn] ✅ Signed in successfully');
      return data;
    },
    onSuccess: (data) => {
      // Update auth store
      setSession(data.session);
    },
  });
};

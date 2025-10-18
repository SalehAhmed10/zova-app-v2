/**
 * ✅ AUTH SYNC HOOK - Syncs profile role to auth store
 * 
 * Purpose: Fetches user profile and updates auth store with role
 * Pattern: React Query (server state) → Zustand (global state)
 * 
 * CRITICAL: This hook ensures userRole is populated after login
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/core/supabase';
import { useAuthStore } from '@/stores/auth';
import { useEffect } from 'react';

/**
 * Hook to fetch profile and sync role to auth store
 * 
 * Features:
 * - Fetches profile when user is authenticated
 * - Automatically updates auth store with role
 * - Runs only when session exists
 * - Fast cache (1 minute staleTime)
 */
export function useAuthSync() {
  const session = useAuthStore((state) => state.session);
  const setUserRole = useAuthStore((state) => state.setUserRole);
  const userId = session?.user?.id;

  // ✅ React Query: Fetch profile data
  const { data: profile, isLoading, error } = useQuery({
    queryKey: ['profile', userId],
    queryFn: async () => {
      if (!userId) {
        throw new Error('User not authenticated');
      }

      console.log('[Profile] Fetching profile for userId:', userId);

      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, role, phone_number, country_code')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('[Profile] ❌ Error fetching profile:', error);
        throw error;
      }

      console.log('[Profile] Profile found:', data);
      return data;
    },
    enabled: !!userId, // Only run if user is authenticated
    staleTime: 1 * 60 * 1000, // 1 minute - fast refresh for auth
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  // ✅ Sync role to auth store when profile is fetched
  useEffect(() => {
    if (profile?.role) {
      console.log('[AuthSync] 🔄 Syncing role to auth store:', profile.role);
      setUserRole(profile.role);
    }
  }, [profile?.role, setUserRole]);

  return {
    profile,
    isLoading,
    error,
  };
}

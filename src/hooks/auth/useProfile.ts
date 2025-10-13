import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/core/supabase';
import { useAuthStore } from '@/stores/auth';
import type { Tables } from '@/types/supabase';

export type ProfileData = Tables<'profiles'>;

/**
 * React Query hook to fetch user profile
 * 
 * Features:
 * - Automatic caching (staleTime: 5 minutes)
 * - Only fetches when user is authenticated
 * - Automatically refetches on mount if data is stale
 */
export const useProfile = () => {
  const user = useAuthStore((state) => state.user);
  const userId = user?.id;

  return useQuery({
    queryKey: ['profile', userId],
    queryFn: async () => {
      if (!userId) {
        throw new Error('User not authenticated');
      }

      console.log('[useProfile] 📥 Fetching profile for:', userId);

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('[useProfile] ❌ Error:', error);
        throw error;
      }

      console.log('[useProfile] ✅ Profile fetched:', data);
      return data as ProfileData;
    },
    enabled: !!userId, // Only run query if user exists
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
  });
};

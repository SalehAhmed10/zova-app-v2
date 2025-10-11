/**
 * ✅ PURE PROFILE SYNC - NO useEffect patterns
 * Uses React Query for profile data + Zustand for global state
 * Real-time subscriptions managed at app level, not in hooks
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useProfileStore } from "@/stores/verification/useProfileStore";

// ✅ PURE REACT QUERY HOOK: Profile data fetching
export function useProfileSync(userId?: string) {
  const setProfile = useProfileStore((s) => s.setProfile);
  
  // ✅ REACT QUERY: Pure profile data fetching with Zustand sync
  const { data: profile, isLoading, error } = useQuery({
    queryKey: ['profile', userId],
    queryFn: async () => {
      if (!userId) return null;
      
      console.log('[ProfileSync] Fetching profile for:', userId);
      const { data, error } = await supabase
        .from("provider_onboarding_progress")
        .select("provider_id, verification_status")
        .eq("provider_id", userId)
        .single();
      
      if (error) throw error;
      
      // ✅ PURE SYNC: Update Zustand store immediately on successful fetch
      setProfile(data.provider_id, data.verification_status);
      
      return data;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  return {
    profile,
    isLoading,
    error
  };
}
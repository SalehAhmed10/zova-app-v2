import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useProfileStore } from "@/stores/useProfileStore";

export function useProfileSync(userId?: string) {
  const setProfile = useProfileStore((s) => s.setProfile);
  const clear = useProfileStore((s) => s.clear);

  useEffect(() => {
    if (!userId) {
      // Don't clear the profile store immediately - it might be a temporary state during navigation
      // Only clear if we have a different user or on explicit logout
      return;
    }

    // 1. Fetch once
    supabase
      .from("profiles")
      .select("id, verification_status")
      .eq("id", userId)
      .single()
      .then(({ data }) => {
        if (data) {
          setProfile(data.id, data.verification_status);
        }
      });

    // 2. Subscribe for live updates
    const channel = supabase
      .channel(`profile-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${userId}`,
        },
        (payload) => {
          console.log('[ProfileSync] Real-time update received:', payload.new.verification_status);
          setProfile(payload.new.id, payload.new.verification_status);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, setProfile, clear]);
}
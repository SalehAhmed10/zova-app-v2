import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth';

interface TrackViewParams {
  type: 'profile' | 'service';
  targetId: string;
  providerId?: string;
}

export const useTrackView = () => {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ type, targetId, providerId }: TrackViewParams) => {
      if (!user?.id) return;

      const table = type === 'profile' ? 'profile_views' : 'service_views';
      const data = type === 'profile'
        ? { profile_id: targetId, viewer_id: user.id }
        : { service_id: targetId, viewer_id: user.id, provider_id: providerId };

      const { error } = await supabase
        .from(table)
        .insert(data);

      if (error) throw error;
    },
    onSuccess: () => {
      // Invalidate analytics queries to refresh view counts
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
  });
};
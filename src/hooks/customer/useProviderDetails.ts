import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/core/supabase';
import { ProfileData } from '@/hooks/shared/useProfileData';

export function useProviderDetails(providerId: string) {
  return useQuery({
    queryKey: ['provider', providerId],
    queryFn: async (): Promise<ProfileData | null> => {
      if (!providerId) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          provider_services (
            id,
            title,
            base_price,
            price_type,
            description,
            duration_minutes,
            is_active,
            is_home_service,
            is_remote_service,
            service_subcategories (
              name,
              service_categories (
                name
              )
            )
          )
        `)
        .eq('id', providerId)
        .eq('role', 'provider')
        .eq('verification_status', 'approved')
        .single();

      if (error) {
        console.error('Error fetching provider details:', error);
        throw error;
      }

      return data;
    },
    enabled: !!providerId,
  });
}
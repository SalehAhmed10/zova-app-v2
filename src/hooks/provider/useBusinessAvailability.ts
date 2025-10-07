import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/core/supabase';

export interface BusinessAvailabilityData {
  isPaused: boolean;
  availabilityMessage?: string;
  pauseUntil?: string;
  availabilityStatus: 'available' | 'unavailable';
}

export const useBusinessAvailability = (providerId: string) => {
  return useQuery({
    queryKey: ['businessAvailability', providerId],
    queryFn: async (): Promise<BusinessAvailabilityData> => {
      if (!providerId) {
        throw new Error('Provider ID is required');
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('availability_status, availability_message, pause_until')
        .eq('id', providerId)
        .eq('role', 'provider')
        .single();

      if (error) {
        console.error('Error fetching business availability:', error);
        throw new Error(`Failed to fetch business availability: ${error.message}`);
      }

      if (!data) {
        throw new Error('Business availability data not found');
      }

      // Determine if business is paused based on pause_until and availability_status
      const now = new Date();
      const pauseUntil = data.pause_until ? new Date(data.pause_until) : null;
      const isPaused = data.availability_status === 'unavailable' ||
                      (pauseUntil && pauseUntil > now);

      return {
        isPaused,
        availabilityMessage: data.availability_message || undefined,
        pauseUntil: data.pause_until || undefined,
        availabilityStatus: data.availability_status || 'available',
      };
    },
    enabled: !!providerId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: (failureCount, error) => {
      console.log(`useBusinessAvailability: Retry attempt ${failureCount} for provider ${providerId}:`, error);
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};
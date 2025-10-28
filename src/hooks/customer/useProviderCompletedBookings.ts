import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface CompletedBooking {
  id: string;
  booking_date: string;
  start_time: string;
  status: string;
  total_amount: string;
  service_title: string;
  duration_minutes?: number;
  completed_at?: string;
  rating?: number;
}

/**
 * Fetch all completed bookings between customer and specific provider
 */
export const useProviderCompletedBookings = (
  customerId: string | undefined,
  providerId: string | undefined
) => {
  return useQuery({
    queryKey: ['provider-completed-bookings', customerId, providerId],
    queryFn: async (): Promise<CompletedBooking[]> => {
      if (!customerId || !providerId) return [];

      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          booking_date,
          start_time,
          status,
          total_amount,
          created_at,
          provider_services!bookings_service_id_fkey (
            title,
            duration_minutes
          ),
          reviews!left (
            rating
          )
        `)
        .eq('customer_id', customerId)
        .eq('provider_id', providerId)
        .eq('status', 'completed')
        .order('booking_date', { ascending: false });

      if (error) {
        console.error('[ProviderCompletedBookings] Error fetching completed bookings:', error);
        throw error;
      }

      // Transform the data
      return (data || []).map(booking => ({
        id: booking.id,
        booking_date: booking.booking_date,
        start_time: booking.start_time,
        status: booking.status || 'completed',
        total_amount: booking.total_amount?.toString() || '0',
        service_title: (booking.provider_services as any)?.title || 'Service',
        duration_minutes: (booking.provider_services as any)?.duration_minutes,
        completed_at: booking.created_at,
        rating: (booking.reviews as any)?.[0]?.rating,
      }));
    },
    enabled: !!customerId && !!providerId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

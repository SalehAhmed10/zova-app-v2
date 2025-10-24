import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth';

interface PendingBooking {
  id: string;
  status: string;
  auto_confirmed: boolean;
  provider_response_deadline: string | null;
  created_at: string;
  base_amount: number;
  total_amount: number;
  customer: {
    id: string;
    email: string;
    first_name?: string;
    last_name?: string;
  } | null;
  service: {
    id: string;
    title: string;
    description?: string;
    base_price: number;
  } | null;
}

/**
 * Fetches pending bookings for the authenticated provider
 * Auto-refetches every minute to keep countdown timers accurate
 */
export function usePendingBookings() {
  const user = useAuthStore((state) => state.user);

  return useQuery({
    queryKey: ['pending-bookings', user?.id],
    queryFn: async (): Promise<PendingBooking[]> => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          status,
          auto_confirmed,
          provider_response_deadline,
          created_at,
          base_amount,
          total_amount,
          customer:profiles!bookings_customer_id_fkey(
            id,
            email,
            first_name,
            last_name
          ),
          service:provider_services!bookings_service_id_fkey(
            id,
            title,
            description,
            base_price
          )
        `)
        .eq('provider_id', user.id)
        .eq('status', 'pending')
        .not('provider_response_deadline', 'is', null)
        .order('provider_response_deadline', { ascending: true });

      if (error) {
        console.error('Error fetching pending bookings:', error);
        throw error;
      }

      // Transform the data to match our interface
      return (data || []).map((booking: any) => ({
        id: booking.id,
        status: booking.status,
        auto_confirmed: booking.auto_confirmed,
        provider_response_deadline: booking.provider_response_deadline,
        created_at: booking.created_at,
        base_amount: booking.base_amount,
        total_amount: booking.total_amount,
        customer: Array.isArray(booking.customer) ? booking.customer[0] : booking.customer,
        service: Array.isArray(booking.service) ? booking.service[0] : booking.service,
      })) as PendingBooking[];
    },
    enabled: !!user?.id,
    refetchInterval: 60000, // Refetch every minute for accurate countdown
    refetchOnWindowFocus: true,
    staleTime: 30000, // Consider data stale after 30 seconds
  });
}

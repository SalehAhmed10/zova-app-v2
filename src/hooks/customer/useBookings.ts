import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/core/supabase';

export interface BookingData {
  id: string;
  booking_date: string;
  start_time: string;
  status: string;
  payment_status: string;
  total_amount: string;
  service_title: string;
  category_name: string;
  subcategory_name: string;
  provider_first_name: string;
  provider_last_name: string;
  business_name?: string;
  created_at: string;
}

export const useCustomerBookings = (userId?: string) => {
  return useQuery({
    queryKey: ['customer-bookings', userId],
    queryFn: async (): Promise<BookingData[]> => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          booking_date,
          start_time,
          status,
          payment_status,
          total_amount,
          created_at,
          services!inner (
            title,
            categories!inner (name),
            subcategories!inner (name)
          ),
          profiles!bookings_provider_id_fkey (
            first_name,
            last_name,
            business_name
          )
        `)
        .eq('customer_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching customer bookings:', error);
        throw error;
      }

      // Transform the data to match our interface
      return (data || []).map(booking => ({
        id: booking.id,
        booking_date: booking.booking_date,
        start_time: booking.start_time,
        status: booking.status || 'pending',
        payment_status: booking.payment_status || 'pending',
        total_amount: booking.total_amount?.toString() || '0',
        service_title: (booking.services as any)?.title || 'Unknown Service',
        category_name: (booking.services as any)?.categories?.[0]?.name || 'Unknown Category',
        subcategory_name: (booking.services as any)?.subcategories?.[0]?.name || 'Unknown Subcategory',
        provider_first_name: (booking.profiles as any)?.first_name || 'Unknown',
        provider_last_name: (booking.profiles as any)?.last_name || 'Provider',
        business_name: (booking.profiles as any)?.business_name,
        created_at: booking.created_at || new Date().toISOString(),
      }));
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
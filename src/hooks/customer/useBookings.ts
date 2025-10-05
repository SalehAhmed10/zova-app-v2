import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/core/supabase';

export interface BookingData {
  id: string;
  booking_date: string;
  start_time: string;
  status: string;
  payment_status: string;
  base_amount: string;
  total_amount: string;
  platform_fee: string;
  service_title: string;
  service_type?: string; // For emergency bookings
  category_name: string;
  subcategory_name: string;
  provider_first_name: string;
  provider_last_name: string;
  business_name?: string;
  created_at: string;
  service_location?: string;
  emergency_description?: string;
  sos_booking?: boolean;
  customer_review_submitted?: boolean;
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
          base_amount,
          total_amount,
          platform_fee,
          created_at,
          is_sos_booking,
          customer_notes,
          service_address,
          provider_services!bookings_service_id_fkey (
            title,
            service_subcategories!inner (
              name,
              service_categories!inner (name)
            )
          ),
          profiles!bookings_provider_id_fkey (
            first_name,
            last_name,
            business_name
          ),
          reviews!left (
            id
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
        base_amount: booking.base_amount?.toString() || '0',
        total_amount: booking.total_amount?.toString() || '0',
        platform_fee: booking.platform_fee?.toString() || '0',
        service_title: (booking.provider_services as any)?.title || 'Unknown Service',
        category_name: (booking.provider_services as any)?.service_subcategories?.service_categories?.name || 'Unknown Category',
        subcategory_name: (booking.provider_services as any)?.service_subcategories?.name || 'Unknown Subcategory',
        provider_first_name: (booking.profiles as any)?.first_name || 'Unknown',
        provider_last_name: (booking.profiles as any)?.last_name || 'Provider',
        business_name: (booking.profiles as any)?.business_name,
        created_at: booking.created_at || new Date().toISOString(),
        service_location: booking.service_address,
        emergency_description: booking.customer_notes,
        sos_booking: booking.is_sos_booking || false,
        customer_review_submitted: !!(booking.reviews as any)?.id,
      }));
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Hook for fetching single booking detail
export const useCustomerBookingDetail = (bookingId?: string) => {
  return useQuery({
    queryKey: ['customer-booking-detail', bookingId],
    queryFn: async (): Promise<BookingData | null> => {
      if (!bookingId) return null;

      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          booking_date,
          start_time,
          status,
          payment_status,
          base_amount,
          total_amount,
          platform_fee,
          created_at,
          service_address,
          customer_notes,
          is_sos_booking,
          provider_services!bookings_service_id_fkey (
            title,
            service_subcategories!inner (
              name,
              service_categories!inner (name)
            )
          ),
          profiles!bookings_provider_id_fkey (
            first_name,
            last_name,
            business_name
          ),
          reviews!left (
            id
          )
        `)
        .eq('id', bookingId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching booking detail:', error);
        throw error;
      }

      if (!data) return null;

      return {
        id: data.id,
        booking_date: data.booking_date,
        start_time: data.start_time,
        status: data.status || 'pending',
        payment_status: data.payment_status || 'pending',
        base_amount: data.base_amount?.toString() || '0',
        total_amount: data.total_amount?.toString() || '0',
        platform_fee: data.platform_fee?.toString() || '0',
        service_title: (data.provider_services as any)?.title || 'Unknown Service',
        category_name: (data.provider_services as any)?.service_subcategories?.service_categories?.name || 'Unknown Category',
        subcategory_name: (data.provider_services as any)?.service_subcategories?.name || 'Unknown Subcategory',
        provider_first_name: (data.profiles as any)?.first_name || 'Unknown',
        provider_last_name: (data.profiles as any)?.last_name || 'Provider',
        business_name: (data.profiles as any)?.business_name,
        created_at: data.created_at || new Date().toISOString(),
        service_type: (data.provider_services as any)?.title || 'Emergency Service',
        service_location: data.service_address,
        emergency_description: data.customer_notes,
        sos_booking: data.is_sos_booking || false,
        customer_review_submitted: !!(data.reviews as any)?.id,
      };
    },
    enabled: !!bookingId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};
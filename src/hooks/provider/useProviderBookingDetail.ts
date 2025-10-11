import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface BookingDetail {
  id: string;
  customerId: string;
  serviceId: string;
  bookingDate: string;
  startTime: string;
  endTime?: string;
  durationMinutes?: number;
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'declined' | 'expired';
  baseAmount: number;
  platformFee: number;
  totalAmount: number;
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  customerNotes?: string;
  providerNotes?: string;
  serviceAddress?: string;
  createdAt: string;
  updatedAt: string;
  
  // Customer details
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  
  // Service details
  serviceTitle: string;
  serviceDescription?: string;
  categoryName: string;
  subcategoryName?: string;
  
  // Provider details
  providerName: string;
}

export const useProviderBookingDetail = (bookingId?: string) => {
  return useQuery({
    queryKey: ['provider-booking-detail', bookingId],
    queryFn: async (): Promise<BookingDetail> => {
      if (!bookingId) {
        throw new Error('Booking ID is required');
      }

      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          customer:profiles!bookings_customer_id_fkey (
            first_name,
            last_name,
            email,
            phone_number
          ),
          service:provider_services!bookings_service_id_fkey (
            id,
            title,
            description,
            category_id,
            subcategory_id,
            provider:profiles!provider_services_provider_id_fkey (
              first_name,
              last_name
            ),
            category:service_categories!provider_services_category_id_fkey (
              name
            ),
            subcategory:service_subcategories!provider_services_subcategory_id_fkey (
              name,
              category:service_categories!service_subcategories_category_id_fkey (
                name
              )
            )
          )
        `)
        .eq('id', bookingId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching booking detail:', error);
        throw new Error(`Failed to fetch booking: ${error.message}`);
      }

      if (!data) {
        throw new Error('Booking not found');
      }

      // Transform the data to match our interface
      const booking: BookingDetail = {
        id: data.id,
        customerId: data.customer_id,
        serviceId: data.service_id,
        bookingDate: data.booking_date,
        startTime: data.start_time,
        endTime: data.end_time,
        durationMinutes: data.end_time && data.start_time ? 
          Math.floor((new Date(`2000-01-01T${data.end_time}`).getTime() - new Date(`2000-01-01T${data.start_time}`).getTime()) / (1000 * 60)) : 
          undefined,
        status: data.status,
        baseAmount: parseFloat(data.base_amount),
        platformFee: parseFloat(data.platform_fee),
        totalAmount: parseFloat(data.total_amount),
        paymentStatus: data.payment_status,
        customerNotes: data.customer_notes,
        providerNotes: data.provider_notes,
        serviceAddress: data.service_address,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        
        // Customer details
        customerName: data.customer ? `${data.customer.first_name || ''} ${data.customer.last_name || ''}`.trim() || 'Unknown Customer' : 'Unknown Customer',
        customerEmail: data.customer?.email,
        customerPhone: data.customer?.phone_number,
        
        // Service details
        serviceTitle: data.service?.title || 'Unknown Service',
        serviceDescription: data.service?.description,
        categoryName: data.service?.category?.name || data.service?.subcategory?.category?.name || 'Unknown Category',
        subcategoryName: data.service?.subcategory?.name,
        
        // Provider details
        providerName: data.service?.provider ? `${data.service.provider.first_name || ''} ${data.service.provider.last_name || ''}`.trim() || 'Unknown Provider' : 'Unknown Provider',
      };

      return booking;
    },
    enabled: !!bookingId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  });
};
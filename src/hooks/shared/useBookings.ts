import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/core/supabase';
import { useAuthPure } from '@/hooks/shared/useAuthPure';
import { Database } from '@/types/supabase';

type Booking = Database['public']['Tables']['bookings']['Row'];
type CreateBookingParams = {
  serviceId: string;
  providerId: string;
  bookingDate: string;
  startTime: string;
  specialRequests?: string;
  address?: string;
  depositAmount: number;
  totalAmount: number;
  paymentIntentId: string;
};

// Hook for creating a booking
export function useCreateBooking() {
  const { user } = useAuthPure();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: CreateBookingParams) => {
      if (!user) throw new Error('User not authenticated');

      console.log('[useCreateBooking] Sending to Edge Function:', {
        service_id: params.serviceId,
        provider_id: params.providerId,
        customer_id: user.id,
        booking_date: params.bookingDate,
        start_time: params.startTime,
        customer_notes: params.specialRequests,
        service_address: params.address,
        payment_intent_id: params.paymentIntentId,
      });

      const response = await supabase.functions.invoke('create-booking', {
        body: {
          service_id: params.serviceId,
          provider_id: params.providerId,
          customer_id: user.id,
          booking_date: params.bookingDate,
          start_time: params.startTime,
          customer_notes: params.specialRequests,
          service_address: params.address,
          payment_intent_id: params.paymentIntentId,
        },
      });

      console.log('[useCreateBooking] Response received:', { data: response.data, error: response.error });

      if (response.error) {
        console.error('[useCreateBooking] Error details:', response.error);
        
        // Try to extract the error message from the response
        if (response.error.context?._bodyInit) {
          try {
            const errorText = await new Response(response.error.context._bodyInit).text();
            console.error('[useCreateBooking] Error body:', errorText);
            throw new Error(errorText);
          } catch (e) {
            console.error('[useCreateBooking] Could not read error body:', e);
          }
        }
        
        throw response.error;
      }
      return response.data;
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['customer-bookings'] });
    },
  });
}

// Hook for fetching customer bookings
export function useCustomerBookings() {
  const { user } = useAuthPure();

  return useQuery({
    queryKey: ['customer-bookings', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          service:provider_services!bookings_service_id_fkey (
            id,
            title,
            base_price,
            duration_minutes
          ),
          provider:profiles!bookings_provider_id_fkey (
            id,
            first_name,
            last_name,
            avatar_url
          )
        `)
        .eq('customer_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

// Hook for fetching provider bookings
export function useProviderBookings() {
  const { user } = useAuthPure();

  return useQuery({
    queryKey: ['provider-bookings', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          service:provider_services!bookings_service_id_fkey (
            id,
            title,
            base_price,
            duration_minutes
          ),
          customer:profiles!bookings_customer_id_fkey (
            id,
            first_name,
            last_name,
            avatar_url
          )
        `)
        .eq('provider_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

// Hook for updating booking status
export function useUpdateBookingStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ bookingId, status }: { bookingId: string; status: string }) => {
      const { data, error } = await supabase
        .from('bookings')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', bookingId)
        .select()
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['customer-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['provider-bookings'] });
    },
  });
}

// Hook for fetching a single booking
export function useBooking(bookingId: string) {
  return useQuery({
    queryKey: ['booking', bookingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          service:provider_services!bookings_service_id_fkey (
            id,
            title,
            base_price,
            duration_minutes
          ),
          customer_profile:profiles!bookings_customer_id_fkey (
            id,
            first_name,
            last_name,
            avatar_url
          ),
          provider_profile:profiles!bookings_provider_id_fkey (
            id,
            first_name,
            last_name,
            avatar_url
          )
        `)
        .eq('id', bookingId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!bookingId,
  });
}

// Hook for completing a service (marks booking as complete and triggers payout)
export function useCompleteService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (bookingId: string) => {
      console.log('[useCompleteService] Completing service for booking:', bookingId);

      const response = await supabase.functions.invoke('complete-service', {
        body: { booking_id: bookingId },
      });

      if (response.error) {
        console.error('[useCompleteService] Error:', response.error);
        throw new Error(response.error.message || 'Failed to complete service');
      }

      return response.data;
    },
    onSuccess: (data, bookingId) => {
      console.log('[useCompleteService] Service completed successfully:', data);
      // Invalidate all booking-related queries
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['customer-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['provider-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['booking', bookingId] });
      queryClient.invalidateQueries({ queryKey: ['provider-booking-detail', bookingId] });
    },
  });
}

// Hook for updating booking details (date, time, etc.)
export function useUpdateBookingDetails() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      bookingId,
      bookingDate,
      startTime,
      endTime,
      serviceAddress
    }: {
      bookingId: string;
      bookingDate?: string;
      startTime?: string;
      endTime?: string;
      serviceAddress?: string;
    }) => {
      const updates: any = { updated_at: new Date().toISOString() };

      if (bookingDate !== undefined) updates.booking_date = bookingDate;
      if (startTime !== undefined) updates.start_time = startTime;
      if (endTime !== undefined) updates.end_time = endTime;
      if (serviceAddress !== undefined) updates.service_address = serviceAddress;

      const { data, error } = await supabase
        .from('bookings')
        .update(updates)
        .eq('id', bookingId)
        .select()
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['customer-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['provider-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['nextUpcomingBooking'] });
    },
  });
}
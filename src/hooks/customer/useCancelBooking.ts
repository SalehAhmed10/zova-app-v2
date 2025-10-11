import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Alert } from 'react-native';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';

interface CancelBookingParams {
  bookingId: string;
  reason?: string;
}

interface CancelBookingResponse {
  success: boolean;
  booking: any;
  refund_id: string;
  message: string;
}

/**
 * Mutation hook to cancel a customer booking
 * Calls the cancel-booking Edge Function which:
 * 1. Updates booking status to 'cancelled'
 * 2. Creates Stripe refund automatically
 * 3. Updates payment records
 * 4. Notifies provider
 */
export function useCancelBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      bookingId, 
      reason 
    }: CancelBookingParams): Promise<CancelBookingResponse> => {
      // Get current session for JWT token
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.access_token) {
        throw new Error('Not authenticated. Please log in again.');
      }

      // Call cancel-booking Edge Function
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/cancel-booking`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            booking_id: bookingId,
            reason: reason || undefined,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to cancel booking');
      }

      return response.json();
    },
    onSuccess: (data, { bookingId }) => {
      // Invalidate all booking-related queries
      queryClient.invalidateQueries({ queryKey: ['customer-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['booking', bookingId] });

      // Show success message
      Alert.alert(
        'Booking Cancelled',
        'Your booking has been cancelled and you will receive a full refund.',
        [{ text: 'OK' }]
      );
    },
    onError: (error: Error) => {
      console.error('Error cancelling booking:', error);
      
      Alert.alert(
        'Error',
        error.message || 'Failed to cancel booking. Please try again.',
        [{ text: 'OK' }]
      );
    },
  });
}
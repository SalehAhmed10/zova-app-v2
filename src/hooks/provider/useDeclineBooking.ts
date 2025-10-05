import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/core/supabase';
import { Alert } from 'react-native';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';

interface DeclineBookingParams {
  bookingId: string;
  reason?: string;
}

interface DeclineBookingResponse {
  success: boolean;
  booking: any;
  refund_id: string;
  message: string;
}

/**
 * Mutation hook to decline a pending booking
 * Calls the decline-booking Edge Function which:
 * 1. Updates booking status to 'declined'
 * 2. Creates Stripe refund automatically
 * 3. Updates payment records
 */
export function useDeclineBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      bookingId, 
      reason 
    }: DeclineBookingParams): Promise<DeclineBookingResponse> => {
      // Get current session for JWT token
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.access_token) {
        throw new Error('Not authenticated. Please log in again.');
      }

      // Call decline-booking Edge Function
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/decline-booking`,
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
        throw new Error(errorData.error || 'Failed to decline booking');
      }

      return response.json();
    },
    onSuccess: (data, { bookingId }) => {
      // Invalidate all booking-related queries
      queryClient.invalidateQueries({ queryKey: ['pending-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['provider-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['booking', bookingId] });

      // Show success message
      Alert.alert(
        'Booking Declined',
        'The booking has been declined and the customer will receive a full refund.',
        [{ text: 'OK' }]
      );
    },
    onError: (error: Error) => {
      console.error('Error declining booking:', error);
      
      Alert.alert(
        'Error',
        error.message || 'Failed to decline booking. Please try again.',
        [{ text: 'OK' }]
      );
    },
  });
}

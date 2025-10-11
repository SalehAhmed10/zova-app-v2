import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Alert } from 'react-native';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';

interface AcceptBookingResponse {
  success: boolean;
  booking: any;
  message: string;
}

/**
 * Mutation hook to accept a pending booking
 * Calls the accept-booking Edge Function with JWT authentication
 */
export function useAcceptBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (bookingId: string): Promise<AcceptBookingResponse> => {
      // Get current session for JWT token
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.access_token) {
        throw new Error('Not authenticated. Please log in again.');
      }

      // Call accept-booking Edge Function
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/accept-booking`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ booking_id: bookingId }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to accept booking');
      }

      return response.json();
    },
    onSuccess: (data, bookingId) => {
      // Invalidate all booking-related queries
      queryClient.invalidateQueries({ queryKey: ['pending-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['provider-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['booking', bookingId] });

      // Show success message
      Alert.alert(
        'Success',
        'Booking accepted! The customer will be notified.',
        [{ text: 'OK' }]
      );
    },
    onError: (error: Error) => {
      console.error('Error accepting booking:', error);
      
      Alert.alert(
        'Error',
        error.message || 'Failed to accept booking. Please try again.',
        [{ text: 'OK' }]
      );
    },
  });
}

/**
 * ✅ UNIFIED BOOKING COMPLETION HOOK
 * 
 * Centralized logic for completing bookings with:
 * - Alert dialog confirmation
 * - Proper mutation state management
 * - App-wide query invalidation (earnings, stats, bookings)
 * - Consistent error handling
 * 
 * Usage:
 * const { handleCompleteBooking, isProcessing } = useCompleteBooking();
 * 
 * // In button
 * <Button onPress={() => handleCompleteBooking(bookingId)} disabled={isProcessing}>
 */

import { Alert } from 'react-native';
import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export const useCompleteBooking = () => {
  const queryClient = useQueryClient();
  const [isProcessing, setIsProcessing] = useState(false);

  /**
   * Complete a booking with confirmation and app-wide updates
   */
  const handleCompleteBooking = useCallback(async (bookingId: string) => {
    if (!bookingId) {
      console.error('❌ [useCompleteBooking] No booking ID provided');
      return;
    }

    // Show confirmation alert
    Alert.alert(
      'Complete Service',
      'Are you sure you want to mark this service as complete? This will release payment to you and notify the customer.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete Service',
          style: 'default',
          onPress: async () => {
            setIsProcessing(true);
            try {
              await executeCompleteBooking(bookingId);
            } finally {
              setIsProcessing(false);
            }
          }
        }
      ]
    );
  }, []);

  /**
   * Execute the actual booking completion
   * This is called only when user confirms in the alert
   */
  const executeCompleteBooking = useCallback(
    async (bookingId: string) => {
      try {
        console.log('🎯 [CompleteBooking] Starting for booking:', bookingId);
        
        // Use the complete-booking Edge Function for proper payment transfer to provider
        const response = await supabase.functions.invoke('complete-booking', {
          body: {
            bookingId
          }
        });

        console.log('📡 [CompleteBooking] Raw response:', {
          data: response.data,
          error: response.error,
          hasData: !!response.data,
          hasError: !!response.error,
          dataType: typeof response.data,
          errorType: typeof response.error
        });

        const { data, error } = response;

        // Check if response was successful (200)
        if (!error && data && typeof data === 'object' && 'success' in data) {
          console.log('✅ [CompleteBooking] Success:', data);
          
          // ✅ CRITICAL: Invalidate all related queries for app-wide updates
          console.log('🔄 [CompleteBooking] Invalidating queries...');
          
          // Invalidate bookings (for bookings list and detail)
          await queryClient.invalidateQueries({ queryKey: ['provider-bookings'] });
          await queryClient.invalidateQueries({ queryKey: ['provider-bookings-detail'] });
          await queryClient.invalidateQueries({ queryKey: ['pending-bookings'] });
          
          // Invalidate earnings
          await queryClient.invalidateQueries({ queryKey: ['provider-earnings'] });
          
          // Invalidate stats (for dashboard and profile)
          await queryClient.invalidateQueries({ queryKey: ['provider-stats'] });
          
          // Invalidate user profile
          await queryClient.invalidateQueries({ queryKey: ['profile'] });

          console.log('✅ [CompleteBooking] All queries invalidated');
          
          Alert.alert(
            'Service Completed',
            'The service has been marked as complete. Payment will be released to you shortly.'
          );
          
          return { success: true, data };
        }

        // If there's an error, handle it
        if (error || (data && typeof data === 'object' && 'error' in data)) {
          const errorStatus = (error as any)?.status || (response as any)?.status || 400;
          let parsedError: any = null;
          let errorDetails = 'Unknown error';
          
          // The error response might be in data if API returned non-200
          if (data && typeof data === 'object' && 'error' in data) {
            parsedError = data as any;
            errorDetails = parsedError.error;
            console.log('📄 [CompleteBooking] Error response in data:', parsedError);
          } else if (error) {
            // Try to extract from error object
            try {
              if (error.message) {
                const match = error.message.match(/[{[].*[}\]]/);
                if (match) {
                  parsedError = JSON.parse(match[0]);
                  errorDetails = parsedError.error || error.message;
                } else {
                  errorDetails = error.message;
                }
              }
            } catch (e) {
              errorDetails = String(error);
            }
            console.log('📄 [CompleteBooking] Error object:', error);
          }
          
          console.error('❌ [CompleteBooking] Error details:', {
            status: errorStatus,
            details: errorDetails,
            parsedError: parsedError,
            rawError: error,
            fullResponse: response
          });

          // Show user-friendly error message
          let userMessage = `Failed to complete booking: ${errorDetails}`;
          
          if (errorStatus === 401) {
            userMessage = 'Authentication error. Please log in again.';
          } else if (errorStatus === 404) {
            userMessage = `Not found: ${errorDetails}`;
          } else if (errorStatus === 400) {
            if (parsedError?.chargeStatus) {
              userMessage = `Charge failed (status ${parsedError.chargeStatus}): ${parsedError.chargeErr || 'Unknown'}`;
            } else if (parsedError?.retryStatus) {
              userMessage = `Transfer retry failed (status ${parsedError.retryStatus}): ${parsedError.retryErr || 'Unknown'}`;
            } else if (parsedError?.stripeErr) {
              userMessage = `Stripe transfer failed: ${parsedError.stripeErr}`;
            } else {
              userMessage = `Invalid request: ${errorDetails}`;
            }
          } else if (errorStatus === 500) {
            userMessage = `Server error: ${errorDetails}`;
          }

          Alert.alert('Error', userMessage);
          return { success: false, error: userMessage };
        }

        // Unexpected response format
        console.warn('⚠️ [CompleteBooking] Unexpected response format:', response);
        Alert.alert('Warning', 'Unexpected response format from server');
        return { success: false, error: 'Unexpected response format' };
        
      } catch (error) {
        console.error('💥 [CompleteBooking] Exception:', {
          message: (error as any)?.message,
          stack: (error as any)?.stack,
          fullError: error
        });
        
        Alert.alert('Error', `Unexpected error: ${(error as any)?.message || 'Unknown'}`);
        return { success: false, error: (error as any)?.message || 'Unknown' };
      }
    },
    [queryClient]
  );

  return {
    handleCompleteBooking,
    isProcessing,
  };
};

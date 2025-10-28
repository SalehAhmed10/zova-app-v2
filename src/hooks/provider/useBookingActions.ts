/**
 * ✅ UNIFIED BOOKING ACTIONS HOOK
 * 
 * Centralized management of all booking state changes:
 * - Accept booking
 * - Decline booking  
 * - Complete booking
 * - Cancel booking
 * 
 * Features:
 * ✅ DRY - shared auth, fetch, and invalidation logic
 * ✅ Consistent - all actions use same patterns
 * ✅ Comprehensive query invalidation
 * ✅ Unified error handling
 * ✅ Loading state for each action
 * 
 * Usage:
 * const { 
 *   acceptBooking, 
 *   declineBooking, 
 *   completeBooking,
 *   cancelBooking,
 *   isAccepting,
 *   isDeclining,
 *   isCompleting,
 *   isCanceling
 * } = useBookingActions();
 * 
 * <Button 
 *   onPress={() => acceptBooking(bookingId)} 
 *   disabled={isAccepting}
 * >
 *   {isAccepting ? 'Accepting...' : 'Accept Booking'}
 * </Button>
 */

import { Alert } from 'react-native';
import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';

// ═══════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════

interface BookingActionParams {
  bookingId: string;
  reason?: string;
}

interface BookingActionResponse {
  success: boolean;
  booking?: any;
  refund_id?: string;
  message: string;
  error?: string;
}

interface ActionStates {
  isAccepting: boolean;
  isDeclining: boolean;
  isCompleting: boolean;
  isCanceling: boolean;
}

// ═══════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════

export const useBookingActions = () => {
  const queryClient = useQueryClient();
  
  // Track loading states for each action
  const [isAccepting, setIsAccepting] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);

  // ═══════════════════════════════════════════════════════════
  // SHARED UTILITIES (DRY - Used by all actions)
  // ═══════════════════════════════════════════════════════════

  /**
   * Get authenticated session with JWT token
   */
  const getAuthSession = useCallback(async () => {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session?.access_token) {
      throw new Error('Not authenticated. Please log in again.');
    }
    
    return session.access_token;
  }, []);

  /**
   * Call Supabase Edge Function with authentication
   * Standardized fetch with error handling
   */
  const callEdgeFunction = useCallback(
    async (
      functionName: string,
      body: Record<string, any>
    ): Promise<BookingActionResponse> => {
      try {
        const token = await getAuthSession();

        const response = await fetch(
          `${SUPABASE_URL}/functions/v1/${functionName}`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Failed to ${functionName}`);
        }

        return response.json();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(message);
      }
    },
    [getAuthSession]
  );

  /**
   * Universal query invalidation for booking changes
   * Ensures all related data refreshes across the app
   */
  const invalidateBookingQueries = useCallback(
    async (bookingId: string) => {
      // Invalidate bookings lists
      await queryClient.invalidateQueries({ queryKey: ['pending-bookings'] });
      await queryClient.invalidateQueries({ queryKey: ['provider-bookings'] });
      await queryClient.invalidateQueries({ queryKey: ['provider-bookings-detail'] });
      await queryClient.invalidateQueries({ queryKey: ['customer-bookings'] });
      
      // Invalidate specific booking detail
      await queryClient.invalidateQueries({ queryKey: ['booking', bookingId] });
      await queryClient.invalidateQueries({ queryKey: ['provider-booking-detail', bookingId] });
      
      // Invalidate provider stats (for dashboard, profile, earnings)
      await queryClient.invalidateQueries({ queryKey: ['provider-stats'] });
      await queryClient.invalidateQueries({ queryKey: ['provider-earnings'] });
      await queryClient.invalidateQueries({ queryKey: ['provider-payouts'] });
      
      // Invalidate user profile
      await queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
    [queryClient]
  );

  // ═══════════════════════════════════════════════════════════
  // INDIVIDUAL ACTIONS
  // ═══════════════════════════════════════════════════════════

  /**
   * Accept a pending booking
   * - Calls accept-booking Edge Function
   * - Shows confirmation alert
   * - Invalidates queries for app-wide updates
   */
  const acceptBooking = useCallback(
    async (bookingId: string) => {
      if (!bookingId) {
        console.error('❌ [acceptBooking] No booking ID provided');
        return { success: false, error: 'No booking ID' };
      }

      setIsAccepting(true);
      try {
        console.log('🎯 [acceptBooking] Accepting booking:', bookingId);
        
        const result = await callEdgeFunction('accept-booking', {
          booking_id: bookingId,
        });

        if (result.success) {
          console.log('✅ [acceptBooking] Success:', result);
          
          // Invalidate queries
          await invalidateBookingQueries(bookingId);

          Alert.alert(
            'Success',
            'Booking accepted! The customer will be notified.',
            [{ text: 'OK' }]
          );

          return { success: true, data: result };
        } else {
          throw new Error(result.error || 'Failed to accept booking');
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ [acceptBooking] Error:', message);
        
        Alert.alert(
          'Error',
          message || 'Failed to accept booking. Please try again.',
          [{ text: 'OK' }]
        );
        
        return { success: false, error: message };
      } finally {
        setIsAccepting(false);
      }
    },
    [callEdgeFunction, invalidateBookingQueries]
  );

  /**
   * Decline a booking with optional reason
   * - Calls decline-booking Edge Function
   * - Automatically refunds customer via Stripe
   * - Shows confirmation alert
   */
  const declineBooking = useCallback(
    async ({ bookingId, reason }: BookingActionParams) => {
      if (!bookingId) {
        console.error('❌ [declineBooking] No booking ID provided');
        return { success: false, error: 'No booking ID' };
      }

      setIsDeclining(true);
      try {
        console.log('🎯 [declineBooking] Declining booking:', bookingId, 'Reason:', reason);
        
        const result = await callEdgeFunction('decline-booking', {
          booking_id: bookingId,
          reason: reason || undefined,
        });

        if (result.success) {
          console.log('✅ [declineBooking] Success:', result);
          
          // Invalidate queries
          await invalidateBookingQueries(bookingId);

          Alert.alert(
            'Booking Declined',
            'The booking has been declined and the customer will receive a full refund.',
            [{ text: 'OK' }]
          );

          return { success: true, data: result };
        } else {
          throw new Error(result.error || 'Failed to decline booking');
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ [declineBooking] Error:', message);
        
        Alert.alert(
          'Error',
          message || 'Failed to decline booking. Please try again.',
          [{ text: 'OK' }]
        );
        
        return { success: false, error: message };
      } finally {
        setIsDeclining(false);
      }
    },
    [callEdgeFunction, invalidateBookingQueries]
  );

  /**
   * Complete a booking with confirmation
   * - Shows alert confirmation before completing
   * - Calls complete-booking Edge Function
   * - Triggers payment transfer to provider
   * - Comprehensive error handling
   */
  const completeBooking = useCallback(
    async (bookingId: string) => {
      if (!bookingId) {
        console.error('❌ [completeBooking] No booking ID provided');
        return { success: false, error: 'No booking ID' };
      }

      // Show confirmation alert first
      return new Promise((resolve) => {
        Alert.alert(
          'Complete Service',
          'Are you sure you want to mark this service as complete? This will release payment to you and notify the customer.',
          [
            { text: 'Cancel', style: 'cancel', onPress: () => resolve({ success: false, error: 'Cancelled' }) },
            {
              text: 'Complete Service',
              style: 'default',
              onPress: async () => {
                setIsCompleting(true);
                try {
                  console.log('🎯 [completeBooking] Completing booking:', bookingId);
                  
                  const response = await supabase.functions.invoke('complete-booking', {
                    body: { bookingId },
                  });

                  const { data, error } = response;

                  if (!error && data && typeof data === 'object' && 'success' in data) {
                    console.log('✅ [completeBooking] Success:', data);
                    
                    // Invalidate queries
                    await invalidateBookingQueries(bookingId);

                    Alert.alert(
                      'Service Completed',
                      'The service has been marked as complete. Payment will be released to you shortly.'
                    );

                    resolve({ success: true, data });
                  } else {
                    const errorStatus = (error as any)?.status || 400;
                    let errorDetails = 'Unknown error';
                    
                    if (data && typeof data === 'object' && 'error' in data) {
                      errorDetails = (data as any).error;
                    } else if (error) {
                      errorDetails = (error as any).message || String(error);
                    }

                    console.error('❌ [completeBooking] Error:', errorDetails);

                    let userMessage = `Failed to complete booking: ${errorDetails}`;
                    
                    if (errorStatus === 401) {
                      userMessage = 'Authentication error. Please log in again.';
                    } else if (errorStatus === 400) {
                      userMessage = `Invalid request: ${errorDetails}`;
                    } else if (errorStatus === 500) {
                      userMessage = `Server error: ${errorDetails}`;
                    }

                    Alert.alert('Error', userMessage);
                    resolve({ success: false, error: userMessage });
                  }
                } catch (error) {
                  const message = error instanceof Error ? error.message : 'Unknown error';
                  console.error('❌ [completeBooking] Exception:', message);
                  
                  Alert.alert('Error', `Unexpected error: ${message}`);
                  resolve({ success: false, error: message });
                } finally {
                  setIsCompleting(false);
                }
              }
            }
          ]
        );
      });
    },
    [invalidateBookingQueries]
  );

  /**
   * Cancel a booking (from provider side)
   * - Calls cancel-booking Edge Function
   * - Handles refunds if applicable
   * - Invalidates relevant queries
   */
  const cancelBooking = useCallback(
    async ({ bookingId, reason }: BookingActionParams) => {
      if (!bookingId) {
        console.error('❌ [cancelBooking] No booking ID provided');
        return { success: false, error: 'No booking ID' };
      }

      setIsCanceling(true);
      try {
        console.log('🎯 [cancelBooking] Canceling booking:', bookingId, 'Reason:', reason);
        
        const result = await callEdgeFunction('cancel-booking', {
          booking_id: bookingId,
          reason: reason || undefined,
        });

        if (result.success) {
          console.log('✅ [cancelBooking] Success:', result);
          
          // Invalidate queries
          await invalidateBookingQueries(bookingId);

          Alert.alert(
            'Booking Cancelled',
            'The booking has been cancelled and the customer will be notified.',
            [{ text: 'OK' }]
          );

          return { success: true, data: result };
        } else {
          throw new Error(result.error || 'Failed to cancel booking');
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ [cancelBooking] Error:', message);
        
        Alert.alert(
          'Error',
          message || 'Failed to cancel booking. Please try again.',
          [{ text: 'OK' }]
        );
        
        return { success: false, error: message };
      } finally {
        setIsCanceling(false);
      }
    },
    [callEdgeFunction, invalidateBookingQueries]
  );

  // ═══════════════════════════════════════════════════════════
  // RETURN ALL ACTIONS AND STATES
  // ═══════════════════════════════════════════════════════════

  return {
    // Actions
    acceptBooking,
    declineBooking,
    completeBooking,
    cancelBooking,
    
    // Loading states
    isAccepting,
    isDeclining,
    isCompleting,
    isCanceling,
    
    // Combined loading state (useful for disabling all actions during processing)
    isProcessing: isAccepting || isDeclining || isCompleting || isCanceling,
  };
};

/**
 * ✅ REFACTORED: React Query + useMemo Pattern
 * ✅ NO useState + useEffect violations
 * ✅ Pure derived state computation
 */
import { useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCustomerBookings } from '@/hooks/customer';
import { useAuthStore } from '@/stores/auth';

interface ReviewPromptState {
  showPrompt: boolean;
  bookingId: string | null;
  providerName: string;
  serviceName: string;
}

const REVIEW_PROMPT_STORAGE_KEY = 'review_prompt_dismissed';

export const useReviewPrompt = () => {
  const user = useAuthStore((state) => state.user);
  const userId = user?.id;
  const { data: bookingsData } = useCustomerBookings(userId);
  const queryClient = useQueryClient();

  // ✅ React Query: Fetch dismissed booking IDs from AsyncStorage
  const { data: dismissedBookingIds = [] } = useQuery({
    queryKey: ['dismissed-review-prompts', userId],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(REVIEW_PROMPT_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    },
    enabled: !!userId,
    staleTime: Infinity, // Dismissed bookings don't change often
  });

  // ✅ useMemo: Compute prompt state from bookings + dismissed data (pure computation!)
  const promptState = useMemo<ReviewPromptState>(() => {
    if (!bookingsData || !userId) {
      return {
        showPrompt: false,
        bookingId: null,
        providerName: '',
        serviceName: '',
      };
    }

    // Find completed bookings that haven't been reviewed
    const reviewableBooking = bookingsData.find(
      (booking: any) =>
        booking.status === 'completed' &&
        !booking.customer_review_submitted
    );

    // No reviewable booking or user dismissed this booking
    if (!reviewableBooking || dismissedBookingIds.includes(reviewableBooking.id)) {
      return {
        showPrompt: false,
        bookingId: null,
        providerName: '',
        serviceName: '',
      };
    }

    // Show prompt for this booking
    return {
      showPrompt: true,
      bookingId: reviewableBooking.id,
      providerName: reviewableBooking.business_name
        ? reviewableBooking.business_name
        : `${reviewableBooking.provider_first_name} ${reviewableBooking.provider_last_name || ''}`.trim(),
      serviceName: reviewableBooking.service_title || 'Service',
    };
  }, [bookingsData, userId, dismissedBookingIds]);

  // ✅ Mutation: Dismiss prompt (updates AsyncStorage + invalidates query)
  const dismissMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      const stored = await AsyncStorage.getItem(REVIEW_PROMPT_STORAGE_KEY);
      const dismissed = stored ? JSON.parse(stored) : [];
      
      if (!dismissed.includes(bookingId)) {
        dismissed.push(bookingId);
        await AsyncStorage.setItem(REVIEW_PROMPT_STORAGE_KEY, JSON.stringify(dismissed));
      }
      
      return dismissed;
    },
    onSuccess: (dismissed) => {
      // Update cache immediately (optimistic update)
      queryClient.setQueryData(['dismissed-review-prompts', userId], dismissed);
    },
  });

  // ✅ Mutation: Complete review (invalidates bookings to refresh review status)
  const completeMutation = useMutation({
    mutationFn: async () => {
      // Invalidate bookings query to fetch updated review status
      await queryClient.invalidateQueries({ queryKey: ['customer-bookings', userId] });
    },
  });

  const dismissPrompt = () => {
    if (promptState.bookingId) {
      dismissMutation.mutate(promptState.bookingId);
    }
  };

  const startReview = () => {
    // Keep the prompt state for the modal to use
    // The modal will handle closing the prompt when review is submitted
  };

  const completeReview = () => {
    completeMutation.mutate();
  };

  return {
    ...promptState,
    dismissPrompt,
    startReview,
    completeReview,
  };
};
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCustomerBookings } from '@/hooks/customer';
import { useAuthOptimized } from '@/hooks';

interface ReviewPromptState {
  showPrompt: boolean;
  bookingId: string | null;
  providerName: string;
  serviceName: string;
}

const REVIEW_PROMPT_STORAGE_KEY = 'review_prompt_dismissed';

export const useReviewPrompt = () => {
  const { user } = useAuthOptimized();
  const userId = user?.id;
  const { data: bookingsData } = useCustomerBookings(userId);
  const [promptState, setPromptState] = useState<ReviewPromptState>({
    showPrompt: false,
    bookingId: null,
    providerName: '',
    serviceName: '',
  });

  useEffect(() => {
    const checkForReviewableBooking = async () => {
      if (!bookingsData || !userId) return;

      // Find completed bookings that haven't been reviewed
      const reviewableBooking = bookingsData.find(
        (booking: any) =>
          booking.status === 'completed' &&
          !booking.customer_review_submitted
      );

      if (!reviewableBooking) {
        setPromptState({
          showPrompt: false,
          bookingId: null,
          providerName: '',
          serviceName: '',
        });
        return;
      }

      // Check if user has dismissed the prompt for this booking
      const dismissedBookings = await AsyncStorage.getItem(REVIEW_PROMPT_STORAGE_KEY);
      const dismissedBookingIds = dismissedBookings ? JSON.parse(dismissedBookings) : [];

      if (dismissedBookingIds.includes(reviewableBooking.id)) {
        return;
      }

      // Show prompt for this booking
      setPromptState({
        showPrompt: true,
        bookingId: reviewableBooking.id,
        providerName: reviewableBooking.business_name 
          ? reviewableBooking.business_name 
          : `${reviewableBooking.provider_first_name} ${reviewableBooking.provider_last_name || ''}`.trim(),
        serviceName: reviewableBooking.service_title || 'Service',
      });
    };

    checkForReviewableBooking();
  }, [bookingsData, userId]);

  const dismissPrompt = async () => {
    if (promptState.bookingId) {
      const dismissedBookings = await AsyncStorage.getItem(REVIEW_PROMPT_STORAGE_KEY);
      const dismissedBookingIds = dismissedBookings ? JSON.parse(dismissedBookings) : [];

      if (!dismissedBookingIds.includes(promptState.bookingId)) {
        dismissedBookingIds.push(promptState.bookingId);
        await AsyncStorage.setItem(REVIEW_PROMPT_STORAGE_KEY, JSON.stringify(dismissedBookingIds));
      }
    }

    setPromptState({
      showPrompt: false,
      bookingId: null,
      providerName: '',
      serviceName: '',
    });
  };

  const startReview = () => {
    // Keep the prompt state for the modal to use
    // The modal will handle closing the prompt when review is submitted
  };

  const completeReview = () => {
    setPromptState({
      showPrompt: false,
      bookingId: null,
      providerName: '',
      serviceName: '',
    });
  };

  return {
    ...promptState,
    dismissPrompt,
    startReview,
    completeReview,
  };
};
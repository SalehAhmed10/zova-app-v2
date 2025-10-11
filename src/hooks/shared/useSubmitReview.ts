import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthPure } from '@/hooks/shared/useAuthPure';

interface SubmitReviewParams {
  booking_id: string;
  rating: number;
  comment?: string;
  is_anonymous?: boolean;
}

interface SubmitReviewResponse {
  success: boolean;
  review_id: string;
  message: string;
}

export const useSubmitReview = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthPure();

  return useMutation({
    mutationFn: async (params: SubmitReviewParams): Promise<SubmitReviewResponse> => {
      if (!user) {
        throw new Error('User must be authenticated');
      }

      const { data, error } = await supabase.functions.invoke('submit-review', {
        body: params,
      });

      if (error) {
        throw new Error(error.message || 'Failed to submit review');
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to submit review');
      }

      return data;
    },
    onSuccess: (data, variables) => {
      // Invalidate booking queries to refresh the booking status
      queryClient.invalidateQueries({
        queryKey: ['bookings', user?.id],
      });

      // Invalidate the specific booking query
      queryClient.invalidateQueries({
        queryKey: ['booking', variables.booking_id],
      });

      // Invalidate provider queries to refresh ratings
      queryClient.invalidateQueries({
        queryKey: ['providers'],
      });
    },
    onError: (error) => {
      console.error('Review submission error:', error);
    },
  });
};
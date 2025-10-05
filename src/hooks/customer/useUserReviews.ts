import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/core/supabase';

export interface UserReview {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string | null;
  is_anonymous: boolean | null;
  provider_response: string | null;
  provider_response_at: string | null;
  // Joined data
  booking_id: string | null;
  provider_id: string | null;
  // Provider details
  provider_name: string | null;
  provider_business_name: string | null;
  // Customer details (for provider responses)
  customer_name: string | null;
  // Service details
  service_title: string | null;
  service_description: string | null;
  // Booking details
  booking_date: string | null;
  booking_start_time: string | null;
  service_address: string | null;
}

export const useUserReviews = (userId?: string) => {
  return useQuery({
    queryKey: ['user-reviews', userId],
    queryFn: async (): Promise<UserReview[]> => {
      if (!userId) {
        throw new Error('User ID is required');
      }

      const { data, error } = await supabase
        .from('reviews')
        .select(`
          id,
          rating,
          comment,
          created_at,
          is_anonymous,
          provider_response,
          provider_response_at,
          booking_id,
          provider_id,
          bookings!left (
            booking_date,
            start_time,
            service_address,
            provider_services!left (
              title,
              description
            )
          ),
          profiles!provider_id (
            first_name,
            last_name,
            business_name
          )
        `)
        .eq('customer_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching user reviews:', error);
        throw error;
      }

      // Transform the data to flatten the nested structure
      const transformedData = (data || []).map(review => ({
        id: review.id,
        rating: review.rating,
        comment: review.comment,
        created_at: review.created_at,
        is_anonymous: review.is_anonymous,
        provider_response: review.provider_response,
        provider_response_at: review.provider_response_at,
        booking_id: review.booking_id,
        provider_id: review.provider_id,
        // Provider details
        provider_name: review.profiles ?
          (Array.isArray(review.profiles) ?
            (review.profiles[0]?.business_name ||
             `${review.profiles[0]?.first_name} ${review.profiles[0]?.last_name}`) :
            ((review.profiles as any).business_name ||
             `${(review.profiles as any).first_name} ${(review.profiles as any).last_name}`)) : null,
        provider_business_name: Array.isArray(review.profiles) ?
          review.profiles[0]?.business_name || null :
          (review.profiles as any)?.business_name || null,
        // Customer details (for provider responses - this is the current user, so we don't need it)
        customer_name: null,
        // Service details from booking relationship (handle null bookings)
        service_title: review.bookings?.[0]?.provider_services?.[0]?.title || null,
        service_description: review.bookings?.[0]?.provider_services?.[0]?.description || null,
        // Booking details (handle null bookings)
        booking_date: review.bookings?.[0]?.booking_date || null,
        booking_start_time: review.bookings?.[0]?.start_time || null,
        service_address: review.bookings?.[0]?.service_address || null,
      }));

      return transformedData;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
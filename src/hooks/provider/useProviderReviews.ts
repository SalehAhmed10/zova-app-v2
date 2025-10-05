import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/core/supabase';

export interface ProviderReview {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string | null;
  is_anonymous: boolean | null;
  provider_response: string | null;
  provider_response_at: string | null;
  // Customer details (if not anonymous)
  customer_name: string | null;
  customer_id: string | null;
  // Service details
  service_title: string | null;
  service_description: string | null;
  // Booking details
  booking_date: string | null;
  booking_start_time: string | null;
  service_address: string | null;
}

export const useProviderReviews = (providerId?: string) => {
  return useQuery({
    queryKey: ['provider-reviews', providerId],
    queryFn: async (): Promise<ProviderReview[]> => {
      if (!providerId) {
        throw new Error('Provider ID is required');
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
          customer_id,
          bookings (
            booking_date,
            start_time,
            service_address,
            provider_services (
              title,
              description
            )
          ),
          profiles!customer_id (
            first_name,
            last_name
          )
        `)
        .eq('provider_id', providerId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching provider reviews:', error);
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
        customer_id: review.customer_id,
        // Customer details (respect anonymity)
        customer_name: review.is_anonymous ? null :
          review.profiles ?
            (Array.isArray(review.profiles) ?
              (review.profiles[0]?.first_name && review.profiles[0]?.last_name ?
                `${review.profiles[0].first_name} ${review.profiles[0].last_name}` :
                null) :
              ((review.profiles as any).first_name && (review.profiles as any).last_name ?
                `${(review.profiles as any).first_name} ${(review.profiles as any).last_name}` :
                null)) : null,
        // Service details from booking relationship
        service_title: review.bookings?.[0]?.provider_services?.[0]?.title || null,
        service_description: review.bookings?.[0]?.provider_services?.[0]?.description || null,
        // Booking details
        booking_date: review.bookings?.[0]?.booking_date || null,
        booking_start_time: review.bookings?.[0]?.start_time || null,
        service_address: review.bookings?.[0]?.service_address || null,
      }));

      return transformedData;
    },
    enabled: !!providerId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Hook to get reviews that need responses
export const useProviderReviewsNeedingResponse = (providerId?: string) => {
  return useQuery({
    queryKey: ['provider-reviews-needing-response', providerId],
    queryFn: async (): Promise<ProviderReview[]> => {
      if (!providerId) {
        throw new Error('Provider ID is required');
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
          customer_id,
          bookings (
            booking_date,
            start_time,
            service_address,
            provider_services (
              title,
              description
            )
          ),
          profiles!customer_id (
            first_name,
            last_name
          )
        `)
        .eq('provider_id', providerId)
        .is('provider_response', null) // Only reviews without responses
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching provider reviews needing response:', error);
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
        customer_id: review.customer_id,
        // Customer details (respect anonymity)
        customer_name: review.is_anonymous ? null :
          review.profiles ?
            (Array.isArray(review.profiles) ?
              (review.profiles[0]?.first_name && review.profiles[0]?.last_name ?
                `${review.profiles[0].first_name} ${review.profiles[0].last_name}` :
                null) :
              ((review.profiles as any).first_name && (review.profiles as any).last_name ?
                `${(review.profiles as any).first_name} ${(review.profiles as any).last_name}` :
                null)) : null,
        // Service details from booking relationship
        service_title: review.bookings?.[0]?.provider_services?.[0]?.title || null,
        service_description: review.bookings?.[0]?.provider_services?.[0]?.description || null,
        // Booking details
        booking_date: review.bookings?.[0]?.booking_date || null,
        booking_start_time: review.bookings?.[0]?.start_time || null,
        service_address: review.bookings?.[0]?.service_address || null,
      }));

      return transformedData;
    },
    enabled: !!providerId,
    staleTime: 2 * 60 * 1000, // 2 minutes (more frequent updates for pending responses)
  });
};
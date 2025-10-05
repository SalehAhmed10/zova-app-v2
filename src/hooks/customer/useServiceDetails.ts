import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/core/supabase';
import { Service } from '@/types/api';

// Hook to fetch detailed service information including provider data
export function useServiceDetails(serviceId: string) {
  return useQuery({
    queryKey: ['service', serviceId],
    queryFn: async (): Promise<Service | null> => {
      if (!serviceId) return null;

      const { data, error } = await supabase
        .from('provider_services')
        .select(`
          *,
          provider:profiles!provider_services_provider_id_fkey (
            id,
            first_name,
            last_name,
            business_name,
            avatar_url,
            bio,
            city,
            years_of_experience,
            availability_status,
            availability_message
          ),
          bookings!bookings_service_id_fkey (
            reviews!reviews_booking_id_fkey (
              rating
            )
          )
        `)
        .eq('id', serviceId)
        .eq('is_active', true)
        .single();

      if (error) {
        console.error('Error fetching service details:', error);
        throw error;
      }

      // Transform the data to match the Service interface
      if (data) {
        // Calculate service rating from reviews
        const allReviews = data.bookings?.flatMap((booking: any) => booking.reviews || []) || [];
        const avgRating = allReviews.length > 0
          ? allReviews.reduce((sum: number, review: any) => sum + (review.rating || 0), 0) / allReviews.length
          : 0;

        const transformedData = {
          ...data,
          duration: data.duration_minutes,
          price: data.base_price,
          rating: avgRating, // Add service rating
          total_reviews: allReviews.length, // Add total reviews count
          isHomeService: data.is_home_service,
          isRemoteService: data.is_remote_service,
          provider: data.provider ? {
            ...data.provider,
            name: data.provider.business_name ||
                  `${data.provider.first_name} ${data.provider.last_name}`.trim(),
            avatar: data.provider.avatar_url,
            location: data.provider.city,
            yearsOfExperience: data.provider.years_of_experience,
            availabilityStatus: data.provider.availability_status,
            availabilityMessage: data.provider.availability_message
          } : undefined
        };
        return transformedData;
      }

      return data;
    },
    enabled: !!serviceId,
  });
}
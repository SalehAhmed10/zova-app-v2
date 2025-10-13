import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { ProfileData } from '@/hooks/shared/useProfileData';

export interface ProviderDetails extends ProfileData {
  provider_services: any[];
  average_rating?: number;
  total_reviews?: number;
  years_of_experience?: number;
  business_name?: string;
  business_description?: string;
  website?: string;
  recent_reviews?: ReviewData[];
}

export interface ReviewData {
  id: string;
  rating: number;
  comment?: string;
  created_at: string;
  customer_first_name?: string;
  customer_last_name?: string;
  is_anonymous: boolean;
}

export function useProviderDetails(providerId: string) {
  return useQuery({
    queryKey: ['provider', providerId],
    queryFn: async (): Promise<ProviderDetails | null> => {
      if (!providerId) return null;

      console.log('[ProviderDetails] Fetching provider:', providerId);

      // Fetch provider profile with services
      // Note: Using LEFT JOIN (default) instead of !inner to allow viewing providers
      // even if they don't have onboarding progress yet
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select(`
          *,
          provider_onboarding_progress (
            verification_status
          ),
          provider_services (
            id,
            title,
            base_price,
            price_type,
            description,
            duration_minutes,
            is_active,
            is_home_service,
            is_remote_service,
            service_subcategories (
              name,
              service_categories (
                name
              )
            )
          )
        `)
        .eq('id', providerId)
        .eq('role', 'provider')
        .single();

      if (profileError) {
        console.error('[ProviderDetails] Error fetching provider:', {
          providerId,
          error: profileError,
          code: profileError.code,
          message: profileError.message
        });
        throw profileError;
      }

      console.log('[ProviderDetails] Provider found:', {
        id: profile?.id,
        name: `${profile?.first_name} ${profile?.last_name}`,
        business: profile?.business_name,
        verification: (profile as any).provider_onboarding_progress?.[0]?.verification_status
      });

      // Fetch average rating and review count
      const { data: reviews, error: reviewsError } = await supabase
        .from('reviews')
        .select('rating')
        .eq('provider_id', providerId);

      if (reviewsError) {
        console.error('Error fetching provider reviews:', reviewsError);
        // Don't throw error for reviews, just continue without them
      }

      // Fetch recent reviews (last 2)
      const { data: recentReviews, error: recentReviewsError } = await supabase
        .from('reviews')
        .select(`
          id,
          rating,
          comment,
          created_at,
          is_anonymous,
          customer:customer_id (
            first_name,
            last_name
          )
        `)
        .eq('provider_id', providerId)
        .order('created_at', { ascending: false })
        .limit(2);

      if (recentReviewsError) {
        console.error('Error fetching recent reviews:', recentReviewsError);
      }

      // Calculate average rating
      let averageRating = 0;
      let totalReviews = 0;

      if (reviews && reviews.length > 0) {
        totalReviews = reviews.length;
        const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
        averageRating = totalRating / reviews.length;
      }

      // Format recent reviews
      const formattedReviews: ReviewData[] = (recentReviews || []).map(review => ({
        id: review.id,
        rating: review.rating,
        comment: review.comment,
        created_at: review.created_at,
        customer_first_name: review.is_anonymous ? null : (review.customer as any)?.first_name,
        customer_last_name: review.is_anonymous ? null : (review.customer as any)?.last_name,
        is_anonymous: review.is_anonymous,
      }));

      return {
        ...profile,
        average_rating: averageRating,
        total_reviews: totalReviews,
        recent_reviews: formattedReviews,
      };
    },
    enabled: !!providerId,
  });
}
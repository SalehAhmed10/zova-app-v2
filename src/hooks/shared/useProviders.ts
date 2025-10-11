/**
 * Provider Profile Hook
 * 
 * Fetches provider profile information for display in booking confirmations.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface ProviderProfile {
  id: string;
  name: string;
  avatar_url?: string;
  rating?: number;
  phone?: string;
  email?: string;
  is_verified: boolean;
  completed_jobs?: number;
  business_name?: string;
  bio?: string;
}

/**
 * Hook to fetch provider profile information
 */
export function useProviderProfile(providerId?: string) {
  return useQuery({
    queryKey: ['provider-profile', providerId],
    queryFn: async (): Promise<ProviderProfile | null> => {
      if (!providerId) return null;

      // Fetch provider profile data with calculated ratings and job counts
      const [profileResult, ratingsResult, jobsResult] = await Promise.all([
        // Get basic profile info with verification status from provider_onboarding_progress
        supabase
          .from('profiles')
          .select(`
            id,
            first_name,
            last_name,
            avatar_url,
            phone_number,
            email,
            business_name,
            bio,
            provider_onboarding_progress(verification_status)
          `)
          .eq('id', providerId)
          .single(),
        
        // Get average rating from reviews
        supabase
          .from('reviews')
          .select('rating')
          .eq('provider_id', providerId),
        
        // Get completed jobs count
        supabase
          .from('bookings')
          .select('id')
          .eq('provider_id', providerId)
          .eq('status', 'completed')
      ]);

      const { data, error } = profileResult;

      if (error) {
        console.error('Error fetching provider profile:', error);
        return null;
      }

      if (!data) return null;

      // Calculate average rating from reviews
      const ratings = ratingsResult.data || [];
      const averageRating = ratings.length > 0 
        ? ratings.reduce((sum, review) => sum + review.rating, 0) / ratings.length
        : 5.0; // Default rating

      // Get completed jobs count
      const completedJobsCount = jobsResult.data?.length || 0;

      // Get verification status from provider_onboarding_progress
      const verificationStatus = (data as any).provider_onboarding_progress?.[0]?.verification_status || 'pending';

      return {
        id: data.id,
        name: data.first_name && data.last_name 
          ? `${data.first_name} ${data.last_name}` 
          : data.business_name || 'Provider',
        avatar_url: data.avatar_url,
        rating: Math.round(averageRating * 10) / 10, // Round to 1 decimal place
        phone: data.phone_number,
        email: data.email,
        is_verified: verificationStatus === 'approved',
        completed_jobs: completedJobsCount,
        business_name: data.business_name,
        bio: data.bio
      };
    },
    enabled: !!providerId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}
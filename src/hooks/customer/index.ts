/**
 * Customer-specific hooks
 * 
 * ⚠️ IMPORTANT: For profile data, use @/hooks/shared/useProfileData
 * - useProfile(userId?) - queries full profiles table with all fields
 * - useProfileStats(userId?, userRole?) - fetches profile statistics
 * 
 * Do NOT import useProfile from customer hooks - it was removed.
 */

export { useUserFavorites, useToggleFavorite, useIsFavorited, type UserFavorite, type FavoriteProvider, type FavoriteService } from './useFavorites';

// ✅ Customer booking management hooks
export { useCancelBooking } from './useCancelBooking';
export { useUserReviews, type UserReview } from './useUserReviews';
export { useSubmitReview } from './useSubmitReview';

// ✅ Detail hooks for service and provider screens
export { useServiceDetails } from './useServiceDetails';
export { useProviderDetails } from './useProviderDetails';

// ✅ Provider availability hooks
export {
  useProviderAvailability,
  useMultipleProvidersAvailability,
  useTimeSlotAvailability,
  type AvailabilitySlot,
  type ProviderAvailability
} from './useProviderAvailability';

// ✅ Customer bookings hook
export { useCustomerBookings, type BookingData } from './useBookings';

// ✅ Import required dependencies for hooks
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

/**
 * Get all providers with payment filters applied
 * Returns providers with active Stripe accounts and verified status
 * 
 * ✅ PAYMENT SECURITY: This includes stripe_account_status = 'active', 
 *    stripe_charges_enabled = true, and verification_status = 'approved'
 */
export const useAllProviders = (limit: number = 50) => {
  return useQuery({
    queryKey: ['allProviders', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          first_name,
          last_name,
          business_name,
          avatar_url,
          bio,
          availability_status,
          is_business_visible,
          stripe_account_status,
          stripe_charges_enabled,
          created_at,
          provider_onboarding_progress!inner (
            verification_status
          ),
          reviews!reviews_provider_id_fkey (
            rating
          )
        `)
        .eq('role', 'provider')
        .eq('is_business_visible', true)
        .eq('provider_onboarding_progress.verification_status', 'approved')
        .eq('availability_status', 'available')
        .eq('stripe_account_status', 'active')       // ✅ PAYMENT SECURITY
        .eq('stripe_charges_enabled', true)          // ✅ PAYMENT SECURITY
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      // Calculate average rating for each provider
      const providersWithRatings = data?.map(provider => {
        const reviews = provider.reviews || [];
        const avgRating = reviews.length > 0 
          ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length 
          : null;
        
        return {
          ...provider,
          avg_rating: avgRating,
          total_reviews: reviews.length,
          reviews: undefined
        };
      }) || [];

      return providersWithRatings;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Alias for useAllProviders with payment filters applied
 * Use this when you want clearly named provider fetching
 */
export const useTrustedProviders = (limit: number = 50) => {
  return useAllProviders(limit);
};

// Update profile mutation
export const useUpdateProfile = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (profileData: {
      id: string;
      first_name?: string;
      last_name?: string;
      phone_number?: string;
      bio?: string;
      address?: string;
      city?: string;
      postal_code?: string;
      country?: string;
      country_code?: string;
      coordinates?: { latitude: number; longitude: number } | null;
    }) => {
      console.log('[useUpdateProfile] Starting database update for user:', profileData.id);
      console.log('[useUpdateProfile] Update payload:', profileData);
      
      const { id, coordinates, ...updateData } = profileData;
      
      // Convert coordinates to PostGIS format if provided
      const finalUpdateData = {
        ...updateData,
        ...(coordinates && {
          coordinates: `POINT(${coordinates.longitude} ${coordinates.latitude})`
        }),
      };
      
      const { data, error } = await supabase
        .from('profiles')
        .update(finalUpdateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('[useUpdateProfile] Database error:', error);
        throw error;
      }
      
      console.log('[useUpdateProfile] ✅ Database update successful:', data);
      return data;
    },
    onSuccess: (data) => {
      console.log('[useUpdateProfile] ✅ Mutation success, invalidating queries');
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
    onError: (error) => {
      console.error('[useUpdateProfile] ❌ Mutation failed:', error);
    },
  });
};

// ✅ Type exports for compatibility  
export type ProfileData = {
  id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone_number?: string;
  bio?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  country?: string;
  avatar_url?: string;
  role?: string;
  verification_status?: string;
  created_at?: string;
  updated_at?: string;
};
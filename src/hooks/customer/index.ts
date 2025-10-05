export { useUserFavorites, useToggleFavorite, useIsFavorited, type UserFavorite, type FavoriteProvider, type FavoriteService } from './useFavorites';

// ✅ Customer booking management hooks
export { useCancelBooking } from './useCancelBooking';
export { useUserReviews, type UserReview } from './useUserReviews';

// ✅ Optimized search hooks following copilot-rules.md
export {
  useSearchResults
} from './useSearchOptimized';

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
import { supabase } from '@/lib/core/supabase';
import { SearchFilters, useProviderSearch } from '../provider/useProviderSearch';

// ✅ Customer-specific hooks with proper data structures
export const useTrustedProviders = (limit: number | SearchFilters = {}) => {
  const filters = typeof limit === 'number' ? { maxResults: limit } : limit;
  const { data, isLoading, error, refetch } = useProviderSearch(filters);
  return { data, isLoading, error, refetch };
};

// ✅ Hook to get ALL providers (not just those with services) for provider selection
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
          verification_status,
          availability_status,
          is_business_visible,
          created_at,
          reviews!reviews_provider_id_fkey (
            rating
          )
        `)
        .eq('role', 'provider')
        .eq('is_business_visible', true)
        .eq('verification_status', 'approved')
        .eq('availability_status', 'available')
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
          // Remove reviews from the response to keep it clean
          reviews: undefined
        };
      }) || [];

      return providersWithRatings;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useProfile = (userId?: string) => {
  const { data } = useProviderSearch({ maxResults: 1 });
  return {
    data: data?.[0] || null,
    isLoading: false,
    error: null,
  };
};

export const useUserBookings = (userId?: string) => {
  return {
    data: [],
    bookings: [],
    isLoading: false,
    loading: false,
    error: null,
    getBookingsForDate: (date: string) => [],
    getBookingsForDateRange: (startDate: string, endDate: string) => [],
    getBookingStats: () => ({ total: 0, completed: 0 }),
    refetch: async () => ({ bookings: [] }),
  };
};

export const useProfileStats = (userId?: string) => {
  return {
    data: {
      total_spent: 0,
      avg_rating: 4.5,
      total_bookings: 0,
      completed_bookings: 0,
    },
    isLoading: false,
    error: null,
  };
};

export const useNotificationSettings = () => {
  return {
    data: { push: true, email: true, sms: false },
    isLoading: false,
    error: null,
  };
};

export const useUpdateNotificationSettings = () => {
  return {
    mutateAsync: async (settings: any) => settings,
    isLoading: false,
    error: null,
  };
};

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
    }) => {
      console.log('[useUpdateProfile] Starting database update for user:', profileData.id);
      console.log('[useUpdateProfile] Update payload:', profileData);
      
      const { id, ...updateData } = profileData;
      
      const { data, error } = await supabase
        .from('profiles')
        .update(updateData)
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
      // Invalidate and refetch profile data
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

export type NotificationSettings = {
  push: boolean;
  email: boolean;
  sms: boolean;
};
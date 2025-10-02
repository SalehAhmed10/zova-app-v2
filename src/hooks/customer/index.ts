export { useUserFavorites, useToggleFavorite, useIsFavorited, type UserFavorite, type FavoriteProvider, type FavoriteService } from './useFavorites';

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
import { useQuery } from '@tanstack/react-query';
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
  return {
    mutateAsync: async (profile: any) => profile,
    isLoading: false,
    error: null,
  };
};

// ✅ Type exports for compatibility  
export type ProfileData = {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  total_spent?: number;
  avg_rating?: number;
  total_bookings?: number;
  completed_bookings?: number;
};

export type NotificationSettings = {
  push: boolean;
  email: boolean;
  sms: boolean;
};
// Enhanced search hooks with direct database queries
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/core/supabase';
import { useSearchStore } from '@/stores/customer/search-store';

export function useSearchResults() {
  const { searchQuery, searchMode, filters } = useSearchStore();

  console.log('[useSearchResults] Current state:', { searchQuery, searchMode, filters });

  // Direct database queries for optimal performance and reliability
  const providersQuery = useQuery({
    queryKey: ['search-providers', searchQuery, filters.sortBy, filters.sortOrder, filters.fiveStarOnly, filters.houseCallOnly, filters.remoteServiceOnly, filters.requiresDeposit, filters.locationRadius],
    queryFn: async () => {
      console.log('🔍 Fetching providers directly from database');

      const { data: providers, error } = await supabase
        .from('profiles')
        .select(`
          id,
          first_name,
          last_name,
          business_name,
          avatar_url,
          bio,
          city,
          country,
          provider_services (
            id,
            title,
            base_price,
            price_type,
            description,
            house_call_available,
            service_subcategories (
              name,
              service_categories (
                name
              )
            )
          ),
          reviews!reviews_provider_id_fkey (
            rating
          )
        `)
        .eq('role', 'provider')
        .eq('is_business_visible', true)
        .eq('verification_status', 'approved')
        .eq('availability_status', 'available')
        .limit(20);

      if (error) {
        console.error('🔍 Provider search error:', error);
        throw error;
      }

      console.log('🔍 Raw providers data:', providers?.length || 0);

      // Transform the data
      const transformedProviders = (providers || []).map(provider => {
        const reviews = provider.reviews || [];
        const avgRating = reviews.length > 0
          ? reviews.reduce((sum: number, review: any) => sum + (review.rating || 0), 0) / reviews.length
          : 0;

        return {
          id: provider.id,
          name: provider.business_name || `${provider.first_name} ${provider.last_name}`.trim(),
          avatar: provider.avatar_url,
          location: [provider.city, provider.country].filter(Boolean).join(', ') || 'Location not specified',
          bio: provider.bio,
          avg_rating: avgRating, // Changed from 'rating' to 'avg_rating' to match component expectations
          total_reviews: reviews.length, // Added total_reviews count
          yearsOfExperience: 0,
          serviceCount: provider.provider_services?.length || 0,
          distance: null,
          services: provider.provider_services?.map((service: any) => service.title) || [],
          provider_services: provider.provider_services?.map((service: any) => ({
            id: service.id,
            title: service.title,
            base_price: service.base_price,
            price_type: service.price_type,
            description: service.description,
            house_call_available: service.house_call_available,
            service_subcategories: service.service_subcategories
          })) || []
        };
      });

      console.log('🔍 Transformed providers:', transformedProviders.length);
      return transformedProviders;
    },
    enabled: searchMode === 'providers',
    staleTime: 30 * 1000,
  });

  // For services mode, use the existing basic implementation
  const servicesQuery = useQuery({
    queryKey: ['search-services', searchQuery, filters.sortBy, filters.sortOrder, filters.fiveStarOnly, filters.houseCallOnly, filters.remoteServiceOnly, filters.requiresDeposit, filters.locationRadius],
    queryFn: async () => {
      console.log('🔍 [Services Query] Query ENABLED and EXECUTING');
      console.log('🔍 [Services Query] Query key values:', {
        searchQuery,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
        fiveStarOnly: filters.fiveStarOnly,
        houseCallOnly: filters.houseCallOnly,
        remoteServiceOnly: filters.remoteServiceOnly,
        requiresDeposit: filters.requiresDeposit,
        locationRadius: filters.locationRadius
      });
      console.log('🔍 [Services Query] Starting services search...');
      console.log('🔍 [Services Query] Query params:', { searchQuery, searchMode, filters });

      // Fetch services with provider info and ratings
      const { data: services, error: servicesError } = await supabase
        .from('provider_services')
        .select(`
          *,
          profiles!provider_services_provider_id_fkey (
            id,
            first_name,
            last_name,
            avatar_url,
            city,
            country,
            bio,
            years_of_experience,
            availability_status
          ),
          bookings!bookings_service_id_fkey (
            reviews!reviews_booking_id_fkey (
              rating
            )
          )
        `)
        .eq('is_active', true)
        .neq('profiles.availability_status', 'unavailable')
        .limit(20);

      console.log('🔍 [Services Query] Database response:', {
        servicesCount: services?.length || 0,
        error: servicesError?.message,
        hasData: !!services
      });

      if (servicesError) {
        console.error('🔍 [Services Query] Database error:', servicesError);
        throw servicesError;
      }

      const transformedServices = (services || [])
        .filter(service => service.profiles !== null) // Filter out orphaned services
        .map(service => {
          // Calculate average rating from reviews
          const allReviews = service.bookings?.flatMap((booking: any) => booking.reviews || []) || [];
          const avgRating = allReviews.length > 0
            ? allReviews.reduce((sum: number, review: any) => sum + (review.rating || 0), 0) / allReviews.length
            : 0;

          return {
            id: service.id,
            title: service.title,
            description: service.description,
            price: service.base_price,
            duration: service.duration_minutes,
            rating: avgRating, // Real rating calculated from reviews
            total_reviews: allReviews.length, // Added total reviews count
            isHomeService: service.is_home_service,
            isRemoteService: service.is_remote_service,
            provider: service.profiles ? {
              id: service.profiles.id,
              name: `${service.profiles.first_name || ''} ${service.profiles.last_name || ''}`.trim() || 'Provider',
              avatar: service.profiles.avatar_url,
              location: [service.profiles.city, service.profiles.country].filter(Boolean).join(', ') || 'Location not specified',
              yearsOfExperience: service.profiles.years_of_experience || 0,
            } : null,
          };
        });

      console.log('🔍 [Services Query] Transformed services:', transformedServices.length);

      // Apply search query filter if provided
      let filteredServices = transformedServices;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        filteredServices = transformedServices.filter(service =>
          service.title.toLowerCase().includes(query) ||
          service.description?.toLowerCase().includes(query) ||
          service.provider?.name?.toLowerCase().includes(query)
        );
        console.log('🔍 [Services Query] After search filter:', filteredServices.length);
      }

      console.log('🔍 [Services Query] Final result:', filteredServices.length, 'services');
      return filteredServices;
    },
    enabled: searchMode === 'services',
    staleTime: 30 * 1000, // 30 seconds - shorter for mode switching
  });

  console.log('🔍 [Services Query] Query status:', {
    isEnabled: searchMode === 'services',
    searchMode,
    isLoading: servicesQuery.isLoading,
    hasData: !!servicesQuery.data,
    dataLength: servicesQuery.data?.length || 0,
    hasError: !!servicesQuery.error
  });

  // Return appropriate data based on search mode
  if (searchMode === 'services') {
    console.log('🔍 [useSearchResults] Returning services data:', {
      dataLength: servicesQuery.data?.length || 0,
      isLoading: servicesQuery.isLoading,
      error: servicesQuery.error?.message
    });
    return {
      data: servicesQuery.data,
      isLoading: servicesQuery.isLoading,
      error: servicesQuery.error,
      refetch: servicesQuery.refetch,
    };
  } else {
    console.log('🔍 [useSearchResults] Returning providers data:', {
      dataLength: providersQuery.data?.length || 0,
      isLoading: providersQuery.isLoading,
      error: providersQuery.error?.message
    });
    return {
      data: providersQuery.data || [],
      isLoading: providersQuery.isLoading,
      error: providersQuery.error,
      refetch: providersQuery.refetch,
    };
  }
}

export function useServiceCategories() {
  return useQuery({
    queryKey: ['service-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('service_categories')
        .select('*');

      if (error) throw error;
      return data || [];
    },
  });
}
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface ServiceSearchResult {
  id: string;
  title: string;
  description?: string;
  base_price: number;
  price_type: 'fixed' | 'hourly';
  category_name: string;
  subcategory_name: string;
  provider: {
    id: string;
    first_name: string;
    last_name: string;
    business_name?: string;
    avatar_url?: string;
    rating?: number;
    review_count?: number;
    distance?: number;
  };
}

export interface ProviderSearchResult {
  id: string;
  first_name: string;
  last_name: string;
  business_name?: string;
  avatar_url?: string;
  bio?: string;
  rating?: number;
  review_count?: number;
  distance?: number;
  services: ServiceSearchResult[];
  featured_service?: {
    id: string;
    title: string;
    base_price: number;
    price_type: 'fixed' | 'hourly';
    category_name: string;
    subcategory_name: string;
  } | null;
  // Additional properties from useAllProviders
  avg_rating?: number | null;
  total_reviews?: number;
  city?: string;
  is_verified?: boolean;
  verification_status?: string;
  availability_status?: string;
  is_business_visible?: boolean;
}

export interface SearchFilters {
  query?: string;
  category?: string;
  subcategory?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  maxDistance?: number;
  sortBy?: 'rating' | 'distance' | 'price' | 'name';
  sortOrder?: 'asc' | 'desc';
  maxResults?: number;
}

export const useProviderSearch = (filters: SearchFilters = {}) => {
  return useQuery({
    queryKey: ['providerSearch', filters],
    queryFn: async () => {
      const {
        query,
        category,
        subcategory,
        minPrice,
        maxPrice,
        minRating,
        maxDistance,
        sortBy = 'rating',
        sortOrder = 'desc',
        maxResults = 50
      } = filters;

      // Build the base query with proper JOINs - optimized for performance
      let queryBuilder = supabase
        .from('profiles')
        .select(`
          id,
          first_name,
          last_name,
          business_name,
          avatar_url,
          bio,
          provider_onboarding_progress!inner (
            verification_status
          ),
          provider_services (
            id,
            title,
            base_price,
            price_type,
            description,
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
        .eq('provider_onboarding_progress.verification_status', 'approved')
        .eq('availability_status', 'available')  // Added: ensure provider is available

      // Apply search query filter - simplified approach
      if (query) {
        // First try to search in basic profile fields
        queryBuilder = queryBuilder.or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,business_name.ilike.%${query}%,bio.ilike.%${query}%`);
      }

      // Apply category filter
      if (category) {
        queryBuilder = queryBuilder.eq('provider_services.service_subcategories.service_categories.name', category);
      }

      // Apply subcategory filter
      if (subcategory) {
        queryBuilder = queryBuilder.eq('provider_services.service_subcategories.name', subcategory);
      }

      // Apply price filters
      if (minPrice !== undefined) {
        queryBuilder = queryBuilder.gte('provider_services.base_price', minPrice);
      }
      if (maxPrice !== undefined) {
        queryBuilder = queryBuilder.lte('provider_services.base_price', maxPrice);
      }

      // Apply search query filter - simplified approach
      if (query) {
        // First try to search in basic profile fields
        queryBuilder = queryBuilder.or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,business_name.ilike.%${query}%,bio.ilike.%${query}%`);
      }

      // Execute the main query
      const { data, error } = await queryBuilder.limit(maxResults);

      console.log('🔍 useProviderSearch - Query executed:', {
        filters,
        dataLength: data?.length || 0,
        error: error?.message
      });

      if (error) throw error;

      // If we have a search query and no results, also search in service titles
      let additionalResults: any[] = [];
      if (query && (!data || data.length === 0)) {
        const { data: serviceData, error: serviceError } = await supabase
          .from('profiles')
          .select(`
            id,
            first_name,
            last_name,
            business_name,
            avatar_url,
            bio,
            provider_onboarding_progress!inner (
              verification_status
            ),
            provider_services!inner (
              id,
              title,
              base_price,
              price_type,
              description,
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
          .eq('provider_onboarding_progress.verification_status', 'approved')
          .eq('availability_status', 'available')  // Added: ensure provider is available
          .ilike('provider_services.title', `%${query}%`)
          .limit(maxResults);

        if (!serviceError && serviceData) {
          additionalResults = serviceData;
        }
      }

      // Combine results and remove duplicates
      const allData = [...(data || []), ...(additionalResults || [])];
      const uniqueData = allData.filter((item, index, self) =>
        index === self.findIndex((t) => t.id === item.id)
      );

      // Transform data
      let results: ProviderSearchResult[] = uniqueData?.map((provider: any) => {
        // Calculate average rating from reviews
        const reviews = provider.reviews || [];
        const rating = reviews.length > 0
          ? reviews.reduce((sum: number, review: any) => sum + review.rating, 0) / reviews.length
          : undefined;

        return {
          id: provider.id,
          first_name: provider.first_name,
          last_name: provider.last_name,
          business_name: provider.business_name,
          avatar_url: provider.avatar_url,
          bio: provider.bio,
          rating: rating,
          review_count: reviews.length,
          services: provider.provider_services?.map((service: any) => ({
            id: service.id,
            title: service.title,
            description: service.description,
            base_price: service.base_price,
            price_type: service.price_type,
            category_name: service.service_subcategories?.service_categories?.name || 'Unknown',
            subcategory_name: service.service_subcategories?.name || 'Unknown',
            provider: {
              id: provider.id,
              first_name: provider.first_name,
              last_name: provider.last_name,
              business_name: provider.business_name,
              avatar_url: provider.avatar_url,
              rating: rating,
              review_count: reviews.length,
            },
          })) || [],
          // Add featured service for display
          featured_service: provider.provider_services?.[0] ? {
            id: provider.provider_services[0].id,
            title: provider.provider_services[0].title,
            base_price: provider.provider_services[0].base_price,
            price_type: provider.provider_services[0].price_type,
            category_name: provider.provider_services[0].service_subcategories?.service_categories?.name || 'Unknown',
            subcategory_name: provider.provider_services[0].service_subcategories?.name || 'Unknown',
          } : null,
        };
      }) || [];

      // Filter by rating if specified
      if (minRating !== undefined) {
        results = results.filter(provider => (provider.rating || 0) >= minRating);
      }

      // Show ALL providers, even those without services
      // results = results.filter(provider => provider.services.length > 0);

      // Sort results
      results.sort((a, b) => {
        let aValue: any, bValue: any;

        switch (sortBy) {
          case 'name':
            aValue = `${a.first_name} ${a.last_name}`.toLowerCase();
            bValue = `${b.first_name} ${b.last_name}`.toLowerCase();
            break;
          case 'price':
            // Handle providers without services
            aValue = a.services.length > 0 ? Math.min(...a.services.map(s => s.base_price)) : Infinity;
            bValue = b.services.length > 0 ? Math.min(...b.services.map(s => s.base_price)) : Infinity;
            break;
          case 'rating':
            aValue = a.rating || 0;
            bValue = b.rating || 0;
            break;
          case 'distance':
            aValue = a.distance || 999;
            bValue = b.distance || 999;
            break;
          default:
            return 0;
        }

        if (sortOrder === 'asc') {
          return aValue > bValue ? 1 : -1;
        } else {
          return aValue < bValue ? 1 : -1;
        }
      });

      return results;
    },
    enabled: true,
    staleTime: 2 * 60 * 1000, // 2 minutes - reduced for better responsiveness
    gcTime: 10 * 60 * 1000, // 10 minutes - keep in cache longer
  });
};

export const useServiceSearch = (filters: SearchFilters = {}) => {
  return useQuery({
    queryKey: ['serviceSearch', filters],
    queryFn: async () => {
      const {
        query,
        category,
        subcategory,
        minPrice,
        maxPrice,
        minRating,
        maxDistance,
        sortBy = 'price',
        sortOrder = 'asc',
        maxResults = 50
      } = filters;

      try {
        let queryBuilder = supabase
          .from('provider_services')
          .select(`
            id,
            title,
            description,
            base_price,
            price_type,
            service_subcategories (
              name,
              service_categories (
                name
              )
            ),
            profiles!inner (
              id,
              first_name,
              last_name,
              business_name,
              avatar_url,
              role,
              is_business_visible,
              reviews!reviews_provider_id_fkey (
                rating
              )
            )
          `)
          .eq('profiles.role', 'provider')
          .eq('profiles.is_business_visible', true)
          .order('base_price', { ascending: true }); // Add default ordering for consistency

        // Apply search query filter
        if (query) {
          queryBuilder = queryBuilder.or(`title.ilike.%${query}%,description.ilike.%${query}%`);
        }

        // Apply category filter
        if (category) {
          queryBuilder = queryBuilder.eq('service_subcategories.service_categories.name', category);
        }

        // Apply subcategory filter
        if (subcategory) {
          queryBuilder = queryBuilder.eq('service_subcategories.name', subcategory);
        }

        // Apply price filters
        if (minPrice !== undefined) {
          queryBuilder = queryBuilder.gte('base_price', minPrice);
        }
        if (maxPrice !== undefined) {
          queryBuilder = queryBuilder.lte('base_price', maxPrice);
        }

        // Get results
        const { data, error } = await queryBuilder.limit(maxResults);

        if (error) {
          console.error('🔍 useServiceSearch - Query error:', error);
          throw error;
        }

        console.log('🔍 useServiceSearch - Raw data received:', {
          dataLength: data?.length || 0,
          firstItem: data?.[0] || null
        });

        // Transform data
        let results: ServiceSearchResult[] = data?.map((service: any) => {
          // Calculate average rating from reviews
          const reviews = service.profiles.reviews || [];
          const rating = reviews.length > 0
            ? reviews.reduce((sum: number, review: any) => sum + review.rating, 0) / reviews.length
            : undefined;

          return {
            id: service.id,
            title: service.title,
            description: service.description,
            base_price: service.base_price,
            price_type: service.price_type,
            category_name: service.service_subcategories?.service_categories?.name || 'Unknown',
            subcategory_name: service.service_subcategories?.name || 'Unknown',
            provider: {
              id: service.profiles.id,
              first_name: service.profiles.first_name,
              last_name: service.profiles.last_name,
              business_name: service.profiles.business_name,
              avatar_url: service.profiles.avatar_url,
              rating: rating,
              review_count: reviews.length,
            },
          };
        }) || [];

        // Sort results
        results.sort((a, b) => {
          let aValue: any, bValue: any;

          switch (sortBy) {
            case 'name':
              aValue = a.title.toLowerCase();
              bValue = b.title.toLowerCase();
              break;
            case 'price':
              aValue = a.base_price;
              bValue = b.base_price;
              break;
            case 'rating':
              aValue = a.provider.rating || 0;
              bValue = b.provider.rating || 0;
              break;
            case 'distance':
              aValue = a.provider.distance || 999;
              bValue = b.provider.distance || 999;
              break;
            default:
              return 0;
          }

          if (sortOrder === 'asc') {
            return aValue > bValue ? 1 : -1;
          } else {
            return aValue < bValue ? 1 : -1;
          }
        });

        return results;
      } catch (error) {
        console.error('🔍 useServiceSearch - Unexpected error:', error);
        throw error;
      }
    },
    enabled: true,
    staleTime: 2 * 60 * 1000, // 2 minutes - reduced for better responsiveness
    gcTime: 10 * 60 * 1000, // 10 minutes - keep in cache longer
  });
};

export const useServiceCategories = () => {
  return useQuery({
    queryKey: ['serviceCategories'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('service_categories')
          .select(`
            id,
            name,
            description,
            service_subcategories (
              id,
              name,
              description
            )
          `)
          .order('name');

        if (error) {
          console.error('🔍 useServiceCategories - Query error:', error);
          throw error;
        }

        return data || [];
      } catch (error) {
        console.error('🔍 useServiceCategories - Unexpected error:', error);
        throw error;
      }
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};
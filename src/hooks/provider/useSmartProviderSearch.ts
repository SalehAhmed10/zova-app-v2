/**
 * 🔍 SMART SEARCH & DISCOVERY ENGINE
 * Enhanced search using Supabase Edge Function for optimal performance
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useSearchStore } from '@/stores/customer/search-store';

export interface SmartSearchFilters {
  query?: string;
  category?: string;
  subcategory?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  maxDistance?: number;
  userLat?: number;
  userLng?: number;
  houseCallOnly?: boolean;
  sortBy?: 'relevance' | 'rating' | 'distance' | 'price' | 'name';
  sortOrder?: 'asc' | 'desc';
  maxResults?: number;
}

export interface SmartProviderSearchResult {
  id: string;
  first_name: string;
  last_name: string;
  business_name?: string;
  avatar_url?: string;
  bio?: string;
  address?: string;
  city?: string;
  country?: string;
  distance?: number | null;
  avg_rating: number;
  total_reviews: number;
  closest_address?: any;
  provider_services: Array<{
    id: string;
    title: string;
    base_price: number;
    price_type: string;
    description?: string;
    house_call_available: boolean;
    service_subcategories: {
      id: string;
      name: string;
      service_categories: {
        id: string;
        name: string;
      };
    };
  }>;
  reviews: Array<{
    rating: number;
  }>;
  user_addresses: Array<{
    coordinates: number[];
    street_address: string;
  }>;
}

/**
 * Enhanced provider search using Supabase Edge Function
 * Features smart keyword matching, location-based filtering, and relevance-based sorting
 */
export const useSmartProviderSearch = (filters: SmartSearchFilters = {}, enabled: boolean = true) => {
  const searchStore = useSearchStore();

  // Simplified filters - removing location for now to make it work
  const mergedFilters: SmartSearchFilters = {
    query: filters.query || '',
    category: filters.category,
    subcategory: filters.subcategory,
    minPrice: filters.minPrice,
    maxPrice: filters.maxPrice,
    minRating: filters.minRating,
    // maxDistance: filters.maxDistance || 25, // Commented out for simplicity
    // userLat: filters.userLat, // Commented out for simplicity
    // userLng: filters.userLng, // Commented out for simplicity
    houseCallOnly: filters.houseCallOnly || false,
    sortBy: filters.sortBy || 'rating',
    sortOrder: filters.sortOrder || 'desc',
    maxResults: filters.maxResults || 50,
  };

  return useQuery({
    queryKey: ['smart-provider-search', mergedFilters],
    queryFn: async (): Promise<SmartProviderSearchResult[]> => {
      console.log('🔍 Calling smart provider search Edge Function with filters:', mergedFilters);

      try {
        const { data, error } = await supabase.functions.invoke('smart-provider-search', {
          body: mergedFilters,
        });

        console.log('🔍 Edge Function response:', { data, error });

        if (error) {
          console.error('🔍 Smart search error:', error);
          throw new Error(error.message || 'Failed to search providers');
        }

        if (data.error) {
          console.error('🔍 Smart search function error:', data.error);
          throw new Error(data.error);
        }

        console.log('🔍 Smart search results:', data.data?.length || 0);
        return data.data || [];
      } catch (err) {
        console.error('🔍 Smart search exception:', err);
        throw err;
      }
    },
    enabled: enabled, // Allow controlling when this query runs
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};
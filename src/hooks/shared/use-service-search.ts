import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface ServiceSearchResult {
  service_id: string;
  service_title: string;
  service_description: string;
  base_price: number;
  duration?: number;
  provider_id: string;
  provider_name: string;
  provider_avatar_url?: string;
  category_name: string;
  subcategory_name: string;
  relevance_rank: number;
}

export interface UseServiceSearchOptions {
  query: string;
  limit?: number;
  offset?: number;
  enabled?: boolean;
}

/**
 * Custom React Query hook for searching services with keyword matching
 * 
 * Features:
 * - Full-text search across service titles, descriptions
 * - Keyword matching (e.g., "nail tech" finds "manicure", "pedicure")
 * - Relevance ranking with primary keyword boosting
 * - Pagination support
 * - Automatic caching and background updates
 * 
 * @example
 * ```tsx
 * const { data, isLoading, error } = useServiceSearch({
 *   query: debouncedSearchQuery,
 *   limit: 20,
 *   enabled: debouncedSearchQuery.length > 0
 * });
 * ```
 */
export function useServiceSearch({
  query,
  limit = 10,
  offset = 0,
  enabled = true,
}: UseServiceSearchOptions) {
  return useQuery<ServiceSearchResult[], Error>({
    queryKey: ['services', 'search', query, limit, offset],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('search_services', {
        search_query: query,
        limit_results: limit,
        offset_results: offset,
      });

      if (error) {
        console.error('🔍 useServiceSearch - Query failed:', error);
        throw new Error(`Service search failed: ${error.message}`);
      }

      console.log('🔍 useServiceSearch - Query executed:', {
        filters: { maxResults: limit },
        dataLength: data?.length || 0,
        error: error ? error.message : null,
      });

      return data || [];
    },
    enabled: enabled, // Respect the enabled prop from parent - browse mode needs this!
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
  });
}

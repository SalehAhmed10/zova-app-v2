import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';


export interface ProviderSearchResult {
  provider_id: string;
  business_name: string;
  business_description: string;
  avatar_url?: string;
  services_count?: number;
  distance?: number; // For future location-based search
  relevance_rank: number;
}

export interface UseProviderSearchOptions {
  query: string;
  limit?: number;
  offset?: number;
  enabled?: boolean;
}

/**
 * Custom React Query hook for searching service providers
 * 
 * Features:
 * - Full-text search across business names, descriptions
 * - Keyword matching through provider's service offerings
 * - Relevance ranking
 * - Verification status filtering
 * - Pagination support
 * - Automatic caching and background updates
 * 
 * @example
 * ```tsx
 * const { data, isLoading, error } = useProviderSearch({
 *   query: debouncedSearchQuery,
 *   limit: 20,
 *   enabled: debouncedSearchQuery.length > 0
 * });
 * ```
 */
export function useProviderSearch({
  query,
  limit = 10,
  offset = 0,
  enabled = true,
}: UseProviderSearchOptions) {
  return useQuery<ProviderSearchResult[], Error>({
    queryKey: ['providers', 'search', query, limit, offset],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('search_providers', {
        search_query: query,
        limit_results: limit,
        offset_results: offset,
      });

      if (error) {
        console.error('🔍 useProviderSearch - Query failed:', error);
        throw new Error(`Provider search failed: ${error.message}`);
      }

      console.log('🔍 useProviderSearch - Query executed:', {
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

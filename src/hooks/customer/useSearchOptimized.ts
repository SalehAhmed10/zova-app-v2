/**
 * Optimized Search Hooks
 * ✅ Follows copilot-rules.md - React Query for server state, NO useEffect patterns
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchStore } from '@/stores/customer/search-store';
import type { SearchFilters } from '@/stores/customer/search-store';
import { useDebounceValue } from '@/hooks/shared/useDebounce';

// Mock API functions - replace with real API calls
const searchServices = async (filters: SearchFilters) => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 300));
  
  // Mock service data
  return [
    {
      id: '1',
      title: 'Home Cleaning Service',
      description: 'Professional cleaning for your home',
      price: 80,
      rating: 4.8,
      provider: {
        id: 'provider1',
        name: 'Clean Pro',
        avatar: null,
      },
    },
    // Add more mock services as needed
  ].filter(service => 
    !filters.query || 
    service.title.toLowerCase().includes(filters.query.toLowerCase())
  );
};

const searchProviders = async (filters: SearchFilters) => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Mock provider data
  return [
    {
      id: 'provider1',
      name: 'Clean Pro Services',
      bio: 'Professional cleaning services',
      rating: 4.8,
      reviewCount: 150,
      avatar: null,
      services: ['Home Cleaning', 'Office Cleaning'],
      location: 'Downtown Area',
      isAvailable: true,
    },
    // Add more mock providers as needed
  ].filter(provider => 
    !filters.query || 
    provider.name.toLowerCase().includes(filters.query.toLowerCase())
  );
};

/**
 * Custom hook for debouncing search queries
 * ✅ NO useEffect patterns - React Query handles debouncing through its own mechanisms
 */
function useSearchQueryDebounced() {
  const searchQuery = useSearchStore(state => state.searchQuery);
  const debouncedQuery = useDebounceValue(searchQuery, 500);
  
  return debouncedQuery;
}

/**
 * Optimized service search hook
 * ✅ Uses React Query for server state management
 * ✅ NO useEffect patterns
 */
export function useOptimizedServiceSearch() {
  const filters = useSearchStore(state => state.filters);
  const debouncedQuery = useSearchQueryDebounced();
  
  // Create search filters with debounced query
  const searchFilters = useMemo(() => ({
    ...filters,
    query: debouncedQuery,
  }), [filters, debouncedQuery]);
  
  return useQuery({
    queryKey: ['services', 'search', searchFilters],
    queryFn: () => searchServices(searchFilters),
    enabled: true,
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Optimized provider search hook
 * ✅ Uses React Query for server state management
 * ✅ NO useEffect patterns
 */
export function useOptimizedProviderSearch() {
  const filters = useSearchStore(state => state.filters);
  const debouncedQuery = useSearchQueryDebounced();
  
  // Create search filters with debounced query
  const searchFilters = useMemo(() => ({
    ...filters,
    query: debouncedQuery,
  }), [filters, debouncedQuery]);
  
  return useQuery({
    queryKey: ['providers', 'search', searchFilters],
    queryFn: () => searchProviders(searchFilters),
    enabled: true,
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Combined search results hook
 * ✅ Pure computation, NO useEffect patterns
 */
export function useSearchResults() {
  const searchMode = useSearchStore(state => state.searchMode);
  
  const serviceQuery = useOptimizedServiceSearch();
  const providerQuery = useOptimizedProviderSearch();
  
  const currentQuery = searchMode === 'services' ? serviceQuery : providerQuery;
  
  return useMemo(() => ({
    data: currentQuery.data,
    isLoading: currentQuery.isLoading,
    error: currentQuery.error,
    refetch: currentQuery.refetch,
    resultsCount: currentQuery.data?.length || 0,
    hasResults: (currentQuery.data?.length || 0) > 0,
  }), [currentQuery]);
}

/**
 * Search actions hook for easy access
 * ✅ Direct Zustand store access, NO useEffect patterns
 */
export function useSearchActions() {
  const {
    setSearchQuery,
    setSearchMode,
    setFilters,
    toggleFiltersCollapsed,
    togglePriceSortDirection,
    clearFilters,
    reset
  } = useSearchStore();
  
  return {
    setSearchQuery,
    setSearchMode,
    setFilters,
    toggleFiltersCollapsed,
    togglePriceSortDirection,
    clearFilters,
    reset,
    
    // Convenience methods
    handleSearch: (query: string) => {
      setSearchQuery(query);
      // Query will be automatically debounced and trigger React Query
    },
    
    handleModeSwitch: (mode: 'services' | 'providers') => {
      setSearchMode(mode);
    },
    
    handleFiltersChange: (newFilters: SearchFilters) => {
      setFilters(newFilters);
    },
  };
}
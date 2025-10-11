/**
 * Search Store - Zustand store for search state management
 * ✅ Follows copilot-rules.md - Zustand for global app state
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface SearchFilters {
  category?: string;
  subcategory?: string;
  minPrice?: number;
  maxPrice?: number;
  fiveStarOnly?: boolean;
  houseCallOnly?: boolean;
  remoteServiceOnly?: boolean;
  requiresDeposit?: boolean;
  locationRadius?: number;
  userLatitude?: number;
  userLongitude?: number;
  locationMode?: 'detected' | 'global';
  sortBy?: 'price' | 'rating' | 'popularity' | 'distance';
  sortOrder?: 'asc' | 'desc';
  query?: string;
}

export interface SearchState {
  // Hydration
  _hasHydrated: boolean;

  // Search input
  searchQuery: string;
  searchMode: 'services' | 'providers';

  // Filters
  filters: SearchFilters;
  isFiltersCollapsed: boolean;
  priceSortDirection: 'asc' | 'desc';

  // Actions
  setSearchQuery: (query: string) => void;
  setSearchMode: (mode: 'services' | 'providers') => void;
  handleModeSwitch: (mode: 'services' | 'providers') => void;
  handleFiltersChange: (filters: Partial<SearchFilters>) => void;
  setUserLocation: (latitude: number, longitude: number) => void;
  clearUserLocation: () => void;
  toggleFiltersCollapsed: () => void;
  togglePriceSortDirection: () => void;
  clearFilters: () => void;
  resetSearch: () => void;
}

const defaultFilters: SearchFilters = {
  sortBy: 'rating',
  sortOrder: 'desc',
  fiveStarOnly: false,
  houseCallOnly: false,
  remoteServiceOnly: false,
  requiresDeposit: false,
  locationRadius: 200,
  locationMode: 'detected',
  query: '',
};

export const useSearchStore = create<SearchState>()(
  persist(
    (set, get) => ({
      // Initial state
      _hasHydrated: false,
      searchQuery: '',
      searchMode: 'services',
      filters: { ...defaultFilters },
      isFiltersCollapsed: true,
      priceSortDirection: 'asc',

      // Actions
      setSearchQuery: (query: string) => {
        console.log(`[SearchStore] Setting search query: "${query}"`);
        set({ searchQuery: query });
      },

      setSearchMode: (mode: 'services' | 'providers') => {
        console.log(`[SearchStore] Setting search mode: ${mode}`);
        set({ searchMode: mode });
      },

      handleModeSwitch: (mode: 'services' | 'providers') => {
        console.log(`[SearchStore] Switching to mode: ${mode}`);
        set({ searchMode: mode });
      },

      handleFiltersChange: (newFilters: Partial<SearchFilters>) => {
        console.log(`[SearchStore] Updating filters:`, newFilters);
        set((state) => ({
          filters: { ...state.filters, ...newFilters },
        }));
      },

      setUserLocation: (latitude: number, longitude: number) => {
        console.log(`[SearchStore] Setting user location: ${latitude}, ${longitude}`);
        set((state) => ({
          filters: { ...state.filters, userLatitude: latitude, userLongitude: longitude },
        }));
      },

      clearUserLocation: () => {
        console.log(`[SearchStore] Clearing user location`);
        set((state) => ({
          filters: { ...state.filters, userLatitude: undefined, userLongitude: undefined },
        }));
      },

      toggleFiltersCollapsed: () => {
        set((state) => ({
          isFiltersCollapsed: !state.isFiltersCollapsed,
        }));
      },

      togglePriceSortDirection: () => {
        set((state) => ({
          priceSortDirection: state.priceSortDirection === 'asc' ? 'desc' : 'asc',
        }));
      },

      clearFilters: () => {
        console.log(`[SearchStore] Clearing all filters`);
        set({ filters: { ...defaultFilters } });
      },

      resetSearch: () => {
        console.log(`[SearchStore] Resetting search state`);
        set({
          searchQuery: '',
          searchMode: 'services',
          filters: { ...defaultFilters },
          isFiltersCollapsed: true,
          priceSortDirection: 'asc',
        });
      },
    }),
    {
      name: 'search-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist certain fields
      partialize: (state) => ({
        searchQuery: state.searchQuery,
        searchMode: state.searchMode,
        filters: state.filters,
        priceSortDirection: state.priceSortDirection,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state._hasHydrated = true;
        }
      },
    }
  )
);

// Action hooks for cleaner usage
export const useSearchActions = () => {
  const {
    setSearchQuery,
    handleModeSwitch,
    handleFiltersChange,
    setUserLocation,
    clearUserLocation,
    toggleFiltersCollapsed,
    togglePriceSortDirection,
    clearFilters,
    resetSearch,
  } = useSearchStore();

  return {
    setSearchQuery,
    handleModeSwitch,
    handleFiltersChange,
    setUserLocation,
    clearUserLocation,
    toggleFiltersCollapsed,
    togglePriceSortDirection,
    clearFilters,
    resetSearch,
  };
};

// Hydration hook
export const useSearchHydration = () => useSearchStore((state) => state._hasHydrated);
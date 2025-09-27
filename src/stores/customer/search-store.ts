/**
 * Search Store - Global search state management
 * ✅ Follows copilot-rules.md - Zustand for global app state
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type SearchMode = 'services' | 'providers';
export type SortBy = 'rating' | 'price' | 'distance' | 'popularity';
export type SortOrder = 'asc' | 'desc';

export interface SearchFilters {
  query?: string;
  category?: string;
  subcategory?: string;
  minPrice?: number;
  maxPrice?: number;
  rating?: number;
  distance?: number;
  availability?: 'available' | 'unavailable' | 'all';
  sortBy?: SortBy;
  sortOrder?: SortOrder;
}

export interface SearchState {
  // Search state
  searchQuery: string;
  searchMode: SearchMode;
  filters: SearchFilters;
  isFiltersCollapsed: boolean;
  priceSortDirection: 'asc' | 'desc';
  
  // Actions
  setSearchQuery: (query: string) => void;
  setSearchMode: (mode: SearchMode) => void;
  setFilters: (filters: SearchFilters | ((prev: SearchFilters) => SearchFilters)) => void;
  toggleFiltersCollapsed: () => void;
  togglePriceSortDirection: () => void;
  clearFilters: () => void;
  reset: () => void;
}

const initialFilters: SearchFilters = {
  sortBy: 'rating',
  sortOrder: 'desc',
};

export const useSearchStore = create<SearchState>()(
  persist(
    (set, get) => ({
      // Initial state
      searchQuery: '',
      searchMode: 'services',
      filters: initialFilters,
      isFiltersCollapsed: true,
      priceSortDirection: 'asc',

      // Actions
      setSearchQuery: (query) => set({ searchQuery: query }),
      
      setSearchMode: (mode) => set({ searchMode: mode }),
      
      setFilters: (filters) => {
        set((state) => ({
          filters: typeof filters === 'function' ? filters(state.filters) : filters,
        }));
      },
      
      toggleFiltersCollapsed: () => {
        set((state) => ({ isFiltersCollapsed: !state.isFiltersCollapsed }));
      },
      
      togglePriceSortDirection: () => {
        set((state) => ({
          priceSortDirection: state.priceSortDirection === 'asc' ? 'desc' : 'asc',
        }));
      },
      
      clearFilters: () => {
        set({ filters: initialFilters });
      },
      
      reset: () => {
        set({
          searchQuery: '',
          searchMode: 'services',
          filters: initialFilters,
          isFiltersCollapsed: true,
          priceSortDirection: 'asc',
        });
      },
    }),
    {
      name: 'search-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        searchMode: state.searchMode,
        filters: state.filters,
        isFiltersCollapsed: state.isFiltersCollapsed,
        priceSortDirection: state.priceSortDirection,
        // Don't persist searchQuery - it should be fresh each time
      }),
    }
  )
);
/**
 * ✅ CATEGORY SEARCH STORE - Following copilot-rules.md
 * 
 * ARCHITECTURE:
 * - Pure Zustand for search state management
 * - Built-in debouncing without useEffect patterns
 * - Computed filtered results
 * - NO useState + useEffect patterns
 * 
 * REPLACES: useState + useEffect search debouncing in category.tsx
 */

import { create } from 'zustand';

interface CategorySearchState {
  // State
  searchQuery: string;
  debouncedQuery: string;
  selectedCategoryId: string | null;
  
  // Actions
  setSearchQuery: (query: string) => void;
  setSelectedCategoryId: (id: string | null) => void;
  clearSearch: () => void;
  reset: () => void;
}

// Debounce helper outside store to avoid useEffect
let debounceTimer: NodeJS.Timeout | null = null;

export const useCategorySearchStore = create<CategorySearchState>((set, get) => ({
  // Initial state
  searchQuery: '',
  debouncedQuery: '',
  selectedCategoryId: null,

  // Actions
  setSearchQuery: (query) => {
    console.log('[CategorySearchStore] Setting search query:', query);
    set({ searchQuery: query });

    // ✅ CLEAN DEBOUNCING: No useEffect needed
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    
    debounceTimer = setTimeout(() => {
      console.log('[CategorySearchStore] Debounced query update:', query);
      set({ debouncedQuery: query });
    }, 300);
  },

  setSelectedCategoryId: (id) => {
    console.log('[CategorySearchStore] Setting selected category:', id);
    set({ selectedCategoryId: id });
  },

  clearSearch: () => {
    set({ searchQuery: '', debouncedQuery: '' });
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
  },

  reset: () => {
    set({ 
      searchQuery: '', 
      debouncedQuery: '', 
      selectedCategoryId: null 
    });
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
  },
}));

/**
 * ✅ COMPUTED SEARCH RESULTS - Pure selector pattern
 */
export const useCategorySearchResults = (categories: any[]) => {
  return useCategorySearchStore((state) => {
    const query = state.debouncedQuery.toLowerCase().trim();
    
    if (!query) {
      return categories;
    }

    return categories.filter((category) => {
      const nameMatch = category.name?.toLowerCase().includes(query);
      const descMatch = category.description?.toLowerCase().includes(query);
      return nameMatch || descMatch;
    });
  });
};
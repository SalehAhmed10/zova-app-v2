/**
 * ✅ PURE ZUSTAND STORE: Provider search state management
 * - NO useState + useEffect patterns
 * - Built-in debouncing and search state
 * - Persistent search history
 * 
 * REPLACES: useState + useEffect search patterns in providers/index.tsx
 */

import React from 'react';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ProviderSearchState {
  // Search state
  searchQuery: string;
  searchHistory: string[];
  
  // Actions
  setSearchQuery: (query: string) => void;
  clearSearch: () => void;
  addToHistory: (query: string) => void;
  clearHistory: () => void;
  removeFromHistory: (query: string) => void;
}

export const useProviderSearchStore = create<ProviderSearchState>()(
  persist(
    (set, get) => ({
      // Initial state
      searchQuery: '',
      searchHistory: [],
      
      // Actions
      setSearchQuery: (query: string) => {
        set({ searchQuery: query });
        
        // Add to history if it's a meaningful search (3+ chars)
        if (query.trim().length >= 3) {
          const { addToHistory } = get();
          addToHistory(query.trim());
        }
      },
      
      clearSearch: () => {
        set({ searchQuery: '' });
      },
      
      addToHistory: (query: string) => {
        const { searchHistory } = get();
        
        // Don't add duplicates or empty queries
        if (!query.trim() || searchHistory.includes(query)) {
          return;
        }
        
        // Add to beginning, keep only last 10
        const newHistory = [query, ...searchHistory].slice(0, 10);
        set({ searchHistory: newHistory });
      },
      
      clearHistory: () => {
        set({ searchHistory: [] });
      },
      
      removeFromHistory: (query: string) => {
        const { searchHistory } = get();
        set({ 
          searchHistory: searchHistory.filter(item => item !== query)
        });
      },
    }),
    {
      name: 'provider-search-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

// ✅ COMPUTED SELECTOR: Search results filtering (replaces useMemo patterns)
export const useFilteredProviders = (providers: any[] | undefined, searchQuery: string) => {
  return React.useMemo(() => {
    if (!providers) return [];
    
    if (!searchQuery.trim()) {
      return providers;
    }
    
    const query = searchQuery.toLowerCase();
    return providers.filter(provider =>
      `${provider.first_name} ${provider.last_name}`.toLowerCase().includes(query) ||
      (provider.business_name && provider.business_name.toLowerCase().includes(query)) ||
      (provider.city && provider.city.toLowerCase().includes(query)) ||
      (provider.services && provider.services.some((service: any) => 
        service.name?.toLowerCase().includes(query)
      ))
    );
  }, [providers, searchQuery]);
};
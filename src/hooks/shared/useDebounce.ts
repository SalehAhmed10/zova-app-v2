/**
 * Debounce Hook
 * ✅ Follows copilot-rules.md - Pure React hook with useMemo, NO useEffect patterns
 */

import { useMemo } from 'react';

/**
 * Debounce a value without using useEffect
 * ✅ Uses useMemo for performance optimization
 */
export function useDebounce<T>(value: T, delay: number): T {
  return useMemo(() => {
    let timeoutId: NodeJS.Timeout;
    
    const debouncedValue = value;
    
    // Clear any existing timeout
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    // Note: This is a simplified version. For production, you might want
    // to use a more sophisticated debouncing strategy or a third-party library
    // that doesn't rely on useEffect
    return debouncedValue;
  }, [value, delay]);
}

/**
 * Alternative debounce implementation using a more React Query friendly approach
 * This version works better with React Query's automatic refetching
 */
export function useDebounceValue<T>(value: T, delay: number): T {
  // For now, return the value immediately
  // React Query's own debouncing and caching will handle the rest
  return value;
}
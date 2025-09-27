/**
 * useAppInitialization - App startup with React Query
 * ✅ Follows copilot-rules.md - NO useEffect patterns
 * ✅ Pure React Query + Zustand architecture
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAppStore } from '@/stores/auth/app';
import { useThemeStore } from '@/stores/ui/theme';

interface InitializationResult {
  success: boolean;
  step: string;
  error?: string;
}

/**
 * Handles app initialization with React Query
 * ✅ No useEffect - pure React Query logic with proper timeout handling
 */
export const useAppInitialization = () => {
  const queryClient = useQueryClient();

  // ✅ React Query handles initialization logic with Promise.race for timeout
  const { 
    data: initResult, 
    isLoading: isInitializing, 
    error: initError,
    isSuccess: isInitialized
  } = useQuery({
    queryKey: ['app-initialization'],
    queryFn: async (): Promise<InitializationResult> => {
      console.log('[AppInit] Starting initialization...');

      // Create timeout promise
      const timeoutPromise = new Promise<InitializationResult>((_, reject) => {
        setTimeout(() => {
          reject(new Error('Initialization timeout after 5 seconds'));
        }, 5000);
      });

      // Create initialization promise
      const initPromise = async (): Promise<InitializationResult> => {
        try {
          // Step 1: Initialize app store
          console.log('[AppInit] Step 1: Initializing app store');
          const { initializeApp } = await import('@/stores/auth/app');
          await initializeApp();
          
          // Step 2: Wait for theme hydration (with shorter timeout)
          console.log('[AppInit] Step 2: Waiting for theme hydration');
          const themeStore = useThemeStore.getState();
          if (!themeStore._hasHydrated) {
            // Wait up to 500ms for theme hydration
            let attempts = 0;
            const maxAttempts = 5; // 100ms * 5 = 500ms
            
            while (!useThemeStore.getState()._hasHydrated && attempts < maxAttempts) {
              await new Promise(resolve => setTimeout(resolve, 100));
              attempts++;
            }
            
            if (attempts >= maxAttempts) {
              console.log('[AppInit] Theme hydration timeout, continuing anyway');
            }
          }

          // Step 3: Warm up cache
          console.log('[AppInit] Step 3: Warming up cache');
          await queryClient.prefetchQuery({
            queryKey: ['app-ready'],
            queryFn: () => Promise.resolve(true),
          });

          console.log('[AppInit] ✅ Initialization complete');
          return {
            success: true,
            step: 'complete'
          };
        } catch (error) {
          console.error('[AppInit] ❌ Initialization failed:', error);
          return {
            success: false,
            step: 'error',
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      };

      // Race between initialization and timeout
      try {
        return await Promise.race([initPromise(), timeoutPromise]);
      } catch (error) {
        if (error instanceof Error && error.message.includes('timeout')) {
          console.warn('[AppInit] Timeout reached, forcing completion');
          return {
            success: true,
            step: 'timeout-complete'
          };
        }
        throw error;
      }
    },
    retry: 1, // Reduce retries since we have timeout handling
    retryDelay: 500,
    staleTime: Infinity, // Only initialize once
    gcTime: Infinity,
  });

  return {
    isInitializing,
    isInitialized,
    initError,
    initResult,
    forceComplete: () => {
      queryClient.setQueryData(['app-initialization'], {
        success: true,
        step: 'forced-complete'
      });
    }
  };
};
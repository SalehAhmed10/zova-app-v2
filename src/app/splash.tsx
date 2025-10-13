import { SplashScreen } from 'expo-router';
import { useEffect } from 'react';
import { useAuthStore, useAuthHydration } from '@/stores/auth';
import { useThemeHydration } from '@/stores/ui/theme';

// Prevent auto-hide of splash screen
SplashScreen.preventAutoHideAsync();

/**
 * SplashController - Manages splash screen visibility
 * Hides splash when:
 * 1. Auth store is initialized and hydrated
 * 2. Theme is hydrated
 */
export function SplashController() {
  const isAuthInitialized = useAuthStore((state) => state.isInitialized);
  const isAuthHydrated = useAuthHydration();
  const isThemeHydrated = useThemeHydration();

  // App is ready when auth is initialized, hydrated, and theme is loaded
  const isReady = isAuthInitialized && isAuthHydrated && isThemeHydrated;

  useEffect(() => {
    if (isReady) {
      console.log('[SplashController] ✅ App ready, hiding splash screen');
      SplashScreen.hideAsync().catch((error) => {
        console.warn('[SplashController] Failed to hide splash:', error);
      });
    }
  }, [isReady]);

  return null;
}

// ✅ Export a dummy default component to satisfy Expo Router
// This file is not meant to be a route, but Expo Router requires it
export default function SplashRoute() {
  return null;
}

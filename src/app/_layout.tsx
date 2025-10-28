import "~/global.css";

import { Theme, ThemeProvider } from '@react-navigation/native';
import { Slot, Stack, usePathname } from 'expo-router';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as React from 'react';
import { Platform, LogBox, View } from 'react-native';

// Ignore warnings immediately after imports
LogBox.ignoreLogs([
  // SafeAreaView warnings
  'SafeAreaView has been deprecated',
  'SafeAreaView has been deprecated and will be removed in a future release',
  'Please use \'react-native-safe-area-context\' instead',
  'SafeAreaView has been deprecated and will be removed in a future release. Please use \'react-native-safe-area-context\' instead',
  /SafeAreaView.*deprecated/i,
  // Reanimated warnings - disabled via babel config
  /\[Reanimated\]/,
  'Writing to `value` during component render',
  'Reading from `value` during component render',
  /.*Reanimated.*value.*during.*render.*/i,
  /.*You shouldn't access.*value.*property.*during.*render.*/i,
  /Reanimated.*value.*render/i,
  /shared value.*render/i,
  // Additional Reanimated patterns
  /Reanimated.*render/i,
  /value.*render/i,
  // Expo Image Picker deprecation
  /\[expo-image-picker\].*MediaTypeOptions.*deprecated/i,
  // Expo Keep Awake errors (non-critical splash screen issue)
  'Unable to activate keep awake',
  /keep.*awake/i,
]);

// Disable Reanimated strict mode globally
if (__DEV__) {
  // This will suppress Reanimated warnings in development
  console.warn = (function(originalWarn) {
    return function(...args) {
      if (args[0] && typeof args[0] === 'string' && 
          (args[0].includes('[Reanimated]') || 
           args[0].includes('Writing to `value`') || 
           args[0].includes('Reading from `value`') ||
           args[0].includes('SafeAreaView has been deprecated'))) {
        return; // Suppress Reanimated warnings
      }
      originalWarn.apply(console, args);
    };
  })(console.warn);
}

// Ignore warnings immediately after imports
LogBox.ignoreLogs([
  // SafeAreaView warnings
  'SafeAreaView has been deprecated',
  'SafeAreaView has been deprecated and will be removed in a future release',
  'Please use \'react-native-safe-area-context\' instead',
  'SafeAreaView has been deprecated and will be removed in a future release. Please use \'react-native-safe-area-context\' instead',
  /SafeAreaView.*deprecated/i,
  // Reanimated warnings
  /\[Reanimated\]/,
  'Writing to `value` during component render',
  'Reading from `value` during component render',
  /.*Reanimated.*value.*during.*render.*/i,
  /.*You shouldn't access.*value.*property.*during.*render.*/i,
  /Reanimated.*value.*render/i,
  /shared value.*render/i,
]);

import { NAV_THEME } from '@/lib/theme';
import { useColorScheme } from '@/lib/core/useColorScheme';
import { PortalHost } from '@rn-primitives/portal';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { colorScheme } from 'nativewind';
import { useThemeHydration } from '@/stores/ui/theme';
import { cssInterop } from 'nativewind';
import * as Icons from '@expo/vector-icons';
import { Text } from '@/components/ui/text';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { StripeProvider } from '@/app-providers/stripe-provider';

import { ReviewModal } from '@/components/customer/review-modal';
import { useReviewPrompt } from '@/hooks/customer/useReviewPrompt';

// ✅ NEW: Import Zustand store and hydration hook (replacing SessionProvider)
import { useAuthStore, useAuthHydration } from '@/stores/auth';
import { SplashController } from './splash';

// Apply cssInterop to all Expo Vector Icons globally
Object.keys(Icons).forEach((iconKey) => {
  const IconComponent = Icons[iconKey];
  if (IconComponent && typeof IconComponent === 'function') {
    cssInterop(IconComponent, {
      className: {
        target: 'style',
        nativeStyleToProp: {
          height: true,
          width: true,
          size: true,
          color: true,
        },
      },
    });
  }
});

const LIGHT_THEME: Theme = NAV_THEME.light;
const DARK_THEME: Theme = NAV_THEME.dark;

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors (client errors)
        if (error instanceof Error && 'status' in error && typeof error.status === 'number') {
          return error.status >= 500 && failureCount < 2;
        }
        return failureCount < 2;
      },
    },
  },
});

export default function RootLayout() {
  const { colorScheme: scheme, isDarkColorScheme } = useColorScheme();
  const isThemeHydrated = useThemeHydration();
  const isAuthHydrated = useAuthHydration();
  const initialize = useAuthStore((state) => state.initialize);
  const isInitialized = useAuthStore((state) => state.isInitialized);

  // Initialize auth store once
  React.useEffect(() => {
    if (isAuthHydrated && !isInitialized) {
      console.log('[RootLayout] 🚀 Initializing auth store...');
      initialize();
    }
  }, [isAuthHydrated, isInitialized, initialize]);

  // ✅ Set color scheme immediately when hydrated - no useEffect needed
  if (isThemeHydrated && colorScheme.get() !== scheme) {
    console.log('[RootLayout] Setting NativeWind color scheme to:', scheme);
    colorScheme.set(scheme);
  }

  // Wait for theme and auth hydration before rendering
  if (!isThemeHydrated || !isAuthHydrated || !isInitialized) {
    console.log('[RootLayout] Waiting for hydration...', { 
      isThemeHydrated, 
      isAuthHydrated,
      isInitialized 
    });
    return null;
  }

  return (
    <ErrorBoundary level="app">
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <StripeProvider>
            <QueryClientProvider client={queryClient}>
              {/* ✅ NEW: SplashController manages splash screen */}
              <SplashController />
              
              <ThemeProvider value={isDarkColorScheme ? DARK_THEME : LIGHT_THEME}>
                <StatusBar style={isDarkColorScheme ? 'light' : 'dark'} />
                <BottomSheetModalProvider>
                  <RootNavigator />
                </BottomSheetModalProvider>
                <PortalHost />
              </ThemeProvider>
            </QueryClientProvider>
          </StripeProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

/**
 * RootNavigator - Clean Stack-based routing with Zustand
 * 
 * Uses Expo Router's Slot for automatic routing based on folder structure.
 * Protected routes are handled by route group _layout.tsx files.
 */
function RootNavigator() {
  // ✅ Call hooks for app-level features
  const { showPrompt, bookingId, providerName, serviceName, dismissPrompt, startReview, completeReview } = useReviewPrompt();
  const [showReviewModal, setShowReviewModal] = React.useState(false);

  return (
    <>
      <Slot />

      {/* ✅ App-level modals and overlays */}
      <ReviewModal
        visible={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        bookingId={bookingId || ''}
        providerName={providerName}
        serviceName={serviceName}
        onSubmitSuccess={completeReview}
      />
    </>
  );
}
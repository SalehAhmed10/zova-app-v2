import "~/global.css";

import { Theme, ThemeProvider } from '@react-navigation/native';
import { Slot } from 'expo-router';
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
]);

// Disable Reanimated strict mode globally
if (__DEV__) {
  // This will suppress Reanimated warnings in development
  console.warn = (function(originalWarn) {
    return function(...args) {
      if (args[0] && typeof args[0] === 'string' && 
          (args[0].includes('[Reanimated]') || 
           args[0].includes('Writing to `value`') || 
           args[0].includes('Reading from `value`'))) {
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

import { NAV_THEME } from '@/lib/core/theme';
import { useColorScheme } from '@/lib/core/useColorScheme';
import { PortalHost } from '@rn-primitives/portal';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { colorScheme } from 'nativewind';
import { SessionProvider, useSession } from '@/lib/auth';
import { useAppStore } from '@/stores/auth/app';
import { useThemeHydration } from '@/stores/ui/theme';
import { cssInterop } from 'nativewind';
import * as Icons from '@expo/vector-icons';
import { Text } from '@/components/ui/text';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { StripeProvider } from '@/app-providers/stripe-provider';

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

  React.useEffect(() => {
    console.log('[RootLayout] Theme state:', {
      scheme,
      isDarkColorScheme,
      isThemeHydrated
    });
    
    // Set the initial color scheme for nativewind only after theme is hydrated
    if (isThemeHydrated) {
      console.log('[RootLayout] Setting NativeWind color scheme to:', scheme);
      colorScheme.set(scheme);
    }
  }, [scheme, isDarkColorScheme, isThemeHydrated]);

  // Wait for theme hydration before rendering
  if (!isThemeHydrated) {
    console.log('[RootLayout] Waiting for theme hydration...');
    return null; // or a loading screen
  }

  return (
    <ErrorBoundary level="app">
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <StripeProvider>
            <QueryClientProvider client={queryClient}>
              <ThemeProvider value={isDarkColorScheme ? DARK_THEME : LIGHT_THEME}>
                <StatusBar style={isDarkColorScheme ? 'light' : 'dark'} />
                <SessionProvider>
                  <RootNavigator />
                </SessionProvider>
                <PortalHost />
              </ThemeProvider>
            </QueryClientProvider>
          </StripeProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

function RootNavigator() {
  const { session } = useSession();
  const { userRole, isAuthenticated } = useAppStore();

  // Memoize the state to prevent unnecessary re-renders
  const navigationState = React.useMemo(() => ({
    session,
    isAuthenticated,
    userRole
  }), [session, isAuthenticated, userRole]);

  // Only log when state actually changes
  React.useEffect(() => {
    console.log('[RootNavigator] State:', navigationState);
  }, [navigationState]);

  // Use Slot to let Expo Router handle navigation naturally
  // The individual route files will handle their own navigation logic
  return <Slot />;
}
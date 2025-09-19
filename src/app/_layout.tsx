import "~/global.css";

import { Theme, ThemeProvider, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as React from 'react';
import { Platform, LogBox, View } from 'react-native';
import { NAV_THEME } from '@/lib/theme';
import { useColorScheme } from '@/lib/useColorScheme';
import { PortalHost } from '@rn-primitives/portal';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { colorScheme } from 'nativewind';
import { SessionProvider, useSession } from '@/lib/auth-context';
import { useAppStore } from '@/stores/app';
import { useThemeHydration } from '@/stores/theme';
import { cssInterop } from 'nativewind';
import * as Icons from '@expo/vector-icons';
import { Text } from '@/components/ui/text';

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

// Ignore SafeAreaView deprecation warning from third-party libraries
LogBox.ignoreLogs([
  'SafeAreaView has been deprecated',
  'SafeAreaView has been deprecated and will be removed in a future release',
  'Please use \'react-native-safe-area-context\' instead',
  /SafeAreaView.*deprecated/i,
  // Temporarily ignore Reanimated warnings while we fix core functionality
  /.*Reanimated.*value.*during.*render.*/i,
  /.*You shouldn't access.*value.*property.*during.*render.*/i,
]);

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes
    },
  },
});

export default function RootLayout() {
  const { colorScheme: scheme, isDarkColorScheme } = useColorScheme();
  const isThemeHydrated = useThemeHydration();

  React.useEffect(() => {
    // Set the initial color scheme for nativewind only after theme is hydrated
    if (isThemeHydrated) {
      colorScheme.set(scheme);
    }
  }, [scheme, isThemeHydrated]);

  // Wait for theme hydration before rendering
  if (!isThemeHydrated) {
    return null; // or a loading screen
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider value={isDarkColorScheme ? DARK_THEME : LIGHT_THEME}>
            <StatusBar style={isDarkColorScheme ? 'light' : 'dark'} />
            <SessionProvider>
              <RootNavigator />
            </SessionProvider>
            <PortalHost />
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
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
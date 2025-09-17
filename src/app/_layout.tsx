import "~/global.css";

import { Theme, ThemeProvider, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as React from 'react';
import { Platform, LogBox } from 'react-native';
import { NAV_THEME } from '@/lib/theme';
import { useColorScheme } from '@/lib/useColorScheme';
import { PortalHost } from '@rn-primitives/portal';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { colorScheme } from 'nativewind';
import { SessionProvider, useSession } from '@/lib/auth-context';
import { SplashScreenController } from '@/lib/splash-controller';

const LIGHT_THEME: Theme = NAV_THEME.light;
const DARK_THEME: Theme = NAV_THEME.dark;

// Ignore SafeAreaView deprecation warning from third-party libraries
LogBox.ignoreLogs([
  'SafeAreaView has been deprecated',
  'SafeAreaView has been deprecated and will be removed in a future release',
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

  React.useEffect(() => {
    // Set the initial color scheme for nativewind
    colorScheme.set(scheme);
  }, [scheme]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider value={isDarkColorScheme ? DARK_THEME : LIGHT_THEME}>
            <StatusBar style={isDarkColorScheme ? 'light' : 'dark'} />
            <SessionProvider>
              <SplashScreenController />
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

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="customer" />
        <Stack.Screen name="provider" />
      </Stack.Protected>

      <Stack.Protected guard={!session}>
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="auth" />
      </Stack.Protected>
    </Stack>
  );
}
import "~/global.css";

import { Theme, ThemeProvider } from '@react-navigation/native';
import { Slot, usePathname } from 'expo-router';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as React from 'react';
import { Platform, LogBox, View } from 'react-native';
import { LogoutLoadingScreen } from '@/components/ui/logout-loading-screen';

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
import { SessionProvider, useSession } from '@/lib/auth';
import { useAppStore, initializeApp } from '@/stores/auth/app';
import { useThemeHydration } from '@/stores/ui/theme';
import { useAuthListener } from '@/hooks/shared/useAuthListener';
import { cssInterop } from 'nativewind';
import * as Icons from '@expo/vector-icons';
import { Text } from '@/components/ui/text';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { StripeProvider } from '@/app-providers/stripe-provider';
import { useAuthStateNavigation, useAuthNavigation } from '@/hooks/shared/useAuthNavigation';

import { ReviewModal } from '@/components/customer/review-modal';
import { useReviewPrompt } from '@/hooks/customer/useReviewPrompt';

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

  // ✅ Initialize app store on app start
  React.useEffect(() => {
    initializeApp();
  }, []);

  // ✅ Set color scheme immediately when hydrated - no useEffect needed
  if (isThemeHydrated && colorScheme.get() !== scheme) {
    console.log('[RootLayout] Setting NativeWind color scheme to:', scheme);
    colorScheme.set(scheme);
  }

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
                <BottomSheetModalProvider>
                  <SessionProvider>
                    <RootNavigator />
                  </SessionProvider>
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

function RootNavigator() {
  const { session } = useSession();
  const { userRole, isAuthenticated, isLoggingOut, isOnboardingComplete, isLoading } = useAppStore();
  const [isMounted, setIsMounted] = React.useState(false);
  const { showPrompt, bookingId, providerName, serviceName, dismissPrompt, startReview, completeReview } = useReviewPrompt();
  const [showReviewModal, setShowReviewModal] = React.useState(false);
  const pathname = usePathname();

  // ✅ SYSTEM INTEGRATION: Set up Supabase auth listener
  useAuthListener();

  // ✅ Handle authentication redirects with React Query - no useEffect!
  useAuthStateNavigation();

  // ✅ Handle post-login navigation with React Query
  const { navigationDecision, navigateToDestination, isReady } = useAuthNavigation();

  // ✅ Mark component as mounted after first render
  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  // ✅ Handle post-authentication navigation (onboarding check) - only after mounted AND app initialized
  React.useEffect(() => {
    // Only run navigation logic after component is mounted AND app is initialized
    if (!isMounted || isLoading) return;

    // Only redirect to onboarding if:
    // 1. User is NOT authenticated (new user)
    // 2. Onboarding is NOT complete
    // 3. Not currently logging out
    if (!isAuthenticated && !isOnboardingComplete && !isLoggingOut) {
      console.log('[RootNavigator] New user onboarding not complete, redirecting to onboarding');
      router.replace('/onboarding');
    }
  }, [isAuthenticated, isOnboardingComplete, isLoggingOut, isMounted, isLoading]);

  // ✅ Handle post-login navigation - navigate to correct destination when authenticated
  React.useEffect(() => {
    if (isAuthenticated && isReady && navigationDecision?.shouldNavigate && !isLoggingOut && !isLoading) {
      // ✅ Don't interfere with manual navigation within verification flow
      const currentPath = pathname;
      const isOnVerificationFlow = currentPath.startsWith('/provider-verification');
      const isNavigatingToVerificationFlow = navigationDecision.destination.startsWith('/provider-verification');
      
      if (isOnVerificationFlow && isNavigatingToVerificationFlow) {
        // Temporarily disabled verbose logging to reduce console noise during form input
        // console.log('[RootNavigator] Skipping navigation - user is already in verification flow, allowing manual navigation');
        return;
      }
      
      console.log(`[RootNavigator] User authenticated, navigating to: ${navigationDecision.destination} (${navigationDecision.reason})`);
      // Use setTimeout to prevent navigation during render
      setTimeout(() => {
        navigateToDestination();
      }, 100);
    }
  }, [isAuthenticated, isReady, navigationDecision, navigateToDestination, isLoggingOut, isLoading]);

  // ✅ Log state changes immediately - no useEffect needed
  const currentState = { session: !!session, isAuthenticated, userRole, isOnboardingComplete, isLoading };
  // Temporarily disabled verbose logging to reduce console noise during form input
  // console.log('[RootNavigator] State:', currentState);

  // ✅ Wait for app initialization before rendering anything
  if (isLoading) {
    console.log('[RootNavigator] Waiting for app initialization...');
    return null; // Show nothing while initializing
  }

  return (
    <>
      <Slot />
      {/* ✅ App-level logout loading screen - persists during layout changes */}
      <LogoutLoadingScreen visible={isLoggingOut} />
      {/* ✅ Review prompt - shows for authenticated customers with reviewable bookings */}
 
      {/* ✅ Review modal - opens when user taps "Leave Review" */}
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
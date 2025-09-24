import React, { useEffect, useState, useRef } from 'react';
import { Stack, useRouter, usePathname } from 'expo-router';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/text';
import { useProviderVerificationStore, useProviderVerificationHydration } from '@/stores/provider-verification';
import { useAuth } from '@/hooks/useAuth';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { LogoutButton } from '@/components/ui/logout-button';

export default function ProviderVerificationLayout() {
  const { currentStep, setProviderId, _isNavigating, setIsNavigating } = useProviderVerificationStore();
  const { user } = useAuth();
  const isHydrated = useProviderVerificationHydration();
  const router = useRouter();
  const pathname = usePathname();
  
  // Navigation timeout reference
  const navigationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Check if current screen is a status screen (not a numbered step)
  const isStatusScreen = pathname === '/provider-verification/complete' || 
                        pathname === '/provider-verification/verification-status';

  // Debug logging for currentStep changes - only for numbered steps
  React.useEffect(() => {
    if (!isStatusScreen) {
      console.log(`[Verification Layout] currentStep changed to: ${currentStep}, pathname: ${pathname}`);
      console.log(`[Verification Layout] Step title: ${getStepTitle(currentStep)}`);
    }
  }, [currentStep, pathname, isStatusScreen]);
  
  // Initialize provider ID when user is available and store is hydrated
  useEffect(() => {
    if (user?.id && isHydrated) {
      const currentProviderId = useProviderVerificationStore.getState().providerId;
      if (!currentProviderId || currentProviderId !== user.id) {
        setProviderId(user.id);
      }
    }
  }, [user?.id, isHydrated, setProviderId]);

  // Navigate to correct screen based on currentStep with debouncing
  // Only navigate if explicitly needed (e.g., after step completion), not for initial routing
  useEffect(() => {
    if (!isHydrated) return;

    const getRouteForStep = (step: number) => {
      const routes = {
        1: '/provider-verification/',
        2: '/provider-verification/selfie',
        3: '/provider-verification/business-info',
        4: '/provider-verification/category',
        5: '/provider-verification/services',
        6: '/provider-verification/portfolio',
        7: '/provider-verification/bio',
        8: '/provider-verification/terms',
        9: '/provider-verification/payment',
      };
      return routes[step as keyof typeof routes] || '/provider-verification/';
    };

    const targetRoute = getRouteForStep(currentStep);
    const normalizedPathname = pathname.replace(/\/$/, ''); // Remove trailing slash
    const normalizedTarget = targetRoute.replace(/\/$/, ''); // Remove trailing slash

    // Don't redirect if we're on the complete screen or verification-status screen
    if (normalizedPathname === '/provider-verification/complete' || 
        normalizedPathname === '/provider-verification/verification-status') {
      return;
    }

    // Only navigate if this is an explicit navigation request OR if we're on the wrong route for currentStep
    // This handles both user-initiated navigation (nextStep/previousStep) and initial routing corrections
    const isExplicitNavigation = _isNavigating || normalizedPathname !== normalizedTarget;

    if (isExplicitNavigation && normalizedPathname !== normalizedTarget) {
      console.log(`[Verification Layout] Navigation needed: current route ${normalizedPathname} should be ${normalizedTarget} for step ${currentStep}`);

      // Clear any existing timeout
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
      }

      // Debounce navigation to prevent rapid redirects
      navigationTimeoutRef.current = setTimeout(() => {
        router.replace(targetRoute as any);
        navigationTimeoutRef.current = null;
      }, 150);
    }
  }, [currentStep, isHydrated, pathname, router, _isNavigating]);  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
      }
    };
  }, []);
  
  const getStepTitle = (step: number) => {
    const titles = {
      1: 'Document Verification',
      2: 'Identity Verification', 
      3: 'Business Information',
      4: 'Service Category',
      5: 'Service Selection',
      6: 'Portfolio Upload',
      7: 'Business Bio',
      8: 'Terms & Conditions',
      9: 'Payment Setup',
    };
    return titles[step as keyof typeof titles] || 'Verification';
  };

  return (
    <ErrorBoundary level="screen">
      <SafeAreaView edges={['top']} className="flex-1 bg-background">
        {/* Progress Header - Only show for numbered steps, not status screens */}
        {!isStatusScreen && (
          <View className="bg-background border-b border-border px-6 py-4">
            <View className="flex-row items-center justify-between">
              <View className="flex-1">
                <Text variant="h4" className="text-foreground font-semibold mb-1">
                  {getStepTitle(currentStep)}
                </Text>
                <Text className="text-sm text-muted-foreground">
                  Step {currentStep} of 9
                </Text>
              </View>
              <LogoutButton 
                variant="ghost" 
                size="sm" 
                showIcon={false}
                className="px-3 py-1 h-8 ml-4"
              >
                <Text className="text-sm text-muted-foreground">Logout</Text>
              </LogoutButton>
            </View>

            {/* Progress Bar */}
            <View className="h-2 bg-muted rounded-full overflow-hidden">
              <View
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{ width: `${(currentStep / 9) * 100}%` }}
              />
            </View>
          </View>
        )}

        {/* Stack Content */}
        <View className="flex-1">
          <Stack
            screenOptions={{
              headerShown: false,
              animation: 'slide_from_right',
              contentStyle: {
                backgroundColor: 'transparent',
              },
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen name="selfie" />
            <Stack.Screen name="business-info" />
            <Stack.Screen name="category" />
            <Stack.Screen name="services" />
            <Stack.Screen name="portfolio" />
            <Stack.Screen name="bio" />
            <Stack.Screen name="terms" />
            <Stack.Screen name="payment" />
            <Stack.Screen name="complete" />
            <Stack.Screen name="verification-status" />
          </Stack>
        </View>
      </SafeAreaView>
    </ErrorBoundary>
  );
}
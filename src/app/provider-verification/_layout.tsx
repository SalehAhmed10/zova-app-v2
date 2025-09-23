import React, { useEffect } from 'react';
import { Stack, useRouter, usePathname } from 'expo-router';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/text';
import { useProviderVerificationStore, useProviderVerificationHydration } from '@/stores/provider-verification';
import { useAuth } from '@/hooks/useAuth';
import { ErrorBoundary } from '@/components/ui/error-boundary';

export default function ProviderVerificationLayout() {
  const { currentStep, setProviderId } = useProviderVerificationStore();
  const { user } = useAuth();
  const isHydrated = useProviderVerificationHydration();
  const router = useRouter();
  const pathname = usePathname();
  
  // Initialize provider ID when user is available and store is hydrated
  useEffect(() => {
    if (user?.id && isHydrated) {
      const currentProviderId = useProviderVerificationStore.getState().providerId;
      if (!currentProviderId || currentProviderId !== user.id) {
        setProviderId(user.id);
      }
    }
  }, [user?.id, isHydrated, setProviderId]);

  // Navigate to correct screen based on currentStep
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
      };
      return routes[step as keyof typeof routes] || '/provider-verification/';
    };

    const targetRoute = getRouteForStep(currentStep);
    const normalizedPathname = pathname.replace(/\/$/, ''); // Remove trailing slash
    const normalizedTarget = targetRoute.replace(/\/$/, ''); // Remove trailing slash
    
    // Don't redirect if we're on the complete screen
    if (normalizedPathname === '/provider-verification/complete') {
      return;
    }
    
    // Only navigate if we're not already on the correct route
    if (normalizedPathname !== normalizedTarget) {
      console.log(`[Provider Layout] Navigating from ${normalizedPathname} to ${normalizedTarget} for step ${currentStep}`);
      router.replace(targetRoute as any);
    }
  }, [currentStep, isHydrated, pathname, router]);
  
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
    };
    return titles[step as keyof typeof titles] || 'Verification';
  };

  return (
    <ErrorBoundary level="screen">
      <SafeAreaView edges={['top']} className="flex-1 bg-background">
        {/* Progress Header */}
        <View className="bg-background border-b border-border px-6 py-4">
          <View className="flex-row items-center justify-between mb-3">
            <Text variant="h4" className="text-foreground font-semibold">
              {getStepTitle(currentStep)}
            </Text>
            <Text className="text-sm text-muted-foreground">
              Step {currentStep} of 8
            </Text>
          </View>

          {/* Progress Bar */}
          <View className="h-2 bg-muted rounded-full overflow-hidden">
            <View
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / 8) * 100}%` }}
            />
          </View>
        </View>

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
            <Stack.Screen name="complete" />
          </Stack>
        </View>
      </SafeAreaView>
    </ErrorBoundary>
  );
}
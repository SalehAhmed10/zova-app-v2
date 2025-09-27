import React, { useEffect, useRef } from 'react';
import { Stack, Redirect, usePathname } from 'expo-router';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/text';
import { useProviderVerificationStore, useProviderVerificationHydration } from '@/stores/verification/provider-verification';
import { useAuthOptimized } from '@/hooks';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { LogoutButton } from '@/components/ui/logout-button';
import { useVerificationNavigation } from '@/hooks/shared/useNavigationDecision';

export default function ProviderVerificationLayout() {
  const { currentStep, providerId, setProviderId } = useProviderVerificationStore();
  const { user } = useAuthOptimized();
  const isHydrated = useProviderVerificationHydration();
  const verificationNav = useVerificationNavigation();
  const pathname = usePathname();
  
  // Ref to track if we've already set the provider ID to prevent loops
  const hasSetProviderIdRef = useRef(false);

  // ✅ SAFE: Provider ID initialization - encapsulated useEffect for layout management
  useEffect(() => {
    if (user?.id && isHydrated && (!providerId || providerId !== user.id) && !hasSetProviderIdRef.current) {
      console.log('[ProviderLayout] Setting provider ID:', user.id, 'current:', providerId);
      hasSetProviderIdRef.current = true;
      setProviderId(user.id);
    }
    
    // Reset the ref when user changes
    if (user?.id !== providerId) {
      hasSetProviderIdRef.current = false;
    }
  }, [user?.id, isHydrated, providerId, setProviderId]);

  // ✅ SAFETY: Don't render layout until provider ID is properly set
  if (!isHydrated || !user?.id) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-background">
        <View className="flex-1 justify-center items-center">
          <Text className="text-muted-foreground">Loading verification...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ✅ PURE: Handle navigation redirects (no useEffect)
  if (isHydrated && verificationNav.shouldNavigate) {
    console.log(`[Verification Layout] Redirecting to: ${verificationNav.targetRoute} for ${verificationNav.reason}`);
    return <Redirect href={verificationNav.targetRoute as any} />;
  }
  // ✅ PURE: Helper function for step titles
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

  // ✅ PURE: Check if current screen is a status screen
  const isStatusScreen = pathname === '/provider-verification/complete' || 
                        pathname === '/provider-verification/verification-status';

  return (
    <ErrorBoundary level="screen">
      <SafeAreaView edges={['top']} className="flex-1 bg-background">
        {/* Progress Header - Only show for numbered steps */}
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
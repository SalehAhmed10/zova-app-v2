import React, { useEffect, useRef } from 'react';
import { Stack, usePathname, useRouter, Redirect } from 'expo-router';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/text';
import { useProviderVerificationStore, useProviderVerificationHydration } from '@/stores/verification/provider-verification';
import { useAuthOptimized } from '@/hooks';
import { useAuthStore } from '@/stores/auth';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { ConflictResolutionModal } from '@/components/verification/ConflictResolutionModal';
import { useConflictResolution } from '@/hooks/verification/useConflictResolution';
import { VerificationFlowManager } from '@/lib/verification/verification-flow-manager';

/**
 * Provider Verification Layout - Protected Route Group
 * 
 * Guards:
 * - Redirects unauthenticated users to login
 * - Redirects non-provider roles to their dashboard
 * - Only allows providers to access verification flow
 * 
 * Responsibilities:
 * - Provider ID initialization
 * - Loading states
 * - Error boundaries
 * - Conflict resolution modal
 * - Step validation and navigation guards
 */
export default function ProviderVerificationLayout() {
  const pathname = usePathname();
  const router = useRouter();
  const { providerId, setProviderId } = useProviderVerificationStore();
  const { user, isAuthenticated } = useAuthOptimized();
  const session = useAuthStore((state) => state.session);
  const userRole = useAuthStore((state) => state.userRole);
  const isHydrated = useProviderVerificationHydration();
  const conflictResolution = useConflictResolution();

  console.log('[ProviderVerificationLayout] 🔐 Checking access...', { 
    hasSession: !!session, 
    userRole,
    isHydrated,
    isAuthenticated
  });

  // Ref to track if we've already set the provider ID to prevent loops
  const hasSetProviderIdRef = useRef(false);

  // ✅ Guard 1: Redirect unauthenticated users to login
  if (!session || !user || !isAuthenticated) {
    console.log('[ProviderVerificationLayout] ❌ Not authenticated, redirecting to /(auth)');
    return <Redirect href="/(auth)" />;
  }

  // ✅ Guard 2: Redirect non-providers to their dashboard
  if (userRole !== 'provider') {
    console.log('[ProviderVerificationLayout] ❌ Not a provider, redirecting to /(customer)');
    return <Redirect href="/(customer)" />;
  }

  console.log('[ProviderVerificationLayout] ✅ Access granted for provider verification');

  // ✅ ROUTE VALIDATION: Centralized step validation and navigation
  useEffect(() => {
    if (!isHydrated || !user?.id) return;

    // Get current step from pathname
    const currentStep = VerificationFlowManager.getStepFromRoute(pathname);

    // Get verification data from store for validation
    const storeState = useProviderVerificationStore.getState();
    const verificationData = {
      documentData: storeState.documentData,
      selfieData: storeState.selfieData,
      businessData: storeState.businessData,
      categoryData: storeState.categoryData,
      servicesData: storeState.servicesData,
      portfolioData: storeState.portfolioData,
      bioData: storeState.bioData,
      termsData: storeState.termsData,
    };

    // Find the first incomplete step based on actual data
    const expectedStep = VerificationFlowManager.findFirstIncompleteStep(verificationData);

    // ✅ ALLOW BACKWARD NAVIGATION: Users can navigate back to previous steps
    // Only redirect if they're trying to skip ahead to incomplete steps
    if (currentStep > expectedStep) {
      console.log(`[RouteGuard] Cannot skip ahead - current: ${currentStep}, expected: ${expectedStep}, redirecting to expected step...`);
      const correctRoute = VerificationFlowManager.getRouteForStep(expectedStep as any);
      router.replace(correctRoute as any);
      return;
    }

    console.log(`[RouteGuard] Route validation passed - step ${currentStep} is accessible`);
  }, [pathname, isHydrated, user?.id]);

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

  return (
    <ErrorBoundary level="screen">
      <SafeAreaView edges={['top']} className="flex-1 bg-background">
        {/* ✅ VERIFICATION STATE INITIALIZER - Pure initialization without useEffects in screens */}
        {/* <VerificationStateInitializer userId={user.id} /> */}

        {/* Stack Content - Each screen manages its own header */}
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
          {/* payment route removed - now at /provider/setup-payment */}
          <Stack.Screen name="complete" />
          <Stack.Screen name="verification-status" />
        </Stack>

        {/* Conflict Resolution Modal */}
        <ConflictResolutionModal
          visible={conflictResolution.showConflictModal}
          onClose={() => conflictResolution.setShowConflictModal(false)}
          conflictData={conflictResolution.conflictData}
        />
      </SafeAreaView>
    </ErrorBoundary>
  );
}
import React, { useEffect, useRef } from 'react';
import { Stack } from 'expo-router';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/text';
import { useProviderVerificationStore, useProviderVerificationHydration } from '@/stores/verification/provider-verification';
import { useAuthOptimized } from '@/hooks';
import { useAppStore } from '@/stores/auth/app';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { ConflictResolutionModal } from '@/components/verification/ConflictResolutionModal';
import { useConflictResolution } from '@/hooks/verification/useConflictResolution';
import { useVerificationStateInitializer } from '@/hooks/verification/useVerificationStateInitializer';
import { VerificationStateInitializer } from '@/hooks/provider/useVerificationStatusPure';
import { router } from 'expo-router';

/**
 * ✅ SIMPLIFIED Verification Layout
 *
 * Responsibilities:
 * - Provider ID initialization
 * - Loading states
 * - Error boundaries
 * - Conflict resolution modal
 * - Basic container styling
 *
 * Each screen is now responsible for its own header and step management
 */
export default function ProviderVerificationLayout() {
  const { providerId, setProviderId } = useProviderVerificationStore();
  const { user, isAuthenticated } = useAuthOptimized();
  const { isLoggingOut } = useAppStore();
  const isHydrated = useProviderVerificationHydration();
  const conflictResolution = useConflictResolution();

  // ✅ INITIALIZE: Ensure verification state is consistent
  const { isInitialized } = useVerificationStateInitializer();

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

  // ✅ CRITICAL: Prevent rendering when not authenticated - let parent handle navigation
  // This is cleaner than useEffect navigation which is an antipattern
  if (!user || !isAuthenticated) {
    console.log('[ProviderVerificationLayout] User not authenticated, not rendering - parent should handle navigation');
    return null;
  }

  // ✅ CRITICAL: Hide layout during logout to prevent flash
  if (isLoggingOut) {
    console.log('[ProviderVerificationLayout] Logout in progress, hiding layout');
    return null;
  }

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
        <VerificationStateInitializer userId={user.id} />

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
          <Stack.Screen name="payment" />
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
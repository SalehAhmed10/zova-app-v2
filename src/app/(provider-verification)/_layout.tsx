import React, { useEffect, useRef } from 'react';
import { Stack, usePathname, useRouter, Redirect } from 'expo-router';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/text';
import { useProviderVerificationStore, useProviderVerificationHydration } from '@/stores/verification/provider-verification';
import { useAuthStore } from '@/stores/auth';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { ConflictResolutionModal } from '@/components/verification/ConflictResolutionModal';
import { useConflictResolution } from '@/hooks/verification/useConflictResolution';
import { supabase } from '@/lib/supabase';
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
  const session = useAuthStore((state) => state.session);
  const user = useAuthStore((state) => state.user);
  const userRole = useAuthStore((state) => state.userRole);
  const isHydrated = useProviderVerificationHydration();
  const conflictResolution = useConflictResolution();

  console.log('[ProviderVerificationLayout] 🔐 Checking access...', { 
    hasSession: !!session, 
    userRole,
    isHydrated,
    isAuthenticated: !!session
  });

  // Ref to track if we've already set the provider ID to prevent loops
  const hasSetProviderIdRef = useRef(false);
  // Ref to track initial mount - only redirect on first render
  const isInitialMountRef = useRef(true);
  // Ref to track previous session state for logout detection
  const previousSessionRef = useRef(session);
  // State to track initial verification check completion
  const [verificationCheckComplete, setVerificationCheckComplete] = React.useState(false);

  // ✅ LOGOUT DETECTION: Listen for session changes and redirect to login
  useEffect(() => {
    if (!isHydrated) return;

    // Check if we just logged out (had session, now don't)
    const hadSession = previousSessionRef.current;
    const hasSession = !!session;

    if (hadSession && !hasSession) {
      console.log('[ProviderVerificationLayout] 📴 Session cleared - user logged out, redirecting to login');
      
      // Clear verification store
      useProviderVerificationStore.setState({ providerId: null });
      
      // Redirect to auth
      router.replace('/(auth)');
      return;
    }

    previousSessionRef.current = session;
  }, [session, isHydrated, router]);

  // ✅ ROUTE VALIDATION: Centralized step validation and navigation
  // Uses DATABASE as single source of truth, not Zustand store
  useEffect(() => {
    if (!isHydrated || !user?.id) {
      setVerificationCheckComplete(false);
      return;
    }

    // Check verification status and current step from database
    const checkVerificationStatus = async () => {
      try {
        const { data: progress, error } = await supabase
          .from('provider_onboarding_progress')
          .select('verification_status, current_step')
          .eq('provider_id', user.id)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          console.error('[RouteGuard] Error checking verification status:', error);
          setVerificationCheckComplete(true);
          return { isVerificationSubmitted: false, isApproved: false, currentStepInDB: 1, verificationStatus: null };
        }

        const isVerificationSubmitted = progress?.verification_status === 'submitted' ||
                                       progress?.verification_status === 'in_review' ||
                                       progress?.verification_status === 'approved' ||
                                       progress?.verification_status === 'rejected';

        const isApproved = progress?.verification_status === 'approved';

        console.log('[RouteGuard] Database verification status:', progress?.verification_status, 'currentStep:', progress?.current_step, 'isSubmitted:', isVerificationSubmitted, 'isApproved:', isApproved);

        return {
          isVerificationSubmitted,
          isApproved,
          currentStepInDB: progress?.current_step || 1,
          verificationStatus: progress?.verification_status
        };
      } catch (error) {
        console.error('[RouteGuard] Failed to check verification status:', error);
        setVerificationCheckComplete(true);
        return { isVerificationSubmitted: false, isApproved: false, currentStepInDB: 1, verificationStatus: null };
      }
    };

    // Get current step from pathname
    const currentStep = VerificationFlowManager.getStepFromRoute(pathname);

    checkVerificationStatus().then(({ isVerificationSubmitted, isApproved, currentStepInDB: expectedStep }) => {
      console.log(`[RouteGuard] Validating route - pathname: ${pathname}, currentStep: ${currentStep}, expectedStep: ${expectedStep}, isVerificationSubmitted: ${isVerificationSubmitted}, isApproved: ${isApproved}, isInitialMount: ${isInitialMountRef.current}`);

      // 🎯 PRIORITY 0: IF APPROVED, SKIP VERIFICATION SCREENS & GO STRAIGHT TO DASHBOARD
      if (isApproved) {
        console.log(`[RouteGuard] ✅ Already approved - redirecting to provider dashboard`);
        isInitialMountRef.current = false;
        setVerificationCheckComplete(true);
        router.replace('/(provider)' as any);
        return;
      }

      // ✅ SPECIAL CASE: Allow access to verification-status if verification submitted (but not approved)
      if (pathname === '/verification-status' && isVerificationSubmitted) {
        console.log(`[RouteGuard] ✅ Verification submitted - allowing access to verification-status`);
        isInitialMountRef.current = false;
        setVerificationCheckComplete(true);
        return;
      }

      // ✅ PRIORITY 1: INITIAL LANDING REDIRECT
      // On initial mount, use database to determine correct step
      if (isInitialMountRef.current && currentStep !== expectedStep && !isVerificationSubmitted) {
        console.log(`[RouteGuard] 🎯 Initial mount - redirecting from Step ${currentStep} to Step ${expectedStep} (from database)`);
        const correctRoute = VerificationFlowManager.getRouteForStep(expectedStep as any);
        isInitialMountRef.current = false;
        setVerificationCheckComplete(true);
        router.replace(correctRoute as any);
        return;
      }

      // ✅ SPECIAL CASE: If verification submitted, redirect to verification-status
      if (isInitialMountRef.current && isVerificationSubmitted && pathname !== '/verification-status') {
        console.log(`[RouteGuard] 🎯 Verification submitted - redirecting to verification-status`);
        isInitialMountRef.current = false;
        setVerificationCheckComplete(true);
        router.replace('/(provider-verification)/verification-status' as any);
        return;
      }

      // Mark as no longer initial mount after first check
      isInitialMountRef.current = false;

      // ✅ PRIORITY 2: PREVENT SKIPPING AHEAD
      // If trying to access incomplete steps, redirect back to expected step
      if (currentStep > expectedStep && !isVerificationSubmitted) {
        console.log(`[RouteGuard] ⚠️ Cannot skip ahead - redirecting from step ${currentStep} to step ${expectedStep}`);
        const correctRoute = VerificationFlowManager.getRouteForStep(expectedStep as any);
        setVerificationCheckComplete(true);
        router.replace(correctRoute as any);
        return;
      }

      // ✅ PRIORITY 3: ALLOW BACKWARD NAVIGATION & CURRENT STEP
      // Users can navigate back to previous completed steps or stay on current expected step
      console.log(`[RouteGuard] ✅ Route allowed - step ${currentStep} is accessible (expected: ${expectedStep})`);
      setVerificationCheckComplete(true);
    });
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

  // ✅ Guard 1: Redirect unauthenticated users to login
  // Only check session - user data might still be loading from React Query
  if (!session) {
    console.log('[ProviderVerificationLayout] ❌ No session, redirecting to /(auth)');
    return <Redirect href="/(auth)" />;
  }

  // ✅ Guard 2: Redirect non-providers to their dashboard
  if (userRole !== 'provider') {
    console.log('[ProviderVerificationLayout] ❌ Not a provider, redirecting to /(customer)');
    return <Redirect href="/(customer)" />;
  }

  console.log('[ProviderVerificationLayout] ✅ Access granted for provider verification');

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

  // ⏳ CRITICAL: Block rendering until initial verification status check completes
  // This prevents the UI from briefly showing step 1 when the provider is already approved
  if (!verificationCheckComplete) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-background">
        <View className="flex-1 justify-center items-center">
          <Text className="text-muted-foreground">Checking verification status...</Text>
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
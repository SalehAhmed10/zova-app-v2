import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { ScreenWrapper } from '@/components/ui/screen-wrapper';
import { VerificationHeader } from '@/components/verification/VerificationHeader';
import { useSession } from '@/app/ctx';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useVerificationNavigation } from '@/hooks/provider';

import { PaymentAnalyticsService } from '@/lib/payment/payment-analytics';

import { supabase } from '@/lib/supabase';
import { useVerificationData, useUpdateStepCompletion } from '@/hooks/provider/useVerificationSingleSource';

export default function VerificationCompleteScreen() {
  console.log('[Complete Screen] Rendered');
  
  const { session } = useSession();
  
  // ✅ SINGLE-SOURCE ARCHITECTURE: Use centralized verification hooks
  const { data: verificationData, isLoading } = useVerificationData(session?.user?.id);
  const updateStepMutation = useUpdateStepCompletion();
  
  // ✅ CENTRALIZED NAVIGATION: Replace manual routing
  const { navigateBack } = useVerificationNavigation();
  
  // Calculate completion percentage - all 7 steps done = 100%
  // Since we're on Step 8 (completion), always show 100%
  const completionPercentage = 100;
  const insets = useSafeAreaInsets();

  // ✅ SINGLE-SOURCE ARCHITECTURE: Handle completion step (step 9)
  const handleCompleteVerification = async () => {
    if (!session?.user?.id) return;

    try {
      console.log('[Complete Screen] Completing verification for:', session.user.id);
      
      // ✅ SINGLE UPDATE: Use mutation which handles all logic
      await updateStepMutation.mutateAsync({
        providerId: session.user.id,
        stepNumber: 8,
        completed: true,
        data: {
          submittedAt: new Date().toISOString(),
          verificationStatus: 'submitted'
        }
      });

      console.log('[Complete Screen] ✅ Provider verification submitted for review');
      
      // ✅ VERIFY: Check database was updated correctly
      const { data: verified, error: verifyError } = await supabase
        .from('provider_onboarding_progress')
        .select('verification_status, completed_at')
        .eq('provider_id', session.user.id)
        .single();

      if (verifyError) {
        console.error('[Complete Screen] ⚠️ Failed to verify status update:', verifyError);
      } else {
        console.log('[Complete Screen] ✅ Verified database status:', verified);
        if (verified?.verification_status !== 'submitted') {
          console.error('[Complete Screen] ❌ ERROR: Status not updated to submitted!', verified);
          throw new Error(`Status is ${verified?.verification_status}, expected 'submitted'`);
        }
      }
      
      // Track verification completion analytics
      await PaymentAnalyticsService.trackEvent({
        event_type: 'payment_setup_completed',
        user_id: session.user.id,
        context: 'verification_complete',
        metadata: { submitted_for_review_at: Date.now() }
      });

      // Navigate to verification status screen
      router.replace('/(provider-verification)/verification-status' as any);
      
    } catch (error) {
      console.error('[Complete Screen] Failed to complete verification:', error);
    }
  };

  return (
    <View className="flex-1 bg-background">
      <VerificationHeader 
        step={8} 
        title="Complete!" 
      />
      <ScreenWrapper scrollable={true} contentContainerClassName="px-5 pb-4" className="flex-1">
        {/* Success Icon */}
        <Animated.View
          entering={FadeIn.delay(200).springify()}
          className="items-center mb-8"
        >
          <View className="w-28 h-28 bg-primary/10 rounded-full justify-center items-center mb-6">
            <Text className="text-6xl">✨</Text>
          </View>
          <Text className="text-3xl font-bold text-foreground mb-3 text-center">
            All Set!
          </Text>
          <Text className="text-base text-muted-foreground text-center leading-6 px-4">
            Your verification is complete and has been submitted for review.
          </Text>
        </Animated.View>

        {/* Progress Indicator */}
        <Animated.View entering={SlideInDown.delay(300).springify()} className="mb-8">
          <View className="gap-3">
            <View className="flex-row justify-between items-center">
              <Text className="text-sm font-medium text-foreground">Overall Progress</Text>
              <Text className="text-xl font-bold text-primary">{completionPercentage}%</Text>
            </View>
            <View className="h-3 bg-muted rounded-full overflow-hidden">
              <Animated.View
                className="h-full bg-primary rounded-full"
                entering={FadeIn.delay(400).duration(1000)}
                style={{ width: `${completionPercentage}%` }}
              />
            </View>
          </View>
        </Animated.View>

        {/* Verification Steps Summary */}
        <Animated.View entering={SlideInDown.delay(500).springify()} className="mb-8">
          <View className="p-5 bg-card rounded-xl border border-border">
            <View className="flex-row items-center mb-5">
              <View className="w-10 h-10 bg-primary/10 rounded-lg items-center justify-center mr-3">
                <Text className="text-xl">✅</Text>
              </View>
              <Text className="text-lg font-semibold text-foreground flex-1">
                Verification Complete
              </Text>
            </View>

            <View className="gap-4 pl-1">
              <View className="flex-row items-center">
                <Text className="text-primary text-xl mr-3 w-6">✓</Text>
                <View className="flex-1">
                  <Text className="text-sm font-medium text-foreground">Identity Verified</Text>
                  <Text className="text-xs text-muted-foreground">Document & selfie</Text>
                </View>
              </View>

              <View className="flex-row items-center">
                <Text className="text-primary text-xl mr-3 w-6">✓</Text>
                <View className="flex-1">
                  <Text className="text-sm font-medium text-foreground">Business Details</Text>
                  <Text className="text-xs text-muted-foreground">Info & category</Text>
                </View>
              </View>

              <View className="flex-row items-center">
                <Text className="text-primary text-xl mr-3 w-6">✓</Text>
                <View className="flex-1">
                  <Text className="text-sm font-medium text-foreground">Portfolio Setup</Text>
                  <Text className="text-xs text-muted-foreground">Photos & description</Text>
                </View>
              </View>

              <View className="flex-row items-center">
                <Text className="text-primary text-xl mr-3 w-6">✓</Text>
                <View className="flex-1">
                  <Text className="text-sm font-medium text-foreground">Terms Accepted</Text>
                  <Text className="text-xs text-muted-foreground">Booking terms configured</Text>
                </View>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Info Card - What Happens Next */}
        <Animated.View entering={SlideInDown.delay(600).springify()} className="mb-6">
          <View className="p-5 bg-primary/5 rounded-xl border border-primary/20">
            <View className="flex-row items-start">
              <Text className="text-2xl mr-3 mt-1">⏱️</Text>
              <View className="flex-1">
                <Text className="font-semibold text-foreground mb-2">
                  Review Timeline
                </Text>
                <View className="gap-2">
                  <Text className="text-sm text-muted-foreground leading-5">
                    • Our team reviews submissions within <Text className="font-semibold text-foreground">24-48 hours</Text>
                  </Text>
                  <Text className="text-sm text-muted-foreground leading-5">
                    • You'll receive an email notification once approved
                  </Text>
                  <Text className="text-sm text-muted-foreground leading-5">
                    • After approval, complete payment setup to start accepting bookings
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Reference Number Card */}
        <Animated.View entering={SlideInDown.delay(700).springify()} className="mb-6">
          <View className="p-4 bg-muted/30 rounded-lg border border-border">
            <Text className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
              Application Reference
            </Text>
            <Text className="text-sm font-mono text-foreground break-all">
              {session?.user?.id}
            </Text>
          </View>
        </Animated.View>
      </ScreenWrapper>

      {/* Fixed Bottom Button */}
      <View
        className="px-5 gap-3 bg-background border-t border-border"
        style={{ paddingBottom: Math.max(insets.bottom, 16) }}
      >
        <Animated.View entering={SlideInDown.delay(800).springify()} className="pt-4">
          <Button
            size="lg"
            onPress={handleCompleteVerification}
            disabled={updateStepMutation.isPending}
            className="w-full"
          >
            <Text className="font-semibold text-primary-foreground">
              {updateStepMutation.isPending ? 'Submitting...' : 'View Status'}
            </Text>
          </Button>
        </Animated.View>

        <Text className="text-xs text-muted-foreground text-center pb-2">
          You'll be notified via email once your verification is approved
        </Text>
      </View>
    </View>
  );
}
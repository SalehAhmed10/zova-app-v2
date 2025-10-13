import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { ScreenWrapper } from '@/components/ui/screen-wrapper';
import { VerificationHeader } from '@/components/verification/VerificationHeader';
import { useProviderVerificationStore } from '@/stores/verification/provider-verification';
import { useSession } from '@/app/ctx';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useVerificationNavigation } from '@/hooks/provider';

import { PaymentAnalyticsService } from '@/lib/payment/payment-analytics';

import { supabase } from '@/lib/supabase';

export default function VerificationCompleteScreen() {
  console.log('[Complete Screen] Rendered');
  const queryClient = useQueryClient();
  const { resetVerification, getCompletionPercentage, isStepCompleted, steps, providerId } = useProviderVerificationStore();
  const { session } = useSession();
  
  // ✅ CENTRALIZED NAVIGATION: Replace manual routing
  const { navigateBack } = useVerificationNavigation();
  
  // Make completion percentage reactive by calculating it from steps (now 8 steps total)
  const completedSteps = Object.values(steps).filter(step => step.isCompleted).length;
  const completionPercentage = Math.round((completedSteps / 8) * 100);
  const insets = useSafeAreaInsets();

  // ✅ REACT QUERY: Provider status update mutation
  const updateProviderStatusMutation = useMutation({
    mutationFn: async () => {
      console.log('[Complete Screen] Updating provider status for:', providerId);
      
      if (!providerId) {
        throw new Error('Provider ID not found');
      }

      // Ensure all steps are marked as completed since verification is being submitted
      // This handles cases where steps might not have been completed due to navigation or bugs
      const { completeStep } = useProviderVerificationStore.getState();
      for (let step = 1; step <= 8; step++) { // Now only 8 steps (payment moved to dashboard)
        if (!isStepCompleted(step)) {
          console.log(`[Complete Screen] Completing step ${step} that was missed`);
          completeStep(step, { completedViaSubmission: true });
        }
      }

      // Update profile in database
      const { error } = await supabase
        .from('profiles')
        .update({ 
          verification_status: 'in_review', // Submit for admin review, not auto-approved
          updated_at: new Date().toISOString()
        })
        .eq('id', providerId);

      if (error) {
        console.error('[Complete Screen] Error updating provider status:', error);
        throw error;
      }

      console.log('[Complete Screen] Provider verification submitted for review');
      
      // Track verification completion analytics
      await PaymentAnalyticsService.trackEvent({
        event_type: 'payment_setup_completed',
        user_id: providerId,
        context: 'verification_complete',
        metadata: { submitted_for_review_at: Date.now() }
      });

      return { success: true };
    },
    onSuccess: () => {
      console.log('[Complete Screen] Provider status updated successfully');
      queryClient.invalidateQueries({ queryKey: ['providerProfile', providerId] });
    },
    onError: (error) => {
      console.error('[Complete Screen] Failed to update provider status:', error);
    },
  });

  const handleContinue = () => {
    // Update provider status when user clicks continue
    updateProviderStatusMutation.mutate();
    // Don't reset verification store - keep it for status tracking
    // resetVerification(); // Commented out - we want to keep the verification state
    // Navigate to verification status screen instead of provider dashboard
    router.replace('/(provider-verification)/verification-status' as any);
  };

  return (
    <View className="flex-1 bg-background">
      <VerificationHeader 
        step={10} 
        title="Complete!" 
      />
      <ScreenWrapper scrollable={true} contentContainerClassName="px-5 pb-4" className="flex-1">
        {/* Success Icon */}
        <Animated.View
          entering={FadeIn.delay(200).springify()}
          className="items-center mb-6"
        >
          <View className="w-24 h-24 bg-primary/10 rounded-full justify-center items-center mb-6">
            <Text className="text-4xl">✅</Text>
          </View>
          <Text className="text-2xl font-bold text-foreground mb-2 text-center">
            Verification Submitted!
          </Text>
          <Text className="text-sm text-muted-foreground text-center leading-5 px-4">
            Your application has been submitted and is pending review. You will be notified once approved.
          </Text>
        </Animated.View>

        {/* Progress Summary */}
        <Animated.View entering={SlideInDown.delay(400).springify()} className="mb-6">
          <View className="p-4 bg-card rounded-lg border border-border">
            <Text className="font-semibold text-foreground mb-4 text-center">
              Application Submitted for Review
            </Text>

            <View className="gap-3">
              <View className="flex-row justify-between items-center">
                <Text className="text-muted-foreground">Completion</Text>
                <Text className="font-semibold text-foreground">{completionPercentage}%</Text>
              </View>

              <View className="h-2 bg-muted rounded-full overflow-hidden">
                <View
                  className="h-full bg-primary rounded-full"
                  style={{ width: `${completionPercentage}%` }}
                />
              </View>
            </View>

            <View className="mt-4 gap-2">
              <View className="flex-row items-center">
                <Text className="text-lg mr-2">{steps[1]?.isCompleted ? '✅' : '⏳'}</Text>
                <Text className="text-sm text-muted-foreground">Identity verified</Text>
              </View>
              <View className="flex-row items-center">
                <Text className="text-lg mr-2">{steps[3]?.isCompleted ? '✅' : '⏳'}</Text>
                <Text className="text-sm text-muted-foreground">Business information provided</Text>
              </View>
              <View className="flex-row items-center">
                <Text className="text-lg mr-2">{steps[5]?.isCompleted ? '✅' : '⏳'}</Text>
                <Text className="text-sm text-muted-foreground">Services configured</Text>
              </View>
              <View className="flex-row items-center">
                <Text className="text-lg mr-2">{steps[8]?.isCompleted ? '✅' : '⏳'}</Text>
                <Text className="text-sm text-muted-foreground">Terms accepted</Text>
              </View>
              {/* Payment step moved to dashboard - no longer part of verification flow */}
            </View>
          </View>
        </Animated.View>

        {/* What's Next */}
        <Animated.View entering={SlideInDown.delay(600).springify()} className="mb-6">
          <View className="p-4 bg-accent/50 rounded-lg border border-accent">
            <Text className="font-semibold text-accent-foreground mb-3">
              🕐 What's Next?
            </Text>
            <View className="gap-2">
              <Text className="text-accent-foreground text-sm">
                • Our team will review your application within 24-48 hours
              </Text>
              <Text className="text-accent-foreground text-sm">
                • You'll receive an email notification once approved
              </Text>
              <Text className="text-accent-foreground text-sm">
                • After approval, setup payments in your dashboard to start accepting bookings
              </Text>
            </View>
          </View>
        </Animated.View>
      </ScreenWrapper>

      {/* Fixed Bottom Button */}
      <View
        className="px-5 bg-background border-t border-border"
        style={{ paddingBottom: Math.max(insets.bottom, 16) }}
      >
        <Animated.View entering={SlideInDown.delay(700).springify()} className="mb-2">
          <Button
            size="lg"
            onPress={handleContinue}
            className="w-full"
          >
            <Text className="font-semibold text-primary-foreground">
              View Verification Status
            </Text>
          </Button>
        </Animated.View>

        <Text className="text-xs text-muted-foreground text-center mb-2">
          Your verification is being reviewed. Setup payments after approval.
        </Text>
      </View>
    </View>
  );
}
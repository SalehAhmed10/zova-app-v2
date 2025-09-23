import React, { useEffect } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { ScreenWrapper } from '@/components/ui/screen-wrapper';
import { useProviderVerificationStore } from '@/stores/provider-verification';
import { useAppStore } from '@/stores/app';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function VerificationCompleteScreen() {
  console.log('[Complete Screen] Rendered');
  const { resetVerification, getCompletionPercentage } = useProviderVerificationStore();
  const { setAuthenticated } = useAppStore();
  const completionPercentage = getCompletionPercentage();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    // Update the user profile to mark verification as complete
    updateProviderStatus();
  }, []);

  const updateProviderStatus = async () => {
    try {
      // TODO: Update profile in database
      // await supabase
      //   .from('profiles')
      //   .update({ verification_status: 'in_review' })
      //   .eq('id', userId);

      console.log('Provider verification submitted for review');
    } catch (error) {
      console.error('Error updating provider status:', error);
    }
  };

  const handleContinue = () => {
    // Don't reset verification store - keep it for status tracking
    // resetVerification(); // Commented out - we want to keep the verification state
    router.replace('/provider' as any);
  };

  return (
    <View className="flex-1">
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

            <View className="space-y-3">
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

            <View className="mt-4 space-y-2">
              <View className="flex-row items-center">
                <Text className="text-lg mr-2">✅</Text>
                <Text className="text-sm text-muted-foreground">Identity verified</Text>
              </View>
              <View className="flex-row items-center">
                <Text className="text-lg mr-2">✅</Text>
                <Text className="text-sm text-muted-foreground">Business information provided</Text>
              </View>
              <View className="flex-row items-center">
                <Text className="text-lg mr-2">✅</Text>
                <Text className="text-sm text-muted-foreground">Services configured</Text>
              </View>
              <View className="flex-row items-center">
                <Text className="text-lg mr-2">✅</Text>
                <Text className="text-sm text-muted-foreground">Terms accepted</Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* What's Next */}
        <Animated.View entering={SlideInDown.delay(600).springify()} className="mb-6">
          <View className="p-4 bg-accent/50 rounded-lg border border-accent">
            <Text className="font-semibold text-accent-foreground mb-3">
              🕐 What's Next?
            </Text>
            <View className="space-y-2">
              <Text className="text-accent-foreground text-sm">
                • Our team will review your application within 24-48 hours
              </Text>
              <Text className="text-accent-foreground text-sm">
                • You'll receive an email notification once approved
              </Text>
              <Text className="text-accent-foreground text-sm">
                • After approval, you'll gain access to your provider dashboard
              </Text>
              <Text className="text-accent-foreground text-sm">
                • Once approved, you can start receiving bookings
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
        <Animated.View entering={SlideInDown.delay(800).springify()} className="mb-2">
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
          Your verification is being reviewed. You'll be notified once approved.
        </Text>
      </View>
    </View>
  );
}
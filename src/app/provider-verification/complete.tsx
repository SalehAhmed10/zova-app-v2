import React, { useEffect } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { ScreenWrapper } from '@/components/ui/screen-wrapper';
import { useProviderVerificationStore } from '@/stores/provider-verification';
import { useAppStore } from '@/stores/app';

export default function VerificationCompleteScreen() {
  const { resetVerification, getCompletionPercentage } = useProviderVerificationStore();
  const { setAuthenticated } = useAppStore();
  const completionPercentage = getCompletionPercentage();

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
    // Clear verification store and navigate to provider dashboard
    resetVerification();
    router.replace('/provider/' as any);
  };

  return (
    <ScreenWrapper scrollable={false} contentContainerClassName="px-6 py-4 justify-center">
      {/* Success Icon */}
      <Animated.View 
        entering={FadeIn.delay(200).springify()}
        className="items-center mb-8"
      >
        <View className="w-24 h-24 bg-green-100 dark:bg-green-900/30 rounded-full justify-center items-center mb-6">
          <Text className="text-4xl">✅</Text>
        </View>
        <Text className="text-3xl font-bold text-foreground mb-4 text-center">
          Verification Complete!
        </Text>
        <Text className="text-base text-muted-foreground text-center">
          Your application has been submitted successfully
        </Text>
      </Animated.View>

      {/* Progress Summary */}
      <Animated.View entering={SlideInDown.delay(400).springify()} className="mb-8">
        <View className="p-6 bg-card rounded-lg border border-border">
          <Text className="font-semibold text-foreground mb-4 text-center">
            Application Summary
          </Text>
          
          <View className="space-y-3">
            <View className="flex-row justify-between items-center">
              <Text className="text-muted-foreground">Completion</Text>
              <Text className="font-semibold text-foreground">{completionPercentage}%</Text>
            </View>
            
            <View className="h-2 bg-muted rounded-full overflow-hidden">
              <View 
                className="h-full bg-green-500 rounded-full"
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
      <Animated.View entering={SlideInDown.delay(600).springify()} className="mb-8">
        <View className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <Text className="font-semibold text-blue-900 dark:text-blue-100 mb-3">
            🕐 What's Next?
          </Text>
          <View className="space-y-2">
            <Text className="text-blue-800 dark:text-blue-200 text-sm">
              • Our team will review your application within 24-48 hours
            </Text>
            <Text className="text-blue-800 dark:text-blue-200 text-sm">
              • You'll receive an email notification once approved
            </Text>
            <Text className="text-blue-800 dark:text-blue-200 text-sm">
              • After approval, you can start receiving bookings
            </Text>
          </View>
        </View>
      </Animated.View>

      {/* Actions */}
      <Animated.View entering={SlideInDown.delay(800).springify()} className="space-y-4">
        <Button
          size="lg"
          onPress={handleContinue}
          className="w-full"
        >
          <Text className="font-semibold text-primary-foreground">
            Continue to Dashboard
          </Text>
        </Button>
        
        <Text className="text-xs text-muted-foreground text-center">
          You can access your dashboard while your verification is being reviewed
        </Text>
      </Animated.View>
    </ScreenWrapper>
  );
}
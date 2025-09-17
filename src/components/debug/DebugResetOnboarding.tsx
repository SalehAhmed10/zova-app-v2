import React from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { useOnboardingStore } from '@/stores/onboarding';
import { useAppStore } from '@/stores/app';

interface DebugResetOnboardingProps {
  className?: string;
  variant?: 'ghost' | 'outline' | 'default';
  size?: 'sm' | 'default' | 'lg';
}

export const DebugResetOnboarding: React.FC<DebugResetOnboardingProps> = ({
  className = 'mb-4',
  variant = 'ghost',
  size = 'sm',
}) => {
  const { reset: resetOnboarding } = useOnboardingStore();
  const { reset: resetApp } = useAppStore();

  const handleResetOnboarding = () => {
    Alert.alert(
      'Reset Onboarding',
      'This will reset the onboarding flow for testing. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Reset', 
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('[Debug] Starting onboarding reset...');
              
              // Reset both stores
              resetOnboarding();
              resetApp();
              
              console.log('[Debug] Both stores reset successfully');
              
              // Give stores time to persist changes
              await new Promise(resolve => setTimeout(resolve, 100));
              
              console.log('[Debug] Navigating back to home...');
              
              // Navigate back to home to trigger re-initialization
              router.replace('/');
              
              Alert.alert('Success', 'Onboarding has been reset. Redirecting to onboarding flow...');
            } catch (error) {
              console.error('[Debug] Reset error:', error);
              Alert.alert('Error', 'Failed to reset onboarding. Please try again.');
            }
          }
        }
      ]
    );
  };

  // Only render in development mode
  if (!__DEV__) {
    return null;
  }

  return (
    <Animated.View entering={FadeIn.delay(750).springify()} className={className}>
      <Button
        variant={variant}
        size={size}
        onPress={handleResetOnboarding}
        className="w-full border border-destructive/20"
      >
        <Text className="text-destructive font-medium text-xs">
          🔧 Reset Onboarding (Debug)
        </Text>
      </Button>
    </Animated.View>
  );
};
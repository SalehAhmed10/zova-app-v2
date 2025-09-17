import React from 'react';
import { View } from '@/components/ui/view';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { useOnboardingStore, checkOnboardingStorage } from '@/stores/onboarding';
import { Alert } from 'react-native';
import { router } from 'expo-router';

interface OnboardingDebugProps {
  /**
   * Whether to show the debug component. Defaults to __DEV__
   */
  show?: boolean;
  /**
   * Custom className for the container
   */
  className?: string;
}

/**
 * Debug component for managing onboarding state during development
 * Only renders in development mode unless explicitly enabled
 */
export function OnboardingDebug({ show = __DEV__, className }: OnboardingDebugProps) {
  const { isCompleted, hasSkipped, completionTime, reset, forceComplete } = useOnboardingStore();

  const handleResetOnboarding = () => {
    Alert.alert(
      'Reset Onboarding',
      'This will clear all onboarding progress and redirect you to the onboarding flow. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            console.log('[Onboarding] Resetting onboarding');
            reset();
            
            // Give the state time to update, then redirect
            setTimeout(() => {
              console.log('[Onboarding] Redirecting to onboarding after reset');
              router.replace('/onboarding');
              Alert.alert('Success', 'Onboarding has been reset. Redirecting to onboarding flow.');
            }, 200);
          }
        }
      ]
    );
  };

  const handleForceComplete = () => {
    Alert.alert(
      'Force Complete Onboarding',
      'This will mark onboarding as completed without going through the flow. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          onPress: () => {
            forceComplete();
            Alert.alert('Success', 'Onboarding has been marked as completed.');
          }
        }
      ]
    );
  };

  const handleCheckStorage = async () => {
    const stored = await checkOnboardingStorage();
    Alert.alert(
      'Storage Contents',
      stored ? JSON.stringify(stored, null, 2) : 'No data found in storage',
      [{ text: 'OK' }]
    );
  };

  const handleGoToOnboarding = () => {
    router.replace('/onboarding');
  };

  if (!show) {
    return null;
  }

  return (
    <View className={`p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg ${className}`}>
      <Text className="text-sm font-semibold text-yellow-700 dark:text-yellow-300 mb-2">
        🛠️ Onboarding Debug
      </Text>

      <View className="space-y-2 mb-3">
        <Text className="text-xs text-muted-foreground">
          Status: {isCompleted ? '✅ Completed' : '⏳ Not Completed'}
        </Text>
        {hasSkipped && (
          <Text className="text-xs text-muted-foreground">
            Skipped: ✅ Yes
          </Text>
        )}
        {completionTime && (
          <Text className="text-xs text-muted-foreground">
            Completed: {completionTime.toLocaleString()}
          </Text>
        )}
      </View>

      <View className="flex-row gap-2">
        <Button
          variant="outline"
          size="sm"
          onPress={handleResetOnboarding}
          className="flex-1 bg-red-500/10 border-red-500/20"
        >
          <Text className="text-xs text-red-600 dark:text-red-400">
            🔄 Reset
          </Text>
        </Button>

        <Button
          variant="outline"
          size="sm"
          onPress={handleForceComplete}
          className="flex-1 bg-green-500/10 border-green-500/20"
        >
          <Text className="text-xs text-green-600 dark:text-green-400">
            ✅ Force Complete
          </Text>
        </Button>
      </View>

      <View className="mt-2 gap-2">
        <Button
          variant="outline"
          size="sm"
          onPress={handleCheckStorage}
          className="w-full bg-blue-500/10 border-blue-500/20"
        >
          <Text className="text-xs text-blue-600 dark:text-blue-400">
            📁 Check Storage
          </Text>
        </Button>

        {!isCompleted && (
          <Button
            variant="outline"
            size="sm"
            onPress={handleGoToOnboarding}
            className="w-full bg-purple-500/10 border-purple-500/20"
          >
            <Text className="text-xs text-purple-600 dark:text-purple-400">
              🚀 Go to Onboarding
            </Text>
          </Button>
        )}
      </View>

      <Text className="text-xs text-muted-foreground mt-2">
        This component only appears in development mode
      </Text>
    </View>
  );
}

/**
 * Hook for programmatic access to onboarding debug functions
 */
export function useOnboardingDebug() {
  const { isCompleted, hasSkipped, completionTime, reset, forceComplete } = useOnboardingStore();

  const resetOnboarding = React.useCallback(() => {
    console.log('[Onboarding] Debug hook: Resetting onboarding');
    reset();
    
    // Navigate to onboarding after reset
    setTimeout(() => {
      console.log('[Onboarding] Debug hook: Redirecting to onboarding after reset');
      router.replace('/onboarding');
    }, 200);
    
    if (__DEV__) {
      console.log('🔄 Onboarding reset - redirecting to onboarding flow');
    }
  }, [reset]);

  const forceCompleteOnboarding = React.useCallback(() => {
    forceComplete();
    if (__DEV__) {
      console.log('✅ Onboarding force completed');
    }
  }, [forceComplete]);

  const getOnboardingStatus = React.useCallback(() => ({
    isCompleted,
    hasSkipped,
    completionTime,
    canAccessOnboarding: !isCompleted,
  }), [isCompleted, hasSkipped, completionTime]);

  return {
    resetOnboarding,
    forceCompleteOnboarding,
    getOnboardingStatus,
  };
}
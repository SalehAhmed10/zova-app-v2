import React from 'react';
import { Stack } from 'expo-router';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/text';
import { useProviderVerificationStore } from '@/stores/provider-verification';
import { ErrorBoundary } from '@/components/ui/error-boundary';

export default function ProviderVerificationLayout() {
  const { currentStep } = useProviderVerificationStore();
  
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
      9: 'Payment Setup'
    };
    return titles[step as keyof typeof titles] || 'Verification';
  };

  return (
    <ErrorBoundary level="screen">
      <SafeAreaView edges={['top']} className="flex-1 bg-background">
        {/* Progress Header */}
        <View className="bg-background border-b border-border px-6 py-4">
          <View className="flex-row items-center justify-between mb-3">
            <Text variant="h4" className="text-foreground font-semibold">
              {getStepTitle(currentStep)}
            </Text>
            <Text className="text-sm text-muted-foreground">
              Step {currentStep} of 9
            </Text>
          </View>

          {/* Progress Bar */}
          <View className="h-2 bg-muted rounded-full overflow-hidden">
            <View
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / 9) * 100}%` }}
            />
          </View>
        </View>

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
          </Stack>
        </View>
      </SafeAreaView>
    </ErrorBoundary>
  );
}
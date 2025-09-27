import React from 'react';
import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import { usePendingRegistration } from '@/hooks/shared/usePendingRegistration';

export default function AuthLayout() {
  // ✅ OPTIMIZED: React Query handles pending registration detection
  const { pendingRegistration, hasPendingRegistration, clearPending } = usePendingRegistration();

  // ✅ Auto-show alert when pending registration is detected - no useEffect needed
  if (hasPendingRegistration && pendingRegistration) {
    // Use setTimeout to prevent alert during render
    setTimeout(() => {
      Alert.alert(
        'Resume Registration',
        `You have an incomplete registration for ${pendingRegistration.email}. Would you like to continue where you left off?`,
        [
          {
            text: 'Start Over',
            style: 'destructive',
            onPress: () => {
              clearPending();
            }
          },
          {
            text: 'Resume',
            onPress: () => {
              router.replace({
                pathname: '/auth/otp-verification',
                params: {
                  email: pendingRegistration.email,
                  role: pendingRegistration.role,
                },
              } as any);
            }
          }
        ]
      );
    }, 100); // Small delay to prevent render-time alert
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: 'transparent' },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="register" />
        <Stack.Screen name="otp-verification" />
      </Stack>
    </SafeAreaView>
  );
}
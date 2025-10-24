import React from 'react';
import { Stack, Redirect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Alert, View, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { usePendingRegistration } from '@/hooks/shared/usePendingRegistration';
import { useAuthLayoutGuards } from '@/hooks/routing/useLayoutGuards';
import { Text } from '@/components/ui/text';

/**
 * Auth Layout - Protected Route Group
 * 
 * Guards:
 * - Redirects authenticated users to their dashboard
 * - Only allows unauthenticated users to access auth screens
 */
export default function AuthLayout() {
  // ✅ CRITICAL: Call all hooks BEFORE any conditional returns (Rules of Hooks)
  const { guardResult, isLoading } = useAuthLayoutGuards();
  const { pendingRegistration, hasPendingRegistration, clearPending } = usePendingRegistration();
  
  // ✅ Profile role sync is handled automatically via auth store listener in _layout.tsx root

  console.log('[AuthLayout] 🔐 Checking authentication...', guardResult);

  // ✅ Handle redirect if guard function requires it
  if (guardResult.type === 'redirect') {
    console.log(`[AuthLayout] ✅ User authenticated, redirecting to ${guardResult.href}`);
    return <Redirect href={guardResult.href as any} />;
  }

  // ✅ Handle loading state
  if (isLoading) {
    console.log('[AuthLayout] ⏳ Loading authentication state');
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 items-center justify-center px-6">
          <ActivityIndicator size="large" className="text-primary mb-4" />
          <Text className="text-center text-muted-foreground">
            Loading...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

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
                pathname: '/(auth)/otp-verification',
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
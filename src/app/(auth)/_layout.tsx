import React from 'react';
import { Stack, Redirect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Alert, View, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '@/stores/auth';
import { usePendingRegistration } from '@/hooks/shared/usePendingRegistration';
import { useAuthSync } from '@/hooks/auth/useAuthSync';
import { Text } from '@/components/ui/text';

/**
 * Auth Layout - Protected Route Group
 * 
 * Guards:
 * - Redirects authenticated users to their dashboard
 * - Only allows unauthenticated users to access auth screens
 */
export default function AuthLayout() {
  const session = useAuthStore((state) => state.session);
  const userRole = useAuthStore((state) => state.userRole);

  // ✅ CRITICAL: Call all hooks BEFORE any conditional returns (Rules of Hooks)
  const { pendingRegistration, hasPendingRegistration, clearPending } = usePendingRegistration();
  
  // ✅ CRITICAL: Sync profile role to auth store when session exists
  useAuthSync();

  console.log('[AuthLayout] 🔐 Checking authentication...', { 
    hasSession: !!session, 
    userRole 
  });

  // ✅ Guard: Redirect authenticated users to their dashboard
  if (session && userRole) {
    console.log('[AuthLayout] ✅ User authenticated with role, redirecting to dashboard');
    
    if (userRole === 'customer') {
      return <Redirect href="/(customer)" />;
    }
    
    if (userRole === 'provider') {
      return <Redirect href="/(provider)" />;
    }
  }

  // ✅ CRITICAL FIX: If session exists but role is still loading, show loading screen
  // This prevents infinite redirect loop with root index
  if (session && !userRole) {
    console.log('[AuthLayout] ⏳ Session exists but role loading, showing loading screen');
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 items-center justify-center px-6">
          <ActivityIndicator size="large" className="text-primary mb-4" />
          <Text className="text-center text-muted-foreground">
            Determining user role...
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
import React, { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Alert } from 'react-native';
import { useAuth } from '@/hooks/useAuth';
import { router } from 'expo-router';

export default function AuthLayout() {
  const { checkPendingRegistration, clearPendingRegistration } = useAuth();
  const [checkedPending, setCheckedPending] = useState(false);

  useEffect(() => {
    const checkForPendingRegistration = async () => {
      if (checkedPending) return;
      
      try {
        const pending = await checkPendingRegistration();
        if (pending) {
          console.log('[AuthLayout] Found pending registration:', pending);
          
          Alert.alert(
            'Resume Registration',
            `You have an incomplete registration for ${pending.email}. Would you like to continue where you left off?`,
            [
              {
                text: 'Start Over',
                style: 'destructive',
                onPress: () => {
                  clearPendingRegistration();
                  setCheckedPending(true);
                }
              },
              {
                text: 'Resume',
                onPress: () => {
                  router.replace({
                    pathname: '/auth/otp-verification',
                    params: {
                      email: pending.email,
                      role: pending.role,
                    },
                  } as any);
                  setCheckedPending(true);
                }
              }
            ]
          );
        } else {
          setCheckedPending(true);
        }
      } catch (error) {
        console.error('[AuthLayout] Error checking pending registration:', error);
        setCheckedPending(true);
      }
    };

    checkForPendingRegistration();
  }, [checkedPending, checkPendingRegistration, clearPendingRegistration]);

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
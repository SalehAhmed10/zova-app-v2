import React, { useState } from 'react';
import { View, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { OtpInput } from 'react-native-otp-entry';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { ScreenWrapper } from '@/components/ui/screen-wrapper';
import { useAuth } from '@/hooks/useAuth';
import { useAppStore } from '@/stores/app';

export default function OTPVerificationScreen() {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const { verifyOTP, resendOTP } = useAuth();
  const { setAuthenticated } = useAppStore();

  // Get parameters from registration
  const params = useLocalSearchParams();
  const email = params.email as string;
  const role = params.role as 'customer' | 'provider';

  console.log('[OTP] Screen loaded with params:', { email, role });

  const handleVerifyOTP = async () => {
    // onFilled callback should guarantee all 6 digits are entered
    console.log('[OTP] Starting verification process');
    console.log('[OTP] Verification data:', { email, otp: '***' + otp.slice(-2), role });

    setLoading(true);
    try {
      const result = await verifyOTP(email, otp, role);

      console.log('[OTP] Verification result:', result);

      if (result.success) {
        console.log('[OTP] Verification successful');
        console.log('[OTP] Preparing navigation for role:', role);

        Alert.alert(
          'Success',
          'Email verified successfully!',
          [
            {
              text: 'Continue',
              onPress: () => {
                console.log('[OTP] User pressed Continue, navigating...');
                setTimeout(() => {
                  if (role === 'customer') {
                    console.log('[OTP] Navigating to customer dashboard');
                    router.replace('/customer/' as any);
                  } else if (role === 'provider') {
                    console.log('[OTP] Navigating to provider verification');
                    router.replace('/provider-verification/' as any);
                  }
                }, 1000);
              }
            }
          ]
        );
      } else {
        console.error('[OTP] Verification failed:', result.error);
        Alert.alert('Verification Failed', result.error || 'Invalid OTP. Please try again.');
      }
    } catch (error) {
      console.error('[OTP] Unexpected error during verification:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      console.log('[OTP] Verification process completed, loading:', false);
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    console.log('[OTP] Resending OTP to:', email);
    setLoading(true);
    try {
      const result = await resendOTP(email);
      console.log('[OTP] Resend result:', result);
      if (result.success) {
        console.log('[OTP] OTP resent successfully');
        Alert.alert('Success', 'OTP has been resent to your email');
        // Reset OTP input
        setOtp('');
      } else {
        console.error('[OTP] Resend failed:', result.error);
        Alert.alert('Error', result.error || 'Failed to resend OTP');
      }
    } catch (error) {
      console.error('[OTP] Unexpected error during resend:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      console.log('[OTP] Resend process completed');
      setLoading(false);
    }
  };

  return (
    <ScreenWrapper scrollable={false} contentContainerClassName="px-6 py-4 justify-center">
      {/* Header */}
      <Animated.View
        entering={FadeIn.delay(200).springify()}
        className="items-center mb-8"
      >
        <View className="w-16 h-16 bg-primary rounded-2xl justify-center items-center mb-4">
          <Text className="text-2xl font-bold text-primary-foreground">✉️</Text>
        </View>
        <Text className="text-2xl font-bold text-foreground mb-2">
          Verify Your Email
        </Text>
        <Text className="text-base text-muted-foreground text-center mb-4">
          We've sent a 6-digit code to{'\n'}
          <Text className="font-semibold text-foreground">{email}</Text>
        </Text>
      </Animated.View>

      {/* OTP Input */}
      <Animated.View
        entering={SlideInDown.delay(400).springify()}
        className="mb-8"
      >
        <OtpInput
          numberOfDigits={6}
          onTextChange={setOtp}
          onFilled={handleVerifyOTP}
          focusColor="#22c55e"
          focusStickBlinkingDuration={500}
          theme={{
            containerStyle: {
              width: '100%',
              justifyContent: 'center',
              gap: 2, // Add gap between input boxes
            },
            pinCodeContainerStyle: {
              width: 48,
              height: 48,
              borderWidth: 2,
              borderColor: '#374151',
              borderRadius: 12,
              backgroundColor: '#1f2937',
              marginHorizontal: 4, // Additional horizontal margin
            },
            pinCodeTextStyle: {
              fontSize: 20,
              fontWeight: 'bold',
              color: '#ffffff',
              textAlign: 'center',
              textAlignVertical: 'center',
            },
            focusStickStyle: {
              backgroundColor: '#22c55e',
              width: 2,
            },
            focusedPinCodeContainerStyle: {
              borderColor: '#22c55e',
              backgroundColor: '#111827',
            },
            filledPinCodeContainerStyle: {
              backgroundColor: '#374151',
            },
          }}
        />
        <Text className="text-center text-sm text-muted-foreground mt-4">
          Enter the 6-digit code sent to your email
        </Text>
      </Animated.View>

      {/* Verify Button */}
      <Animated.View
        entering={SlideInDown.delay(600).springify()}
        className="mb-4"
      >
        <Button
          onPress={handleVerifyOTP}
          disabled={loading || otp.length !== 6}
          className="w-full"
        >
          <Text className="text-primary-foreground font-semibold">
            {loading ? 'Verifying...' : 'Verify Email'}
          </Text>
        </Button>
      </Animated.View>

      {/* Resend OTP */}
      <Animated.View
        entering={SlideInDown.delay(800).springify()}
        className="items-center"
      >
        <Text className="text-muted-foreground mb-2">
          Didn't receive the code?
        </Text>
        <Button
          variant="link"
          onPress={handleResendOTP}
          disabled={loading}
        >
          <Text className="text-primary font-semibold">
            Resend Code
          </Text>
        </Button>
      </Animated.View>

      {/* Wrong Email */}
      <Animated.View
        entering={SlideInDown.delay(1000).springify()}
        className="items-center mt-8"
      >
        <Button
          variant="ghost"
          onPress={() => router.replace('/auth/register')}
        >
          <Text className="text-muted-foreground">
            Wrong email? Go back to register
          </Text>
        </Button>
      </Animated.View>
    </ScreenWrapper>
  );
}
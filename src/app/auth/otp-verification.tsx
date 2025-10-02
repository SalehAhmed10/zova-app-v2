/**
 * OTP Verification Screen
 * 
 * ✅ MIGRATED TO REACT QUERY + ZUSTAND ARCHITECTURE
 * - Replaced useState + useEffect with React Query mutations
 * - Using useAuthOptimized for better performance
 * - Direct Supabase integration for OTP verification
 * 
 * Architecture Changes:
 * - Removed: useState for loading/errors
 * - Added: React Query mutations for OTP operations
 * - Improved: Error handling and user feedback
 */
import React, { useState } from 'react';
import { View, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { useMutation } from '@tanstack/react-query';
import { OtpInput } from 'react-native-otp-entry';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { ScreenWrapper } from '@/components/ui/screen-wrapper';
import { useAuthOptimized } from '@/hooks';
import { useAppStore } from '@/stores/auth/app';
import { supabase } from '@/lib/core/supabase';
import { createOrUpdateUserProfile } from '@/lib/auth/profile';

export default function OTPVerificationScreen() {
  const [otp, setOtp] = useState('');
  
  // ✅ OPTIMIZED: Using useAuthOptimized for better performance
  const { refetchSession } = useAuthOptimized();
  const { setAuthenticated } = useAppStore();

  // Get parameters from registration
  const params = useLocalSearchParams();
  const email = params.email as string;
  const role = params.role as 'customer' | 'provider';
  const firstName = params.firstName as string;
  const lastName = params.lastName as string;

  console.log('[OTP] Screen loaded with params:', { email, role });

  // ✅ REACT QUERY MUTATION: OTP verification
  const verifyOTPMutation = useMutation({
    mutationFn: async ({ email, otp }: { email: string; otp: string }) => {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: 'signup'
      });

      if (error) {
        if (error.message.includes('expired')) {
          throw { code: 'OTP_EXPIRED', message: error.message };
        } else if (error.message.includes('invalid')) {
          throw { code: 'INVALID_OTP', message: error.message };
        } else {
          throw { code: 'NETWORK_ERROR', message: error.message };
        }
      }

      return { user: data.user, session: data.session };
    },
    onSuccess: async (data) => {
      console.log('[OTP] Verification successful, creating profile...');
      
      try {
        // Create or update user profile
        const profile = await createOrUpdateUserProfile(
          data.user.id,
          data.user.email!,
          role
        );

        if (!profile) {
          console.error('[OTP] Failed to create profile');
          Alert.alert('Error', 'Account created but profile setup failed. Please contact support.');
          return;
        }

        // Update profile with name information if provided
        if (firstName || lastName) {
          const { error: updateError } = await supabase
            .from('profiles')
            .update({
              first_name: firstName || '',
              last_name: lastName || ''
            })
            .eq('id', data.user.id);

          if (updateError) {
            console.error('[OTP] Failed to update profile names:', updateError);
            // Don't fail the whole process for this
          }
        }

        console.log('[OTP] Profile created successfully:', profile);
        
        // Refetch session to update auth state
        refetchSession();
      } catch (error) {
        console.error('[OTP] Error creating profile:', error);
        Alert.alert('Error', 'Account verified but profile setup failed. Please try logging in again.');
        return;
      }
    },
    onError: (error: any) => {
      console.error('[OTP] Verification failed:', error);
    }
  });

  // ✅ REACT QUERY MUTATION: Resend OTP
  const resendOTPMutation = useMutation({
    mutationFn: async (email: string) => {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
      });

      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      Alert.alert('Success', 'OTP sent successfully!');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to resend OTP');
    }
  });

  // ✅ OPTIMIZED: Handle OTP verification with React Query mutation
  const handleVerifyOTP = async () => {
    console.log('[OTP] Starting verification process');
    console.log('[OTP] Verification data:', { email, otp: '***' + otp.slice(-2), role });

    try {
      const result = await verifyOTPMutation.mutateAsync({ email, otp });
      
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
                // Navigation will be handled by auth navigation hooks
                // No manual onboarding checks needed here
                if (role === 'customer') {
                  console.log('[OTP] Navigating to customer dashboard');
                  router.replace('/customer');
                } else if (role === 'provider') {
                  console.log('[OTP] Navigating to provider verification');
                  router.replace('/provider-verification');
                } else {
                  console.warn('[OTP] Unknown role, navigating to auth');
                  router.replace('/auth');
                }
              }, 500);
            }
          }
        ]
      );
    } catch (error: any) {
      console.error('[OTP] Verification failed:', error);
      
      let errorMessage = 'Verification failed. Please try again.';
      
      if (error.code === 'OTP_EXPIRED') {
        errorMessage = 'Your verification code has expired. Please request a new one.';
      } else if (error.code === 'INVALID_OTP') {
        errorMessage = 'Invalid verification code. Please check and try again.';
      } else if (error.code === 'NETWORK_ERROR') {
        errorMessage = 'Network error. Please check your connection and try again.';
      }

      Alert.alert('Verification Failed', errorMessage);
      setOtp(''); // Clear the OTP input
    }
  };

  // ✅ OPTIMIZED: Handle OTP resend with React Query mutation
  const handleResendOTP = async () => {
    console.log('[OTP] Resending OTP to:', email);
    
    try {
      await resendOTPMutation.mutateAsync(email);
      
      console.log('[OTP] OTP resent successfully');
      Alert.alert('Success', 'A new verification code has been sent to your email.');
      
      // Clear current OTP
      setOtp('');
    } catch (error: any) {
      console.error('[OTP] Resend failed:', error);
      Alert.alert('Error', error.message || 'Failed to send verification code. Please try again.');
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
          disabled={verifyOTPMutation.isPending || otp.length !== 6}
          className="w-full"
        >
          <Text className="text-primary-foreground font-semibold">
            {verifyOTPMutation.isPending ? 'Verifying...' : 'Verify Email'}
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
          disabled={resendOTPMutation.isPending}
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
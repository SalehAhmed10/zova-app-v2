/**
 * Optimized Register Screen
 * ✅ Follows copilot-rules.md - NO useEffect patterns
 * ✅ React Hook Form + Zod validation + React Query + Zustand
 * ✅ Proper TypeScript types and error handling
 */

import React, { useState } from 'react';
import { View, Alert } from 'react-native';
import { router } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { ScreenWrapper } from '@/components/ui/screen-wrapper';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAuthOptimized } from '@/hooks';
import { useAppStore } from '@/stores/auth/app';
import { registrationSchema, type RegistrationFormData } from '@/lib/validation/authValidation';
import { supabase } from '@/lib/core/supabase';

interface RoleSwitchData {
  currentRole: 'customer' | 'provider';
  requestedRole: 'customer' | 'provider';
  profileId: string;
}

export default function RegisterScreen() {
  // ✅ OPTIMIZED: Using useAuthOptimized for better performance
  const { refetchSession } = useAuthOptimized();
  const { setAuthenticated } = useAppStore();
  
  // Dialog state
  const [showExistingUserDialog, setShowExistingUserDialog] = useState(false);
  // Removed role switch dialog state for simplified auth flow

  // ✅ REACT QUERY MUTATION: Sign up with email/password
  const signUpMutation = useMutation({
    mutationFn: async (userData: { email: string; password: string; role: 'customer' | 'provider' }) => {
      console.log('[Register] Starting Supabase signup');
      
      const { data, error } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            role: userData.role,
            email: userData.email
          }
        }
      });

      if (error) {
        console.error('[Register] Supabase signup error:', error);
        
        if (error.message.includes('already registered')) {
          throw { code: 'USER_EXISTS', message: error.message };
        } else if (error.message.includes('invalid email')) {
          throw { code: 'INVALID_EMAIL', message: error.message };
        } else if (error.message.includes('weak password')) {
          throw { code: 'WEAK_PASSWORD', message: error.message };
        } else {
          throw { code: 'SIGNUP_ERROR', message: error.message };
        }
      }

      console.log('[Register] Signup successful, user needs to verify email');
      return { user: data.user, session: data.session };
    }
  });

  // ✅ React Hook Form with Zod validation - no manual state
  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
    setError,
    watch,
  } = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationSchema),
    mode: 'onChange',
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
      role: 'customer',
    },
  });

  const password = watch('password');

  // ✅ OPTIMIZED: Handle form submission with React Query mutation
  const onSubmit = async (data: RegistrationFormData) => {
    try {
      console.log('[Register] Starting registration process');
      console.log('[Register] User data:', {
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role
      });

      await signUpMutation.mutateAsync({
        email: data.email,
        password: data.password,
        role: data.role
      });

      console.log('[Register] Registration successful, navigating to OTP verification');
      console.log('[Register] Navigation params:', {
        email: data.email,
        role: data.role
      });

      // Navigate to OTP verification with user data
      router.replace({
        pathname: '/auth/otp-verification',
        params: {
          email: data.email,
          role: data.role,
        },
      } as any);
      
    } catch (error: any) {
      console.error('[Register] Registration failed:', error);
      
      // Handle specific error codes
      if (error.code === 'USER_EXISTS') {
        console.log('[Register] User already exists, showing dialog');
        setShowExistingUserDialog(true);
        return;
      }
      
      // Handle validation errors
      if (error.code === 'INVALID_EMAIL') {
        setError('email', { message: 'Please enter a valid email address' });
      } else if (error.code === 'WEAK_PASSWORD') {
        setError('password', { message: 'Password is too weak. Please choose a stronger password.' });
      } else {
        Alert.alert('Registration Error', error.message || 'Registration failed. Please try again.');
      }
    }
  };

  // Removed role switch functionality for simplified auth flow

  return (
    <ScreenWrapper scrollable={true} contentContainerClassName="px-6 py-4">
      {/* Header */}
      <Animated.View 
        entering={FadeIn.delay(200).springify()}
        className="items-center mb-8"
      >
        <View className="w-16 h-16 bg-primary rounded-2xl justify-center items-center mb-4">
          <Text className="text-2xl font-bold text-primary-foreground">Z</Text>
        </View>
        <Text className="text-2xl font-bold text-foreground mb-2">
          Create Account
        </Text>
        <Text className="text-base text-muted-foreground text-center">
          Join ZOVA and connect with trusted service providers
        </Text>
      </Animated.View>

      {/* Registration Form */}
      <Animated.View entering={SlideInDown.delay(400).springify()} className="px-2">
        <View className="w-full max-w-md mx-auto mb-6">
          <View className="gap-6">
            {/* Name Fields */}
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Text className="text-sm font-medium text-foreground mb-3">
                  First Name
                </Text>
                <Controller
                  control={control}
                  name="firstName"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Input
                      placeholder="First name"
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      autoCapitalize="words"
                      autoComplete="given-name"
                      className={errors.firstName ? 'border-destructive' : ''}
                    />
                  )}
                />
                {errors.firstName && (
                  <Text className="text-xs text-destructive mt-1">
                    {errors.firstName.message}
                  </Text>
                )}
              </View>

              <View className="flex-1">
                <Text className="text-sm font-medium text-foreground mb-3">
                  Last Name
                </Text>
                <Controller
                  control={control}
                  name="lastName"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Input
                      placeholder="Last name"
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      autoCapitalize="words"
                      autoComplete="family-name"
                      className={errors.lastName ? 'border-destructive' : ''}
                    />
                  )}
                />
                {errors.lastName && (
                  <Text className="text-xs text-destructive mt-1">
                    {errors.lastName.message}
                  </Text>
                )}
              </View>
            </View>

            {/* Email Field */}
            <View>
              <Text className="text-sm font-medium text-foreground mb-3">
                Email Address
              </Text>
              <Controller
                control={control}
                name="email"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    placeholder="Enter your email"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    className={errors.email ? 'border-destructive' : ''}
                  />
                )}
              />
              {errors.email && (
                <Text className="text-sm text-destructive mt-1">
                  {errors.email.message}
                </Text>
              )}
            </View>

            {/* Password Field */}
            <View>
              <Text className="text-sm font-medium text-foreground mb-3">
                Password
              </Text>
              <Controller
                control={control}
                name="password"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    placeholder="Create a password"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    secureTextEntry
                    autoComplete="new-password"
                    className={errors.password ? 'border-destructive' : ''}
                  />
                )}
              />
              {errors.password && (
                <Text className="text-sm text-destructive mt-1">
                  {errors.password.message}
                </Text>
              )}
            </View>

            {/* Confirm Password Field */}
            <View>
              <Text className="text-sm font-medium text-foreground mb-3">
                Confirm Password
              </Text>
              <Controller
                control={control}
                name="confirmPassword"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    placeholder="Confirm your password"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    secureTextEntry
                    autoComplete="new-password"
                    className={errors.confirmPassword ? 'border-destructive' : ''}
                  />
                )}
              />
              {errors.confirmPassword && (
                <Text className="text-sm text-destructive mt-1">
                  {errors.confirmPassword.message}
                </Text>
              )}
            </View>

            {/* Role Selection Field */}
            <View>
              <Text className="text-sm font-medium text-foreground mb-3">
                How will you use ZOVA?
              </Text>
              <Controller
                control={control}
                name="role"
                render={({ field: { onChange, value } }) => (
                  <Select
                    options={[
                      {
                        label: 'I need services',
                        value: 'customer',
                        description: 'Book appointments and connect with providers'
                      },
                      {
                        label: 'I provide services',
                        value: 'provider',
                        description: 'Offer your services and grow your business'
                      }
                    ]}
                    value={value}
                    onValueChange={onChange}
                    placeholder="Select your role"
                    variant={errors.role ? 'error' : 'default'}
                  />
                )}
              />
              {errors.role && (
                <Text className="text-sm text-destructive mt-1">
                  {errors.role.message}
                </Text>
              )}
            </View>

            {/* Terms and Privacy */}
            <View className="p-4 bg-muted/50 rounded-lg">
              <Text className="text-xs text-muted-foreground text-center">
                By creating an account, you agree to our{' '}
                <Text className="text-primary">Terms of Service</Text> and{' '}
                <Text className="text-primary">Privacy Policy</Text>
              </Text>
            </View>

            {/* Submit Button */}
            <Button
              size="lg"
              onPress={handleSubmit(onSubmit)}
              disabled={!isValid || signUpMutation.isPending}
              className="w-full mt-2"
            >
              <Text className="font-semibold text-primary-foreground">
                {signUpMutation.isPending ? 'Creating Account...' : 'Create Account'}
              </Text>
            </Button>
          </View>
        </View>
      </Animated.View>

      {/* Sign In Option */}
      <Animated.View 
        entering={FadeIn.delay(600).springify()}
        className="mt-6 mb-4 px-2"
      >
        <View className="flex-row items-center justify-center">
          <Text className="text-muted-foreground">Already have an account? </Text>
          <Button
            variant="ghost"
            size="sm"
            onPress={() => router.push('/auth' as any)}
          >
            <Text className="text-primary font-medium">Sign In</Text>
          </Button>
        </View>
      </Animated.View>

      {/* Back Button */}
      <Animated.View entering={FadeIn.delay(800).springify()}>
        <Button
          variant="outline"
          size="lg"
          onPress={() => router.replace('/auth')}
          className="w-full"
        >
          <Text>Back to Login</Text>
        </Button>
      </Animated.View>

      {/* Existing User Alert Dialog */}
      <AlertDialog open={showExistingUserDialog} onOpenChange={setShowExistingUserDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Account Already Exists</AlertDialogTitle>
            <AlertDialogDescription>
              An account with this email already exists. Would you like to log in instead, or reset your password?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onPress={() => setShowExistingUserDialog(false)}>
              <Text>Cancel</Text>
            </AlertDialogCancel>
            <AlertDialogAction
              onPress={() => {
                console.log('[Register] User chose to log in instead');
                setShowExistingUserDialog(false);
                router.replace('/auth' as any);
              }}
            >
              <Text>Log In</Text>
            </AlertDialogAction>
            <AlertDialogAction
              onPress={() => {
                console.log('[Register] User chose to reset password');
                setShowExistingUserDialog(false);
                // TODO: Implement password reset flow
                Alert.alert('Coming Soon', 'Password reset functionality will be available soon.');
              }}
            >
              <Text>Reset Password</Text>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Removed role switch dialog for simplified auth flow */}
    </ScreenWrapper>
  );
}
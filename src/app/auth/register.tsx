import React, { useState } from 'react';
import { View, Alert } from 'react-native';
import { router } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
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
import { useAuth } from '@/hooks';
import { useAppStore } from '@/stores/auth/app';

interface RegisterForm {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: 'customer' | 'provider';
}

export default function RegisterScreen() {
  const { signUp, loading } = useAuth();
  const { setAuthenticated } = useAppStore();
  
  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
    watch,
    setError,
  } = useForm<RegisterForm>({
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

  // Dialog state for existing user alert
  const [showExistingUserDialog, setShowExistingUserDialog] = useState(false);
  const [showRoleSwitchDialog, setShowRoleSwitchDialog] = useState(false);
  const [roleSwitchData, setRoleSwitchData] = useState<{
    currentRole: 'customer' | 'provider';
    requestedRole: 'customer' | 'provider';
    profileId: string;
  } | null>(null);

  const onSubmit = async (data: RegisterForm) => {
    try {
      console.log('[Register] Starting registration process');
      console.log('[Register] User data:', {
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role
      });

      const result = await signUp(data.email, data.password, data.role);

      if (result.success) {
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
      } else {
        console.error('[Register] Registration failed:', result.error);
        
        // Handle role switching case
        if (result.roleSwitch) {
          console.log('[Register] Role switch offered:', result.roleSwitch);
          setRoleSwitchData(result.roleSwitch);
          setShowRoleSwitchDialog(true);
          return;
        }
        
        // Handle existing user case
        if (result.userExists) {
          console.log('[Register] User already exists, showing dialog');
          setShowExistingUserDialog(true);
          return;
        }
        
        // Handle other errors
        setError('email', { message: result.error || 'Registration failed' });
      }
    } catch (error) {
      console.error('[Register] Unexpected error:', error);
      Alert.alert(
        'Registration Error',
        'An unexpected error occurred. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

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
                    rules={{
                      required: 'First name is required',
                      minLength: {
                        value: 2,
                        message: 'First name must be at least 2 characters',
                      },
                    }}
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
                    rules={{
                      required: 'Last name is required',
                      minLength: {
                        value: 2,
                        message: 'Last name must be at least 2 characters',
                      },
                    }}
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
                  rules={{
                    required: 'Email is required',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Please enter a valid email address',
                    },
                  }}
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
                  rules={{
                    required: 'Password is required',
                    minLength: {
                      value: 8,
                      message: 'Password must be at least 8 characters',
                    },
                    pattern: {
                      value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
                      message: 'Password must contain uppercase, lowercase, and number',
                    },
                  }}
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
                  rules={{
                    required: 'Please confirm your password',
                    validate: (value) =>
                      value === password || 'Passwords do not match',
                  }}
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
                  rules={{
                    required: 'Please select your role',
                  }}
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
                disabled={!isValid || loading}
                className="w-full mt-2"
              >
                <Text className="font-semibold text-primary-foreground">
                  {loading ? 'Creating Account...' : 'Create Account'}
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

        {/* Role Switch Dialog */}
        <AlertDialog open={showRoleSwitchDialog} onOpenChange={setShowRoleSwitchDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Switch Account Role</AlertDialogTitle>
              <AlertDialogDescription>
                An account with this email already exists as a {roleSwitchData?.currentRole}.
                Would you like to switch to {roleSwitchData?.requestedRole} role instead?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onPress={() => {
                setShowRoleSwitchDialog(false);
                setRoleSwitchData(null);
              }}>
                <Text>Cancel</Text>
              </AlertDialogCancel>
              <AlertDialogAction
                onPress={async () => {
                  if (!roleSwitchData) return;

                  console.log('[Register] User chose to switch role');
                  setShowRoleSwitchDialog(false);

                  try {
                    // Import the switchUserRole function
                    const { switchUserRole } = useAuth() as any;

                    const result = await switchUserRole(roleSwitchData.profileId, roleSwitchData.requestedRole);

                    if (result.success) {
                      Alert.alert(
                        'Role Switched Successfully',
                        `Your account has been switched to ${roleSwitchData.requestedRole} role.`,
                        [
                          {
                            text: 'Continue',
                            onPress: () => {
                              // Navigate to the appropriate dashboard based on new role
                              if (roleSwitchData.requestedRole === 'customer') {
                                router.replace('/customer' as any);
                              } else {
                                router.replace('/provider' as any);
                              }
                            }
                          }
                        ]
                      );
                    } else {
                      Alert.alert('Error', 'Failed to switch role. Please try again.');
                    }
                  } catch (error) {
                    console.error('[Register] Role switch error:', error);
                    Alert.alert('Error', 'Failed to switch role. Please try again.');
                  }

                  setRoleSwitchData(null);
                }}
              >
                <Text>Switch Role</Text>
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
    </ScreenWrapper>
  );
}
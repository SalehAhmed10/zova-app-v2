import React, { useState } from 'react';
import { View, Alert } from 'react-native';
import { router } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Animated, { 
  FadeIn, 
  FadeInDown
} from 'react-native-reanimated';
import { Loader2 } from 'lucide-react-native';
import { Text } from '@/components/ui/text';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScreenWrapper } from '@/components/ui/screen-wrapper';
import { useAuthOptimized } from '@/hooks';
import { useAppStore } from '@/stores/auth/app';
import { loginSchema, type LoginFormData } from '@/lib/validation/authValidation';
import { DebugPanel, StorageDebugPanel } from '@/components';

export default function LoginScreen() {
  // ✅ OPTIMIZED: React Query + Zustand + React Hook Form + Zod
  const { signIn, isLoading } = useAuthOptimized();
  const { isAuthenticated, userRole } = useAppStore();
  
  // ✅ Optimistic loading state for immediate UI feedback
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ✅ React Hook Form with Zod validation - no manual state
  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
    setError,
    watch
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: 'onChange',
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const formValues = watch();

  // ✅ PURE: Auto-navigation logic using useMemo (replaces setTimeout in render)
  React.useMemo(() => {
    if (isAuthenticated && userRole) {
      console.log('[Login] Auth state updated, navigating to:', userRole);
      setIsSubmitting(false); // Reset optimistic state before navigation
      
      // Use queueMicrotask for clean navigation without render conflicts
      queueMicrotask(() => {
        if (userRole === 'customer') {
          router.replace('/customer');
        } else if (userRole === 'provider') {
          router.replace('/provider');
        }
      });
    }
  }, [isAuthenticated, userRole]);

  const onSubmit = async (data: LoginFormData) => {
    // ✅ Set optimistic loading state immediately
    setIsSubmitting(true);
    
    try {
      console.log('[Login] Attempting login with:', { email: data.email });
      
      const result = await signIn(data.email, data.password);

      if (result.success) {
        console.log('[Login] Login successful');
        // Keep loading state until navigation happens
        // Navigation will happen automatically via the auth state check above
      } else if (result.requiresVerification) {
        // Reset loading state for verification flow
        setIsSubmitting(false);
        
        // User needs to verify their email
        Alert.alert(
          'Email Verification Required',
          'Please verify your email before signing in.',
          [
            {
              text: 'Verify Email',
              onPress: () => {
                router.push({
                  pathname: '/auth/otp-verification',
                  params: {
                    email: result.email || data.email,
                    role: 'customer', // Default to customer, will be updated after verification
                  },
                } as any);
              }
            },
            {
              text: 'Cancel',
              style: 'cancel'
            }
          ]
        );
      } else {
        console.error('[Login] Login failed:', result.error);
        setIsSubmitting(false); // Reset loading state on error
        
        // Set form-level error
        if (result.error?.includes('Invalid credentials') || result.error?.includes('Invalid login')) {
          setError('password', { message: 'Invalid email or password' });
        } else {
          Alert.alert('Login Failed', result.error || 'An error occurred');
        }
      }
    } catch (error) {
      console.error('[Login] Unexpected error:', error);
      setIsSubmitting(false); // Reset loading state on error
      Alert.alert('Login Error', 'An unexpected error occurred. Please try again.');
    }
  };

  return (
    <ScreenWrapper scrollable={false} contentContainerClassName="px-6 py-4 justify-center">
      {/* Header */}
      <Animated.View
        entering={FadeIn.delay(100).duration(800)}
        className="items-center mb-8"
      >
        <View className="w-16 h-16 bg-primary rounded-2xl justify-center items-center mb-4">
          <Text className="text-2xl font-bold text-primary-foreground">Z</Text>
        </View>
        <Text className="text-2xl font-bold text-foreground mb-2">
          Welcome Back
        </Text>
        <Text className="text-base text-muted-foreground text-center">
          Sign in to your ZOVA account
        </Text>
      </Animated.View>

      {/* Login Form */}
      <Animated.View 
        entering={FadeInDown.delay(300).duration(700).springify()}
        className="px-2"
      >
        <View className="w-full max-w-md mx-auto mb-6">
          <Text variant="h3" className="text-center mb-8">
            Sign In
          </Text>

          <View className="gap-6">
            {/* Email Field */}
            <View>
              <Text variant="small" className="mb-3 font-semibold text-foreground">
                Email
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
              <Text variant="small" className="mb-3 font-semibold text-foreground">
                Password
              </Text>
              <Controller
                control={control}
                name="password"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    placeholder="Enter your password"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    secureTextEntry
                    autoComplete="current-password"
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

            <Button
              onPress={handleSubmit(onSubmit)}
              disabled={isSubmitting || isLoading || !isValid}
              className="w-full mt-4"
              size="lg"
            >
              {(isSubmitting || isLoading) ? (
                <>
                  <View className="pointer-events-none animate-spin mr-2">
                    <Loader2 size={20} className="text-primary-foreground" />
                  </View>
                  <Text variant="default" className="text-primary-foreground font-semibold">
                    Signing In...
                  </Text>
                </>
              ) : (
                <Text variant="default" className="text-primary-foreground font-semibold">
                  Sign In
                </Text>
              )}
            </Button>
          </View>
        </View>
      </Animated.View>

      {/* Register Option */}
      <Animated.View
        entering={FadeIn.delay(500).duration(600)}
        className="mt-6 mb-4 px-2"
      >
        <View className="flex-row items-center justify-center">
          <Text className="text-muted-foreground">Don't have an account? </Text>
          <Button
            variant="ghost"
            size="sm"
            onPress={() => router.push('/auth/register')}
          >
            <Text className="text-primary font-medium">Create Account</Text>
          </Button>
        </View>
      </Animated.View>

      {/* Back Button */}
      <Animated.View 
        entering={FadeIn.delay(700).duration(600)}
      >
        <Button
          variant="outline"
          size="lg"
          onPress={() => router.replace('/onboarding')}
          className="w-full"
        >
          <Text>Back to Onboarding</Text>
        </Button>
      </Animated.View>

      {/* Development Tools - Only show in development */}
      {__DEV__ && (
        <Animated.View 
          entering={FadeIn.delay(900).duration(500)}
          className="mt-4"
        >
      <StorageDebugPanel/>
        </Animated.View>
      )}
    </ScreenWrapper>
  );
}
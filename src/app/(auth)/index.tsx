import React, { useState } from 'react';
import { View } from 'react-native';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useSignIn } from '@/hooks/auth/useSignIn';
import { useAuthStore } from '@/stores/auth';
import { loginSchema, type LoginFormData } from '@/lib/validation/authValidation';
import { DebugPanel, StorageDebugPanel } from '@/components';
import { Logo } from '@/components/branding';
import { supabase } from '@/lib/supabase';

export default function LoginScreen() {
  // ✅ OPTIMIZED: React Query + Zustand + React Hook Form + Zod
  const { mutate: signIn, isPending: isLoading } = useSignIn();
  const session = useAuthStore((state) => state.session);
  const userRole = useAuthStore((state) => state.userRole);
  
  // ✅ Optimistic loading state for immediate UI feedback
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // ✅ Error dialog state for better UX
  const [errorDialog, setErrorDialog] = useState<{
    open: boolean;
    title: string;
    message: string;
    showVerification?: boolean;
    email?: string;
    role?: 'customer' | 'provider';
  }>({ open: false, title: '', message: '' });

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

  // ✅ REMOVED: Manual navigation logic - let Zustand store handle this
  // The auth layout in the root layout will handle post-login navigation
  React.useMemo(() => {
    if (session && userRole) {
      console.log('[Login] Auth state updated - navigation will be handled by auth layout');
      setIsSubmitting(false); // Reset optimistic state
      // Navigation is now handled by auth guards in the root layout
    }
  }, [session, userRole]);

  const onSubmit = (data: LoginFormData) => {
    // ✅ Set optimistic loading state immediately
    setIsSubmitting(true);
    
    console.log('[Login] Attempting login with:', { email: data.email });
    
    signIn(
      { email: data.email, password: data.password },
      {
        onSuccess: async () => {
          console.log('[Login] Login successful');
          // Keep loading state until navigation happens
          // Navigation will happen automatically via the auth state check above
        },
        onError: (error: any) => {
          console.error('[Login] Login failed:', error);
          setIsSubmitting(false); // Reset loading state on error
          
          const errorMessage = error?.message || 'An error occurred while trying to sign in.';
          
          // Set form-level error for invalid credentials
          if (errorMessage.includes('Invalid credentials') || errorMessage.includes('Invalid login') || errorMessage.includes('invalid')) {
            setError('password', { message: 'Invalid email or password' });
            
            // Also show user-friendly dialog
            setErrorDialog({
              open: true,
              title: 'Login Failed',
              message: 'The email or password you entered is incorrect. Please check your credentials and try again.'
            });
          } else {
            // Show generic error dialog for other errors
            setErrorDialog({
              open: true,
              title: 'Login Failed', 
              message: errorMessage
            });
          }
        }
      }
    );
  };

  return (
    <ScreenWrapper scrollable={false} contentContainerClassName="px-6 py-4 justify-center">
      {/* Header */}
      <Animated.View
        entering={FadeIn.delay(100).duration(800)}
        className="items-center mb-12"
      >
        <Logo size={64} style={{ marginBottom: 16 }} />
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
            onPress={() => router.push('/(auth)/register')}
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
          onPress={() => router.replace('/(public)/onboarding')}
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
      {/* <StorageDebugPanel/> */}
        </Animated.View>
      )}

      {/* Error Dialog */}
      <AlertDialog open={errorDialog.open} onOpenChange={(open) => setErrorDialog(prev => ({ ...prev, open }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{errorDialog.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {errorDialog.message}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            {errorDialog.showVerification ? (
              <>
                <AlertDialogCancel onPress={() => setErrorDialog(prev => ({ ...prev, open: false }))}>
                  <Text>Cancel</Text>
                </AlertDialogCancel>
                <AlertDialogAction 
                  onPress={() => {
                    setErrorDialog(prev => ({ ...prev, open: false }));
                    router.push({
                      pathname: '/(auth)/otp-verification',
                      params: {
                        email: errorDialog.email,
                        role: errorDialog.role || 'customer', // Use fetched role, fallback to customer
                      },
                    } as any);
                  }}
                >
                  <Text>Verify Email</Text>
                </AlertDialogAction>
              </>
            ) : (
              <AlertDialogAction onPress={() => setErrorDialog(prev => ({ ...prev, open: false }))}>
                <Text>Try Again</Text>
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ScreenWrapper>
  );
}
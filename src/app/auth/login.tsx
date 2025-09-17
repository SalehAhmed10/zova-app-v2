import React, { useState } from 'react';
import { View, Alert } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { Text } from '@/components/ui/text';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScreenWrapper } from '@/components/ui/screen-wrapper';
import { DebugResetOnboarding } from '@/components/debug/DebugResetOnboarding';
import { useAuth } from '@/hooks/useAuth';
import { useAppStore } from '@/stores/app';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { signIn, loading } = useAuth();
  const { setAuthenticated } = useAppStore();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    const result = await signIn(email, password);
    
    if (result.success) {
      console.log('Login successful');
      // For demo purposes, default to customer role
      // In production, this would come from the user's profile
      const userRole = 'customer'; // This should come from backend
      setAuthenticated(true, userRole);
      
      // Navigate based on user role
      if (userRole === 'customer') {
        router.replace('/customer');
      } else if (userRole === 'provider') {
        router.replace('/provider');
      }
    } else {
      Alert.alert('Login Failed', result.error || 'An error occurred');
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
      <Animated.View entering={SlideInDown.delay(400).springify()} className="px-2">
        <View className="w-full max-w-md mx-auto mb-6">
          <Text variant="h3" className="text-center mb-8">
            Sign In
          </Text>
          
          <View className="gap-6">
            <View>
              <Text variant="small" className="mb-3 font-semibold text-foreground">
                Email
              </Text>
              <Input
                placeholder="Enter your email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
            </View>

            <View>
              <Text variant="small" className="mb-3 font-semibold text-foreground">
                Password
              </Text>
              <Input
                placeholder="Enter your password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="current-password"
              />
            </View>

            <Button 
              onPress={handleLogin}
              disabled={loading}
              className="w-full mt-4"
              size="lg"
            >
              <Text variant="default" className="text-primary-foreground font-semibold">
                {loading ? 'Signing In...' : 'Sign In'}
              </Text>
            </Button>
          </View>
        </View>
      </Animated.View>

      {/* Register Option */}
      <Animated.View 
        entering={FadeIn.delay(600).springify()}
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

      {/* Debug Reset Button */}
      <DebugResetOnboarding />

      {/* Back Button */}
      <Animated.View entering={FadeIn.delay(800).springify()}>
        <Button
          variant="outline"
          size="lg"
          onPress={() => router.back()}
          className="w-full"
        >
          <Text>Back</Text>
        </Button>
      </Animated.View>
    </ScreenWrapper>
  );
}
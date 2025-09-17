import React from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function AuthIndex() {
  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      <View className="flex-1 px-6 py-8">
        {/* Header */}
        <Animated.View 
          entering={FadeIn.delay(200).springify()}
          className="items-center mb-12"
        >
          <View className="w-24 h-24 bg-primary rounded-2xl justify-center items-center mb-6">
            <Text className="text-4xl font-bold text-primary-foreground">Z</Text>
          </View>
          <Text className="text-3xl font-bold text-foreground mb-2">
            Welcome to ZOVA
          </Text>
          <Text className="text-lg text-muted-foreground text-center">
            Your trusted service marketplace
          </Text>
        </Animated.View>

        {/* Main content */}
        <Animated.View 
          entering={SlideInDown.delay(400).springify()}
          className="flex-1 justify-center"
        >
          <Card className="mb-8">
            <CardContent className="p-6">
              <Text className="text-xl font-semibold text-foreground mb-4 text-center">
                Get started with ZOVA
              </Text>
              <Text className="text-base text-muted-foreground text-center mb-6">
                Sign in to your account or create a new one to start connecting with trusted service providers.
              </Text>
              
              <View className="gap-4">
                <Button
                  size="lg"
                  onPress={() => router.push('/auth/login' as any)}
                  className="w-full"
                >
                  <Text className="font-semibold">Sign In</Text>
                </Button>
                
                <Button
                  variant="outline"
                  size="lg"
                  onPress={() => router.push('/auth/register' as any)}
                  className="w-full"
                >
                  <Text>Create Account</Text>
                </Button>
              </View>
            </CardContent>
          </Card>

          {/* Features preview */}
          <View className="gap-3">
            <FeatureItem 
              icon="🔒" 
              title="Secure & Safe" 
              description="Your data is protected with enterprise-grade security"
            />
            <FeatureItem 
              icon="⭐" 
              title="Verified Providers" 
              description="All service providers are thoroughly vetted and verified"
            />
            <FeatureItem 
              icon="📱" 
              title="Easy Booking" 
              description="Book services in just a few taps with instant confirmation"
            />
          </View>
        </Animated.View>

        {/* Footer */}
        <Animated.View 
          entering={FadeIn.delay(600).springify()}
          className="mt-8"
        >
          <Text className="text-sm text-muted-foreground text-center">
            By continuing, you agree to our{' '}
            <Text className="text-primary underline">Terms of Service</Text>
            {' '}and{' '}
            <Text className="text-primary underline">Privacy Policy</Text>
          </Text>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

interface FeatureItemProps {
  icon: string;
  title: string;
  description: string;
}

function FeatureItem({ icon, title, description }: FeatureItemProps) {
  return (
    <View className="flex-row items-center gap-3">
      <View className="w-10 h-10 bg-muted rounded-full items-center justify-center">
        <Text className="text-lg">{icon}</Text>
      </View>
      <View className="flex-1">
        <Text className="text-sm font-medium text-foreground">{title}</Text>
        <Text className="text-xs text-muted-foreground">{description}</Text>
      </View>
    </View>
  );
}
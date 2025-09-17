import React, { useState } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, { FadeIn, SlideInDown, withSpring } from 'react-native-reanimated';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/stores/app';

type UserRole = 'customer' | 'provider';

interface RoleOption {
  role: UserRole;
  title: string;
  description: string;
  icon: string;
  features: string[];
}

const roleOptions: RoleOption[] = [
  {
    role: 'customer',
    title: 'I need services',
    description: 'Book appointments and connect with trusted service providers',
    icon: '👤',
    features: [
      'Browse and book services',
      'Real-time tracking',
      'Secure payments',
      'Rate and review providers',
      'Chat with professionals'
    ],
  },
  {
    role: 'provider',
    title: 'I provide services',
    description: 'Offer your services and grow your business',
    icon: '🔧',
    features: [
      'Create service listings',
      'Manage appointments',
      'Receive payments',
      'Build your reputation',
      'Analytics and insights'
    ],
  },
];

export default function RoleSelectionScreen() {
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const { setAuthenticated } = useAppStore();

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
  };

  const handleContinue = async () => {
    if (!selectedRole) return;

    try {
      // Set the user role in app store and mark as authenticated
      setAuthenticated(true, selectedRole);
      
      // Navigate based on selected role
      if (selectedRole === 'customer') {
        router.replace('/customer/' as any);
      } else if (selectedRole === 'provider') {
        router.replace('/provider/' as any);
      }
    } catch (error) {
      console.error('Role selection error:', error);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      <ScrollView 
        className="flex-1 px-6 py-4"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View 
          entering={FadeIn.delay(200).springify()}
          className="items-center mb-8"
        >
          <View className="w-20 h-20 bg-primary rounded-3xl justify-center items-center mb-6">
            <Text className="text-3xl font-bold text-primary-foreground">Z</Text>
          </View>
          <Text className="text-3xl font-bold text-foreground mb-3 text-center">
            How will you use ZOVA?
          </Text>
          <Text className="text-base text-muted-foreground text-center px-4">
            Choose your role to get started with a personalized experience
          </Text>
        </Animated.View>

        {/* Role Options */}
        <Animated.View 
          entering={SlideInDown.delay(400).springify()}
          className="gap-4 mb-8 px-2"
        >
          {roleOptions.map((option, index) => (
            <Pressable
              key={option.role}
              onPress={() => handleRoleSelect(option.role)}
            >
              <Animated.View
                entering={SlideInDown.delay(500 + index * 100).springify()}
                className={`border-2 rounded-xl p-6 ${
                  selectedRole === option.role
                    ? 'border-primary bg-primary/5'
                    : 'border-border bg-background'
                }`}
              >
                <View className="flex-row items-start gap-4">
                  {/* Icon */}
                  <View className="w-16 h-16 bg-muted rounded-2xl justify-center items-center">
                    <Text className="text-2xl">{option.icon}</Text>
                  </View>

                  {/* Content */}
                  <View className="flex-1">
                    <Text className="text-xl font-bold text-foreground mb-2">
                      {option.title}
                    </Text>
                    <Text className="text-muted-foreground mb-4">
                      {option.description}
                    </Text>

                    {/* Features */}
                    <View className="gap-2">
                      {option.features.map((feature, featureIndex) => (
                        <View key={featureIndex} className="flex-row items-center">
                          <View className="w-1.5 h-1.5 bg-primary rounded-full mr-3" />
                          <Text className="text-sm text-muted-foreground">
                            {feature}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>

                  {/* Selection Indicator */}
                  <View 
                    className={`w-6 h-6 rounded-full border-2 justify-center items-center ${
                      selectedRole === option.role
                        ? 'border-primary bg-primary'
                        : 'border-muted'
                    }`}
                  >
                    {selectedRole === option.role && (
                      <View className="w-2 h-2 bg-primary-foreground rounded-full" />
                    )}
                  </View>
                </View>
              </Animated.View>
            </Pressable>
          ))}
        </Animated.View>

        {/* Continue Button */}
        <Animated.View entering={FadeIn.delay(800).springify()}>
          <Button
            size="lg"
            onPress={handleContinue}
            disabled={!selectedRole}
            className="w-full mb-4"
          >
            <Text className="font-semibold text-primary-foreground">
              Continue
            </Text>
          </Button>
        </Animated.View>

        {/* Back Button */}
        <Animated.View entering={FadeIn.delay(900).springify()}>
          <Button
            variant="outline"
            size="lg"
            onPress={() => router.back()}
            className="w-full"
          >
            <Text>Back</Text>
          </Button>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}
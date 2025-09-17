import React, { useState } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/stores/app';

const ONBOARDING_STEPS = [
  {
    title: 'Find Services Near You',
    description: "Discover trusted service providers in your area. From beauty to home services, we've got you covered.",
    icon: '📍',
  },
  {
    title: 'Book Instantly',
    description: 'Schedule services at your convenience. Real-time availability means no waiting around.',
    icon: '⚡',
  },
  {
    title: 'Trusted & Verified',
    description: 'All providers are verified and reviewed by our community. Your safety is our priority.',
    icon: '�',
  },
  {
    title: 'Rate & Review',
    description: 'Share your experience and help others find the best services. Build a better community together.',
    icon: '⭐',
  },
];

export default function OnboardingScreen() {
  const [currentStep, setCurrentStep] = useState(0);
  const { completeOnboarding } = useAppStore();

  const handleNext = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      completeOnboarding();
      router.replace('/auth/login');
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    completeOnboarding();
    router.replace('/auth/login');
  };

  const currentStepData = ONBOARDING_STEPS[currentStep];

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      {/* Header with back and skip */}
      <View className="flex-row justify-between items-center px-6 py-4">
        <Button
          variant="ghost"
          size="sm"
          onPress={handleBack}
          className={currentStep === 0 ? 'invisible' : 'visible'}
        >
          <Text className="text-muted-foreground">Back</Text>
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onPress={handleSkip}
          className={currentStep === ONBOARDING_STEPS.length - 1 ? 'invisible' : 'visible'}
        >
          <Text className="text-muted-foreground">Skip</Text>
        </Button>
      </View>

      {/* Progress dots */}
      <View className="flex-row justify-center gap-2 px-6 mb-12">
        {ONBOARDING_STEPS.map((_, index) => (
          <Animated.View
            key={index}
            entering={FadeIn.delay(index * 100)}
            className={`h-2 rounded-full ${
              index === currentStep 
                ? 'w-8 bg-primary' 
                : index < currentStep 
                  ? 'w-2 bg-primary/60' 
                  : 'w-2 bg-muted'
            }`}
          />
        ))}
      </View>

      {/* Main content */}
      <View className="flex-1 justify-center px-6">
        <Animated.View 
          key={currentStep}
          entering={SlideInDown.springify()}
          className="items-center"
        >
          {/* Icon */}
          <Text className="text-7xl mb-8">{currentStepData.icon}</Text>
          
          {/* Title */}
          <Text variant="h1" className="text-center mb-6 px-4">
            {currentStepData.title}
          </Text>
          
          {/* Description */}
          <Text 
            variant="p" 
            className="text-muted-foreground text-center leading-relaxed px-8 mb-16"
          >
            {currentStepData.description}
          </Text>
        </Animated.View>
      </View>

      {/* Bottom buttons */}
      <View className="px-6 pb-8">
        <Button 
          onPress={handleNext} 
          className="w-full mb-4"
          size="lg"
        >
          <Text variant="default" className="text-primary-foreground font-semibold">
            {currentStep === ONBOARDING_STEPS.length - 1 ? 'Get Started' : 'Next'}
          </Text>
        </Button>
      </View>
    </SafeAreaView>
  );
}
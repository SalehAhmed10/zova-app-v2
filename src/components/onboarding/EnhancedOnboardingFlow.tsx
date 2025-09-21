import React from 'react';
import { View, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  runOnJS,
  FadeIn,
  FadeOut,
  SlideInRight,
  SlideOutLeft,
} from 'react-native-reanimated';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { router } from 'expo-router';
import { useOnboardingStore, useOnboardingSelectors } from '@/stores/onboarding';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';

const { width: screenWidth } = Dimensions.get('window');

interface OnboardingStep {
  id: number;
  title: string;
  subtitle: string;
  description: string;
  primaryAction: string;
  illustration: React.ComponentType;
}

// Illustration Components
function WelcomeIllustration() {
  return (
    <Animated.View 
      entering={FadeIn.delay(300).springify()}
      className="items-center"
    >
      <View className="w-40 h-40 bg-primary/10 rounded-full items-center justify-center mb-6">
        <View className="w-28 h-28 bg-primary/20 rounded-full items-center justify-center">
          <View className="w-16 h-16 bg-primary rounded-full items-center justify-center">
            <Text className="text-primary-foreground text-3xl font-bold">Z</Text>
          </View>
        </View>
      </View>
      <View className="items-center">
        <Text className="text-4xl mb-2">👋</Text>
        <Text className="text-lg font-medium text-foreground">Welcome to ZOVA</Text>
      </View>
    </Animated.View>
  );
}

function ServicesIllustration() {
  const services = [
    { icon: '🏠', name: 'Home', color: 'bg-blue-500/20' },
    { icon: '🔧', name: 'Repair', color: 'bg-green-500/20' },
    { icon: '✨', name: 'Cleaning', color: 'bg-purple-500/20' },
    { icon: '🎨', name: 'Design', color: 'bg-orange-500/20' },
  ];

  return (
    <Animated.View 
      entering={FadeIn.delay(300).springify()}
      className="items-center"
    >
      <View className="flex-row flex-wrap justify-center gap-4 mb-8">
        {services.map((service, index) => (
          <Animated.View
            key={service.name}
            entering={FadeIn.delay(400 + index * 100).springify()}
            className={`w-20 h-20 ${service.color} rounded-2xl items-center justify-center`}
          >
            <Text className="text-2xl">{service.icon}</Text>
            <Text className="text-xs font-medium text-foreground/80 mt-1">
              {service.name}
            </Text>
          </Animated.View>
        ))}
      </View>
      <Text className="text-lg font-medium text-foreground text-center">
        Connect with trusted professionals
      </Text>
    </Animated.View>
  );
}

function TrustIllustration() {
  return (
    <Animated.View 
      entering={FadeIn.delay(300).springify()}
      className="items-center"
    >
      <View className="relative">
        <View className="w-32 h-32 bg-green-500/20 rounded-full items-center justify-center mb-6">
          <View className="w-20 h-20 bg-green-500/30 rounded-full items-center justify-center">
            <Text className="text-4xl">🛡️</Text>
          </View>
        </View>
        {/* Trust badges */}
        <View className="absolute -top-2 -right-2 w-8 h-8 bg-green-500 rounded-full items-center justify-center">
          <Text className="text-white text-xs">✓</Text>
        </View>
        <View className="absolute -bottom-2 -left-2 w-8 h-8 bg-blue-500 rounded-full items-center justify-center">
          <Text className="text-white text-xs">⭐</Text>
        </View>
      </View>
      <Text className="text-lg font-medium text-foreground text-center">
        Verified & Trusted Providers
      </Text>
    </Animated.View>
  );
}

function ReadyIllustration() {
  return (
    <Animated.View 
      entering={FadeIn.delay(300).springify()}
      className="items-center"
    >
      <View className="w-32 h-32 bg-primary/20 rounded-full items-center justify-center mb-6">
        <Text className="text-6xl">🎉</Text>
      </View>
      <Text className="text-lg font-medium text-foreground text-center">
        You're all set!
      </Text>
    </Animated.View>
  );
}

const onboardingSteps: OnboardingStep[] = [
  {
    id: 1,
    title: "Welcome to ZOVA",
    subtitle: "Your trusted service marketplace",
    description: "Find and book professional services with confidence. From home repairs to creative services, we connect you with verified experts.",
    primaryAction: "Get Started",
    illustration: WelcomeIllustration,
  },
  {
    id: 2,
    title: "Discover Services",
    subtitle: "Browse hundreds of categories",
    description: "Explore a wide range of professional services. From home maintenance to creative projects, find exactly what you need.",
    primaryAction: "Explore Services",
    illustration: ServicesIllustration,
  },
  {
    id: 3,
    title: "Trust & Safety",
    subtitle: "Verified professionals only",
    description: "All service providers are thoroughly vetted and verified. Read reviews, check ratings, and book with confidence.",
    primaryAction: "Learn About Safety",
    illustration: TrustIllustration,
  },
  {
    id: 4,
    title: "Ready to Start",
    subtitle: "Begin your ZOVA journey",
    description: "You're ready to discover amazing services and connect with trusted professionals. Let's get started!",
    primaryAction: "Start Exploring",
    illustration: ReadyIllustration,
  },
];

export function EnhancedOnboardingFlow() {
  const { currentStep, nextStep, previousStep, complete } = useOnboardingStore();
  const { isFirstStep, isLastStep, progress, canGoNext, canGoBack } = useOnboardingSelectors();
  
  const translateX = useSharedValue(0);
  const currentStepData = onboardingSteps[currentStep - 1];

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
    };
  }, []);

  const progressStyle = useAnimatedStyle(() => {
    return {
      width: `${progress}%`,
    };
  }, [progress]);

  const handleNext = React.useCallback(() => {
    if (isLastStep) {
      complete();
      router.replace('/');
    } else {
      nextStep();
    }
  }, [isLastStep, complete, nextStep]);

  const handlePrevious = React.useCallback(() => {
    if (canGoBack) {
      previousStep();
    }
  }, [canGoBack, previousStep]);

  const handleSkip = React.useCallback(() => {
    complete();
    router.replace('/');
  }, [complete]);

  // Gesture handling for swipe navigation
  const handleGestureEvent = ({ nativeEvent }: any) => {
    translateX.value = nativeEvent.translationX;
  };

  const handleGestureEnd = ({ nativeEvent }: any) => {
    const { translationX, velocityX } = nativeEvent;
    
    if (Math.abs(translationX) > screenWidth * 0.3 || Math.abs(velocityX) > 1000) {
      if (translationX > 0 && canGoBack) {
        // Swipe right - go back
        runOnJS(handlePrevious)();
      } else if (translationX < 0 && canGoNext) {
        // Swipe left - go forward
        runOnJS(handleNext)();
      }
    }
    
    // Reset position
    translateX.value = withSpring(0);
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      {/* Header with progress */}
      <View className="px-6 py-4">
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-sm font-medium text-muted-foreground">
            {currentStep} of {onboardingSteps.length}
          </Text>
          <Button 
            variant="ghost" 
            size="sm"
            onPress={handleSkip}
            className="px-3"
          >
            <Text className="text-muted-foreground">Skip</Text>
          </Button>
        </View>
        
        {/* Progress bar */}
        <View className="h-2 bg-muted rounded-full overflow-hidden">
          <Animated.View 
            style={progressStyle}
            className="h-full bg-primary rounded-full"
          />
        </View>
      </View>

      {/* Main content */}
      <PanGestureHandler
        onGestureEvent={handleGestureEvent}
        onHandlerStateChange={({ nativeEvent }) => {
          if (nativeEvent.state === State.END) {
            handleGestureEnd({ nativeEvent });
          }
        }}
      >
        <Animated.View style={animatedStyle} className="flex-1">
          <View className="flex-1 px-6 py-8">
            {/* Illustration */}
            <View className="flex-1 items-center justify-center">
              <currentStepData.illustration />
            </View>

            {/* Content */}
            <Animated.View 
              key={currentStep}
              entering={FadeIn.delay(200).springify()}
              exiting={FadeOut.springify()}
              className="mb-8"
            >
              <Text className="text-3xl font-bold text-foreground mb-2 text-center">
                {currentStepData.title}
              </Text>
              <Text className="text-lg text-primary mb-4 text-center font-medium">
                {currentStepData.subtitle}
              </Text>
              <Text className="text-base text-muted-foreground text-center leading-relaxed px-4">
                {currentStepData.description}
              </Text>
            </Animated.View>

            {/* Navigation */}
            <View className="gap-3">
              <Button
                size="lg"
                onPress={handleNext}
                className="w-full"
              >
                <Text className="font-semibold">
                  {isLastStep ? 'Get Started' : currentStepData.primaryAction}
                </Text>
              </Button>
              
              {!isFirstStep && (
                <Button
                  variant="outline"
                  size="lg"
                  onPress={handlePrevious}
                  className="w-full"
                >
                  <Text>Previous</Text>
                </Button>
              )}
            </View>
          </View>
        </Animated.View>
      </PanGestureHandler>

      {/* Step indicators */}
      <View className="flex-row justify-center gap-2 pb-6">
        {onboardingSteps.map((_, index) => (
          <View
            key={index}
            className={`w-2 h-2 rounded-full ${
              index + 1 === currentStep 
                ? 'bg-primary' 
                : index + 1 < currentStep 
                  ? 'bg-primary/60' 
                  : 'bg-muted'
            }`}
          />
        ))}
      </View>
    </SafeAreaView>
  );
}
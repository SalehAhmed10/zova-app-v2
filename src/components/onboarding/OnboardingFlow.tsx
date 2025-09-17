import React from 'react';
import { View } from '@/components/ui/view';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { router } from 'expo-router';
import { useOnboardingStore } from '@/stores/onboarding';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInRight,
  SlideOutLeft,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemeToggle } from '@/components/ThemeToggle';

interface OnboardingStep {
  title: string;
  subtitle: string;
  description: string;
  illustration: React.ComponentType;
  primaryAction: string;
}

function WelcomeIllustration() {
  return (
    <View className="w-32 h-32 bg-primary/10 rounded-full items-center justify-center mb-4">
      <View className="w-20 h-20 bg-primary/20 rounded-full items-center justify-center">
        <View className="w-12 h-12 bg-primary rounded-full items-center justify-center">
          <Text className="text-primary-foreground text-2xl font-bold">
            🚀
          </Text>
        </View>
      </View>
    </View>
  );
}

function FeaturesIllustration() {
  const features = [
    { icon: '👥', label: 'Verified' },
    { icon: '📅', label: 'Easy Booking' },
    { icon: '⭐', label: 'Trusted' },
  ];

  return (
    <View className="flex-row justify-center items-center gap-4 mb-4">
      {features.map((feature, index) => (
        <View
          key={feature.label}
          className="items-center"
        >
          <View className="w-16 h-16 bg-secondary/20 rounded-2xl items-center justify-center mb-2">
            <Text className="text-2xl">{feature.icon}</Text>
          </View>
          <Text className="text-sm font-medium text-muted-foreground">
            {feature.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

function ServiceBookingIllustration() {
  return (
    <View className="items-center mb-4">
      <View className="flex-row items-center gap-4 mb-6">
        <View className="w-20 h-20 bg-primary/10 rounded-2xl items-center justify-center shadow-lg">
          <Text className="text-3xl">📱</Text>
          <Text className="text-xs text-muted-foreground mt-1">Book</Text>
        </View>

        <View className="w-8 h-8 bg-primary rounded-full items-center justify-center">
          <Text className="text-primary-foreground text-sm">→</Text>
        </View>

        <View className="w-20 h-20 bg-secondary/20 rounded-2xl items-center justify-center shadow-lg">
          <Text className="text-3xl">✅</Text>
          <Text className="text-xs text-muted-foreground mt-1">Confirm</Text>
        </View>
      </View>

      <Text className="text-sm text-muted-foreground text-center">
        Simple booking in 3 easy steps
      </Text>
    </View>
  );
}

function GetStartedIllustration() {
  return (
    <View className="items-center mb-4">
      <View className="w-32 h-32 bg-gradient-to-br from-primary to-primary/80 rounded-full items-center justify-center mb-4 shadow-2xl shadow-primary/30">
        <Text className="text-5xl">🎉</Text>
      </View>

      <View className="bg-primary/10 rounded-2xl px-6 py-3">
        <Text className="text-primary font-semibold text-center">
          You're all set!
        </Text>
      </View>
    </View>
  );
}

const onboardingSteps: OnboardingStep[] = [
  {
    title: "Welcome to ZOVA",
    subtitle: "Connect with trusted professionals",
    description: "Discover amazing service providers and book appointments seamlessly. Connect with trusted professionals in your area and experience reliable service connections.",
    illustration: WelcomeIllustration,
    primaryAction: "Let's get started"
  },
  {
    title: "Trusted Professionals",
    subtitle: "Quality service guaranteed",
    description: "Connect with verified service providers, book appointments effortlessly, and experience trusted professional connections.",
    illustration: FeaturesIllustration,
    primaryAction: "See how it works"
  },
  {
    title: "Easy Booking Process",
    subtitle: "Book with confidence",
    description: "Browse available services, select your preferred time, and confirm your booking instantly. Professional service at your fingertips.",
    illustration: ServiceBookingIllustration,
    primaryAction: "Start booking"
  },
  {
    title: "Ready to Connect?",
    subtitle: "Start your service journey",
    description: "Everything is set up and ready to go. Start connecting with trusted service providers and book your first appointment with ZOVA.",
    illustration: GetStartedIllustration,
    primaryAction: "Start Exploring"
  }
];

export function OnboardingFlow() {
  const { currentStep, nextStep, previousStep, skip, complete } = useOnboardingStore();
  const [currentIndex, setCurrentIndex] = React.useState(Math.max(0, currentStep - 1));
  const slideAnim = useSharedValue(0);

  React.useEffect(() => {
    setCurrentIndex(Math.max(0, currentStep - 1));
  }, [currentStep]);

  const currentStepData = onboardingSteps[currentIndex] || onboardingSteps[0];
  const isLastStep = currentIndex === onboardingSteps.length - 1;

  // Fix: Move animated style outside of render and avoid reading shared value during render
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: slideAnim.value }],
    };
  }, []);

  React.useEffect(() => {
    slideAnim.value = withSpring(0, { damping: 25, stiffness: 120 });
  }, [currentIndex, slideAnim]);

  const handleNext = () => {
    if (isLastStep) {
      complete();
      router.replace('/');
    } else {
      // Use runOnJS for smoother animation without shared value access during render
      slideAnim.value = withSpring(-40, { damping: 25, stiffness: 120 }, (finished) => {
        'worklet';
        if (finished) {
          runOnJS(setCurrentIndex)(Math.min(currentIndex + 1, onboardingSteps.length - 1));
          runOnJS(nextStep)();
        }
      });
    }
  };

  const handleBack = () => {
    if (currentIndex > 0) {
      slideAnim.value = withSpring(40, { damping: 25, stiffness: 120 }, (finished) => {
        'worklet';
        if (finished) {
          runOnJS(setCurrentIndex)(Math.max(currentIndex - 1, 0));
          runOnJS(previousStep)();
        }
      });
    }
  };

  const handleSkip = () => {
    skip();
    router.replace('/');
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      {/* Progress Indicator */}
      <View className="pt-4 pb-8 px-6">
        <View className="flex-row justify-between items-center mb-8">
          {/* Back Button - only show if not first step */}
          {currentIndex > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              onPress={handleBack}
              className="p-2"
            >
              <Text className="text-muted-foreground text-lg">‹</Text>
            </Button>
          ) : (
            <View className="w-10" />
          )}

          {/* Progress Dots */}
          <View className="flex-row justify-center items-center flex-1">
            {onboardingSteps.map((_, index) => {
              const isActive = index === currentIndex;
              const isCompleted = index < currentIndex;

              return (
                <View
                  key={index}
                  className={`w-2.5 h-2.5 rounded-full mx-1 ${
                    isCompleted
                      ? 'bg-primary'
                      : isActive
                      ? 'bg-primary'
                      : 'bg-muted-foreground/30'
                  }`}
                />
              );
            })}
          </View>

          <View className="w-10" /> 
        </View>

        {/* Progress Bar */}
        <View className="w-full h-1 bg-muted rounded-full overflow-hidden">
          <View
            className="h-full bg-primary rounded-full"
            style={{
              width: `${((currentIndex + 1) / onboardingSteps.length) * 100}%`,
            }}
          />
        </View>
      </View>

      {/* Main Content */}
      <View className="flex-1 px-6">
        <Animated.View
          key={currentIndex}
          entering={SlideInRight.duration(400)}
          exiting={SlideOutLeft.duration(300)}
          style={animatedStyle}
          className="flex-1 items-center justify-center"
        >
          {/* Illustration */}
          <View className="mb-8">
            <currentStepData.illustration />
          </View>

          {/* Title */}
          <Text
            variant="h1"
            className="text-center text-3xl font-bold mb-3 text-foreground"
          >
            {currentStepData.title}
          </Text>

          {/* Subtitle */}
          {currentStepData.subtitle && (
            <Text className="text-center text-lg text-muted-foreground mb-6">
              {currentStepData.subtitle}
            </Text>
          )}

          {/* Description */}
          <Text className="text-center text-base text-muted-foreground mb-12 leading-6 px-4">
            {currentStepData.description}
          </Text>

        
        </Animated.View>
      </View>

      {/* Bottom Actions - Safe Area */}
      <SafeAreaView edges={['bottom']} className="bg-background">
        <View className="px-6 pb-6">
          <View className="w-full gap-4">
            <Button
              onPress={handleNext}
              className="w-full"
              size="lg"
            >
              <Text className="text-primary-foreground font-semibold">
                {currentStepData.primaryAction}
              </Text>
            </Button>

            {!isLastStep && (
              <Button
                variant="ghost"
                onPress={handleSkip}
                className="w-full"
              >
                <Text className="text-muted-foreground">
                  Skip for now
                </Text>
              </Button>
            )}
          </View>
        </View>
      </SafeAreaView>
    </SafeAreaView>
  );
}
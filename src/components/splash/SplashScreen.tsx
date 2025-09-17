import React, { useEffect } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  withSequence,
  runOnJS,
} from 'react-native-reanimated';
import { Text } from '@/components/ui/text';

interface SplashScreenProps {
  onComplete: () => void;
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  
  // Animation values
  const logoScale = useSharedValue(0);
  const logoOpacity = useSharedValue(0);
  const titleOpacity = useSharedValue(0);
  const titleTranslateY = useSharedValue(30);
  const subtitleOpacity = useSharedValue(0);
  const subtitleTranslateY = useSharedValue(20);
  const containerOpacity = useSharedValue(1);

  // Animated styles
  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
    opacity: logoOpacity.value,
  }));

  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleTranslateY.value }],
  }));

  const subtitleStyle = useAnimatedStyle(() => ({
    opacity: subtitleOpacity.value,
    transform: [{ translateY: subtitleTranslateY.value }],
  }));

  const containerStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
  }));

  const handleAnimationComplete = () => {
    onComplete();
  };

  useEffect(() => {
    // Start animation sequence immediately
    logoScale.value = withSpring(1, { damping: 15, stiffness: 150 });
    logoOpacity.value = withSpring(1, { damping: 15, stiffness: 150 });

    titleOpacity.value = withDelay(
      300,
      withSpring(1, { damping: 15, stiffness: 150 })
    );
    titleTranslateY.value = withDelay(
      300,
      withSpring(0, { damping: 15, stiffness: 150 })
    );

    subtitleOpacity.value = withDelay(
      600,
      withSpring(1, { damping: 15, stiffness: 150 })
    );
    subtitleTranslateY.value = withDelay(
      600,
      withSpring(0, { damping: 15, stiffness: 150 })
    );

    // Exit animation after 3 seconds
    containerOpacity.value = withDelay(
      3000,
      withSpring(0, { damping: 15, stiffness: 150 }, (finished) => {
        'worklet';
        if (finished) {
          runOnJS(handleAnimationComplete)();
        }
      })
    );
  }, []);

  return (
    <Animated.View 
      style={containerStyle}
      className="flex-1 bg-background justify-center items-center px-8"
    >
      {/* Logo Container */}
      <Animated.View 
        style={logoStyle}
        className="mb-8"
      >
        <View className="w-24 h-24 bg-primary rounded-2xl justify-center items-center shadow-lg">
          <Text className="text-4xl font-bold text-primary-foreground">Z</Text>
        </View>
      </Animated.View>

      {/* Title */}
      <Animated.View style={titleStyle} className="mb-4">
        <Text className="text-4xl font-bold text-foreground text-center tracking-tight">
          ZOVA
        </Text>
      </Animated.View>

      {/* Subtitle */}
      <Animated.View style={subtitleStyle} className="mb-8">
        <Text className="text-lg text-muted-foreground text-center leading-relaxed max-w-sm">
          Your trusted service marketplace
        </Text>
      </Animated.View>

      {/* Loading indicator */}
      <View className="mt-12">
        <View className="w-8 h-1 bg-muted rounded-full overflow-hidden">
          <Animated.View 
            className="h-full bg-primary rounded-full"
            style={{
              width: '100%',
            }}
          />
        </View>
      </View>
    </Animated.View>
  );
}
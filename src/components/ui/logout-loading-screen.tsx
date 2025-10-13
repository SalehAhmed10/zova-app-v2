import React from 'react';
import { View } from 'react-native';
import Animated, { 
  useSharedValue, 
  withRepeat, 
  withSequence, 
  withTiming,
  useAnimatedStyle,
  withDelay
} from 'react-native-reanimated';
import { Text } from '@/components/ui/text';

interface LogoutLoadingScreenProps {
  visible: boolean;
}

export function LogoutLoadingScreen({ visible }: LogoutLoadingScreenProps) {
  // Temporarily disabled verbose logging to reduce console noise
  // console.log('[LogoutLoadingScreen] � Component render - visible:', visible);
  
  // ✅ CLEAN: Static initial values for optimal performance
  const scaleAnim = useSharedValue(0);
  const fadeAnim = useSharedValue(0);

  // ✅ ROBUST: Direct animation control without useEffect
  if (visible) {
    console.log('[LogoutLoadingScreen] ✨ Starting direct animations');
    
    // Start animations immediately when visible
    scaleAnim.value = withRepeat(
      withSequence(
        withTiming(1.1, { duration: 1000 }),
        withTiming(1, { duration: 1000 })
      ),
      -1,
      true
    );
    
    fadeAnim.value = withTiming(1, { duration: 300 });
  } else {
    // Reset animations when not visible
    scaleAnim.value = withTiming(0, { duration: 300 });
    fadeAnim.value = withTiming(0, { duration: 300 });
  }

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleAnim.value }],
    opacity: fadeAnim.value,
  }), []);

  // ✅ CLEAN: Early return without logging (reduces console noise during app init)
  if (!visible) {
    return null;
  }

  console.log('[LogoutLoadingScreen] ✅ Rendering branded logout screen');

  return (
    <View className="absolute inset-0 z-50 bg-primary" style={{ zIndex: 9999 }}>
      <View className="flex-1 items-center justify-center px-6">
        {/* Logo with animation */}
        <Animated.View style={animatedStyle} className="items-center mb-8">
          <View className="w-24 h-24 bg-primary-foreground/20 rounded-3xl items-center justify-center mb-6">
            <Text className="text-4xl font-bold text-primary-foreground">Z</Text>
          </View>
        </Animated.View>

        {/* Loading message */}
        <View className="items-center">
          <Text className="text-primary-foreground text-xl font-semibold mb-2">
            Signing Out
          </Text>
          <Text className="text-primary-foreground/80 text-base text-center leading-6">
            Securely logging you out...
          </Text>
        </View>

        {/* Loading dots animation */}
        <View className="flex-row items-center mt-8 gap-2">
          <LoadingDot delay={0} />
          <LoadingDot delay={200} />
          <LoadingDot delay={400} />
        </View>
      </View>
    </View>
  );
}

// ✅ CLEAN: Direct animation loading dot
function LoadingDot({ delay }: { delay: number }) {
  const opacity = useSharedValue(0.3);
  
  // ✅ DIRECT: Start animation immediately without useEffect
  opacity.value = withDelay(
    delay,
    withRepeat(
      withSequence(
        withTiming(1, { duration: 600 }),
        withTiming(0.3, { duration: 600 })
      ),
      -1,
      true
    )
  );

  const dotStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }), []);

  return (
    <Animated.View 
      style={dotStyle}
      className="w-3 h-3 bg-primary-foreground rounded-full"
    />
  );
}
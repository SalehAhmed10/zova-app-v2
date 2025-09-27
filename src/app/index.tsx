import { View } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming,
  runOnJS
} from 'react-native-reanimated';
import { Text } from '@/components/ui/text';
import { useAppStore } from '@/stores/auth/app';
import { Logo } from '@/components/branding';
import { useAppInitialization } from '@/hooks/shared/useAppInitialization';
import { useAuthNavigation } from '@/hooks/shared/useAuthNavigation';
import { useRef } from 'react';

export default function SplashScreen() {
  // ✅ OPTIMIZED: React Query + Zustand architecture
  const { isInitializing, isInitialized } = useAppInitialization();
  const { navigationDecision, navigateToDestination, isReady } = useAuthNavigation();
  const { isLoading } = useAppStore();
  
  const fadeAnim = useSharedValue(0);
  const scaleAnim = useSharedValue(0.8);
  const lastNavigationDestination = useRef<string | null>(null);

  // ✅ Optimized animation style
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
    transform: [{ scale: scaleAnim.value }],
  }), []);

  // ✅ Start animations immediately - no useEffect needed
  if (fadeAnim.value === 0) {
    fadeAnim.value = withTiming(1, { duration: 800 });
    scaleAnim.value = withTiming(1, { duration: 600 });
  }

  // ✅ Auto-navigate when ready - trigger navigation when destination changes
  const shouldNavigate = isInitialized && !isLoading && isReady && navigationDecision?.shouldNavigate;
  const currentDestination = navigationDecision?.destination;
  
  if (shouldNavigate && currentDestination && currentDestination !== lastNavigationDestination.current) {
    lastNavigationDestination.current = currentDestination;
    // Use setTimeout to prevent navigation during render
    setTimeout(() => {
      runOnJS(navigateToDestination)();
    }, 1500); // 1.5 seconds for optimal user experience
  }

  // ✅ Single splash screen with dotted animation
  return (
    <View className="flex-1 bg-background items-center justify-center px-6">
      <Animated.View style={animatedStyle} className="items-center space-y-8">
        {/* ZOVA Logo/Brand */}
        <Logo size={140} />
        
        {/* Dotted Loading Animation */}
        <View className="flex-row gap-2">
          <View className="w-2 h-2 bg-primary rounded-full animate-pulse" />
          <View className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
          <View className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
        </View>
      </Animated.View>
    </View>
  );
}
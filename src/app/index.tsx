import { useEffect, useState, useCallback } from 'react';
import { router } from 'expo-router';
import { View } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring
} from 'react-native-reanimated';
import { Text } from '@/components/ui/text';
import { useAppStore, initializeApp } from '@/stores/app';

export default function SplashScreen() {
  const [initialized, setInitialized] = useState(false);
  const [hasStartedInit, setHasStartedInit] = useState(false);
  const { isLoading, isOnboardingComplete, isAuthenticated, userRole } = useAppStore();
  const fadeAnim = useSharedValue(0);
  const scaleAnim = useSharedValue(0.8);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
    transform: [{ scale: scaleAnim.value }],
  }), []);

  const navigateToScreen = useCallback(() => {
    // Navigate based on authentication state
    if (!isOnboardingComplete) {
      console.log('[Splash] → Onboarding');
      router.replace('/onboarding');
    } else if (!isAuthenticated) {
      console.log('[Splash] → Auth');
      router.replace('/auth');
    } else {
      // Navigate based on user role
      if (userRole === 'customer') {
        console.log('[Splash] → Customer');
        router.replace('/customer');
      } else if (userRole === 'provider') {
        console.log('[Splash] → Provider');
        router.replace('/provider');
      } else {
        console.log('[Splash] → Auth (no role)');
        router.replace('/auth');
      }
    }
  }, [isOnboardingComplete, isAuthenticated, userRole]);

  useEffect(() => {
    // Start splash animation using worklet
    const startAnimation = () => {
      'worklet';
      fadeAnim.value = withSpring(1, { damping: 15 });
      scaleAnim.value = withSpring(1, { damping: 15 });
    };
    
    // Initialize animation values
    fadeAnim.value = 0;
    scaleAnim.value = 0.8;
    
    // Run animation on next frame to avoid render cycle
    const timer = setTimeout(startAnimation, 0);
    
    const init = async () => {
      // Prevent multiple initialization attempts
      if (hasStartedInit) {
        console.log('[Splash] Initialization already started, skipping');
        return;
      }
      
      setHasStartedInit(true);
      
      try {
        await initializeApp();
        setInitialized(true);
      } catch (error) {
        console.error('[Splash] Failed to initialize app:', error);
        // Force initialization even if it fails
        setInitialized(true);
      }
    };

    // Add timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      console.warn('[Splash] Initialization timeout, forcing completion');
      setInitialized(true);
    }, 5000); // 5 second timeout

    init();

    return () => {
      clearTimeout(timer);
      clearTimeout(timeout);
    };
  }, []);

  useEffect(() => {
    if (!initialized || isLoading) {
      console.log('[Splash] Still loading or not initialized:', { initialized, isLoading });
      return;
    }

    console.log('[Splash] State:', {
      initialized,
      isLoading,
      isOnboardingComplete,
      isAuthenticated,
      userRole
    });

    // Navigate after splash animation completes
    const timer = setTimeout(() => {
      navigateToScreen();
    }, 2000); // Show splash for 2 seconds

    return () => {
      clearTimeout(timer);
    };
  }, [initialized, isLoading, isOnboardingComplete, isAuthenticated, userRole, navigateToScreen]);

  // Show loading screen while initializing
  if (isLoading || !initialized) {
    return (
      <View className="flex-1 bg-background items-center justify-center px-6">
        <View className="items-center space-y-6">
          {/* ZOVA Logo/Brand */}
          <View className="items-center space-y-2">
            <Text variant="h1" className="text-primary font-bold text-4xl">
              ZOVA
            </Text>
            <Text variant="p" className="text-muted-foreground text-center">
              Connect with trusted service providers
            </Text>
          </View>

          {/* Loading Animation */}
          <View className="items-center space-y-4">
            <View className="flex-row space-x-2">
              <View className="w-3 h-3 bg-primary rounded-full animate-pulse" />
              <View className="w-3 h-3 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
              <View className="w-3 h-3 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
            </View>
            <Text variant="p" className="text-muted-foreground">
              Setting up your experience...
            </Text>
          </View>

          {/* Progress indicator */}
          <View className="w-full max-w-xs">
            <View className="h-1 bg-muted rounded-full overflow-hidden">
              <View className="h-full bg-primary rounded-full animate-pulse" />
            </View>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background items-center justify-center">
      <Animated.View style={animatedStyle} className="items-center">
        <Text variant="h1" className="text-primary mb-4 font-bold">
          ZOVA
        </Text>
        <Text variant="p" className="text-muted-foreground text-center">
          Connect with trusted service providers
        </Text>
      </Animated.View>
    </View>
  );
}
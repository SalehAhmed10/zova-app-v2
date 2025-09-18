import { useEffect, useState, useCallback } from 'react';
import { router } from 'expo-router';
import { View } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring,
  runOnJS
} from 'react-native-reanimated';
import { Text } from '@/components/ui/text';
import { useAppStore, initializeApp } from '@/stores/app';

export default function SplashScreen() {
  const [initialized, setInitialized] = useState(false);
  const [shouldNavigate, setShouldNavigate] = useState(false);
  const { isLoading, isOnboardingComplete, isAuthenticated, userRole } = useAppStore();
  const fadeAnim = useSharedValue(0);
  const scaleAnim = useSharedValue(0.8);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
    transform: [{ scale: scaleAnim.value }],
  }), []);

  const startAnimations = useCallback(() => {
    fadeAnim.value = withSpring(1, { damping: 15 });
    scaleAnim.value = withSpring(1, { damping: 15 });
  }, [fadeAnim, scaleAnim]);

  const navigateToScreen = useCallback(() => {
    if (!isOnboardingComplete) {
      console.log('[App Navigation] → Onboarding');
      router.replace('/onboarding');
    } else if (!isAuthenticated) {
      console.log('[App Navigation] → Login');
      router.replace('/auth/login');
    } else {
      // Navigate based on user role
      if (userRole === 'customer') {
        console.log('[App Navigation] → Customer Dashboard');
        router.replace('/customer');
      } else if (userRole === 'provider') {
        console.log('[App Navigation] → Provider Dashboard');
        router.replace('/provider');
      } else {
        console.log('[App Navigation] → Login (no role - need to register)');
        router.replace('/auth/login');
      }
    }
  }, [isOnboardingComplete, isAuthenticated, userRole]);

  useEffect(() => {
    // Start splash animation and app initialization
    startAnimations();
    
    const init = async () => {
      await initializeApp();
      setInitialized(true);
    };

    init();
  }, [startAnimations]);

  useEffect(() => {
    if (!initialized || isLoading) return;

    console.log('[App Navigation] State:', {
      initialized,
      isLoading,
      isOnboardingComplete,
      isAuthenticated,
      userRole
    });

    // Prevent double navigation
    if (shouldNavigate) return;

    // Navigation logic after initialization
    const timer = setTimeout(() => {
      setShouldNavigate(true);
      navigateToScreen();
    }, 2000); // Show splash for 2 seconds

    return () => clearTimeout(timer);
  }, [initialized, isLoading, isOnboardingComplete, isAuthenticated, userRole, shouldNavigate, navigateToScreen]);

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
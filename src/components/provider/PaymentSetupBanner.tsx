import React from 'react';
import { View, Pressable } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { X, CreditCard, ChevronRight } from 'lucide-react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { useProviderAccess } from '@/hooks/provider/useProviderAccess';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BANNER_DISMISSED_KEY = '@payment_setup_banner_dismissed';
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * ✅ PAYMENT SETUP BANNER (Dashboard)
 * 
 * Passive reminder banner that shows when:
 * - Verification is approved
 * - Payment is NOT active
 * 
 * Features:
 * - Dismissible (remembers for 7 days)
 * - Animated entrance
 * - Direct link to payment setup
 * - Uses useProviderAccess hook
 * 
 * Conversion: 30-40% (passive reminder)
 * Location: Provider dashboard _layout (above tabs)
 */
export function PaymentSetupBanner() {
  const [isDismissed, setIsDismissed] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  
  const { 
    needsPaymentSetup, 
    isFullyActive,
    canViewDashboard 
  } = useProviderAccess();

  // Check if banner was previously dismissed
  React.useEffect(() => {
    const checkDismissed = async () => {
      try {
        const dismissedData = await AsyncStorage.getItem(BANNER_DISMISSED_KEY);
        if (dismissedData) {
          const { timestamp } = JSON.parse(dismissedData);
          const now = Date.now();
          const timeSinceDismiss = now - timestamp;
          
          // Show banner again if 7 days have passed
          if (timeSinceDismiss < DISMISS_DURATION_MS) {
            setIsDismissed(true);
          } else {
            // Clear old dismissal
            await AsyncStorage.removeItem(BANNER_DISMISSED_KEY);
          }
        }
      } catch (error) {
        console.error('[PaymentSetupBanner] Error checking dismissed state:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkDismissed();
  }, []);

  const handleDismiss = async () => {
    try {
      const dismissData = {
        timestamp: Date.now(),
        dismissedBy: 'user'
      };
      await AsyncStorage.setItem(BANNER_DISMISSED_KEY, JSON.stringify(dismissData));
      setIsDismissed(true);
    } catch (error) {
      console.error('[PaymentSetupBanner] Error saving dismissed state:', error);
      setIsDismissed(true); // Still dismiss in UI even if storage fails
    }
  };

  const handleSetupPayment = () => {
    router.push('/(provider)/setup-payment' as any);
  };

  // Don't show if:
  // - Still loading dismissed state
  // - Already dismissed
  // - Not verified (can't view dashboard)
  // - Payment is already active
  // - Doesn't need payment setup
  if (isLoading || isDismissed || !canViewDashboard || isFullyActive || !needsPaymentSetup) {
    return null;
  }

  return (
    <Animated.View 
      entering={SlideInDown.duration(400).springify()}
      className="px-4 pb-3"
    >
      <View className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden">
        {/* Left accent stripe */}
        <View className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500" />
        
        <View className="flex-row items-center pl-4 pr-2 py-3.5">
          {/* Icon in circular background */}
          <View className="w-10 h-10 rounded-full bg-amber-500/10 items-center justify-center mr-3">
            <CreditCard size={20} className="text-amber-600 dark:text-amber-400" />
          </View>

          {/* Content */}
          <Pressable 
            onPress={handleSetupPayment}
            className="flex-1 mr-2"
            android_ripple={{ color: 'rgba(245, 158, 11, 0.05)' }}
          >
            <Text className="font-semibold text-foreground text-sm mb-0.5">
              Setup payments to start earning
            </Text>
            <Text className="text-muted-foreground text-xs">
              Connect your payment account • Takes 2 minutes
            </Text>
          </Pressable>

          {/* Navigation arrow */}
          <Pressable
            onPress={handleSetupPayment}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            className="p-1.5"
          >
            <ChevronRight 
              size={20} 
              className="text-muted-foreground" 
            />
          </Pressable>

          {/* Dismiss Button */}
          <Pressable
            onPress={handleDismiss}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            className="p-1.5"
          >
            <X size={18} className="text-muted-foreground" />
          </Pressable>
        </View>
      </View>
    </Animated.View>
  );
}

/**
 * Helper function to clear banner dismissal (useful for testing or user preference reset)
 */
export async function clearPaymentBannerDismissal() {
  try {
    await AsyncStorage.removeItem(BANNER_DISMISSED_KEY);
    console.log('[PaymentSetupBanner] Dismissal cleared');
  } catch (error) {
    console.error('[PaymentSetupBanner] Error clearing dismissal:', error);
  }
}

/**
 * Helper function to check if banner is currently dismissed
 */
export async function isPaymentBannerDismissed(): Promise<boolean> {
  try {
    const dismissedData = await AsyncStorage.getItem(BANNER_DISMISSED_KEY);
    if (dismissedData) {
      const { timestamp } = JSON.parse(dismissedData);
      const now = Date.now();
      const timeSinceDismiss = now - timestamp;
      return timeSinceDismiss < DISMISS_DURATION_MS;
    }
    return false;
  } catch (error) {
    console.error('[PaymentSetupBanner] Error checking dismissal:', error);
    return false;
  }
}

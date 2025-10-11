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
    router.push('/provider/setup-payment' as any);
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
      className="bg-amber-50 dark:bg-amber-950 border-b border-amber-200 dark:border-amber-800"
    >
      <View className="px-4 py-3">
        <View className="flex-row items-center gap-3">
          {/* Icon */}
          <View className="w-10 h-10 bg-amber-100 dark:bg-amber-900 rounded-full items-center justify-center">
            <CreditCard size={20} className="text-amber-600 dark:text-amber-400" />
          </View>

          {/* Content */}
          <Pressable 
            onPress={handleSetupPayment}
            className="flex-1"
            android_ripple={{ color: 'rgba(245, 158, 11, 0.1)' }}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-1 mr-2">
                <Text className="font-semibold text-amber-900 dark:text-amber-100 mb-0.5">
                  Setup Payments to Accept Bookings
                </Text>
                <Text className="text-xs text-amber-700 dark:text-amber-300">
                  Connect your payment account • Takes 2 minutes
                </Text>
              </View>
              
              <ChevronRight 
                size={20} 
                className="text-amber-600 dark:text-amber-400" 
              />
            </View>
          </Pressable>

          {/* Dismiss Button */}
          <Pressable
            onPress={handleDismiss}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            className="p-1"
          >
            <X size={20} className="text-amber-600 dark:text-amber-400" />
          </Pressable>
        </View>

        {/* Optional: CTA Button (uncomment if you want a button instead of just tap-anywhere) */}
        {/* <View className="mt-2">
          <Button 
            size="sm"
            onPress={handleSetupPayment}
            className="bg-amber-600 dark:bg-amber-500"
          >
            <Text className="text-white font-medium text-xs">
              Setup Now
            </Text>
          </Button>
        </View> */}
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

/**
 * ✅ VERIFICATION STATUS BANNER - Phase 4
 * 
 * PURPOSE: Informational banner showing verification review progress
 * LOCATION: Provider dashboard layout (above tabs)
 * PATTERN: Non-blocking, informational (NOT a gate)
 * 
 * SHOWS WHEN:
 * - verification_status = 'pending' OR 'in_review'
 * - User has submitted verification and waiting for approval
 * 
 * HIDES WHEN:
 * - verification_status = 'approved' (user is verified)
 * - verification_status = 'rejected' (handled by navigation guard)
 * - User hasn't started verification yet (handled by navigation guard)
 */

import React, { useEffect, useState } from 'react';
import { View, Pressable } from 'react-native';
import { router } from 'expo-router';
import Animated, { SlideInDown } from 'react-native-reanimated';
import { Clock, Eye, AlertCircle, X } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Text } from '@/components/ui/text';
import { useColorScheme } from '@/lib/core/useColorScheme';
import { cn } from '@/lib/utils';
import { useVerificationStatusSelector } from '@/hooks/provider';

// AsyncStorage key for dismissal
const BANNER_DISMISSED_KEY = 'verification-status-banner-dismissed';
const DISMISS_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours (respawn daily)

/**
 * Banner configuration by verification status
 */
const getBannerConfig = (status: string) => {
  switch (status) {
    case 'pending':
      return {
        Icon: Clock,
        iconColor: 'text-amber-600 dark:text-amber-400',
        bgColor: 'bg-amber-50 dark:bg-amber-950/30',
        borderColor: 'border-amber-200 dark:border-amber-800',
        title: 'Verification Pending',
        subtitle: 'Your application is submitted and awaiting review',
        estimatedTime: '24-48 hours',
      };
    case 'in_review':
      return {
        Icon: Eye,
        iconColor: 'text-blue-600 dark:text-blue-400',
        bgColor: 'bg-blue-50 dark:bg-blue-950/30',
        borderColor: 'border-blue-200 dark:border-blue-800',
        title: 'Under Review',
        subtitle: 'Our team is actively reviewing your application',
        estimatedTime: '12-24 hours',
      };
    default:
      return null;
  }
};

/**
 * Helper: Clear banner dismissal state (for testing/debugging)
 */
export const clearVerificationBannerDismissal = async () => {
  try {
    await AsyncStorage.removeItem(BANNER_DISMISSED_KEY);
    console.log('[VerificationBanner] Dismissal state cleared');
  } catch (error) {
    console.error('[VerificationBanner] Failed to clear dismissal:', error);
  }
};

/**
 * Helper: Check if banner is dismissed
 */
export const isVerificationBannerDismissed = async (): Promise<boolean> => {
  try {
    const dismissedData = await AsyncStorage.getItem(BANNER_DISMISSED_KEY);
    if (!dismissedData) return false;

    const { timestamp } = JSON.parse(dismissedData);
    const timeSinceDismiss = Date.now() - timestamp;
    
    return timeSinceDismiss < DISMISS_DURATION_MS;
  } catch (error) {
    console.error('[VerificationBanner] Failed to check dismissal:', error);
    return false;
  }
};

export function VerificationStatusBanner() {
  const { isDarkColorScheme } = useColorScheme();
  const [isDismissed, setIsDismissed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // ✅ REACT QUERY + ZUSTAND: Get verification status from store
  const { status: verificationStatus } = useVerificationStatusSelector();

  // Check dismissal state on mount
  useEffect(() => {
    const checkDismissalState = async () => {
      const dismissed = await isVerificationBannerDismissed();
      setIsDismissed(dismissed);
      setIsLoading(false);
    };

    checkDismissalState();
  }, []);

  // Handle banner dismissal
  const handleDismiss = async () => {
    try {
      // Save dismissal timestamp to AsyncStorage
      const dismissalData = {
        timestamp: Date.now(),
        status: verificationStatus,
      };
      
      await AsyncStorage.setItem(
        BANNER_DISMISSED_KEY,
        JSON.stringify(dismissalData)
      );
      
      console.log('[VerificationBanner] Banner dismissed for 24 hours');
      setIsDismissed(true);
    } catch (error) {
      console.error('[VerificationBanner] Failed to save dismissal:', error);
    }
  };

  // Handle banner tap (navigate to verification status screen)
  const handlePress = () => {
    router.push('/provider-verification/verification-status');
  };

  // Don't show banner if loading, dismissed, or status doesn't match
  const config = getBannerConfig(verificationStatus);
  
  if (isLoading || isDismissed || !config) {
    return null;
  }

  const { Icon, iconColor, bgColor, borderColor, title, subtitle, estimatedTime } = config;

  return (
    <Animated.View 
      entering={SlideInDown.duration(400).springify()}
      className="w-full"
    >
      <View className="px-4 pt-2 pb-0">
        <Pressable
          onPress={handlePress}
          className={cn(
            'rounded-lg border p-3',
            bgColor,
            borderColor,
            'active:opacity-70'
          )}
        >
          <View className="flex-row items-start gap-3">
            {/* Icon */}
            <View className="pt-0.5">
              <Icon 
                size={20} 
                className={iconColor}
              />
            </View>

            {/* Content */}
            <View className="flex-1">
              <Text className="font-semibold text-foreground text-sm mb-0.5">
                {title}
              </Text>
              <Text className="text-muted-foreground text-xs leading-4">
                {subtitle}
              </Text>
              <Text className="text-muted-foreground text-xs mt-1">
                Estimated: {estimatedTime}
              </Text>
            </View>

            {/* Dismiss Button */}
            <Pressable
              onPress={handleDismiss}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              className="active:opacity-50"
            >
              <X size={18} className="text-muted-foreground" />
            </Pressable>
          </View>

          {/* Tap to view details hint */}
          <Text className="text-muted-foreground text-xs text-center mt-2 opacity-70">
            Tap for details
          </Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

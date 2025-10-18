/**
 * ✅ VERIFICATION STATUS BANNER - Phase 4 (Redesigned)
 * 
 * PURPOSE: Sleek, modern banner showing verification review progress
 * DESIGN: Inspired by Airbnb/Uber - minimal, elegant, theme-aware
 * LOCATION: Top of provider dashboard (below header, above content)
 * PATTERN: Non-blocking, informational, dismissible
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
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';
import { Clock, Eye, X, ChevronRight } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Text } from '@/components/ui/text';
import { useColorScheme } from '@/lib/core/useColorScheme';
import { THEME } from '@/lib/theme';
import { cn } from '@/lib/utils';
import { useVerificationStatusPure } from '@/hooks/provider';
import { useAuthOptimized } from '@/hooks';

// AsyncStorage key for dismissal
const BANNER_DISMISSED_KEY = 'verification-status-banner-dismissed';
const DISMISS_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours (respawn daily)

/**
 * Modern banner configuration - minimal and elegant
 */
const getBannerConfig = (status: string) => {
  switch (status) {
    case 'pending':
      return {
        Icon: Clock,
        title: 'Verification in progress',
        subtitle: 'We\'re reviewing your application',
        time: '24-48h',
        iconBg: 'bg-[hsl(var(--warning)_/_0.1)]',
        iconColor: 'text-[hsl(var(--warning))]',
        accentColor: 'bg-[hsl(var(--warning))]',
      };
    case 'in_review':
      return {
        Icon: Eye,
        title: 'Under active review',
        subtitle: 'Your application is being processed',
        time: '12-24h',
        iconBg: 'bg-[hsl(var(--info)_/_0.1)]',
        iconColor: 'text-[hsl(var(--info))]',
        accentColor: 'bg-[hsl(var(--info))]',
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
  const { isDarkColorScheme, colorScheme } = useColorScheme();
  const colors = THEME[colorScheme];
  const [isDismissed, setIsDismissed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // ✅ FIX: Use React Query directly instead of Zustand store
  // This prevents stale cache issues - database is source of truth
  const { user } = useAuthOptimized();
  const { data: verificationData, isLoading: isQueryLoading } = useVerificationStatusPure(user?.id);
  const verificationStatus = verificationData?.status || 'pending';

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

  // ✅ FIX: Navigate within provider route group (not outside to provider-verification)
  // This prevents breaking app routing structure
  const handlePress = () => {
    // Since this banner only shows for pending/in_review (not approved/rejected),
    // we just show a local status view or do nothing
    // The verification-status screen should only be accessible during onboarding
    console.log('[VerificationBanner] Status check - Current:', verificationStatus);
    
    // Don't navigate - this banner is informational only
    // User should access full details from profile settings if needed
  };

  // Don't show banner if loading, dismissed, or status doesn't match
  const config = getBannerConfig(verificationStatus);
  
  // 🚨 CRITICAL FIX: Never show banner for approved status
  // This prevents stale Zustand cache from showing incorrect banner
  // Database is source of truth - if approved, banner should never appear
  // Now using React Query directly instead of Zustand store
  if (isLoading || isQueryLoading || isDismissed || !config || verificationStatus === 'approved') {
    console.log('[VerificationBanner] Hidden -', {
      isLoading,
      isQueryLoading,
      isDismissed,
      hasConfig: !!config,
      verificationStatus,
      source: 'React Query (database)',
    });
    return null;
  }

  const { Icon, title, subtitle, time, iconBg, iconColor, accentColor } = config;

  return (
    <Animated.View 
      entering={FadeInDown.duration(500).springify()}
      exiting={FadeOut.duration(300)}
      className="w-full px-4 pb-3"
    >
      {/* Modern Card Design - Airbnb/Uber Style */}
      <Pressable
        onPress={handlePress}
        className={cn(
          'rounded-2xl overflow-hidden',
          'bg-card border border-border',
          'active:scale-[0.98]',
          'shadow-sm'
        )}
        style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.05,
          shadowRadius: 2,
          elevation: 2,
        }}
      >
        {/* Left Accent Border */}
        <View className={cn('absolute left-0 top-0 bottom-0 w-1', accentColor)} />
        
        {/* Content Container */}
        <View className="flex-row items-center pl-4 pr-2 py-3.5">
          {/* Icon with Background Circle */}
          <View className={cn('w-10 h-10 rounded-full items-center justify-center mr-3', iconBg)}>
            <Icon size={20} color={verificationStatus === 'pending' ? colors.warning : colors.info} />
          </View>

          {/* Text Content */}
          <View className="flex-1 mr-2">
            <Text className="font-semibold text-foreground text-sm mb-0.5">
              {title}
            </Text>
            <Text className="text-muted-foreground text-xs leading-tight">
              {subtitle} • Est. {time}
            </Text>
          </View>

          {/* Right Side Actions */}
          <View className="flex-row items-center gap-2">
            {/* View Details Arrow */}
            <Pressable
              onPress={handlePress}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              className="active:opacity-50"
            >
              <ChevronRight size={20} color={colors.mutedForeground} />
            </Pressable>

            {/* Dismiss Button */}
            <Pressable
              onPress={handleDismiss}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              className="active:opacity-50 ml-1"
            >
              <X size={18} color={colors.mutedForeground} />
            </Pressable>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

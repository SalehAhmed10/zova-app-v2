/**
 * Provider Profile Screen - Modern UI Design
 *
 * Features:
 * - Clean header with profile information
 * - Key performance metrics in organized cards
 * - Quick action buttons for common tasks
 * - Well-organized menu sections by priority
 * - Professional spacing and visual hierarchy
 *
 * Design Principles:
 * - Uses theme colors exclusively (no hardcoded colors)
 * - Lucide icons for consistency
 * - Proper contrast and accessibility
 * - No gradients or shadows (NativeWind compatibility)
 * - Professional spacing and typography
 */

import React from 'react';
import { View, ScrollView, Platform, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import type { LucideIcon } from 'lucide-react-native';
import {
  Calendar,
  User,
  Clock,
  Star,
  CheckCircle,
  Settings,
  CreditCard,
  BarChart3,
  Diamond,
  MessageCircle,
  Megaphone,
  ChevronRight,
  Wallet,
  TrendingUp,
  Trophy
} from 'lucide-react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { LogoutButton } from '@/components/ui/logout-button';
import { useAppStore } from '@/stores/auth/app';
import { useProfileModalStore } from '@/stores/ui/profileModal';
import { useAuthOptimized } from '@/hooks';
import {
  useProfile,
  useProviderStats,
  useUserBookings,
  useNotificationSettings
} from '@/hooks/shared/useProfileData';
import { cn, formatCurrency } from '@/lib/utils';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { useColorScheme } from '@/lib/core/useColorScheme';
import { THEME } from '@/lib/theme';
import { Icon } from '@/components/ui/icon';


// Import modals



export default React.memo(function ProfileScreen() {
  const { userRole } = useAppStore();
  // ✅ MIGRATED: Using optimized auth hook following copilot-rules.md
  const { user } = useAuthOptimized();
  const { colorScheme } = useColorScheme();
  const colors = THEME[colorScheme];
  
  // Don't fetch data if user is not authenticated or logging out
  const shouldFetchData = user?.id && userRole === 'provider';

  // Use Zustand store for modal state management
  const {
    bookingHistoryModalVisible,
    openBookingHistoryModal,
    closeBookingHistoryModal,
    _hasHydrated
  } = useProfileModalStore();

  // Data fetching hooks with user ID - only call when user is authenticated
  const { data: profileData, isLoading: profileLoading, error: profileError, refetch: refetchProfile } = useProfile(shouldFetchData ? user?.id : undefined);
  const { data: statsData, isLoading: statsLoading } = useProviderStats(shouldFetchData ? user?.id : undefined);
  const { data: bookingsData, isLoading: bookingsLoading } = useUserBookings(shouldFetchData ? user?.id : undefined);
  const { data: notificationSettings } = useNotificationSettings(shouldFetchData ? user?.id : undefined);

  // Wait for Zustand store hydration before rendering
  if (!_hasHydrated) {
    console.log('[ProfileScreen] Waiting for modal store hydration...');
    return null;
  }

  // Helper functions
  const getDisplayName = () => {
    if (profileLoading) return 'Loading...';
    if (profileData?.first_name && profileData?.last_name) {
      return `${profileData.first_name} ${profileData.last_name}`;
    }
    if (profileData?.first_name) {
      return profileData.first_name;
    }
    return profileData?.email?.split('@')[0] || user?.email?.split('@')[0] || 'Provider';
  };

  // Helper function for icon background colors using theme colors
  const getIconBgColor = (color: string) => {
    const colorMap: Record<string, string> = {
      green: THEME[colorScheme].success,
      yellow: THEME[colorScheme].warning,
      blue: THEME[colorScheme].info,
      purple: THEME[colorScheme].purple,
      orange: THEME[colorScheme].orange,
      red: THEME[colorScheme].destructive,
    };
    return colorMap[color] || THEME[colorScheme].muted;
  };

  // Memoized menu data structures for performance - ORDERED BY PRIORITY
  const businessManagementMenu = React.useMemo(() => [
    // HIGH PRIORITY: Core business operations
    {
      id: 'calendar',
      icon: Calendar,
      title: 'Calendar & Bookings',
      subtitle: 'Manage your schedule and appointments',
      onPress: () => router.push('/provider/calendar'),
    },
    {
      id: 'services',
      icon: Settings,
      title: 'Services & Pricing',
      subtitle: 'Update your service offerings and rates',
      onPress: () => router.push('/provider/profile/services'),
    },
    // CRITICAL: Revenue generation
    {
      id: 'payments',
      icon: CreditCard,
      title: 'Payment Integration',
      subtitle: 'Connect Stripe for secure payments',
      onPress: () => router.push('/provider/profile/payments'),
    },
    // MEDIUM PRIORITY: Performance monitoring
    {
      id: 'analytics',
      icon: BarChart3,
      title: 'Business Analytics',
      subtitle: 'Track performance and earnings',
      onPress: () => router.push('/provider/profile/analytics'),
    },
    // LOW PRIORITY: Premium features
    {
      id: 'subscriptions',
      icon: Diamond,
      title: 'Premium Subscription',
      subtitle: 'Unlock advanced business features',
      onPress: () => router.push('/provider/profile/subscriptions'),
    },
  ], []);

  const customerRelationsMenu = React.useMemo(() => [
    // HIGH PRIORITY: Reputation management
    {
      id: 'reviews',
      icon: Star,
      title: 'Reviews & Ratings',
      subtitle: statsData?.avg_rating ? `${statsData.avg_rating.toFixed(1)}★ average rating` : 'No reviews yet',
      badge: '2 new',
      onPress: () => router.push('/provider/profile/reviews'),
    },
    // {
    //   id: 'messages',
    //   icon: MessageCircle,
    //   title: 'Client Messages',
    //   subtitle: 'Communicate with your clients',
    //   onPress: () => {},
    // },
    // {
    //   id: 'marketing',
    //   icon: Megaphone,
    //   title: 'Marketing Tools',
    //   subtitle: 'Promote and grow your business',
    //   onPress: () => {},
    // },
  ], [statsData?.avg_rating]);

  const accountSettingsMenu = React.useMemo(() => [
    // HIGH PRIORITY: Business identity
    {
      id: 'profile',
      icon: User,
      title: 'Business Profile',
      subtitle: 'Update your business information',
      onPress: () => router.push('/provider/profile/personal-info'),
    },
    // HIGH PRIORITY: Availability settings
    {
      id: 'hours',
      icon: Clock,
      title: 'Business Hours',
      subtitle: 'Set your availability schedule',
      onPress: () => router.push('/provider/calendar'),
    },
  ], []);

  // Define menu item type
  type MenuItem = {
    id: string;
    icon: LucideIcon;
    title: string;
    subtitle: string;
    badge?: string;
    onPress: () => void;
  };

  // Memoized MenuItem component for performance
  const MenuItemComponent = React.memo(({ item }: { item: MenuItem }) => (
    <TouchableOpacity
      className="bg-card rounded-xl p-4 border border-border active:scale-[0.98] transition-transform"
      onPress={item.onPress}
      accessibilityRole="button"
      accessibilityLabel={`${item.title}: ${item.subtitle}`}
    >
      <View className="flex-row items-center">
        <View className="w-12 h-12 bg-accent rounded-xl items-center justify-center mr-4">
          <Icon as={item.icon} size={24} className="text-foreground" />
        </View>
        <View className="flex-1">
          <View className="flex-row items-center justify-between">
            <Text className="font-semibold text-foreground text-base">{item.title}</Text>
            {item.badge && (
              <Badge variant="secondary" className="ml-2">
                <Text className="text-xs font-medium">{item.badge}</Text>
              </Badge>
            )}
          </View>
          <Text className="text-muted-foreground text-sm mt-1">{item.subtitle}</Text>
        </View>
        <Icon as={ChevronRight} size={20} className="text-muted-foreground" />
      </View>
    </TouchableOpacity>
  ));

  // Loading state (wait for user and profile data)
  if (!shouldFetchData || profileLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={['top']}>
        <ScrollView className="flex-1">
          {/* Header Skeleton */}
          <View className="px-4 pt-6 pb-8">
            <View className="items-center">
              <Skeleton className="w-32 h-32 rounded-full mb-6" />
              <Skeleton className="w-40 h-8 mb-2" />
              <Skeleton className="w-48 h-4 mb-2" />
              <Skeleton className="w-24 h-6 rounded-full" />
            </View>
          </View>

          {/* Stats Skeleton */}
          <View className="px-4 mb-6">
            <Card>
              <CardContent className="p-0">
                <View className="flex-row">
                  <View className="items-center flex-1 py-4">
                    <Skeleton className="w-8 h-6 mb-1" />
                    <Skeleton className="w-16 h-4" />
                  </View>
                  <View className="w-px bg-border" />
                  <View className="items-center flex-1 py-4">
                    <Skeleton className="w-8 h-6 mb-1" />
                    <Skeleton className="w-12 h-4" />
                  </View>
                  <View className="w-px bg-border" />
                  <View className="items-center flex-1 py-4">
                    <Skeleton className="w-8 h-6 mb-1" />
                    <Skeleton className="w-14 h-4" />
                  </View>
                </View>
              </CardContent>
            </Card>
          </View>

          {/* Menu Sections Skeleton */}
          <View className="px-4 gap-6">
            <View>
              <Skeleton className="w-32 h-6 mb-4" />
              <Card>
                <CardContent className="p-4 gap-2">
                  {[1, 2, 3].map((i) => (
                    <View key={i} className="flex-row items-center py-2">
                      <Skeleton className="w-10 h-10 rounded-xl mr-4" />
                      <View className="flex-1">
                        <Skeleton className="w-32 h-4 mb-1" />
                        <Skeleton className="w-48 h-3" />
                      </View>
                    </View>
                  ))}
                </CardContent>
              </Card>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Error state
  if (profileError) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={['top']}>
        <View className="flex-1 items-center justify-center px-4">
          <Text className="text-4xl mb-4">⚠️</Text>
          <Text variant="h3" className="text-foreground font-bold mb-2 text-center">
            Unable to Load Profile
          </Text>
          <Text variant="p" className="text-muted-foreground text-center mb-6">
            Please check your connection and try again.
          </Text>
          <Button onPress={() => refetchProfile()}>
            <Text>Retry</Text>
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section - Clean Design */}
        <View className="bg-card border-b border-border px-6 pt-6 pb-8">
          <View className="items-center">
            {/* Profile Picture */}
            <View className="mb-4">
              <Avatar className="w-20 h-20 border-2 border-border" alt="Provider avatar">
                {profileData?.avatar_url ? (
                  <AvatarImage source={{ uri: profileData.avatar_url }} />
                ) : null}
                <AvatarFallback className="bg-muted">
                  {(profileData?.first_name?.[0] || profileData?.email?.[0]) ? (
                    <Text className="text-2xl text-muted-foreground font-bold">
                      {profileData?.first_name?.[0]?.toUpperCase() || 
                       profileData?.email?.[0]?.toUpperCase()}
                    </Text>
                  ) : (
                    <Icon as={User} size={32} className="text-muted-foreground" />
                  )}
                </AvatarFallback>
              </Avatar>
            </View>

            {/* Provider Info */}
            <Text className="text-xl font-bold text-foreground mb-2 text-center">
              {getDisplayName()}
            </Text>
            <Text className="text-muted-foreground mb-4 text-center px-4">
              {profileData?.bio || 'Professional Service Provider'}
            </Text>

            {/* Business Badge */}
            <View className="bg-primary/10 px-4 py-2 rounded-full border border-primary/20">
              <Text className="text-primary font-semibold text-sm">
                ⭐ Service Provider
              </Text>
            </View>

            {/* Verification Status */}
            {profileData?.verification_status === 'approved' && (
              <View className="mt-3 bg-success/10 px-3 py-1 rounded-full border border-success/20">
                <Text className="text-success font-medium text-xs">
                  ✓ Verified Provider
                </Text>
              </View>
            )}
            {profileData?.verification_status === 'pending' && (
              <View className="mt-3 bg-warning/10 px-3 py-1 rounded-full border border-warning/20">
                <Text className="text-warning font-medium text-xs">
                  ⏳ Verification Pending
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* 🚀 MODERN: Achievements & Badges Section */}
        <View className="px-3 mb-8">
          <Text className="text-lg font-bold text-foreground mb-4">Achievements</Text>
          <View className="flex-row gap-3">
            <View className="flex-1">
              <Card className="bg-card border-border h-24">
                <CardContent className="p-4 items-center justify-center h-full">
                  <View className="w-10 h-10 bg-primary/10 rounded-xl items-center justify-center mb-2">
                    <Icon as={Star} size={20} className="text-primary" />
                  </View>
                  <Text className="text-xs font-bold text-foreground mb-0.5 text-center">
                    Top Rated
                  </Text>
                  <Text className="text-xs text-muted-foreground text-center">
                    {statsLoading ? '-' : (statsData?.avg_rating || 0).toFixed(1)} ★
                  </Text>
                </CardContent>
              </Card>
            </View>

            <View className="flex-1">
              <Card className="bg-card border-border h-24">
                <CardContent className="p-4 items-center justify-center h-full">
                  <View className="w-10 h-10 bg-success/10 rounded-xl items-center justify-center mb-2">
                    <Icon as={CheckCircle} size={20} className="text-success" />
                  </View>
                  <Text className="text-xs font-bold text-foreground mb-0.5 text-center">
                    Reliable
                  </Text>
                  <Text className="text-xs text-muted-foreground text-center">
                    {statsLoading ? '-' : (statsData?.completed_bookings || 0)} Jobs
                  </Text>
                </CardContent>
              </Card>
            </View>

            <View className="flex-1">
              <Card className="bg-card border-border h-24">
                <CardContent className="p-4 items-center justify-center h-full">
                  <View className="w-10 h-10 bg-warning/10 rounded-xl items-center justify-center mb-2">
                    <Icon as={TrendingUp} size={20} className="text-warning" />
                  </View>
                  <Text className="text-xs font-bold text-foreground mb-0.5 text-center">
                    Earnings
                  </Text>
                  <Text className="text-xs text-muted-foreground text-center">
                    {statsLoading ? '-' : statsData?.this_month_earnings ? formatCurrency(statsData.this_month_earnings) : formatCurrency(0)}
                  </Text>
                </CardContent>
              </Card>
            </View>
          </View>
        </View>

        {/* Menu Sections - ORDERED BY BUSINESS PRIORITY */}
        <View className="px-6 gap-6">
          {/* SECTION 1: HIGH PRIORITY - Account Configuration */}
          <View>
            <View className="flex-row items-center mb-4">
              <View className="w-1 h-6 bg-primary rounded-full mr-3" />
              <Text className="text-lg font-bold text-foreground">Account Settings</Text>
            </View>
            <View className="gap-3">
              {accountSettingsMenu.map((item) => (
                <MenuItemComponent key={item.id} item={item} />
              ))}
            </View>
          </View>

          {/* SECTION 2: HIGH PRIORITY - Core Business Operations */}
          <View>
            <View className="flex-row items-center mb-4">
              <View className="w-1 h-6 bg-secondary rounded-full mr-3" />
              <Text className="text-lg font-bold text-foreground">Business Management</Text>
            </View>
            <View className="gap-3">
              {businessManagementMenu.map((item) => (
                <MenuItemComponent key={item.id} item={item} />
              ))}
            </View>
          </View>

          {/* SECTION 3: MEDIUM PRIORITY - Client Relations */}
          <View>
            <View className="flex-row items-center mb-4">
              <View className="w-1 h-6 bg-info rounded-full mr-3" />
              <Text className="text-lg font-bold text-foreground">Customer Relations</Text>
            </View>
            <View className="gap-3">
              {customerRelationsMenu.map((item) => (
                <MenuItemComponent key={item.id} item={item} />
              ))}
            </View>
          </View>

          {/* App Version & Footer */}
          <View className="items-center py-4">
            <Text className="text-muted-foreground text-sm mb-2">ZOVA Business - Version 1.0.0</Text>
            <Text className="text-muted-foreground text-xs text-center">
              Professional tools for service providers
            </Text>
          </View>

          {/* Logout Button */}
          <View className="mb-8">
            <LogoutButton variant="modern" fullWidth />
          </View>
        </View>

        {/* Theme Toggle */}
        <View className="px-6 mt-4 mb-6">
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <ThemeToggle />
            </CardContent>
          </Card>
        </View>

        {/* Bottom spacing for tab bar */}
        <View className={cn("h-6", Platform.OS === 'ios' && "h-24")} />
      </ScrollView>

    </SafeAreaView>
  );
});
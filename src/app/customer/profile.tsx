

import React, { useState, useCallback, useMemo } from 'react';
import { View, ScrollView, Platform, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import type { LucideIcon } from 'lucide-react-native';
import {
  User,
  Crown,
  Calendar,
  Heart,
  Star,
  AlertTriangle,
  MessageCircle,
  Search,
  Bell,
  HelpCircle,
  Phone,
  Trophy,
  DollarSign,
  CheckCircle,
  ChevronRight,
  LogOut
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
  useProfileStats,
  useUserBookings,
  useNotificationSettings
} from '@/hooks/shared/useProfileData';
import { useUserFavorites } from '@/hooks/customer';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { Icon } from '@/components/ui/icon';
import { cn, formatCurrency } from '@/lib/utils';
import { THEME } from '@/lib/theme';
import { useColorScheme } from '@/lib/core/useColorScheme';

const CustomerProfile = React.memo(function CustomerProfile() {
  const { userRole } = useAppStore();
  // ✅ MIGRATED: Using optimized auth hook following copilot-rules.md
  const { user } = useAuthOptimized();
  const { colorScheme } = useColorScheme();

  // 🚀 MODERN: Conditional data fetching (was always fetching)
  const shouldFetchData = !!user?.id && userRole === 'customer';

  // ✅ MIGRATED: React Query for server state (was useState + useEffect)
  const { data: profileData, isLoading: profileLoading, error: profileError, refetch: refetchProfile } = useProfile(shouldFetchData ? user?.id : undefined);
  const { data: statsData, isLoading: statsLoading, refetch: refetchStats } = useProfileStats(shouldFetchData ? user?.id : undefined, userRole);
  const { data: bookingsData, isLoading: bookingsLoading, refetch: refetchBookings } = useUserBookings(shouldFetchData ? user?.id : undefined);
  const { data: notificationSettings, refetch: refetchNotifications } = useNotificationSettings();
  const { data: favoritesData, refetch: refetchFavorites } = useUserFavorites(shouldFetchData ? user?.id : undefined);

  // 🚀 MODERN: Pull-to-refresh state (was useState)
  const [refreshing, setRefreshing] = useState(false);

  // 🚀 MODERN: Pull-to-refresh handler with React Query refetch
  const onRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      console.log('[CustomerProfile] Pull-to-refresh triggered');
      await Promise.all([
        refetchProfile(),
        refetchStats(),
        refetchBookings(),
        refetchNotifications(),
        refetchFavorites()
      ]);
    } catch (error) {
      console.error('Error refreshing profile:', error);
    } finally {
      setRefreshing(false);
    }
  }, [refetchProfile, refetchStats, refetchBookings, refetchNotifications, refetchFavorites]);

  // Use Zustand store for modal state management
  const {
    _hasHydrated
  } = useProfileModalStore();

  // Wait for Zustand store hydration before rendering
  if (!_hasHydrated) {
    console.log('[CustomerProfile] Waiting for modal store hydration...');
    return null;
  }

  // Helper functions
  const getDisplayName = () => {
    if (profileData?.first_name && profileData?.last_name) {
      return `${profileData.first_name} ${profileData.last_name}`;
    }
    if (profileData?.first_name) {
      return profileData.first_name;
    }
    return profileData?.email?.split('@')[0] || 'User';
  };

  // 🚀 MODERN: Memoized menu data with meaningful customer options
  const menuData = useMemo(() => [
    {
      id: 'personal-info',
      title: 'Personal Information',
      subtitle: 'Manage your profile details',
      icon: User,
      onPress: () => router.push('/customer/profile/personal-info'),
    },
    {
      id: 'subscriptions',
      title: 'Subscriptions',
      subtitle: 'Manage SOS and premium plans',
      icon: Crown,
      onPress: () => router.push('/customer/subscriptions'),
    },
    {
      id: 'booking-history',
      title: 'Booking History',
      subtitle: 'View past and upcoming bookings',
      icon: Calendar,
      onPress: () => router.push('/customer/profile/booking-history'),
    },
    {
      id: 'favorites',
      title: 'Favorites',
      subtitle: 'Your saved providers and services',
      icon: Heart,
      onPress: () => router.push('/customer/profile/favorites'),
    },
    {
      id: 'reviews',
      title: 'My Reviews',
      subtitle: 'View and manage your reviews',
      icon: Star,
      onPress: () => router.push('/customer/profile/reviews'),
    },
    {
      id: 'sos-booking',
      title: 'SOS Emergency Booking',
      subtitle: 'Quick access to emergency services',
      icon: AlertTriangle,
      onPress: () => router.push('/customer/sos-booking'),
    },
    {
      id: 'messages',
      title: 'Messages',
      subtitle: 'Chat with service providers',
      icon: MessageCircle,
      onPress: () => router.push('/customer/messages'),
    },
    {
      id: 'search',
      title: 'Search Services',
      subtitle: 'Find providers and services',
      icon: Search,
      onPress: () => router.push('/customer/search'),
    },
    {
      id: 'notifications',
      title: 'Notification Settings',
      subtitle: 'Customize your alerts',
      icon: Bell,
      onPress: () => router.push('/customer/profile/notifications'),
    },
  ], []);

  // Define menu item type
  type MenuItemType = {
    id: string;
    title: string;
    subtitle: string;
    icon: LucideIcon;
    onPress: () => void;
  };

  // 🚀 MODERN: Memoized MenuItem component (like provider profile)
  const MenuItem = React.memo(({ item }: { item: MenuItemType }) => {
    return (
      <TouchableOpacity
        onPress={item.onPress}
        className="mb-3 active:opacity-80"
        activeOpacity={0.8}
      >
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <View className="flex-row items-center">
              <View className="w-12 h-12 bg-accent rounded-xl items-center justify-center mr-4">
                <Icon as={item.icon} size={20} className="text-foreground" />
              </View>
              <View className="flex-1">
                <Text className="text-foreground font-medium text-base">
                  {item.title}
                </Text>
                {item.subtitle && (
                  <Text className="text-muted-foreground text-sm mt-0.5">
                    {item.subtitle}
                  </Text>
                )}
              </View>
              <Icon as={ChevronRight} size={20} className="text-muted-foreground" />
            </View>
          </CardContent>
        </Card>
      </TouchableOpacity>
    );
  });

  // Early returns for different states
  if (!user || profileLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={['top']}>
        <ScrollView className="flex-1">
          <View className="px-6 pt-6 pb-8">
            <View className="items-center">
              <Skeleton className="w-24 h-24 rounded-full mb-4" />
              <Skeleton className="w-32 h-6 mb-2" />
              <Skeleton className="w-48 h-4 mb-2" />
              <Skeleton className="w-20 h-6 rounded-full" />
            </View>
          </View>
          <View className="px-6 mb-6">
            <Card className="bg-card/50">
              <CardContent className="p-6">
                <View className="flex-row justify-around">
                  <View className="items-center">
                    <Skeleton className="w-8 h-6 mb-1" />
                    <Skeleton className="w-16 h-4" />
                  </View>
                  <View className="items-center">
                    <Skeleton className="w-8 h-6 mb-1" />
                    <Skeleton className="w-20 h-4" />
                  </View>
                  <View className="items-center">
                    <Skeleton className="w-8 h-6 mb-1" />
                    <Skeleton className="w-12 h-4" />
                  </View>
                </View>
              </CardContent>
            </Card>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Error state
  if (profileError) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={['top']}>
        <View className="flex-1 items-center justify-center px-6">
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
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={THEME[colorScheme].primary}
            colors={[THEME[colorScheme].primary]}
          />
        }
      >
        {/* Header Section - Clean Design */}
        <View className="bg-card border-b border-border px-6 pt-6 pb-8">
          <View className="items-center">
            {/* Profile Picture */}
            <View className="mb-4">
              <Avatar className="w-20 h-20 border-2 border-border" alt="Customer avatar">
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

            {/* Customer Info */}
            <Text className="text-xl font-bold text-foreground mb-2 text-center">
              {getDisplayName()}
            </Text>
            <Text className="text-muted-foreground mb-4 text-center px-4">
              {profileData?.bio || 'Welcome to ZOVA'}
            </Text>

            {/* Customer Badge */}
            <View className="bg-primary/10 px-4 py-2 rounded-full border border-primary/20">
              <Text className="text-primary font-semibold text-sm">
                ⭐ ZOVA Customer
              </Text>
            </View>

            {/* Rating & Member Since */}
            <View className="flex-row gap-2 mt-3">
              <View className="bg-warning/10 px-3 py-1 rounded-full border border-warning/20">
                <Text className="text-warning font-medium text-xs">
                  ⭐ {statsLoading ? '-' : (statsData?.avg_rating || 4.9).toFixed(1)} Rating
                </Text>
              </View>
              <View className="bg-info/10 px-3 py-1 rounded-full border border-info/20">
                <Text className="text-info font-medium text-xs">
                  Since {profileData?.created_at ? new Date(profileData.created_at).getFullYear() : '2024'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Customer Stats Cards */}
        <View className="px-6 pt-6 mb-8">
          <View className="flex-row gap-3">
            {/* Total Bookings */}
            <View className="flex-1 bg-card rounded-xl p-4 border border-border">
              <View className="items-center">
                <View className="w-10 h-10 bg-info/10 rounded-full items-center justify-center mb-3">
                  <Icon as={Calendar} size={20} className="text-info" />
                </View>
                <Text className="text-xl font-bold text-foreground mb-1">
                  {statsLoading ? '...' : (statsData?.total_bookings || 0).toLocaleString()}
                </Text>
                <Text className="text-muted-foreground text-xs font-medium text-center">Total</Text>
                <Text className="text-muted-foreground/70 text-xs text-center">Bookings</Text>
              </View>
            </View>

            {/* Completed Bookings */}
            <View className="flex-1 bg-card rounded-xl p-4 border border-border">
              <View className="items-center">
                <View className="w-10 h-10 bg-success/10 rounded-full items-center justify-center mb-3">
                  <Icon as={CheckCircle} size={20} className="text-success" />
                </View>
                <Text className="text-xl font-bold text-foreground mb-1">
                  {statsLoading ? '...' : (statsData?.completed_bookings || 0).toLocaleString()}
                </Text>
                <Text className="text-muted-foreground text-xs font-medium text-center">Completed</Text>
                <Text className="text-muted-foreground/70 text-xs text-center">Bookings</Text>
              </View>
            </View>

            {/* Favorites */}
            <View className="flex-1 bg-card rounded-xl p-4 border border-border">
              <View className="items-center">
                <View className="w-10 h-10 bg-warning/10 rounded-full items-center justify-center mb-3">
                  <Icon as={Heart} size={20} className="text-warning" />
                </View>
                <Text className="text-xl font-bold text-foreground mb-1">
                  {(favoritesData?.providers?.length || 0) + (favoritesData?.services?.length || 0)}
                </Text>
                <Text className="text-muted-foreground text-xs font-medium text-center">Favorite</Text>
                <Text className="text-muted-foreground/70 text-xs text-center">Providers</Text>
              </View>
            </View>
          </View>

          {/* Quick Actions Row */}
          <View className="flex-row gap-3 mt-4">
            <TouchableOpacity
              className="flex-1 bg-primary/5 rounded-xl p-3 border border-primary/20 active:scale-[0.98] transition-transform"
              onPress={() => router.push('/customer/search')}
              accessibilityRole="button"
              accessibilityLabel="Find services"
            >
              <View className="flex-row items-center justify-center">
                <Icon as={Search} size={16} className="text-primary mr-2" />
                <Text className="text-primary font-semibold text-sm">Find Services</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 bg-destructive/5 rounded-xl p-3 border border-destructive/20 active:scale-[0.98] transition-transform"
              onPress={() => router.push('/customer/sos-booking')}
              accessibilityRole="button"
              accessibilityLabel="SOS emergency booking"
            >
              <View className="flex-row items-center justify-center">
                <Icon as={AlertTriangle} size={16} className="text-destructive mr-2" />
                <Text className="text-destructive font-semibold text-sm">SOS Emergency</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* 🚀 MODERN: Achievements & Badges Section */}
        <View className="px-3 mb-8">
          <Text className="text-lg font-bold text-foreground mb-4">Achievements</Text>
          <View className="flex-row gap-3">
            <View className="flex-1">
              <Card className="bg-card border-border  h-24">
                <CardContent className="p-4 items-center justify-center h-full">
                  <View className="w-10 h-10 bg-primary/10 rounded-xl items-center justify-center mb-2">
                    <Icon as={Trophy} size={20} className="text-primary" />
                  </View>
                  <Text className="text-xs font-bold text-foreground mb-0.5 text-center">
                    First Booking
                  </Text>
                  <Text className="text-xs text-muted-foreground text-center">
                    Completed
                  </Text>
                </CardContent>
              </Card>
            </View>

            <View className="flex-1">
              <Card className="bg-card border-border  h-24">
                <CardContent className="p-4 items-center justify-center h-full">
                  <View className="w-10 h-10 bg-primary/10 rounded-xl items-center justify-center mb-2">
                    <Icon as={Star} size={20} className="text-primary" />
                  </View>
                  <Text className="text-xs font-bold text-foreground mb-0.5 text-center">
                    {statsLoading ? '-' : (statsData?.avg_rating || 0).toFixed(1)}
                  </Text>
                  <Text className="text-xs text-muted-foreground text-center">
                    Avg Rating
                  </Text>
                </CardContent>
              </Card>
            </View>

            <View className="flex-1">
              <Card className="bg-card border-border  h-24">
                <CardContent className="p-4 items-center justify-center h-full">
                  <View className="w-10 h-10 bg-primary/10 rounded-xl items-center justify-center mb-2">
                    <Icon as={DollarSign} size={20} className="text-primary" />
                  </View>
                  <Text className="text-xs font-bold text-foreground mb-0.5 text-center">
                    ${statsLoading ? '-' : (statsData?.total_spent || 0)}
                  </Text>
                  <Text className="text-xs text-muted-foreground text-center">
                    Total Spent
                  </Text>
                </CardContent>
              </Card>
            </View>
          </View>
        </View>
        {/* Menu Sections - ORDERED BY PRIORITY */}
        <View className="px-6 gap-6">
          {/* SECTION 1: HIGH PRIORITY - Account & Profile */}
          <View>
            <View className="flex-row items-center mb-4">
              <View className="w-1 h-6 bg-primary rounded-full mr-3" />
              <Text className="text-lg font-bold text-foreground">Account & Profile</Text>
            </View>
            <View className="gap-3">
              {[menuData[0], menuData[1]].map((item) => (
                <MenuItem key={item.id} item={item} />
              ))}
            </View>
          </View>

          {/* SECTION 2: HIGH PRIORITY - Services & Bookings */}
          <View>
            <View className="flex-row items-center mb-4">
              <View className="w-1 h-6 bg-secondary rounded-full mr-3" />
              <Text className="text-lg font-bold text-foreground">Services & Bookings</Text>
            </View>
            <View className="gap-3">
              {[menuData[2], menuData[3], menuData[4]].map((item) => (
                <MenuItem key={item.id} item={item} />
              ))}
            </View>
          </View>

          {/* SECTION 3: MEDIUM PRIORITY - Emergency & Communication */}
          <View>
            <View className="flex-row items-center mb-4">
              <View className="w-1 h-6 bg-info rounded-full mr-3" />
              <Text className="text-lg font-bold text-foreground">Emergency & Communication</Text>
            </View>
            <View className="gap-3">
              {[menuData[5], menuData[6], menuData[7], menuData[8]].map((item) => (
                <MenuItem key={item.id} item={item} />
              ))}
            </View>
          </View>

          {/* App Version & Footer */}
          <View className="items-center py-4">
            <Text className="text-muted-foreground text-sm mb-2">ZOVA - Version 1.0.0</Text>
            <Text className="text-muted-foreground text-xs text-center">
              Connecting you with trusted service providers
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

export default CustomerProfile;
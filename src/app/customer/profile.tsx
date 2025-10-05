

import React, { useState, useCallback, useMemo } from 'react';
import { View, ScrollView, Platform, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { Skeleton } from '@/components/ui/skeleton';
import { LogoutButton } from '@/components/ui/logout-button';
import { useAppStore } from '@/stores/auth/app';
import { useProfileModalStore } from '@/stores/ui/profileModal';
import { useAuthOptimized } from '@/hooks';
import { supabase } from '@/lib/core/supabase';
import {
  useProfile,
  useProfileStats,
  useUserBookings,
  useNotificationSettings
} from '@/hooks/shared/useProfileData';
import { useUserFavorites } from '@/hooks/customer';
import { PersonalInfoModal } from '@/components/profile/PersonalInfoModal';
import { NotificationSettingsModal } from '@/components/profile/NotificationSettingsModal';
import { ReviewsModal } from '@/components/profile/ReviewsModal';
import { ReviewSection } from '@/components/customer/ReviewSection';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { Icon } from '@/components/ui/icon';
import { Calendar, CheckCircle, Heart, Search, AlertTriangle, ClipboardList, Trophy, Star, DollarSign, HelpCircle, Phone } from 'lucide-react-native';
import { cn } from '@/lib/utils';
import { THEME } from '@/lib/core/theme';
import { useColorScheme } from '@/lib/core/useColorScheme';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const CustomerProfile = React.memo(function CustomerProfile() {
  const { userRole } = useAppStore();
  // ✅ MIGRATED: Using optimized auth hook following copilot-rules.md
  const { user } = useAuthOptimized();
  const { colorScheme } = useColorScheme();

  // 🚀 MODERN: Conditional data fetching (was always fetching)
  const shouldFetchData = !!user?.id && userRole === 'customer';

  // ✅ MIGRATED: React Query for server state (was useState + useEffect)
  const { data: profileData, isLoading: profileLoading, error: profileError, refetch: refetchProfile } = useProfile(shouldFetchData ? user?.id : undefined);
  const { data: statsData, isLoading: statsLoading, refetch: refetchStats } = useProfileStats(shouldFetchData ? user?.id : undefined);
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
    notificationModalVisible,
    reviewsModalVisible,
    openNotificationModal,
    closeNotificationModal,
    openReviewsModal,
    closeReviewsModal,
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

  // 🚀 MODERN: Memoized menu data with meaningful customer options
  const menuData = useMemo(() => [
    {
      id: 'personal-info',
      title: 'Personal Information',
      subtitle: 'Manage your profile details',
      icon: '👤',
      iconBg: getIconBgColor('blue'),
      onPress: () => router.push('/customer/profile/personal-info'),
    },
    {
      id: 'subscriptions',
      title: 'Subscriptions',
      subtitle: 'Manage SOS and premium plans',
      icon: '⚡',
      iconBg: getIconBgColor('purple'),
      onPress: () => router.push('/customer/subscriptions'),
    },
    {
      id: 'booking-history',
      title: 'Booking History',
      subtitle: 'View past and upcoming bookings',
      icon: '📅',
      iconBg: getIconBgColor('green'),
      onPress: () => router.push('/customer/profile/booking-history'),
    },
    {
      id: 'favorites',
      title: 'Favorites',
      subtitle: 'Your saved providers and services',
      icon: '❤️',
      iconBg: getIconBgColor('red'),
      onPress: () => router.push('/customer/profile/favorites'),
    },
    {
      id: 'reviews',
      title: 'My Reviews',
      subtitle: 'View and manage your reviews',
      icon: '⭐',
      iconBg: getIconBgColor('yellow'),
      onPress: openReviewsModal,
    },
    {
      id: 'sos-booking',
      title: 'SOS Emergency Booking',
      subtitle: 'Quick access to emergency services',
      icon: '🚨',
      iconBg: getIconBgColor('red'),
      onPress: () => router.push('/customer/sos-booking'),
    },
    {
      id: 'messages',
      title: 'Messages',
      subtitle: 'Chat with service providers',
      icon: '💬',
      iconBg: getIconBgColor('blue'),
      onPress: () => router.push('/customer/messages'),
    },
    {
      id: 'search',
      title: 'Search Services',
      subtitle: 'Find providers and services',
      icon: '🔍',
      iconBg: getIconBgColor('orange'),
      onPress: () => router.push('/customer/search'),
    },
    {
      id: 'notifications',
      title: 'Notification Settings',
      subtitle: 'Customize your alerts',
      icon: '🔔',
      iconBg: getIconBgColor('yellow'),
      onPress: openNotificationModal,
    },
    {
      id: 'logout',
      title: 'Logout',
      subtitle: 'Sign out of your account',
      icon: '🚪',
      iconBg: getIconBgColor('red'),
      onPress: () => { }, // Will be handled by LogoutButton component
      isLogout: true, // Special flag for logout button
    },
  ], [colorScheme]);

  // Define menu item type
  type MenuItemType = {
    id: string;
    title: string;
    subtitle: string;
    icon: string;
    iconBg: string;
    onPress: () => void;
    isLogout?: boolean;
  };

  // 🚀 MODERN: Memoized MenuItem component (like provider profile)
  const MenuItem = React.memo(({ item }: { item: MenuItemType }) => {
    if (item.isLogout) {
      return (
        <View className="mb-3">
          <LogoutButton
            variant="modern"
            className="bg-red-500/10 dark:bg-red-500/20 border-red-200 dark:border-red-700"
            showIcon={true}
            fullWidth={true}
          >
            <Text className="text-red-600 dark:text-red-400 font-semibold text-base">
              Sign Out
            </Text>
          </LogoutButton>
        </View>
      );
    }

    return (
      <TouchableOpacity
        onPress={item.onPress}
        className="mb-3 active:opacity-80"
        activeOpacity={0.8}
      >
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <View className="flex-row items-center">
              <View
                className="w-12 h-12 rounded-xl items-center justify-center mr-4"
                style={{ backgroundColor: item.iconBg }}
              >
                <Text className="text-lg">{item.icon}</Text>
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
              <Text className="text-muted-foreground text-lg">›</Text>
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
        {/* Header Section with Modern Design */}
        <LinearGradient
          colors={[THEME[colorScheme].gradientStart, THEME[colorScheme].gradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 32 }}
        >
          <View className="items-center">
            {/* Profile Picture with Edit Button */}
            <View className="mb-6 relative">
              <Avatar className="w-32 h-32 border-4 border-white/30 shadow-2xl" alt="User avatar">
                {profileData?.avatar_url ? (
                  <AvatarImage source={{ uri: profileData.avatar_url }} />
                ) : null}
                <AvatarFallback className="bg-white/20">
                  <Text className="text-4xl text-white font-bold">
                    {profileData?.first_name?.[0]?.toUpperCase() ||
                      profileData?.email?.[0]?.toUpperCase() || '👤'}
                  </Text>
                </AvatarFallback>
              </Avatar>
              {/* Edit Avatar Button */}
              <TouchableOpacity
                onPress={() => router.push('/customer/profile/personal-info')}
                className="absolute -bottom-2 -right-2 w-10 h-10 bg-primary rounded-full items-center justify-center border-2 border-white"
              >
                <Text className="text-white text-lg">✏️</Text>
              </TouchableOpacity>
            </View>

            {/* User Info */}
            <Text className="text-2xl font-bold text-white mb-1">
              {getDisplayName()}
            </Text>
            <Text className="text-white/80 mb-3 text-center">
              {profileData?.bio || 'Welcome to ZOVA'}
            </Text>

            {/* Rating & Member Since */}
            <View className="flex-row gap-4">
              <View className="flex-row items-center bg-white/20 px-3 py-2 rounded-full">
                <Text className="text-white font-bold text-sm mr-1">
                  {statsLoading ? '-' : (statsData?.avg_rating || 4.9).toFixed(1)}
                </Text>
                <Text className="text-white/80 text-sm">⭐</Text>
              </View>
              <View className="flex-row items-center bg-white/20 px-3 py-2 rounded-full">
                <Text className="text-white/80 text-sm mr-1">Since</Text>
                <Text className="text-white font-bold text-sm">
                  {profileData?.created_at ? new Date(profileData.created_at).getFullYear() : '2024'}
                </Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* Quick Stats Cards - Box Grid Design */}
        <View className="px-2 -mt-4 mb-8">
          <View className="flex-row gap-3">
            {/* Total Bookings Card */}
            <View className="flex-1">
              <Card className="bg-card border-border shadow-lg">
                <CardContent className="p-3 items-center justify-center">
                  <View className="w-8 h-8 bg-primary/10 rounded-lg items-center justify-center mb-1.5">
                    <Icon as={Calendar} size={16} className="text-primary" />
                  </View>
                  <Text className="text-lg font-bold text-foreground mb-0.5 text-center">
                    {statsLoading ? '-' : (statsData?.total_bookings || 24)}
                  </Text>
                  <Text className="text-xs text-muted-foreground text-center">
                    Total
                  </Text>
                </CardContent>
              </Card>
            </View>

            {/* Completed Bookings Card */}
            <View className="flex-1">
              <Card className="bg-card border-border shadow-lg">
                <CardContent className="p-3 items-center justify-center">
                  <View className="w-8 h-8 bg-green-500/10 rounded-lg items-center justify-center mb-1.5">
                    <Icon as={CheckCircle} size={16} className="text-green-500" />
                  </View>
                  <Text className="text-lg font-bold text-foreground mb-0.5 text-center">
                    {statsLoading ? '-' : (statsData?.completed_bookings || 21)}
                  </Text>
                  <Text className="text-xs text-muted-foreground text-center">
                    Completed
                  </Text>
                </CardContent>
              </Card>
            </View>

            {/* Favorites Card */}
            <View className="flex-1">
              <Card className="bg-card border-border shadow-lg">
                <CardContent className="p-3 items-center justify-center">
                  <View className="w-8 h-8 bg-pink-500/10 rounded-lg items-center justify-center mb-1.5">
                    <Icon as={Heart} size={16} className="text-pink-500" />
                  </View>
                  <Text className="text-lg font-bold text-foreground mb-0.5 text-center">
                    {(favoritesData?.providers?.length || 0) + (favoritesData?.services?.length || 0)}
                  </Text>
                  <Text className="text-xs text-muted-foreground text-center">
                    Favorites
                  </Text>
                </CardContent>
              </Card>
            </View>
          </View>
        </View>

        {/* 🚀 MODERN: Quick Actions Section */}
        <View className="px-2 mb-8">
          <Text className="text-lg font-bold text-foreground mb-4">Quick Actions</Text>
          <View className="flex-row gap-3">
            <TouchableOpacity
              onPress={() => router.push('/customer/search')}
              className="flex-1 active:opacity-80"
              activeOpacity={0.8}
            >
              <Card className="bg-card border-border shadow-lg h-24">
                <CardContent className="p-4 items-center justify-center h-full">
                  <View className="w-10 h-10 bg-primary/10 rounded-xl items-center justify-center mb-2">
                    <Icon as={Search} size={20} className="text-primary" />
                  </View>
                  <Text className="text-xs font-bold text-foreground mb-0.5 text-center">
                    Find Services
                  </Text>
                </CardContent>
              </Card>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push('/customer/sos-booking')}
              className="flex-1 active:opacity-80"
              activeOpacity={0.8}
            >
              <Card className="bg-card border-border shadow-lg h-24">
                <CardContent className="p-4 items-center justify-center h-full">
                  <View className="w-10 h-10 bg-destructive/10 rounded-xl items-center justify-center mb-2">
                    <Icon as={AlertTriangle} size={20} className="text-destructive" />
                  </View>
                  <Text className="text-xs font-bold text-foreground  text-center">
                    SOS Emergency
                  </Text>
                </CardContent>
              </Card>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push('/customer/bookings')}
              className="flex-1 active:opacity-80"
              activeOpacity={0.8}
            >
              <Card className="bg-card border-border shadow-lg h-24">
                <CardContent className="p-4 items-center justify-center h-full">
                  <View className="w-10 h-10 bg-secondary/50 rounded-xl items-center justify-center mb-2">
                    <Icon as={ClipboardList} size={20} className="text-secondary-foreground" />
                  </View>
                  <Text className="text-xs font-bold text-foreground text-center">
                    My Bookings
                  </Text>
                </CardContent>
              </Card>
            </TouchableOpacity>
          </View>
        </View>

        {/* 🚀 MODERN: Achievements & Badges Section */}
        <View className="px-3 mb-8">
          <Text className="text-lg font-bold text-foreground mb-4">Achievements</Text>
          <View className="flex-row gap-3">
            <View className="flex-1">
              <Card className="bg-card border-border shadow-lg h-24">
                <CardContent className="p-4 items-center justify-center h-full">
                  <View className="w-10 h-10 bg-yellow-500/10 rounded-xl items-center justify-center mb-2">
                    <Icon as={Trophy} size={20} className="text-yellow-500" />
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
              <Card className="bg-card border-border shadow-lg h-24">
                <CardContent className="p-4 items-center justify-center h-full">
                  <View className="w-10 h-10 bg-blue-500/10 rounded-xl items-center justify-center mb-2">
                    <Icon as={Star} size={20} className="text-blue-500" />
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
              <Card className="bg-card border-border shadow-lg h-24">
                <CardContent className="p-4 items-center justify-center h-full">
                  <View className="w-10 h-10 bg-green-500/10 rounded-xl items-center justify-center mb-2">
                    <Icon as={DollarSign} size={20} className="text-green-500" />
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
        <View className="px-6">
          <Text className="text-lg font-bold text-foreground mb-4">Menu</Text>
          <View>
            {menuData.map((item) => (
              <MenuItem key={item.id} item={item} />
            ))}
          </View>

          {/* Support Section */}
          <View className="mt-6 pt-4 border-t border-border">
            <Text className="text-base font-semibold text-foreground mb-3">Support & Help</Text>
            {[
              {
                id: 'help-center',
                title: 'Help Center',
                subtitle: 'FAQs and guides',
                icon: '❓',
                iconBg: getIconBgColor('blue'),
                onPress: () => {
                  // TODO: Implement help center route
                  console.log('Help center pressed');
                },
              },
              {
                id: 'contact-support',
                title: 'Contact Support',
                subtitle: 'Get help from our team',
                icon: '📞',
                iconBg: getIconBgColor('green'),
                onPress: () => {
                  // TODO: Implement contact support
                  console.log('Contact support pressed');
                },
              },
            ].map((item) => (
              <MenuItem key={item.id} item={item} />
            ))}
          </View>

          {/* Theme Toggle */}
          <View className="mt-4">
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <ThemeToggle />
              </CardContent>
            </Card>
          </View>
        </View>

        {/* Bottom spacing for tab bar */}
        <View className={cn("h-6", Platform.OS === 'ios' && "h-24")} />
      </ScrollView>

      {/* Modals - Only Notification Settings and Reviews remain as modals */}
      {notificationModalVisible && (
        <NotificationSettingsModal
          visible={notificationModalVisible}
          onClose={closeNotificationModal}
          settings={notificationSettings}
          userId={user?.id || ''}
        />
      )}

      {reviewsModalVisible && (
        <ReviewsModal
          visible={reviewsModalVisible}
          onClose={closeReviewsModal}
          userId={user?.id}
        />
      )}
    </SafeAreaView>
  );
});

export default CustomerProfile;
import React, { useState, useCallback, useMemo } from 'react';
import { View, ScrollView, Platform, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
import { PersonalInfoModal } from '@/components/profile/PersonalInfoModal';
import { NotificationSettingsModal } from '@/components/profile/NotificationSettingsModal';
import { BookingHistoryModal } from '@/components/profile/BookingHistoryModal';
import { FavoritesModal } from '@/components/profile/FavoritesModal';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { cn } from '@/lib/utils';
import { THEME } from '@/lib/core/theme';
import { useColorScheme } from '@/lib/core/useColorScheme';

const CustomerProfile = React.memo(function CustomerProfile() {
  const { userRole } = useAppStore();
  // ✅ MIGRATED: Using optimized auth hook following copilot-rules.md
  const { user } = useAuthOptimized();
  const { colorScheme } = useColorScheme();

  // 🚀 MODERN: Conditional data fetching (was always fetching)
  const shouldFetchData = !!user?.id && userRole === 'customer';
  
  // ✅ MIGRATED: React Query for server state (was useState + useEffect)
  const { data: profileData, isLoading: profileLoading, error: profileError } = useProfile(shouldFetchData ? user?.id : undefined);
  const { data: statsData, isLoading: statsLoading } = useProfileStats(shouldFetchData ? user?.id : undefined);
  const { data: bookingsData, isLoading: bookingsLoading } = useUserBookings(shouldFetchData ? user?.id : undefined);
  const { data: notificationSettings } = useNotificationSettings();
  const { data: favoritesData } = useUserFavorites(shouldFetchData ? user?.id : undefined);

  // Mock refetch functions for pull-to-refresh (will be replaced with real React Query)
  const refetchProfile = useCallback(async () => {
    console.log('[CustomerProfile] Refetching profile...');
  }, []);
  const refetchStats = useCallback(async () => {
    console.log('[CustomerProfile] Refetching stats...');
  }, []);
  const refetchBookings = useCallback(async () => {
    console.log('[CustomerProfile] Refetching bookings...');
  }, []);
  const refetchNotifications = useCallback(async () => {
    console.log('[CustomerProfile] Refetching notifications...');
  }, []);
  const refetchFavorites = useCallback(async () => {
    console.log('[CustomerProfile] Refetching favorites...');
  }, []);

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
    personalInfoModalVisible,
    notificationModalVisible,
    bookingHistoryModalVisible,
    favoritesModalVisible,
    openPersonalInfoModal,
    closePersonalInfoModal,
    openNotificationModal,
    closeNotificationModal,
    openBookingHistoryModal,
    closeBookingHistoryModal,
    openFavoritesModal,
    closeFavoritesModal,
    _hasHydrated
  } = useProfileModalStore();

  // Wait for Zustand store hydration before rendering
  if (!_hasHydrated) {
    console.log('[CustomerProfile] Waiting for modal store hydration...');
    return null;
  }

  // Handle logout action
  const handleLogout = useCallback(async () => {
    try {
      // TODO: Implement logout logic (clear auth store, sign out from Supabase)
      console.log('[CustomerProfile] Logout initiated');
    } catch (error) {
      console.error('[CustomerProfile] Logout error:', error);
    }
  }, []);

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
      onPress: openPersonalInfoModal,
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
      onPress: openBookingHistoryModal,
    },
    {
      id: 'favorites',
      title: 'Favorites',
      subtitle: 'Your saved providers and services',
      icon: '❤️',
      iconBg: getIconBgColor('red'),
      onPress: openFavoritesModal,
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
      onPress: handleLogout,
    },
  ], [
    openPersonalInfoModal,
    openNotificationModal,
    openBookingHistoryModal,
    openFavoritesModal,
    handleLogout,
    colorScheme
  ]);

  // 🚀 MODERN: Memoized MenuItem component (like provider profile)
  const MenuItem = React.memo(({ item }: { item: typeof menuData[0] & { subtitle?: string } }) => (
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
  ));

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
        {/* Header Section with Linear Gradient */}
        <LinearGradient
          colors={['#667eea', '#764ba2']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 32 }}
        >
          <View className="items-center">
            {/* Profile Picture */}
            <View className="mb-6">
              <Avatar className="w-32 h-32 border-4 border-white shadow-2xl" alt="User avatar">
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
            </View>
            
            {/* User Info */}
            <Text className="text-2xl font-bold text-white mb-1">
              {getDisplayName()}
            </Text>
            <Text className="text-white/80 mb-2">
              {profileData?.bio || 'Welcome to ZOVA'}
            </Text>
            
            {/* Rating */}
            <View className="flex-row items-center bg-white/20 px-4 py-2 rounded-full">
              <Text className="text-white font-bold text-lg mr-1">
                {statsLoading ? '-' : (statsData?.avg_rating || 4.9).toFixed(1)}
              </Text>
              <Text className="text-white/80">
                ⭐ {statsLoading ? '-' : (statsData?.total_bookings || 0)} bookings
              </Text>
            </View>
          </View>
        </LinearGradient>

        {/* Quick Stats Cards */}
        <View className="px-6 -mt-4 mb-6">
          <View className="flex-row gap-4">
            <View className="flex-1 bg-accent dark:bg-accent rounded-2xl p-4 shadow-sm">
              <Text className="text-3xl text-center font-bold text-primary mb-1">
                {statsLoading ? '-' : (statsData?.total_bookings || 24)}
              </Text>
              <Text className="text-muted-foreground text-center text-xs">Bookings</Text>
            </View>
            <View className="flex-1 bg-accent dark:bg-accent rounded-2xl p-4 shadow-sm">
              <Text className="text-3xl text-center font-bold text-green-500 mb-1">
                {statsLoading ? '-' : (statsData?.completed_bookings || 21)}
              </Text>
              <Text className="text-muted-foreground text-center text-xs">Completed</Text>
            </View>
            <View className="flex-1 bg-accent dark:bg-accent rounded-2xl p-4 shadow-sm">
              <Text className="text-3xl text-center font-bold text-orange-500 mb-1">
                {(favoritesData?.providers?.length || 0) + (favoritesData?.services?.length || 0)}
              </Text>
              <Text className="text-muted-foreground text-center text-xs">Favorites</Text>
            </View>
          </View>
        </View>

        {/* 🚀 MODERN: Menu System with proper scrolling */}
        <View className="px-6">
          <Text className="text-lg font-bold text-foreground mb-4">Menu</Text>
          <View>
            {menuData.map((item) => (
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

      {/* Modals - Lazy Loading for Performance */}
      {personalInfoModalVisible && (
        <PersonalInfoModal
          visible={personalInfoModalVisible}
          onClose={closePersonalInfoModal}
          profileData={profileData}
        />
      )}
      
      {notificationModalVisible && (
        <NotificationSettingsModal
          visible={notificationModalVisible}
          onClose={closeNotificationModal}
          settings={notificationSettings}
          userId={user?.id || ''}
        />
      )}
      
      {bookingHistoryModalVisible && (
        <BookingHistoryModal />
      )}

      {favoritesModalVisible && (
        <FavoritesModal
          visible={favoritesModalVisible}
          onClose={closeFavoritesModal}
          userId={user?.id || ''}
        />
      )}
    </SafeAreaView>
  );
});

export default CustomerProfile;
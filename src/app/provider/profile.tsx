import React from 'react';
import { View, ScrollView, Platform, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
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
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { useColorScheme } from '@/lib/core/useColorScheme';
import { THEME } from '@/lib/core/theme';


// Import modals

import { NotificationSettingsModal } from '@/components/profile/NotificationSettingsModal';

import { StripeIntegrationModal } from '@/components/profile/StripeIntegrationModal';
import ServicesModal from '@/components/profile/ServicesModal';

export default React.memo(function ProfileScreen() {
  const { userRole } = useAppStore();
  // ✅ MIGRATED: Using optimized auth hook following copilot-rules.md
  const { user } = useAuthOptimized();
  const { colorScheme } = useColorScheme();
  
  // Don't fetch data if user is not authenticated or logging out
  const shouldFetchData = user?.id && userRole === 'provider';

  // Use Zustand store for modal state management
  const {
    personalInfoModalVisible,
    notificationModalVisible,
    bookingHistoryModalVisible,
    stripeIntegrationModalVisible,
    servicesModalVisible,
    openPersonalInfoModal,
    closePersonalInfoModal,
    openNotificationModal,
    closeNotificationModal,
    openBookingHistoryModal,
    closeBookingHistoryModal,
    openStripeIntegrationModal,
    closeStripeIntegrationModal,
    openServicesModal,
    closeServicesModal,
    _hasHydrated
  } = useProfileModalStore();

  // Data fetching hooks with user ID - only call when user is authenticated
  const { data: profileData, isLoading: profileLoading, error: profileError, refetch: refetchProfile } = useProfile(shouldFetchData ? user?.id : undefined);
  const { data: statsData, isLoading: statsLoading } = useProfileStats(shouldFetchData ? user?.id : undefined, userRole);
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

  // Memoized menu data structures for performance
  const businessManagementMenu = React.useMemo(() => [
    {
      id: 'calendar',
      icon: 'calendar-outline' as keyof typeof Ionicons.glyphMap,
      iconBg: 'bg-blue-500/10',
      iconColor: 'text-blue-600',
      title: 'Calendar & Bookings',
      subtitle: 'Manage your schedule and appointments',
      onPress: () => router.push('/provider/calendar'),
    },
    {
      id: 'services',
      icon: 'construct-outline' as keyof typeof Ionicons.glyphMap,
      iconBg: 'bg-purple-500/10',
      iconColor: 'text-purple-600',
      title: 'Services & Pricing',
      subtitle: 'Update your service offerings and rates',
      onPress: openServicesModal,
    },
    {
      id: 'payments',
      icon: 'card-outline' as keyof typeof Ionicons.glyphMap,
      iconBg: 'bg-green-500/10',
      iconColor: 'text-green-600',
      title: 'Payment Integration',
      subtitle: 'Connect Stripe for secure payments',
      onPress: openStripeIntegrationModal,
    },
    {
      id: 'analytics',
      icon: 'bar-chart-outline' as keyof typeof Ionicons.glyphMap,
      iconBg: 'bg-orange-500/10',
      iconColor: 'text-orange-600',
      title: 'Business Analytics',
      subtitle: 'Track performance and earnings',
      onPress: () => {},
    },
    {
      id: 'subscriptions',
      icon: 'diamond-outline' as keyof typeof Ionicons.glyphMap,
      iconBg: 'bg-yellow-500/10',
      iconColor: 'text-yellow-600',
      title: 'Premium Subscription',
      subtitle: 'Unlock advanced business features',
      onPress: () => router.push('/provider/profile/subscriptions'),
    },
  ], [openStripeIntegrationModal, openServicesModal]);

  const customerRelationsMenu = React.useMemo(() => [
    {
      id: 'reviews',
      icon: 'star-outline' as keyof typeof Ionicons.glyphMap,
      iconBg: 'bg-yellow-500/10',
      iconColor: 'text-yellow-600',
      title: 'Reviews & Ratings',
      subtitle: statsData?.avg_rating ? `${statsData.avg_rating.toFixed(1)}★ average rating` : 'No reviews yet',
      badge: '2 new',
      onPress: () => router.push('/provider/profile/reviews'),
    },
    // {
    //   id: 'messages',
    //   icon: 'chatbubbles-outline' as keyof typeof Ionicons.glyphMap,
    //   iconBg: 'bg-blue-500/10',
    //   iconColor: 'text-blue-600',
    //   title: 'Client Messages',
    //   subtitle: 'Communicate with your clients',
    //   onPress: () => {},
    // },
    // {
    //   id: 'marketing',
    //   icon: 'megaphone-outline' as keyof typeof Ionicons.glyphMap,
    //   iconBg: 'bg-purple-500/10',
    //   iconColor: 'text-purple-600',
    //   title: 'Marketing Tools',
    //   subtitle: 'Promote and grow your business',
    //   onPress: () => {},
    // },
  ], [statsData?.avg_rating]);

  const accountSettingsMenu = React.useMemo(() => [
    {
      id: 'profile',
      icon: 'person-outline' as keyof typeof Ionicons.glyphMap,
      iconBg: 'bg-indigo-500/10',
      iconColor: 'text-indigo-600',
      title: 'Business Profile',
      subtitle: 'Update your business information',
      onPress: openPersonalInfoModal,
    },
    {
      id: 'hours',
      icon: 'time-outline' as keyof typeof Ionicons.glyphMap,
      iconBg: 'bg-cyan-500/10',
      iconColor: 'text-cyan-600',
      title: 'Business Hours',
      subtitle: 'Set your availability schedule',
      onPress: () => router.push('/provider/calendar'),
    },
    {
      id: 'notifications',
      icon: 'notifications-outline' as keyof typeof Ionicons.glyphMap,
      iconBg: 'bg-orange-500/10',
      iconColor: 'text-orange-600',
      title: 'Notifications',
      subtitle: 'Customize business alerts',
      onPress: openNotificationModal,
    },
    {
      id: 'security',
      icon: 'shield-checkmark-outline' as keyof typeof Ionicons.glyphMap,
      iconBg: 'bg-red-500/10',
      iconColor: 'text-red-600',
      title: 'Privacy & Security',
      subtitle: 'Manage account security settings',
      onPress: () => {},
    },
  ], [openPersonalInfoModal, openNotificationModal]);

  const supportResourcesMenu = React.useMemo(() => [
    {
      id: 'resources',
      icon: 'library-outline' as keyof typeof Ionicons.glyphMap,
      iconBg: 'bg-emerald-500/10',
      iconColor: 'text-emerald-600',
      title: 'Provider Resources',
      subtitle: 'Tips, guides, and best practices',
      onPress: () => {},
    },
    {
      id: 'help',
      icon: 'help-circle-outline' as keyof typeof Ionicons.glyphMap,
      iconBg: 'bg-slate-500/10',
      iconColor: 'text-slate-600',
      title: 'Help Center',
      subtitle: 'FAQs and documentation',
      onPress: () => {},
    },
    {
      id: 'support',
      icon: 'headset-outline' as keyof typeof Ionicons.glyphMap,
      iconBg: 'bg-blue-500/10',
      iconColor: 'text-blue-600',
      title: 'Contact Support',
      subtitle: '24/7 business support team',
      onPress: () => {},
    },
    {
      id: 'history',
      icon: 'document-text-outline' as keyof typeof Ionicons.glyphMap,
      iconBg: 'bg-green-500/10',
      iconColor: 'text-green-600',
      title: 'Service History',
      subtitle: 'View completed bookings',
      onPress: openBookingHistoryModal,
    },
  ], [openBookingHistoryModal]);

  // Define menu item type
  type MenuItem = {
    id: string;
    icon: keyof typeof Ionicons.glyphMap;
    iconBg: string;
    iconColor: string;
    title: string;
    subtitle: string;
    badge?: string;
    onPress: () => void;
  };

  // Memoized MenuItem component for performance
  const MenuItemComponent = React.memo(({ item }: { item: MenuItem }) => (
    <TouchableOpacity 
      className="bg-card rounded-2xl p-5 border border-border shadow-sm active:scale-[0.98] transition-transform"
      onPress={item.onPress}
    >
      <View className="flex-row items-center">
        <View className={cn("w-12 h-12 rounded-2xl items-center justify-center mr-4", item.iconBg)}>
          <Ionicons 
            name={item.icon} 
            size={24} 
            className={cn("text-2xl", item.iconColor)} 
          />
        </View>
        <View className="flex-1">
          <View className="flex-row items-center">
            <Text className="font-bold text-foreground text-base">{item.title}</Text>
            {item.badge && (
              <View className="ml-2 bg-primary/10 px-2 py-0.5 rounded-full">
                <Text className="text-primary text-xs font-medium">{item.badge}</Text>
              </View>
            )}
          </View>
          <Text className="text-muted-foreground text-sm mt-0.5">{item.subtitle}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} className="text-muted-foreground" />
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
        {/* Header Section with Linear Gradient */}
        <LinearGradient
          colors={[THEME[colorScheme].gradientStart, THEME[colorScheme].gradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: 24 }}
        >
          <View className="items-center">
            {/* Profile Picture */}
            <View className="mb-4">
              <Avatar className="w-24 h-24 border-4 border-white shadow-lg" alt="Provider avatar">
                {profileData?.avatar_url ? (
                  <AvatarImage source={{ uri: profileData.avatar_url }} />
                ) : null}
                <AvatarFallback className="bg-white/20 backdrop-blur-sm">
                  {(profileData?.first_name?.[0] || profileData?.email?.[0]) ? (
                    <Text className="text-3xl text-white font-bold">
                      {profileData?.first_name?.[0]?.toUpperCase() || 
                       profileData?.email?.[0]?.toUpperCase()}
                    </Text>
                  ) : (
                    <Ionicons name="person" size={32} className="text-white" />
                  )}
                </AvatarFallback>
              </Avatar>
            </View>
            
            {/* Provider Info */}
            <Text className="text-xl font-bold text-white mb-1 text-center">
              {getDisplayName()}
            </Text>
            <Text className="text-white/90 mb-3 text-sm text-center px-4">
              {profileData?.bio || 'Professional Service Provider'}
            </Text>
            
            {/* Business Badge */}
            <View className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full border border-white/30">
              <Text className="text-white font-semibold text-sm">
                {userRole === 'provider' ? '⭐ Service Provider' : '🏢 Business Account'}
              </Text>
            </View>
            
            {/* Verification Status */}
            {profileData?.verification_status === 'approved' && (
              <View className="mt-2 bg-green-500/20 backdrop-blur-sm px-3 py-1 rounded-full border border-green-400/30">
                <Text className="text-green-100 font-medium text-xs">
                  ✓ Verified Provider
                </Text>
              </View>
            )}
            {profileData?.verification_status === 'pending' && (
              <View className="mt-2 bg-yellow-500/20 backdrop-blur-sm px-3 py-1 rounded-full border border-yellow-400/30">
                <Text className="text-yellow-100 font-medium text-xs">
                  ⏳ Verification Pending
                </Text>
              </View>
            )}
          </View>
        </LinearGradient>

        {/* Business Stats Cards */}
        <View className="px-6 pt-4 mb-8">
          <View className="flex-row gap-3">
            {/* Completed Jobs */}
            <View className="flex-1 bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-4 border border-green-200/50">
              <View className="items-center">
                <View className="w-8 h-8 bg-green-500/10 rounded-full items-center justify-center mb-2">
                  <Ionicons name="checkmark-circle" size={18} className="text-green-600" />
                </View>
                <Text className="text-2xl font-bold text-green-700 mb-1">
                  {statsLoading ? '...' : statsData?.completed_bookings ? statsData.completed_bookings.toLocaleString() : '0'}
                </Text>
                <Text className="text-green-600 text-xs font-medium text-center">Completed</Text>
                <Text className="text-green-600/70 text-xs text-center">Jobs</Text>
              </View>
            </View>

            {/* Rating */}
            <View className="flex-1 bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-2xl p-4 border border-yellow-200/50">
              <View className="items-center">
                <View className="w-8 h-8 bg-yellow-500/10 rounded-full items-center justify-center mb-2">
                  <Ionicons name="star" size={18} className="text-yellow-600" />
                </View>
                <Text className="text-2xl font-bold text-yellow-700 mb-1">
                  {statsLoading ? '...' : statsData?.avg_rating ? statsData.avg_rating.toFixed(1) : '0.0'}
                </Text>
                <Text className="text-yellow-600 text-xs font-medium text-center">Average</Text>
                <Text className="text-yellow-600/70 text-xs text-center">Rating</Text>
              </View>
            </View>

            {/* Total Earnings */}
            <View className="flex-1 bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-4 border border-blue-200/50">
              <View className="items-center">
                <View className="w-8 h-8 bg-blue-500/10 rounded-full items-center justify-center mb-2">
                  <Ionicons name="wallet" size={18} className="text-blue-600" />
                </View>
                <Text className="text-2xl font-bold text-blue-700 mb-1">
                  {statsLoading ? '...' : statsData?.total_spent ? `£${statsData.total_spent.toFixed(0)}` : '£0'}
                </Text>
                <Text className="text-blue-600 text-xs font-medium text-center">Total</Text>
                <Text className="text-blue-600/70 text-xs text-center">Earned</Text>
              </View>
            </View>
          </View>

          {/* Quick Actions Row */}
          <View className="flex-row gap-3 mt-4">
            <TouchableOpacity 
              className="flex-1 bg-primary/5 rounded-xl p-3 border border-primary/20"
              onPress={() => {}}
            >
              <View className="flex-row items-center justify-center">
                <Ionicons name="trending-up" size={16} className="text-primary mr-2" />
                <Text className="text-primary font-semibold text-sm">View Earnings</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity 
              className="flex-1 bg-secondary/5 rounded-xl p-3 border border-secondary/20"
              onPress={() => router.push('/provider/calendar')}
            >
              <View className="flex-row items-center justify-center">
                <Ionicons name="calendar" size={16} className="text-secondary mr-2" />
                <Text className="text-secondary font-semibold text-sm">My Schedule</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Menu Sections */}
        <View className="px-6 gap-8">
          {/* Business Management Section */}
          <View>
            <View className="flex-row items-center mb-5">
              <View className="w-1 h-6 bg-primary rounded-full mr-3" />
              <Text className="text-xl font-bold text-foreground">Business Management</Text>
            </View>
            <View className="gap-3">
              {businessManagementMenu.map((item) => (
                <MenuItemComponent key={item.id} item={item} />
              ))}
            </View>
          </View>

          {/* Customer Relations Section */}
          <View>
            <View className="flex-row items-center mb-5">
              <View className="w-1 h-6 bg-secondary rounded-full mr-3" />
              <Text className="text-xl font-bold text-foreground">Customer Relations</Text>
            </View>
            <View className="gap-3">
              {customerRelationsMenu.map((item) => (
                <MenuItemComponent key={item.id} item={item} />
              ))}
            </View>
          </View>

          {/* Account Settings Section */}
          <View>
            <View className="flex-row items-center mb-5">
              <View className="w-1 h-6 bg-orange-500 rounded-full mr-3" />
              <Text className="text-xl font-bold text-foreground">Account Settings</Text>
            </View>
            <View className="gap-3">
              {accountSettingsMenu.map((item) => (
                <MenuItemComponent key={item.id} item={item} />
              ))}
            </View>
          </View>

          {/* Support & Resources Section */}
          <View>
            <View className="flex-row items-center mb-5">
              <View className="w-1 h-6 bg-green-500 rounded-full mr-3" />
              <Text className="text-xl font-bold text-foreground">Support & Resources</Text>
            </View>
            <View className="gap-3">
              {supportResourcesMenu.map((item) => (
                <MenuItemComponent key={item.id} item={item} />
              ))}
              
              {/* Theme Toggle */}
          
               
                  <ThemeToggle />
            
            </View>
          </View>

          {/* App Version & Footer */}
          <View className="items-center py-6">
            <Text className="text-muted-foreground text-sm mb-2">ZOVA Business - Version 1.0.0</Text>
            <Text className="text-muted-foreground text-xs text-center">
              Professional tools for service providers
            </Text>
          </View>

          {/* Logout Button */}
          <View className="mb-8">
            <LinearGradient
              colors={[THEME[colorScheme].destructiveGradientStart, THEME[colorScheme].destructiveGradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ borderRadius: 12, padding: 1 }}
            >
              <TouchableOpacity className="bg-card rounded-xl p-4 border border-border">
                <LogoutButton />
              </TouchableOpacity>
            </LinearGradient>
          </View>
        </View>

        {/* Bottom spacing for tab bar */}
        <View className={cn("h-6", Platform.OS === 'ios' && "h-24")} />
      </ScrollView>




      {notificationModalVisible && (
        <NotificationSettingsModal
          visible={notificationModalVisible}
          onClose={closeNotificationModal}
          settings={notificationSettings}
          userId={user?.id || ''}
        />
      )}

  

      {stripeIntegrationModalVisible && (
        <StripeIntegrationModal
          visible={stripeIntegrationModalVisible}
          onClose={closeStripeIntegrationModal}
        />
      )}

      {servicesModalVisible && (
        <ServicesModal
          visible={servicesModalVisible}
          onClose={closeServicesModal}
        />
      )}
    </SafeAreaView>
  );
});
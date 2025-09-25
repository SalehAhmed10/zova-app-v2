import React from 'react';
import { View, ScrollView, Platform, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { LogoutButton } from '@/components/ui/logout-button';
import { useAppStore } from '@/stores/app';
import { useProfileModalStore } from '@/stores/profileModal';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useColorScheme } from '@/lib/useColorScheme';
import { THEME } from '@/lib/theme';
import ServicesModal from '@/components/profile/ServicesModal';
import {
  useProfile,
  useProviderStats,
  useUserBookings,
  useNotificationSettings
} from '@/hooks/useProfileData';

// Import modals
import { PersonalInfoModal } from '@/components/profile/PersonalInfoModal';
import { NotificationSettingsModal } from '@/components/profile/NotificationSettingsModal';
import { BookingHistoryModal } from '@/components/profile/BookingHistoryModal';
import { StripeIntegrationModal } from '@/components/profile/StripeIntegrationModal';

export default React.memo(function ProfileScreen() {
  const { userRole } = useAppStore();
  const { user } = useAuth();
  const { colorScheme } = useColorScheme();

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

  // Data fetching hooks with user ID - React Query for server state
  const { data: profileData, isLoading: profileLoading, error: profileError, refetch: refetchProfile } = useProfile(user?.id);
  const { data: statsData, isLoading: statsLoading } = useProviderStats(user?.id);
  const { data: bookingsData, isLoading: bookingsLoading } = useUserBookings(user?.id);
  const { data: notificationSettings } = useNotificationSettings(user?.id);

  // Wait for Zustand store hydration before rendering
  if (!_hasHydrated) {
    console.log('[ProfileScreen] Waiting for modal store hydration...');
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
    return profileData?.email?.split('@')[0] || 'Provider';
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
      icon: '📅',
      iconBg: 'bg-primary/10',
      title: 'Calendar & Bookings',
      subtitle: 'Manage your schedule and appointments',
      onPress: () => router.push('/provider/calendar'),
    },
    {
      id: 'services',
      icon: '⚙️',
      iconBg: 'bg-secondary/20',
      title: 'Services & Pricing',
      subtitle: 'Update your service offerings',
      onPress: openServicesModal,
    },
    {
      id: 'payments',
      icon: '💳',
      iconBg: 'bg-primary/10',
      title: 'Payment Integration',
      subtitle: 'Connect your Stripe account for payments',
      onPress: openStripeIntegrationModal,
    },
    {
      id: 'analytics',
      icon: '📊',
      iconBg: 'bg-secondary/20',
      title: 'Analytics',
      subtitle: 'View detailed business insights',
      onPress: () => {},
    },
  ], [openStripeIntegrationModal, openServicesModal]);

  const customerRelationsMenu = React.useMemo(() => [
    {
      id: 'reviews',
      icon: '⭐',
      iconBg: `${getIconBgColor('yellow')}20`,
      title: 'Reviews & Ratings',
      subtitle: '2 new reviews',
      onPress: () => {},
    },
    {
      id: 'messages',
      icon: '💬',
      iconBg: `${getIconBgColor('blue')}20`,
      title: 'Messages',
      subtitle: 'Communicate with clients',
      onPress: () => {},
    },
    {
      id: 'marketing',
      icon: '🎯',
      iconBg: `${getIconBgColor('purple')}20`,
      title: 'Marketing Tools',
      subtitle: 'Promote your services',
      onPress: () => {},
    },
  ], [colorScheme]);

  const accountSettingsMenu = React.useMemo(() => [
    {
      id: 'profile',
      icon: '👤',
      iconBg: 'bg-primary/10',
      title: 'Business Profile',
      subtitle: 'Update your business information',
      onPress: openPersonalInfoModal,
    },
    {
      id: 'hours',
      icon: '🏪',
      iconBg: 'bg-secondary/20',
      title: 'Business Hours',
      subtitle: 'Set your availability',
      onPress: () => router.push('/provider/calendar'),
    },
    {
      id: 'notifications',
      icon: '🔔',
      iconBg: `${getIconBgColor('orange')}20`,
      title: 'Notifications',
      subtitle: 'Customize business alerts',
      onPress: openNotificationModal,
    },
    {
      id: 'security',
      icon: '🔒',
      iconBg: `${getIconBgColor('red')}20`,
      title: 'Privacy & Security',
      subtitle: 'Manage account security',
      onPress: () => {},
    },
  ], [colorScheme, openPersonalInfoModal, openNotificationModal]);

  const supportResourcesMenu = React.useMemo(() => [
    {
      id: 'resources',
      icon: '📚',
      iconBg: 'bg-primary/10',
      title: 'Provider Resources',
      subtitle: 'Tips and best practices',
      onPress: () => {},
    },
    {
      id: 'help',
      icon: '❓',
      iconBg: 'bg-secondary/20',
      title: 'Help Center',
      subtitle: 'Find answers to your questions',
      onPress: () => {},
    },
    {
      id: 'support',
      icon: '💬',
      iconBg: `${getIconBgColor('blue')}20`,
      title: 'Contact Support',
      subtitle: 'Get help from our business team',
      onPress: () => {},
    },
    {
      id: 'history',
      icon: '📱',
      iconBg: `${getIconBgColor('green')}20`,
      title: 'Business History',
      subtitle: 'View your service history',
      onPress: openBookingHistoryModal,
    },
  ], [colorScheme, openBookingHistoryModal]);

  // Memoized MenuItem component for performance
  const MenuItem = React.memo(({ item }: { item: typeof businessManagementMenu[0] }) => (
    <TouchableOpacity 
      className="bg-card rounded-xl p-4 border border-border"
      onPress={item.onPress}
    >
      <View className="flex-row items-center">
        <View className={cn("w-10 h-10 rounded-xl items-center justify-center mr-4", item.iconBg)}>
          <Text className="text-xl">{item.icon}</Text>
        </View>
        <View className="flex-1">
          <Text className="font-semibold text-foreground">{item.title}</Text>
          <Text className="text-muted-foreground text-sm">{item.subtitle}</Text>
        </View>
        <Text className="text-muted-foreground text-lg">›</Text>
      </View>
    </TouchableOpacity>
  ));

  // Loading state (wait for user and profile data)
  if (!user || profileLoading) {
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
          style={{ paddingHorizontal: 24, paddingTop: 12, paddingBottom: 16 }}
        >
          <View className="items-center">
            {/* Profile Picture */}
            <View className="mb-3">
              <Avatar className="w-20 h-20 border-3 border-white" alt="Provider avatar">
                {profileData?.avatar_url ? (
                  <AvatarImage source={{ uri: profileData.avatar_url }} />
                ) : null}
                <AvatarFallback className="bg-muted/50">
                  <Text className="text-2xl text-foreground font-bold">
                    {profileData?.first_name?.[0]?.toUpperCase() || 
                     profileData?.email?.[0]?.toUpperCase() || '💼'}
                  </Text>
                </AvatarFallback>
              </Avatar>
            </View>
            
            {/* Provider Info */}
            <Text className="text-lg font-bold text-white mb-0.5">
              {getDisplayName()}
            </Text>
            <Text className="text-white/80 mb-1.5 text-xs">
              {profileData?.bio || 'Professional Service Provider'}
            </Text>
            
            {/* Business Badge */}
            <View className="bg-muted/30 px-3 py-1.5 rounded-full">
              <Text className="text-foreground font-medium text-xs">
                {userRole === 'provider' ? 'Service Provider' : 'Business Account'}
              </Text>
            </View>
          </View>
        </LinearGradient>

        {/* Business Stats Cards */}
        <View className="px-6 pt-6 mb-6">
          <View className="flex-row gap-4">
            <View className="flex-1 bg-card rounded-2xl p-4 border border-border">
              <Text className="text-2xl text-center font-bold text-green-600 mb-1">
                {statsLoading ? '...' : statsData?.this_month_earnings ? `$${statsData.this_month_earnings.toLocaleString()}` : '$0'}
              </Text>
              <Text className="text-muted-foreground text-center text-xs">This Month</Text>
            </View>
            <View className="flex-1 bg-card rounded-2xl p-4 border border-border">
              <Text className="text-2xl text-center font-bold text-yellow-600 mb-1">
                {statsLoading ? '...' : statsData?.avg_rating ? statsData.avg_rating.toFixed(1) : '0.0'}
              </Text>
              <Text className="text-muted-foreground text-center text-xs">Rating</Text>
            </View>
            <View className="flex-1 bg-card rounded-2xl p-4 border border-border">
              <Text className="text-2xl text-center font-bold text-blue-600 mb-1">
                {statsLoading ? '...' : statsData?.completed_bookings || 0}
              </Text>
              <Text className="text-muted-foreground text-center text-xs">Clients</Text>
            </View>
          </View>
        </View>

        {/* Menu Sections */}
        <View className="px-6 gap-6">
          {/* Business Management Section */}
          <View>
            <Text className="text-lg font-bold text-foreground mb-4">Business Management</Text>
            <FlashList
              data={businessManagementMenu}
              renderItem={({ item }) => <MenuItem item={item} />}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              ItemSeparatorComponent={() => <View className="h-2" />}
            />
          </View>

          {/* Customer Relations Section */}
          <View>
            <Text className="text-lg font-bold text-foreground mb-4">Customer Relations</Text>
            <FlashList
              data={customerRelationsMenu}
              renderItem={({ item }) => <MenuItem item={item} />}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              ItemSeparatorComponent={() => <View className="h-2" />}
            />
          </View>

          {/* Account Settings Section */}
          <View>
            <Text className="text-lg font-bold text-foreground mb-4">Account Settings</Text>
            <FlashList
              data={accountSettingsMenu}
              renderItem={({ item }) => <MenuItem item={item} />}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              ItemSeparatorComponent={() => <View className="h-2" />}
            />
          </View>

          {/* Support & Resources Section */}
          <View>
            <Text className="text-lg font-bold text-foreground mb-4">Support & Resources</Text>
            <View className="gap-2">
              <FlashList
                data={supportResourcesMenu}
                renderItem={({ item }) => <MenuItem item={item} />}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                ItemSeparatorComponent={() => <View className="h-2" />}
              />

              {/* Theme Toggle */}
              <View className="bg-card rounded-xl p-4 shadow-sm border border-border">
                <ThemeToggle />
              </View>
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

      {/* Modals */}
      <PersonalInfoModal
        visible={personalInfoModalVisible}
        onClose={closePersonalInfoModal}
        profileData={profileData}
      />

      <NotificationSettingsModal
        visible={notificationModalVisible}
        onClose={closeNotificationModal}
        settings={notificationSettings}
        userId={user?.id || ''}
      />

      <BookingHistoryModal
        visible={bookingHistoryModalVisible}
        onClose={closeBookingHistoryModal}
        bookings={bookingsData}
        isLoading={bookingsLoading}
      />

      <StripeIntegrationModal
        visible={stripeIntegrationModalVisible}
        onClose={closeStripeIntegrationModal}
      />

      <ServicesModal
        visible={servicesModalVisible}
        onClose={closeServicesModal}
      />
    </SafeAreaView>
  );
});
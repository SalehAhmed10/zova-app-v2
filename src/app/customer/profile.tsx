import React from 'react';
import { View, ScrollView, Platform, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { LogoutButton } from '@/components/ui/logout-button';
import { useAppStore } from '@/stores/app';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/ThemeToggle';
import { 
  useProfile, 
  useProfileStats, 
  useUserBookings,
  useNotificationSettings 
} from '@/hooks/useProfileData';

// Import modals
import { PersonalInfoModal } from '@/components/profile/PersonalInfoModal';
import { NotificationSettingsModal } from '@/components/profile/NotificationSettingsModal';
import { BookingHistoryModal } from '@/components/profile/BookingHistoryModal';

export default function ProfileScreen() {
  const { userRole } = useAppStore();
  const { user } = useAuth();
  
  // Data fetching hooks with user ID
  const { data: profileData, isLoading: profileLoading, error: profileError, refetch: refetchProfile } = useProfile(user?.id);
  const { data: statsData, isLoading: statsLoading } = useProfileStats(user?.id);
  const { data: bookingsData, isLoading: bookingsLoading } = useUserBookings(user?.id);
  const { data: notificationSettings } = useNotificationSettings(user?.id);

  // Modal states
  const [personalInfoModalVisible, setPersonalInfoModalVisible] = React.useState(false);
  const [notificationModalVisible, setNotificationModalVisible] = React.useState(false);
  const [bookingHistoryModalVisible, setBookingHistoryModalVisible] = React.useState(false);

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

  // Loading state (wait for user and profile data)
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
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
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
              <Text className="text-3xl text-center font-bold text-orange-500 mb-1">5</Text>
              <Text className="text-muted-foreground text-center text-xs">Favorites</Text>
            </View>
          </View>
        </View>

        {/* Menu Sections */}
        <View className="px-6 gap-6">
          {/* Account Settings Section */}
          <View>
            <Text className="text-lg font-bold text-foreground mb-4">Account Settings</Text>
            <View className="gap-2">
              <TouchableOpacity 
                className="bg-white dark:bg-card rounded-xl p-4 shadow-sm"
                onPress={() => setPersonalInfoModalVisible(true)}
              >
                <View className="flex-row items-center">
                  <View className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl items-center justify-center mr-4">
                    <Text className="text-xl">👤</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="font-semibold text-foreground">Personal Information</Text>
                    <Text className="text-muted-foreground text-sm">Update your details</Text>
                  </View>
                  <Text className="text-muted-foreground text-lg">›</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity 
                className="bg-white dark:bg-card rounded-xl p-4 shadow-sm"
                onPress={() => setNotificationModalVisible(true)}
              >
                <View className="flex-row items-center">
                  <View className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-xl items-center justify-center mr-4">
                    <Text className="text-xl">⚙️</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="font-semibold text-foreground">Preferences</Text>
                    <Text className="text-muted-foreground text-sm">App settings & privacy</Text>
                  </View>
                  <Text className="text-muted-foreground text-lg">›</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* Activity Section */}
          <View>
            <Text className="text-lg font-bold text-foreground mb-4">Activity</Text>
            <View className="gap-2">
              <TouchableOpacity className="bg-white dark:bg-card rounded-xl p-4 shadow-sm">
                <View className="flex-row items-center">
                  <View className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-xl items-center justify-center mr-4">
                    <Text className="text-xl">❤️</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="font-semibold text-foreground">Favorites</Text>
                    <Text className="text-muted-foreground text-sm">5 saved providers</Text>
                  </View>
                  <Text className="text-muted-foreground text-lg">›</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity className="bg-white dark:bg-card rounded-xl p-4 shadow-sm">
                <View className="flex-row items-center">
                  <View className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl items-center justify-center mr-4">
                    <Text className="text-xl">⭐</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="font-semibold text-foreground">Reviews</Text>
                    <Text className="text-muted-foreground text-sm">Rate your experiences</Text>
                  </View>
                  <Text className="text-muted-foreground text-lg">›</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity 
                className="bg-white dark:bg-card rounded-xl p-4 shadow-sm"
                onPress={() => setBookingHistoryModalVisible(true)}
              >
                <View className="flex-row items-center">
                  <View className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-xl items-center justify-center mr-4">
                    <Text className="text-xl">📅</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="font-semibold text-foreground">Booking History</Text>
                    <Text className="text-muted-foreground text-sm">View your past appointments</Text>
                  </View>
                  <Text className="text-muted-foreground text-lg">›</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* More Section */}
          <View>
            <Text className="text-lg font-bold text-foreground mb-4">More</Text>
            <View className="gap-2">
              <TouchableOpacity className="bg-white dark:bg-card rounded-xl p-4 shadow-sm">
                <View className="flex-row items-center">
                  <View className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl items-center justify-center mr-4">
                    <Text className="text-xl">📍</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="font-semibold text-foreground">Addresses</Text>
                    <Text className="text-muted-foreground text-sm">2 saved locations</Text>
                  </View>
                  <Text className="text-muted-foreground text-lg">›</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity className="bg-white dark:bg-card rounded-xl p-4 shadow-sm">
                <View className="flex-row items-center">
                  <View className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-xl items-center justify-center mr-4">
                    <Text className="text-xl">🔔</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="font-semibold text-foreground">Notifications</Text>
                    <Text className="text-muted-foreground text-sm">Manage alerts</Text>
                  </View>
                  <Text className="text-muted-foreground text-lg">›</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity className="bg-white dark:bg-card rounded-xl p-4 shadow-sm">
                <View className="flex-row items-center">
                  <View className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-xl items-center justify-center mr-4">
                    <Text className="text-xl">�</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="font-semibold text-foreground">Payment Methods</Text>
                    <Text className="text-muted-foreground text-sm">Visa •••• 4567</Text>
                  </View>
                  <Text className="text-muted-foreground text-lg">›</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity className="bg-white dark:bg-card rounded-xl p-4 shadow-sm">
                <View className="flex-row items-center">
                  <View className="w-10 h-10 bg-cyan-100 dark:bg-cyan-900/30 rounded-xl items-center justify-center mr-4">
                    <Text className="text-xl">❓</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="font-semibold text-foreground">Help & Support</Text>
                    <Text className="text-muted-foreground text-sm">Get assistance</Text>
                  </View>
                  <Text className="text-muted-foreground text-lg">›</Text>
                </View>
              </TouchableOpacity>

              {/* Theme Toggle */}
              <View className="bg-white dark:bg-card rounded-xl p-4 shadow-sm">
           
             
                  <ThemeToggle />
                  </View>
            </View>
          </View>

          {/* App Version & Footer */}
          <View className="items-center py-6">
            <Text className="text-muted-foreground text-sm mb-2">ZOVA - Version 1.0.0</Text>
            <Text className="text-muted-foreground text-xs text-center">
              Made with ❤️ for connecting you with amazing service providers
            </Text>
          </View>

          {/* Logout Button */}
          <View className="mb-8">
            <LinearGradient
              colors={['#ff6b6b', '#ee5a52']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ borderRadius: 12, padding: 1 }}
            >
              <TouchableOpacity className="bg-white dark:bg-background rounded-xl p-4">
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
        onClose={() => setPersonalInfoModalVisible(false)}
        profileData={profileData}
      />
      
      <NotificationSettingsModal
        visible={notificationModalVisible}
        onClose={() => setNotificationModalVisible(false)}
        settings={notificationSettings}
        userId={user?.id || ''}
      />
      
      <BookingHistoryModal
        visible={bookingHistoryModalVisible}
        onClose={() => setBookingHistoryModalVisible(false)}
        bookings={bookingsData}
        isLoading={bookingsLoading}
      />
    </SafeAreaView>
  );
}
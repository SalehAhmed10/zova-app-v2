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

// Business stats item
const BusinessStat = ({ 
  label, 
  value, 
  icon,
  trend,
  trendValue,
  isLoading = false
}: { 
  label: string; 
  value: string; 
  icon: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  isLoading?: boolean;
}) => (
  <View className="items-center flex-1 py-4">
    <Text className="text-2xl mb-1">{icon}</Text>
    {isLoading ? (
      <Skeleton className="w-8 h-6 mb-1" />
    ) : (
      <Text variant="h3" className="text-foreground font-bold mb-1">
        {value}
      </Text>
    )}
    <Text variant="small" className="text-muted-foreground text-center mb-1">
      {label}
    </Text>
    {trend && trendValue && !isLoading && (
      <View className="flex-row items-center">
        <Text className={cn(
          'text-xs font-medium',
          trend === 'up' && 'text-chart-2',
          trend === 'down' && 'text-destructive',
          trend === 'neutral' && 'text-muted-foreground'
        )}>
          {trend === 'up' ? '↗' : trend === 'down' ? '↘' : '→'} {trendValue}
        </Text>
      </View>
    )}
  </View>
);

// Provider menu item
const ProviderMenuItem = ({ 
  title, 
  subtitle, 
  icon, 
  onPress,
  showArrow = true,
  badge 
}: { 
  title: string; 
  subtitle?: string; 
  icon: string; 
  onPress?: () => void;
  showArrow?: boolean;
  badge?: string;
}) => (
  <TouchableOpacity
    className="w-full justify-start px-4 py-4 h-auto"
    onPress={onPress}
  >
    <View className="flex-row items-center w-full">
      <View className="w-10 h-10 bg-primary/10 rounded-xl items-center justify-center mr-4">
        <Text className="text-lg">{icon}</Text>
      </View>
      <View className="flex-1">
        <View className="flex-row items-center gap-2">
          <Text variant="p" className="text-foreground font-semibold text-left">
            {title}
          </Text>
          {badge && (
            <View className="bg-primary/10 px-2 py-0.5 rounded-full">
              <Text variant="small" className="text-primary font-medium text-xs">
                {badge}
              </Text>
            </View>
          )}
        </View>
        {subtitle && (
          <Text variant="small" className="text-muted-foreground text-left">
            {subtitle}
          </Text>
        )}
      </View>
      {showArrow && (
        <Text className="text-muted-foreground text-lg">›</Text>
      )}
    </View>
  </TouchableOpacity>
);

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
    return profileData?.email?.split('@')[0] || 'Provider';
  };

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
          colors={['#4f46e5', '#7c3aed']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 32 }}
        >
          <View className="items-center">
            {/* Profile Picture */}
            <View className="mb-6">
              <Avatar className="w-32 h-32 border-4 border-white shadow-2xl" alt="Provider avatar">
                {profileData?.avatar_url ? (
                  <AvatarImage source={{ uri: profileData.avatar_url }} />
                ) : null}
                <AvatarFallback className="bg-muted/50">
                  <Text className="text-4xl text-foreground font-bold">
                    {profileData?.first_name?.[0]?.toUpperCase() || 
                     profileData?.email?.[0]?.toUpperCase() || '💼'}
                  </Text>
                </AvatarFallback>
              </Avatar>
            </View>
            
            {/* Provider Info */}
            <Text className="text-2xl font-bold text-white mb-1">
              {getDisplayName()}
            </Text>
            <Text className="text-white/80 mb-2">
              {profileData?.bio || 'Professional Service Provider'}
            </Text>
            
            {/* Business Badge */}
            <View className="bg-muted/30 px-4 py-2 rounded-full">
              <Text className="text-foreground font-medium">
                {userRole === 'provider' ? 'Service Provider' : 'Business Account'}
              </Text>
            </View>
          </View>
        </LinearGradient>

        {/* Business Stats Cards */}
        <View className="px-4 -mt-4 mb-6">
          <Card>
            <CardContent className="p-0">
              <View className="flex-row">
                <BusinessStat 
                  icon="💰" 
                  value={statsLoading ? '-' : `$${(statsData?.total_bookings * 68 || 3200).toLocaleString()}`}
                  label="This Month"
                  trend="up"
                  trendValue="+12%"
                  isLoading={statsLoading}
                />
                <View className="w-px bg-border" />
                <BusinessStat 
                  icon="⭐" 
                  value={statsLoading ? '-' : (statsData?.avg_rating || 4.9).toFixed(1)}
                  label="Rating"
                  trend="up"
                  trendValue="+0.1"
                  isLoading={statsLoading}
                />
                <View className="w-px bg-border" />
                <BusinessStat 
                  icon="👥" 
                  value={statsLoading ? '-' : (statsData?.total_bookings || 48).toString()}
                  label="Clients"
                  trend="up"
                  trendValue="+8"
                  isLoading={statsLoading}
                />
              </View>
            </CardContent>
          </Card>
        </View>

        {/* Menu Sections */}
        <View className="px-4 gap-6">
          {/* Business Management Section */}
          <View>
            <Text className="text-lg font-bold text-foreground mb-4">Business Management</Text>
            <View className="gap-2">
              <TouchableOpacity className="bg-card rounded-xl p-4 shadow-sm border border-border">
                <ProviderMenuItem 
                  icon="📅" 
                  title="Calendar & Bookings" 
                  subtitle="Manage your schedule and appointments"
                  badge="3 today"
                  showArrow={false}
                />
              </TouchableOpacity>

              <TouchableOpacity className="bg-card rounded-xl p-4 shadow-sm border border-border">
                <ProviderMenuItem 
                  icon="⚙️" 
                  title="Services & Pricing" 
                  subtitle="Update your service offerings"
                  showArrow={false}
                />
              </TouchableOpacity>

              <TouchableOpacity className="bg-card rounded-xl p-4 shadow-sm border border-border">
                <ProviderMenuItem 
                  icon="💳" 
                  title="Earnings & Payouts" 
                  subtitle="Track income and payment history"
                  badge="$248 pending"
                  showArrow={false}
                />
              </TouchableOpacity>

              <TouchableOpacity className="bg-card rounded-xl p-4 shadow-sm border border-border">
                <ProviderMenuItem 
                  icon="📊" 
                  title="Analytics" 
                  subtitle="View detailed business insights"
                  showArrow={false}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Customer Relations Section */}
          <View>
            <Text className="text-lg font-bold text-foreground mb-4">Customer Relations</Text>
            <View className="gap-2">
              <TouchableOpacity className="bg-card rounded-xl p-4 shadow-sm border border-border">
                <ProviderMenuItem 
                  icon="⭐" 
                  title="Reviews & Ratings" 
                  subtitle="Manage customer feedback"
                  badge="2 new"
                  showArrow={false}
                />
              </TouchableOpacity>

              <TouchableOpacity className="bg-card rounded-xl p-4 shadow-sm border border-border">
                <ProviderMenuItem 
                  icon="💬" 
                  title="Messages" 
                  subtitle="Communicate with clients"
                  showArrow={false}
                />
              </TouchableOpacity>

              <TouchableOpacity className="bg-card rounded-xl p-4 shadow-sm border border-border">
                <ProviderMenuItem 
                  icon="🎯" 
                  title="Marketing Tools" 
                  subtitle="Promote your services"
                  showArrow={false}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Account Settings Section */}
          <View>
            <Text className="text-lg font-bold text-foreground mb-4">Account Settings</Text>
            <View className="gap-2">
              <TouchableOpacity 
                className="bg-card rounded-xl p-4 shadow-sm border border-border"
                onPress={() => setPersonalInfoModalVisible(true)}
              >
                <ProviderMenuItem 
                  icon="👤" 
                  title="Business Profile" 
                  subtitle="Update your business information"
                  showArrow={false}
                />
              </TouchableOpacity>

              <TouchableOpacity className="bg-card rounded-xl p-4 shadow-sm border border-border">
                <ProviderMenuItem 
                  icon="🏪" 
                  title="Business Hours" 
                  subtitle="Set your availability"
                  showArrow={false}
                />
              </TouchableOpacity>

              <TouchableOpacity 
                className="bg-card rounded-xl p-4 shadow-sm border border-border"
                onPress={() => setNotificationModalVisible(true)}
              >
                <ProviderMenuItem 
                  icon="🔔" 
                  title="Notifications" 
                  subtitle="Customize business alerts"
                  showArrow={false}
                />
              </TouchableOpacity>

              <TouchableOpacity className="bg-card rounded-xl p-4 shadow-sm border border-border">
                <ProviderMenuItem 
                  icon="🔒" 
                  title="Privacy & Security" 
                  subtitle="Manage account security"
                  showArrow={false}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Support & Resources Section */}
          <View>
            <Text className="text-lg font-bold text-foreground mb-4">Support & Resources</Text>
            <View className="gap-2">
              <TouchableOpacity className="bg-card rounded-xl p-4 shadow-sm border border-border">
                <ProviderMenuItem 
                  icon="📚" 
                  title="Provider Resources" 
                  subtitle="Tips and best practices"
                  showArrow={false}
                />
              </TouchableOpacity>

              <TouchableOpacity className="bg-card rounded-xl p-4 shadow-sm border border-border">
                <ProviderMenuItem 
                  icon="❓" 
                  title="Help Center" 
                  subtitle="Find answers to your questions"
                  showArrow={false}
                />
              </TouchableOpacity>

              <TouchableOpacity className="bg-card rounded-xl p-4 shadow-sm border border-border">
                <ProviderMenuItem 
                  icon="💬" 
                  title="Contact Support" 
                  subtitle="Get help from our business team"
                  showArrow={false}
                />
              </TouchableOpacity>

              <TouchableOpacity 
                className="bg-card rounded-xl p-4 shadow-sm border border-border"
                onPress={() => setBookingHistoryModalVisible(true)}
              >
                <ProviderMenuItem 
                  icon="📱" 
                  title="Business History" 
                  subtitle="View your service history"
                  showArrow={false}
                />
              </TouchableOpacity>

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
              colors={['#ff6b6b', '#ee5a52']}
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
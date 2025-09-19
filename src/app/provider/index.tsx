import React from 'react';
import { View, ScrollView, Platform, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import {
  useProfile,
  useProfileStats,
  useUserBookings
} from '@/hooks/useProfileData';

// Today's Stats Component  
const TodaysStat = ({
  label,
  value,
  icon,
  trend,
  isLoading = false
}: {
  label: string;
  value: string;
  icon: string;
  trend?: 'up' | 'down' | 'neutral';
  isLoading?: boolean;
}) => (
  <View className="flex-1 bg-accent/50 rounded-2xl p-5 min-w-[110px]">
    <View className="items-center">
      <Text className="text-xl mb-2">{icon}</Text>
      {isLoading ? (
        <Skeleton className="w-12 h-7 mb-2" />
      ) : (
        <Text className="text-2xl font-bold text-foreground mb-2">
          {value}
        </Text>
      )}
      <Text className="text-muted-foreground text-xs text-center leading-4">
        {label}
      </Text>
      {trend && !isLoading && (
        <Text className={cn(
          'text-xs font-medium mt-1',
          trend === 'up' && 'text-muted-foreground',
          trend === 'down' && 'text-destructive',
          trend === 'neutral' && 'text-muted-foreground'
        )}>
          {trend === 'up' ? '↗' : trend === 'down' ? '↘' : '→'}
        </Text>
      )}
    </View>
  </View>
);

export default function ProviderDashboard() {
  const { user } = useAuth();
  const { data: profileData, isLoading: profileLoading } = useProfile(user?.id);
  const { data: statsData, isLoading: statsLoading } = useProfileStats(user?.id);
  const { data: bookingsData, isLoading: bookingsLoading } = useUserBookings(user?.id);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const getDisplayName = () => {
    if (profileData?.first_name || profileData?.last_name) {
      return `${profileData.first_name || ''} ${profileData.last_name || ''}`.trim();
    }
    return profileData?.email?.split('@')[0] || 'Provider';
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView className="flex-1">
        {/* Header with Gradient */}
        <LinearGradient
          colors={['#EC6751', '#F4A261']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 24 }}
        >
          <View className="flex-row items-center justify-between mb-6">
            <View className="flex-1">
              <Text className="text-white/80 text-sm mb-1">
                {getGreeting()} 👋
              </Text>
              {profileLoading ? (
                <View className="bg-muted/30 rounded p-1">
                  <Skeleton className="w-32 h-6" />
                </View>
              ) : (
                <Text className="text-white text-xl font-bold">
                  {getDisplayName()}
                </Text>
              )}
              <Text className="text-white/70 text-sm mt-1">
                Ready to serve your clients today?
              </Text>
            </View>

            {/* Profile Avatar */}
            <View>
              <Avatar className="w-16 h-16 border-2 border-white/30" alt="Provider avatar">
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
          </View>

          {/* Business Status Badge */}
          <View className="bg-muted/30 px-4 py-2 rounded-full self-start">
            <Text className="text-foreground font-medium text-sm">
              🟢 Available for bookings
            </Text>
          </View>
        </LinearGradient>

        {/* Today's Overview */}
        <View className="px-4 -mt-4 mb-6">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-foreground">Today's Overview</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View className="flex-row gap-3">
                  <TodaysStat
                    icon="📅"
                    value={bookingsLoading ? '-' : '3'}
                    label="Appointments"
                    trend="up"
                    isLoading={bookingsLoading}
                  />
                  <TodaysStat
                    icon="💰"
                    value={statsLoading ? '-' : '$420'}
                    label="Expected"
                    trend="up"
                    isLoading={statsLoading}
                  />
                  <TodaysStat
                    icon="⭐"
                    value={statsLoading ? '-' : (statsData?.avg_rating || 4.9).toFixed(1)}
                    label="Rating"
                    trend="neutral"
                    isLoading={statsLoading}
                  />
                </View>
              </ScrollView>
            </CardContent>
          </Card>
        </View>

        {/* Quick Actions */}
        <View className="px-4 mb-6">
          <Text className="text-lg font-bold text-foreground mb-4">Quick Actions</Text>
          <View className="gap-3">
            <View className="flex-row gap-3">
              <TouchableOpacity className="flex-1" onPress={() => router.push('/provider/calendar')}>
                <Card className='bg-card'>
                  <CardContent className=" p-4 items-center">
                    <Text className="text-xl mb-2">📅</Text>
                    <Text className="font-semibold text-foreground text-center text-xs">
                      View Calendar
                    </Text>
                    <Text className="text-muted-foreground text-xs text-center mt-1">
                      Today's schedule
                    </Text>
                  </CardContent>
                </Card>
              </TouchableOpacity>
              
              <TouchableOpacity className="flex-1" onPress={() => router.push('/provider/services')}>
                <Card className='bg-card'>
                  <CardContent className=" p-4 items-center">
                    <Text className="text-xl mb-2">➕</Text>
                    <Text className="font-semibold text-foreground text-center text-xs">
                      New Service
                    </Text>
                    <Text className="text-muted-foreground text-xs text-center mt-1">
                      Add offering
                    </Text>
                  </CardContent>
                </Card>
              </TouchableOpacity>
            </View>
            
            <View className="flex-row gap-3">
              <TouchableOpacity className="flex-1">
                <Card className='bg-card'>
                  <CardContent className=" p-4 items-center">
                    <Text className="text-xl mb-2">💬</Text>
                    <Text className="font-semibold text-foreground text-center text-xs">
                      Messages
                    </Text>
                    <Text className="text-muted-foreground text-xs text-center mt-1">
                      2 unread
                    </Text>
                  </CardContent>
                </Card>
              </TouchableOpacity>
              
              <TouchableOpacity className="flex-1" onPress={() => router.push('/provider/earnings')}>
                <Card className='bg-card'>
                  <CardContent className=" p-4 items-center">
                    <Text className="text-xl mb-2">📊</Text>
                    <Text className="font-semibold text-foreground text-center text-xs">
                      Analytics
                    </Text>
                    <Text className="text-muted-foreground text-xs text-center mt-1">
                      View insights
                    </Text>
                  </CardContent>
                </Card>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Recent Activity */}
        <View className="px-4 mb-6">
          <Text className="text-lg font-bold text-foreground mb-4">Recent Activity</Text>
          <Card>
            <CardContent className="p-4">
              <View className="gap-4">
                <View className="flex-row items-center">
                  <View className="w-10 h-10 bg-accent/50 rounded-full items-center justify-center mr-3">
                    <Text className="text-lg">✅</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="font-semibold text-foreground">Service completed</Text>
                    <Text className="text-muted-foreground text-sm">Hair styling for Sarah M. • 2h ago</Text>
                  </View>
                  <Text className="text-primary font-bold">+$85</Text>
                </View>

                <View className="flex-row items-center">
                  <View className="w-10 h-10 bg-primary/10 rounded-full items-center justify-center mr-3">
                    <Text className="text-lg">📅</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="font-semibold text-foreground">New booking</Text>
                    <Text className="text-muted-foreground text-sm">Makeup session • Tomorrow 2:00 PM</Text>
                  </View>
                  <Text className="text-primary font-bold">$120</Text>
                </View>

                <View className="flex-row items-center">
                  <View className="w-10 h-10 bg-accent/50 rounded-full items-center justify-center mr-3">
                    <Text className="text-lg">⭐</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="font-semibold text-foreground">New review</Text>
                    <Text className="text-muted-foreground text-sm">5 stars from Michael T. • 1h ago</Text>
                  </View>
                  <Text className="text-primary font-bold">⭐ 5.0</Text>
                </View>
              </View>
            </CardContent>
          </Card>
        </View>

        {/* Business Insights */}
        <View className="px-4 mb-6">
          <Text className="text-lg font-bold text-foreground mb-4">This Week</Text>
          <Card>
            <CardContent className="p-4">
              <View className="flex-row justify-between items-center mb-4">
                <View>
                  <Text className="text-2xl font-bold text-foreground">
                    {statsLoading ? '-' : (statsData?.total_bookings || 12)}
                  </Text>
                  <Text className="text-muted-foreground text-sm">Total bookings</Text>
                </View>
                <View>
                  <Text className="text-2xl font-bold  text-foreground">
                    {statsLoading ? '-' : '$1,240'}
                  </Text>
                  <Text className="text-muted-foreground text-sm">Revenue</Text>
                </View>
                <View>
                  <Text className="text-2xl font-bold text-foreground">
                    {statsLoading ? '-' : (statsData?.completed_bookings || 10)}
                  </Text>
                  <Text className="text-muted-foreground text-sm">Completed</Text>
                </View>
              </View>

              <View className="bg-accent/30 rounded-lg p-3">
                <Text className="text-sm text-muted-foreground">
                  📈 Revenue up 15% from last week
                </Text>
              </View>
            </CardContent>
          </Card>
        </View>

        {/* Service Management */}
        <View className="px-4 mb-6">
          <Text className="text-lg font-bold text-foreground mb-4">Service Management</Text>
          <Card>
            <CardContent className="p-4">
              <View className="gap-4">
                <TouchableOpacity className="flex-row items-center" onPress={() => router.push('/provider/services')}>
                  <View className="w-10 h-10 bg-primary/10 rounded-full items-center justify-center mr-3">
                    <Text className="text-lg">✏️</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="font-semibold text-foreground">Update Services</Text>
                    <Text className="text-muted-foreground text-sm">Manage pricing and descriptions</Text>
                  </View>
                  <Text className="text-muted-foreground">→</Text>
                </TouchableOpacity>

                <TouchableOpacity className="flex-row items-center" onPress={() => router.push('/provider/services')}>
                  <View className="w-10 h-10 bg-accent/50 rounded-full items-center justify-center mr-3">
                    <Text className="text-lg">📋</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="font-semibold text-foreground">Service Templates</Text>
                    <Text className="text-muted-foreground text-sm">Pre-built service packages</Text>
                  </View>
                  <Text className="text-muted-foreground">→</Text>
                </TouchableOpacity>

                <TouchableOpacity className="flex-row items-center" onPress={() => router.push('/provider/calendar')}>
                  <View className="w-10 h-10 bg-secondary/20 rounded-full items-center justify-center mr-3">
                    <Text className="text-lg">🕒</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="font-semibold text-foreground">Availability Settings</Text>
                    <Text className="text-muted-foreground text-sm">Set working hours and breaks</Text>
                  </View>
                  <Text className="text-muted-foreground">→</Text>
                </TouchableOpacity>
              </View>
            </CardContent>
          </Card>
        </View>

        {/* Next Appointment */}
        <View className="px-4 mb-6">
          <Text className="text-lg font-bold text-foreground mb-4">Next Appointment</Text>
          <Card>
            <CardContent className="p-4">
              <View className="flex-row items-center gap-3 mb-4">
                <Avatar className="w-14 h-14" alt="Client avatar">
                  <AvatarFallback className="bg-primary/10">
                    <Text className="text-lg font-bold text-primary">JD</Text>
                  </AvatarFallback>
                </Avatar>
                <View className="flex-1">
                  <Text className="font-semibold text-foreground text-base">Jane Doe</Text>
                  <Text className="text-muted-foreground text-sm mt-1">Haircut & Styling</Text>
                  <View className="flex-row items-center gap-2 mt-1">
                    <Text className="text-xs">📅</Text>
                    <Text className="text-muted-foreground text-xs">Tomorrow • 10:00 AM</Text>
                  </View>
                </View>
                <View className="items-center">
                  <Text className="text-primary font-bold text-lg">$85</Text>
                  <Text className="text-muted-foreground text-xs">1.5hr</Text>
                </View>
              </View>
              
              <View className="bg-accent/20 rounded-lg p-3 mb-4">
                <Text className="text-muted-foreground text-xs">
                  📍 Location: 123 Beauty Street, Downtown
                </Text>
              </View>
              
              <View className="gap-3">
                {/* Primary Action - Start Service */}
                <TouchableOpacity>
                  <View className="bg-primary rounded-lg py-4 items-center">
                    <Text className="text-primary-foreground font-bold text-sm">Start Service</Text>
                  </View>
                </TouchableOpacity>
                
                {/* Secondary Actions */}
                <View className="flex-row gap-3">
                  <TouchableOpacity className="flex-1">
                    <View className="bg-secondary/10 border border-secondary/20 rounded-lg py-3 items-center">
                      <Text className="text-muted-foreground font-medium text-xs">Reschedule</Text>
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity className="flex-1">
                    <View className="bg-secondary/10 border border-secondary/20 rounded-lg py-3 items-center">
                      <Text className="text-muted-foreground font-medium text-xs">Contact Client</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </View>
            </CardContent>
          </Card>
        </View>

        {/* Bottom spacing for tab bar */}
        <View className={cn("h-6", Platform.OS === 'ios' && "h-24")} />
      </ScrollView>
    </SafeAreaView>
  );
}

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
import { useAuthOptimized } from '@/hooks';
import {
  useProfile,
  useProfileStats,
  useUserBookings
} from '@/hooks/shared/useProfileData';
import { useTrustedProviders } from '@/hooks/customer';
import { 
  useActiveSubscription,
  hasActiveSubscription,
  useUserSubscriptions 
} from '@/hooks/shared/useSubscription';
import { cn } from '@/lib/utils';

import { useColorScheme } from '@/lib/core/useColorScheme';
import { THEME } from '@/lib/core/theme';

// Today's Stats Component
const TodaysStat = React.memo(({
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
  <View className="flex-1 bg-accent/50 rounded-2xl p-5 min-w-[110px]" accessibilityLabel={`${label}: ${value}`}>
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
));

export default function CustomerDashboard() {
  // ✅ MIGRATED: Using optimized auth hook following copilot-rules.md
  const { user } = useAuthOptimized();
  const { data: profileData, isLoading: profileLoading } = useProfile(user?.id);
  const { data: statsData, isLoading: statsLoading } = useProfileStats(user?.id, 'customer');
  const { data: bookingsData, isLoading: bookingsLoading } = useUserBookings(user?.id);
  const { data: trustedProviders, isLoading: providersLoading } = useTrustedProviders(5);
  const { isDarkColorScheme } = useColorScheme();
  
  // Subscription data
  const { data: allSubscriptions } = useUserSubscriptions();
  const { data: customerSubscription } = useActiveSubscription('customer_sos');
  const hasSOSAccess = hasActiveSubscription(allSubscriptions, 'customer_sos');
  
  // Theme-aware colors
  const theme = isDarkColorScheme ? THEME.dark : THEME.light;

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
    return profileData?.email?.split('@')[0] || 'Customer';
  };

  // Get upcoming bookings for today
  const todaysBookings = React.useMemo(() => 
    bookingsData?.filter(booking =>
      booking.booking_date === new Date().toISOString().split('T')[0] &&
      ['pending', 'confirmed'].includes(booking.status)
    ) || [], [bookingsData]);

  // Get next upcoming booking
  const nextBooking = React.useMemo(() => 
    bookingsData?.find(booking =>
      new Date(booking.booking_date) >= new Date() &&
      ['pending', 'confirmed'].includes(booking.status)
    ), [bookingsData]);

  // Calculate real stats
  const realStats = React.useMemo(() => ({
    totalBookings: bookingsData?.length || 0,
    completedBookings: bookingsData?.filter(b => b.status === 'completed').length || 0,
    totalSpent: bookingsData?.reduce((sum, booking) => 
      sum + (booking.status === 'completed' ? parseFloat(booking.total_amount) : 0), 0
    ) || 0,
    thisMonthBookings: bookingsData?.filter(booking => {
      const bookingDate = new Date(booking.booking_date);
      const now = new Date();
      return bookingDate.getMonth() === now.getMonth() && 
             bookingDate.getFullYear() === now.getFullYear();
    }).length || 0,
    avgRating: statsData?.avg_rating || 0
  }), [bookingsData, statsData]);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView className="flex-1">
        {/* Header with Gradient */}
        <LinearGradient
          colors={[theme.gradientStart, theme.gradientEnd]}
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
                Ready to discover amazing services?
              </Text>
            </View>

            {/* Profile Avatar */}
            <View>
              <Avatar className="w-16 h-16 border-2 border-white/30" alt="Customer avatar">
                {profileData?.avatar_url ? (
                  <AvatarImage source={{ uri: profileData.avatar_url }} />
                ) : null}
                <AvatarFallback className="bg-muted/50">
                  <Text className="text-2xl text-foreground font-bold">
                    {profileData?.first_name?.[0]?.toUpperCase() ||
                      profileData?.email?.[0]?.toUpperCase() || '👤'}
                  </Text>
                </AvatarFallback>
              </Avatar>
            </View>
          </View>

          {/* Quick Status */}
          <View className="bg-muted/30 px-4 py-2 rounded-full self-start">
            <Text className="text-foreground font-medium text-sm">
              🔍 Exploring services nearby
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
                    value={bookingsLoading ? '-' : todaysBookings.length.toString()}
                    label="Today's Bookings"
                    trend="up"
                    isLoading={bookingsLoading}
                  />
                  <TodaysStat
                    icon="💰"
                    value={bookingsLoading ? '-' : `£${realStats.totalSpent.toFixed(0)}`}
                    label="Total Spent"
                    trend="up"
                    isLoading={bookingsLoading}
                  />
                  <TodaysStat
                    icon={hasSOSAccess ? "🚨" : "⭐"}
                    value={hasSOSAccess ? "Active" : realStats.avgRating.toFixed(1)}
                    label={hasSOSAccess ? "SOS Access" : "Your Rating"}
                    trend={hasSOSAccess ? "up" : "neutral"}
                    isLoading={bookingsLoading}
                  />
                </View>
              </ScrollView>
            </CardContent>
          </Card>
        </View>

        {/* Quick Actions */}
        <View className="px-4 mb-6">
          <Text className="text-lg font-bold text-foreground mb-4">Quick Actions</Text>
          <View>
            <View className="flex-row mb-3">
              <TouchableOpacity
                className="flex-1"
                onPress={() => router.push('/customer/search')}
                accessibilityLabel="Find services"
                accessibilityRole="button"
              >
                <Card className="bg-card">
                  <CardContent className="p-4 items-center">
                    <Text className="text-2xl mb-2">🔍</Text>
                    <Text className="font-semibold text-foreground text-center text-sm">
                      Find Services
                    </Text>
                    <Text className="text-muted-foreground text-xs text-center mt-1 leading-4">
                      Browse nearby
                    </Text>
                  </CardContent>
                </Card>
              </TouchableOpacity>

              <TouchableOpacity
                className="flex-1"
                onPress={() => router.push('/customer/search?mode=providers')}
                accessibilityLabel="Browse providers"
                accessibilityRole="button"
              >
                <Card className="bg-card">
                  <CardContent className="p-4 items-center">
                    <Text className="text-2xl mb-2">👥</Text>
                    <Text className="font-semibold text-foreground text-center text-sm">
                      Browse Providers
                    </Text>
                    <Text className="text-muted-foreground text-xs text-center mt-1 leading-4">
                      Find professionals
                    </Text>
                  </CardContent>
                </Card>
              </TouchableOpacity>
            </View>
            
            <View className="flex-row">
              <TouchableOpacity 
                className="flex-1" 
                onPress={() => hasSOSAccess ? router.push('/customer/sos-booking') : router.push('/customer/subscriptions')}
                accessibilityLabel={hasSOSAccess ? "Emergency SOS booking" : "Get SOS access"}
                accessibilityRole="button"
              >
                <Card className={`bg-card ${hasSOSAccess ? 'border-2 border-destructive/20 bg-destructive/5' : ''}`}>
                  <CardContent className="p-4 items-center">
                    <View className="flex-row items-center justify-center mb-2">
                      {hasSOSAccess ? (
                        <Text className="text-xl text-destructive">🛡️</Text>
                      ) : (
                        <Text className="text-xl">⚡</Text>
                      )}
                    </View>
                    <Text className="font-semibold text-foreground text-center text-sm">
                      {hasSOSAccess ? "SOS Booking" : "Get SOS Access"}
                    </Text>
                    <Text className="text-muted-foreground text-xs text-center mt-1 leading-4">
                      {hasSOSAccess ? "Emergency services" : "Premium feature"}
                    </Text>
                  </CardContent>
                </Card>
              </TouchableOpacity>

              <TouchableOpacity 
                className="flex-1" 
                onPress={() => router.push('/customer/subscriptions')}
                accessibilityLabel="Manage subscriptions"
                accessibilityRole="button"
              >
                <Card className='bg-card'>
                  <CardContent className="p-4 items-center">
                    <Text className="text-xl mb-2">⚡</Text>
                    <Text className="font-semibold text-foreground text-center text-sm">
                      Subscriptions
                    </Text>
                    <Text className="text-muted-foreground text-xs text-center mt-1 leading-4">
                      Manage plans
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
              <View>
                {bookingsLoading ? (
                  <>
                    <Skeleton className="h-16 w-full mb-4" />
                    <Skeleton className="h-16 w-full mb-4" />
                    <Skeleton className="h-16 w-full" />
                  </>
                ) : bookingsData?.slice(0, 3).map((booking) => (
                  <View key={booking.id} className="flex-row items-center mb-4 last:mb-0">
                    <View className="w-10 h-10 bg-accent/50 rounded-full items-center justify-center mr-3">
                      <Text className="text-lg">
                        {booking.status === 'completed' ? '✅' :
                         booking.status === 'confirmed' ? '📅' : '⏳'}
                      </Text>
                    </View>
                    <View className="flex-1">
                      <Text className="font-semibold text-foreground">{booking.service_title}</Text>
                      <Text className="text-muted-foreground text-sm">
                        {booking.provider_first_name} {booking.provider_last_name} • {booking.booking_date}
                      </Text>
                    </View>
                    <Text className="text-primary font-bold">£{booking.total_amount}</Text>
                  </View>
                )) || (
                  <View className="items-center py-8">
                    <Text className="text-muted-foreground text-center">No recent activity</Text>
                    <Text className="text-muted-foreground text-sm text-center mt-1">
                      Book your first service to get started!
                    </Text>
                  </View>
                )}
              </View>
            </CardContent>
          </Card>
        </View>

        {/* Weekly Insights */}
        <View className="px-4 mb-6">
          <Text className="text-lg font-bold text-foreground mb-4">This Week</Text>
          <Card>
            <CardContent className="p-4">
              <View className="flex-row justify-between items-center mb-4">
                <View>
                  <Text className="text-2xl font-bold text-foreground">
                    {bookingsLoading ? '-' : realStats.totalBookings}
                  </Text>
                  <Text className="text-muted-foreground text-sm">Total bookings</Text>
                </View>
                <View>
                  <Text className="text-2xl font-bold text-foreground">
                    {bookingsLoading ? '-' : `£${realStats.totalSpent.toFixed(0)}`}
                  </Text>
                  <Text className="text-muted-foreground text-sm">Total spent</Text>
                </View>
                <View>
                  <Text className="text-2xl font-bold text-foreground">
                    {bookingsLoading ? '-' : realStats.completedBookings}
                  </Text>
                  <Text className="text-muted-foreground text-sm">Completed</Text>
                </View>
              </View>

              <View className="bg-accent/30 rounded-lg p-3">
                <Text className="text-sm text-muted-foreground">
                  {hasSOSAccess ? 
                    "🛡️ SOS Emergency Access is active - book urgent services anytime" :
                    "💡 Upgrade to SOS Access for emergency booking priority"
                  }
                </Text>
              </View>
            </CardContent>
          </Card>
        </View>

        {/* Trusted Providers Near You */}
        <View className="px-4 mb-6">
          <Text className="text-lg font-bold text-foreground mb-4">Trusted Providers Near You</Text>
          <Card>
            <CardContent className="p-4">
              <View>
                {providersLoading ? (
                  <>
                    <Skeleton className="h-16 w-full mb-4" />
                    <Skeleton className="h-16 w-full mb-4" />
                    <Skeleton className="h-16 w-full" />
                  </>
                ) : trustedProviders?.length > 0 ? (
                  trustedProviders.map((provider) => (
                    <TouchableOpacity
                      key={provider.id}
                      className="flex-row items-center mb-4 last:mb-0"
                      onPress={() => router.push(`/customer/provider/${provider.id}`)}
                    >
                      <Avatar className="w-12 h-12 mr-3" alt={`${provider.first_name} ${provider.last_name} avatar`}>
                        {provider.avatar_url ? (
                          <AvatarImage source={{ uri: provider.avatar_url }} />
                        ) : null}
                        <AvatarFallback className="bg-primary/10">
                          <Text className="text-lg font-bold text-primary">
                            {provider.first_name?.[0] || '?'}{provider.last_name?.[0] || '?'}
                          </Text>
                        </AvatarFallback>
                      </Avatar>
                      <View className="flex-1">
                        <View className="flex-row items-center gap-2">
                          <Text className="font-semibold text-foreground">
                            {provider.first_name} {provider.last_name}
                          </Text>
                          {provider.is_verified && (
                            <View className="flex-row items-center">
                              <Text className="text-xs text-success">✓</Text>
                            </View>
                          )}
                          <View className="flex-row items-center">
                            <Text className="text-xs">⭐</Text>
                            <Text className="text-xs text-muted-foreground ml-1">
                              {provider.avg_rating?.toFixed(1) || 'New'}
                            </Text>
                          </View>
                        </View>
                        <Text className="text-muted-foreground text-sm">
                          {provider.featured_service?.title || 'Service Provider'}
                        </Text>
                        <View className="flex-row items-center mt-1">
                          {provider.city && (
                            <>
                              <Text className="text-xs">📍</Text>
                              <Text className="text-muted-foreground text-xs mr-2">{provider.city}</Text>
                            </>
                          )}
                          <Text className="text-xs">💼</Text>
                          <Text className="text-muted-foreground text-xs">
                            {provider.total_reviews || 0} reviews
                          </Text>
                        </View>
                      </View>
                      <Text className="text-muted-foreground">→</Text>
                    </TouchableOpacity>
                  ))
                ) : (
                  <View className="items-center py-8">
                    <Text className="text-muted-foreground text-center">No providers found nearby</Text>
                    <Text className="text-muted-foreground text-sm text-center mt-1">
                      Check back later for available providers in your area
                    </Text>
                  </View>
                )}
              </View>

              {/* View All Button */}
              <TouchableOpacity className="mt-4" onPress={() => router.push('/customer/search')}>
                <View className="bg-accent/30 rounded-lg py-3 items-center">
                  <Text className="text-muted-foreground font-medium text-sm">
                    View all nearby providers →
                  </Text>
                </View>
              </TouchableOpacity>
            </CardContent>
          </Card>
        </View>

        {/* Next Appointment */}
        {nextBooking && (
          <View className="px-4 mb-6">
            <Text className="text-lg font-bold text-foreground mb-4">Next Appointment</Text>
            <Card>
              <CardContent className="p-4">
                <View className="flex-row items-center gap-3 mb-4">
                    <Avatar className="w-14 h-14" alt="Provider avatar">
                      <AvatarFallback className="bg-primary/10">
                        <Text className="text-lg font-bold text-primary">
                          {nextBooking.provider_first_name?.[0] || '?'}{nextBooking.provider_last_name?.[0] || '?'}
                        </Text>
                      </AvatarFallback>
                    </Avatar>
                  <View className="flex-1">
                    <Text className="font-semibold text-foreground text-lg">{nextBooking.service_title}</Text>
                    <Text className="text-muted-foreground text-sm mt-1">
                      {nextBooking.provider_first_name} {nextBooking.provider_last_name}
                    </Text>
                    <View className="flex-row items-center gap-2 mt-1">
                      <Text className="text-xs">📅</Text>
                      <Text className="text-muted-foreground text-xs">
                        {new Date(nextBooking.booking_date).toLocaleDateString()} • {nextBooking.start_time}
                      </Text>
                    </View>
                  </View>
                  <View className="items-center">
                    <Text className="text-primary font-bold text-lg">£{nextBooking.total_amount}</Text>
                    <Text className="text-muted-foreground text-xs">{nextBooking.status}</Text>
                  </View>
                </View>

                <View className="bg-accent/20 rounded-lg p-3 mb-4">
                  <Text className="text-muted-foreground text-xs">
                    📍 Service location will be confirmed closer to the date
                  </Text>
                </View>

                <View className="gap-3">
                  <TouchableOpacity onPress={() => router.push(`/customer/booking/${nextBooking.id}` as any)}>
                    <View className="bg-primary rounded-lg py-4 items-center">
                      <Text className="text-primary-foreground font-bold text-sm">View Details</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </CardContent>
            </Card>
          </View>
        )}

        {/* Bottom spacing for tab bar */}
        <View className={cn("h-6", Platform.OS === 'ios' && "h-24")} />
      </ScrollView>
    </SafeAreaView>
  );
}

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
import { Ionicons } from '@expo/vector-icons';
import { Shield, Zap } from 'lucide-react-native';
import { useColorScheme } from '@/lib/core/useColorScheme';

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

export default function CustomerDashboard() {
  // ✅ MIGRATED: Using optimized auth hook following copilot-rules.md
  const { user } = useAuthOptimized();
  const { data: profileData, isLoading: profileLoading } = useProfile(user?.id);
  const { data: statsData, isLoading: statsLoading } = useProfileStats(user?.id);
  const { data: bookingsData, isLoading: bookingsLoading } = useUserBookings(user?.id);
  const { data: trustedProviders, isLoading: providersLoading } = useTrustedProviders(5);
  const { isDarkColorScheme } = useColorScheme();
  
  // Subscription data
  const { data: allSubscriptions } = useUserSubscriptions();
  const { data: customerSubscription } = useActiveSubscription('customer_sos');
  const hasSOSAccess = hasActiveSubscription(allSubscriptions, 'customer_sos');
  
  // Theme-aware colors
  const redColor = '#ef4444';

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
  const todaysBookings = bookingsData?.filter(booking =>
    booking.booking_date === new Date().toISOString().split('T')[0] &&
    ['pending', 'confirmed'].includes(booking.status)
  ) || [];

  // Get next upcoming booking
  const nextBooking = bookingsData?.find(booking =>
    new Date(booking.booking_date) >= new Date() &&
    ['pending', 'confirmed'].includes(booking.status)
  );

  // Calculate real stats
  const realStats = {
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
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView className="flex-1">
        {/* Header with Gradient */}
        <LinearGradient
          colors={['#667EEA', '#764BA2']}
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
                    value={bookingsLoading ? '-' : `$${realStats.totalSpent.toFixed(0)}`}
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
          <View className="gap-3">
            <View className="flex-row gap-3">
              <TouchableOpacity className="flex-1" onPress={() => router.push('/customer/search')}>
                <Card className='bg-card'>
                  <CardContent className=" p-4 items-center">
                    <Text className="text-xl mb-2">🔍</Text>
                    <Text className="font-semibold text-foreground text-center text-xs">
                      Find Services
                    </Text>
                    <Text className="text-muted-foreground text-xs text-center mt-1">
                      Browse nearby
                    </Text>
                  </CardContent>
                </Card>
              </TouchableOpacity>

              <TouchableOpacity className="flex-1" onPress={() => router.push('/providers')}>
                <Card className='bg-card'>
                  <CardContent className=" p-4 items-center">
                    <Text className="text-xl mb-2">👥</Text>
                    <Text className="font-semibold text-foreground text-center text-xs">
                      Browse Providers
                    </Text>
                    <Text className="text-muted-foreground text-xs text-center mt-1">
                      Find professionals
                    </Text>
                  </CardContent>
                </Card>
              </TouchableOpacity>
            </View>

            <View className="flex-row gap-3">
              <TouchableOpacity 
                className="flex-1" 
                onPress={() => hasSOSAccess ? router.push('/customer/sos-booking') : router.push('/customer/subscriptions')}
              >
                <Card className={`bg-card ${hasSOSAccess ? 'border-2 border-red-500/20 bg-red-50 dark:bg-red-950/20' : ''}`}>
                  <CardContent className="p-4 items-center">
                    <View className="flex-row items-center justify-center mb-2">
                      {hasSOSAccess ? (
                        <Shield size={18} color={redColor} />
                      ) : (
                        <Text className="text-xl">�</Text>
                      )}
                    </View>
                    <Text className="font-semibold text-foreground text-center text-xs">
                      {hasSOSAccess ? "SOS Booking" : "Get SOS Access"}
                    </Text>
                    <Text className="text-muted-foreground text-xs text-center mt-1">
                      {hasSOSAccess ? "Emergency services" : "Premium feature"}
                    </Text>
                  </CardContent>
                </Card>
              </TouchableOpacity>

              <TouchableOpacity className="flex-1" onPress={() => router.push('/customer/subscriptions')}>
                <Card className='bg-card'>
                  <CardContent className="p-4 items-center">
                    <Text className="text-xl mb-2">⚡</Text>
                    <Text className="font-semibold text-foreground text-center text-xs">
                      Subscriptions
                    </Text>
                    <Text className="text-muted-foreground text-xs text-center mt-1">
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
              <View className="gap-4">
                {bookingsLoading ? (
                  <>
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </>
                ) : bookingsData?.slice(0, 3).map((booking) => (
                  <View key={booking.id} className="flex-row items-center">
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
                    <Text className="text-primary font-bold">${booking.total_amount}</Text>
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
                    {bookingsLoading ? '-' : `$${realStats.totalSpent.toFixed(0)}`}
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
                    "� SOS Emergency Access is active - book urgent services anytime" :
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
              <View className="gap-4">
                {providersLoading ? (
                  <>
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </>
                ) : trustedProviders?.length > 0 ? (
                  trustedProviders.map((provider) => (
                    <TouchableOpacity
                      key={provider.id}
                      className="flex-row items-center"
                      onPress={() => router.push(`/profiles/provider?providerId=${provider.id}`)}
                    >
                      <Avatar className="w-12 h-12 mr-3" alt={`${provider.first_name} ${provider.last_name} avatar`}>
                        {provider.avatar_url ? (
                          <AvatarImage source={{ uri: provider.avatar_url }} />
                        ) : null}
                        <AvatarFallback className="bg-primary/10">
                          <Text className="text-lg font-bold text-primary">
                            {provider.first_name[0]}{provider.last_name[0]}
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
                              <Ionicons name="checkmark-circle" size={14} color="#10B981" />
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
                        <View className="flex-row items-center gap-2 mt-1">
                          {provider.city && (
                            <>
                              <Text className="text-xs">📍</Text>
                              <Text className="text-muted-foreground text-xs">{provider.city}</Text>
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
                        {nextBooking.provider_first_name[0]}{nextBooking.provider_last_name[0]}
                      </Text>
                    </AvatarFallback>
                  </Avatar>
                  <View className="flex-1">
                    <Text className="font-semibold text-foreground text-base">
                      {nextBooking.provider_first_name} {nextBooking.provider_last_name}
                    </Text>
                    <Text className="text-muted-foreground text-sm mt-1">{nextBooking.service_title}</Text>
                    <View className="flex-row items-center gap-2 mt-1">
                      <Text className="text-xs">📅</Text>
                      <Text className="text-muted-foreground text-xs">
                        {new Date(nextBooking.booking_date).toLocaleDateString()} • {nextBooking.start_time}
                      </Text>
                    </View>
                  </View>
                  <View className="items-center">
                    <Text className="text-primary font-bold text-lg">${nextBooking.total_amount}</Text>
                    <Text className="text-muted-foreground text-xs">{nextBooking.status}</Text>
                  </View>
                </View>

                <View className="bg-accent/20 rounded-lg p-3 mb-4">
                  <Text className="text-muted-foreground text-xs">
                    📍 Service location will be confirmed closer to the date
                  </Text>
                </View>

                <View className="gap-3">
                  {/* Primary Action - View Details */}
                  <TouchableOpacity onPress={() => router.push('/customer/bookings')}>
                    <View className="bg-primary rounded-lg py-4 items-center">
                      <Text className="text-primary-foreground font-bold text-sm">View Details</Text>
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
                        <Text className="text-muted-foreground font-medium text-xs">Contact Provider</Text>
                      </View>
                    </TouchableOpacity>
                  </View>
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

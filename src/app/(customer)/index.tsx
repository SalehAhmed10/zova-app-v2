/**
 * Customer Dashboard - Modern UI Design
 * 
 * Features:
 * - Clean header with user profile and status badges
 * - Activity stats cards with icons and visual hierarchy
 * - Quick action grid with proper theme colors
 * - Recent bookings with status indicators
 * - Progress insights with clear metrics
 * - Featured providers with ratings and verification
 * - Upcoming appointment preview
 * 
 * Design Principles:
 * - Uses theme colors exclusively (no hardcoded colors)
 * - Lucide icons for consistency
 * - Proper contrast and accessibility
 * - No gradients or shadows (NativeWind compatibility)
 * - Professional spacing and typography
 */

import React from 'react';
import { View, ScrollView, Platform, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Text } from '@/components/ui/text';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Icon } from '@/components/ui/icon';
import {
  useProfile,
  useProfileStats,
  useUserBookings
} from '@/hooks/shared/useProfileData';
import { useTrustedProviders } from '@/hooks/customer';
import { useAuthStore } from '@/stores/auth';
import { 
  useActiveSubscription,
  hasActiveSubscription,
  useUserSubscriptions 
} from '@/hooks/shared/useSubscription';
import { cn } from '@/lib/utils';
import { 
  Search, 
  Users, 
  Shield, 
  Zap, 
  Calendar, 
  TrendingUp, 
  MapPin, 
  Star,
  Clock,
  CheckCircle,
  ChevronRight,
  Activity,
  Heart
} from 'lucide-react-native';

// Modern Stats Component
const StatCard = React.memo(({
  label,
  value,
  IconComponent,
  trend,
  isLoading = false,
  variant = 'default'
}: {
  label: string;
  value: string;
  IconComponent: any;
  trend?: 'up' | 'down' | 'neutral';
  isLoading?: boolean;
  variant?: 'default' | 'primary' | 'success';
}) => (
  <View className={cn(
    "flex-1 rounded-xl p-4 min-w-[100px] border",
    variant === 'primary' && 'bg-primary/5 border-primary/20',
    variant === 'success' && 'bg-success/5 border-success/20',
    variant === 'default' && 'bg-card border-border'
  )} accessibilityLabel={`${label}: ${value}`}>
    <View className="items-center">
      <View className={cn(
        "w-10 h-10 rounded-full items-center justify-center mb-3",
        variant === 'primary' && 'bg-primary/10',
        variant === 'success' && 'bg-success/10',
        variant === 'default' && 'bg-accent/50'
      )}>
        <Icon 
          as={IconComponent} 
          size={20} 
          className={cn(
            variant === 'primary' && 'text-primary',
            variant === 'success' && 'text-success',
            variant === 'default' && 'text-foreground'
          )} 
        />
      </View>
      {isLoading ? (
        <Skeleton className="w-12 h-6 mb-2" />
      ) : (
        <Text className="text-xl font-bold text-foreground mb-1">
          {value}
        </Text>
      )}
      <Text className="text-muted-foreground text-xs text-center leading-4">
        {label}
      </Text>
      {trend && !isLoading && (
        <View className="flex-row items-center mt-1">
          <Icon 
            as={TrendingUp} 
            size={10} 
            className={cn(
              trend === 'up' && 'text-success',
              trend === 'down' && 'text-destructive',
              trend === 'neutral' && 'text-muted-foreground'
            )} 
          />
        </View>
      )}
    </View>
  </View>
));

export default function CustomerDashboard() {
  // ✅ MIGRATED: Using Zustand store for auth following copilot-rules.md
  const user = useAuthStore((state) => state.user);
  const { data: profileData, isLoading: profileLoading } = useProfile(user?.id);
  const { data: statsData, isLoading: statsLoading } = useProfileStats(user?.id, 'customer');
  const { data: bookingsData, isLoading: bookingsLoading } = useUserBookings(user?.id);
  const { data: trustedProviders, isLoading: providersLoading } = useTrustedProviders(5);
  // Subscription data
  const { data: allSubscriptions } = useUserSubscriptions();
  const { data: customerSubscription } = useActiveSubscription('customer_sos');
  const hasSOSAccess = hasActiveSubscription(allSubscriptions, 'customer_sos');

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
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScrollView className="flex-1">
        {/* Modern Header */}
        <View className="bg-card px-6 pt-6 pb-4 border-b border-border">
          <View className="flex-row items-center justify-between mb-6">
            <View className="flex-1">
              <Text className="text-muted-foreground text-sm mb-1">
                {getGreeting()}
              </Text>
              {profileLoading ? (
                <Skeleton className="w-32 h-7 mb-2" />
              ) : (
                <Text className="text-foreground text-2xl font-bold mb-1">
                  {getDisplayName()}
                </Text>
              )}
              <View className="flex-row items-center">
                <Icon as={MapPin} size={14} className="text-primary mr-1" />
                <Text className="text-muted-foreground text-sm">
                  Ready to discover services
                </Text>
              </View>
            </View>

            {/* Profile Avatar with Status */}
            <TouchableOpacity onPress={() => router.push('/(customer)/profile')}>
              <View className="relative">
                <Avatar className="w-14 h-14 border-2 border-primary/20" alt="Customer avatar">
                  {profileData?.avatar_url ? (
                    <AvatarImage source={{ uri: profileData.avatar_url }} />
                  ) : null}
                  <AvatarFallback className="bg-primary/10">
                    <Text className="text-lg text-primary font-bold">
                      {profileData?.first_name?.[0]?.toUpperCase() ||
                        profileData?.email?.[0]?.toUpperCase() || '👤'}
                    </Text>
                  </AvatarFallback>
                </Avatar>
                {hasSOSAccess && (
                  <View className="absolute -top-1 -right-1 w-5 h-5 bg-primary rounded-full items-center justify-center">
                    <Icon as={Shield} size={12} className="text-primary-foreground" />
                  </View>
                )}
              </View>
            </TouchableOpacity>
          </View>

          {/* Status Badge */}
          <View className="flex-row items-center gap-3">
            <Badge variant="secondary" className="bg-accent/50">
              <Icon as={Activity} size={12} className="text-accent-foreground mr-1" />
              <Text className="text-accent-foreground text-xs font-medium">
                {hasSOSAccess ? 'SOS Protected' : 'Active User'}
              </Text>
            </Badge>
            {realStats.totalBookings > 0 && (
              <Badge variant="outline">
                <Icon as={Heart} size={12} className="text-muted-foreground mr-1" />
                <Text className="text-muted-foreground text-xs">
                  {realStats.totalBookings} bookings
                </Text>
              </Badge>
            )}
          </View>
        </View>

        {/* Stats Overview */}
        <View className="px-6 py-4">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-lg font-bold text-foreground">Your Activity</Text>
            <TouchableOpacity onPress={() => router.push('/(customer)/profile/booking-history')}>
              <View className="flex-row items-center">
                <Text className="text-primary text-sm mr-1">View all</Text>
                <Icon as={ChevronRight} size={16} className="text-primary" />
              </View>
            </TouchableOpacity>
          </View>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-1">
            <View className="flex-row gap-3 px-1">
              <StatCard
                IconComponent={Calendar}
                value={bookingsLoading ? '-' : todaysBookings.length.toString()}
                label="Today"
                trend="up"
                isLoading={bookingsLoading}
                variant="primary"
              />
              <StatCard
                IconComponent={TrendingUp}
                value={bookingsLoading ? '-' : `£${realStats.totalSpent.toFixed(0)}`}
                label="Total Spent"
                trend="up"
                isLoading={bookingsLoading}
              />
              <StatCard
                IconComponent={hasSOSAccess ? Shield : Star}
                value={hasSOSAccess ? "Active" : realStats.avgRating.toFixed(1)}
                label={hasSOSAccess ? "SOS Status" : "Rating"}
                trend={hasSOSAccess ? "up" : "neutral"}
                isLoading={bookingsLoading}
                variant={hasSOSAccess ? "success" : "default"}
              />
            </View>
          </ScrollView>
        </View>

        {/* Quick Actions */}
        <View className="px-6 mb-6">
          <Text className="text-lg font-bold text-foreground mb-4">Quick Actions</Text>
          <View className="gap-3">
            {/* Primary Actions Row */}
            <View className="flex-row gap-3">
              <TouchableOpacity
                className="flex-1"
                onPress={() => router.push('/(customer)/search')}
                accessibilityLabel="Find services"
                accessibilityRole="button">
              
                <View className="bg-primary/5 border border-primary/20 rounded-xl p-4 items-center">
                  <View className="w-12 h-12 bg-primary/10 rounded-full items-center justify-center mb-3">
                    <Icon as={Search} size={24} className="text-primary" />
                  </View>
                  <Text className="font-semibold text-foreground text-center text-sm">
                    Find Services
                  </Text>
                  <Text className="text-muted-foreground text-xs text-center mt-1">
                    Browse & book
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                className="flex-1"
                onPress={() => router.push('/(customer)/search?mode=providers')}
                accessibilityLabel="Browse providers"
                accessibilityRole="button">
              
                <View className="bg-card border border-border rounded-xl p-4 items-center">
                  <View className="w-12 h-12 bg-accent/50 rounded-full items-center justify-center mb-3">
                    <Icon as={Users} size={24} className="text-foreground" />
                  </View>
                  <Text className="font-semibold text-foreground text-center text-sm">
                    Providers
                  </Text>
                  <Text className="text-muted-foreground text-xs text-center mt-1">
                    Find professionals
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
            
            {/* Secondary Actions Row */}
            <View className="flex-row gap-3">
              <TouchableOpacity 
                className="flex-1" 
                onPress={() => hasSOSAccess ? router.push('/(customer)/sos-booking') : router.push('/(customer)/subscriptions')}
                accessibilityLabel={hasSOSAccess ? "Emergency SOS booking" : "Get SOS access"}
                accessibilityRole="button">
              
                <View className={cn(
                  "rounded-xl p-4 items-center border",
                  hasSOSAccess 
                    ? 'bg-destructive/5 border-destructive/20' 
                    : 'bg-card border-border'
                )}>
                  <View className={cn(
                    "w-12 h-12 rounded-full items-center justify-center mb-3",
                    hasSOSAccess ? 'bg-destructive/10' : 'bg-accent/50'
                  )}>
                    <Icon 
                      as={Shield} 
                      size={24} 
                      className={hasSOSAccess ? "text-destructive" : "text-foreground"} 
                    />
                  </View>
                  <Text className="font-semibold text-foreground text-center text-sm">
                    {hasSOSAccess ? "SOS Booking" : "Get SOS"}
                  </Text>
                  <Text className="text-muted-foreground text-xs text-center mt-1">
                    {hasSOSAccess ? "Emergency ready" : "Premium feature"}
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity 
                className="flex-1" 
                onPress={() => router.push('/(customer)/subscriptions')}
                accessibilityLabel="Manage subscriptions"
                accessibilityRole="button">
              
                <View className="bg-card border border-border rounded-xl p-4 items-center">
                  <View className="w-12 h-12 bg-accent/50 rounded-full items-center justify-center mb-3">
                    <Icon as={Zap} size={24} className="text-foreground" />
                  </View>
                  <Text className="font-semibold text-foreground text-center text-sm">
                    Plans
                  </Text>
                  <Text className="text-muted-foreground text-xs text-center mt-1">
                    Manage billing
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>

     

        {/* Recent Activity */}
        <View className="px-6 mb-6">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-lg font-bold text-foreground">Recent Activity</Text>
            <TouchableOpacity onPress={() => router.push('/(customer)/bookings')}>
              <View className="flex-row items-center">
                <Text className="text-primary text-sm mr-1">View all</Text>
                <Icon as={ChevronRight} size={16} className="text-primary" />
              </View>
            </TouchableOpacity>
          </View>
          
          <Card className="bg-card border border-border">
            <CardContent className="p-0">
              {bookingsLoading ? (
                <View className="p-4 gap-4">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </View>
              ) : bookingsData?.slice(0, 3).map((booking, index) => (
                <TouchableOpacity
                  key={booking.id}
                  onPress={() => router.push(`/(customer)/booking/${booking.id}`)}
                  className={cn(
                    "flex-row items-center p-4",
                    index !== 0 && "border-t border-border"
                  )}
                >
                  <View className={cn(
                    "w-12 h-12 rounded-full items-center justify-center mr-4",
                    booking.status === 'completed' && 'bg-success/10',
                    booking.status === 'confirmed' && 'bg-primary/10',
                    booking.status === 'pending' && 'bg-warning/10'
                  )}>
                    <Icon 
                      as={
                        booking.status === 'completed' ? CheckCircle :
                        booking.status === 'confirmed' ? Calendar : Clock
                      }
                      size={20}
                      className={cn(
                        booking.status === 'completed' && 'text-success',
                        booking.status === 'confirmed' && 'text-primary',
                        booking.status === 'pending' && 'text-warning'
                      )}
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="font-semibold text-foreground mb-1">
                      {booking.service_title}
                    </Text>
                    <Text className="text-muted-foreground text-sm">
                      {booking.provider_first_name} {booking.provider_last_name}
                    </Text>
                    <Text className="text-muted-foreground text-xs mt-1">
                      {new Date(booking.booking_date).toLocaleDateString()}
                    </Text>
                  </View>
                  <View className="items-end">
                    <Text className="text-primary font-bold text-lg">
                      £{booking.total_amount}
                    </Text>
                    <Badge 
                      variant={
                        booking.status === 'completed' ? 'default' :
                        booking.status === 'confirmed' ? 'secondary' : 'outline'
                      }
                      className="mt-1"
                    >
                      <Text className="text-xs capitalize">{booking.status}</Text>
                    </Badge>
                  </View>
                </TouchableOpacity>
              )) ?? (
                <View className="items-center py-12 px-4">
                  <View className="w-16 h-16 bg-muted/20 rounded-full items-center justify-center mb-4">
                    <Icon as={Calendar} size={24} className="text-muted-foreground" />
                  </View>
                  <Text className="text-muted-foreground text-center font-medium mb-2">
                    No recent activity
                  </Text>
                  <Text className="text-muted-foreground text-sm text-center">
                    Book your first service to get started!
                  </Text>
                </View>
              )}
            </CardContent>
          </Card>
        </View>

        {/* Insights Card */}
        <View className="px-6 mb-6">
          <Text className="text-lg font-bold text-foreground mb-4">Your Progress</Text>
          <Card className="bg-card border border-border">
            <CardContent className="p-4">
              <View className="flex-row mb-6">
                <View className="items-center justify-center flex-1 px-2">
                  <Text className="text-2xl font-bold text-foreground mb-2">
                    {bookingsLoading ? '-' : realStats.totalBookings}
                  </Text>
                  <Text className="text-muted-foreground text-xs text-center leading-4">
                    Total{'\n'}Bookings
                  </Text>
                </View>
                <View className="w-px bg-border mx-3" />
                <View className="items-center justify-center flex-1 px-2">
                  <Text className="text-2xl font-bold text-primary mb-2">
                    {bookingsLoading ? '-' : `£${realStats.totalSpent.toFixed(0)}`}
                  </Text>
                  <Text className="text-muted-foreground text-xs text-center leading-4">
                    Total{'\n'}Invested
                  </Text>
                </View>
                <View className="w-px bg-border mx-3" />
                <View className="items-center justify-center flex-1 px-2">
                  <Text className="text-2xl font-bold text-success mb-2">
                    {bookingsLoading ? '-' : realStats.completedBookings}
                  </Text>
                  <Text className="text-muted-foreground text-xs text-center leading-4">
                    Services{'\n'}Completed
                  </Text>
                </View>
              </View>

              <View className={cn(
                "rounded-lg p-4 border",
                hasSOSAccess 
                  ? 'bg-destructive/5 border-destructive/20' 
                  : 'bg-accent/20 border-border'
              )}>
                <View className="flex-row items-start gap-3">
                  <Icon 
                    as={hasSOSAccess ? Shield : Zap} 
                    size={20} 
                    className={hasSOSAccess ? "text-destructive" : "text-primary"} 
                  />
                  <View className="flex-1">
                    <Text className="text-sm font-medium text-foreground mb-1">
                      {hasSOSAccess ? 'SOS Protection Active' : 'Upgrade to SOS Access'}
                    </Text>
                    <Text className="text-xs text-muted-foreground">
                      {hasSOSAccess ? 
                        "Emergency booking priority is active - book urgent services anytime" :
                        "Get priority emergency booking and exclusive features"
                      }
                    </Text>
                  </View>
                </View>
              </View>
            </CardContent>
          </Card>
        </View>

        {/* Featured Providers */}
        <View className="px-6 mb-6">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-lg font-bold text-foreground">Featured Providers</Text>
            <TouchableOpacity onPress={() => router.push('/(customer)/search?mode=providers')}>
              <View className="flex-row items-center">
                <Text className="text-primary text-sm mr-1">View all</Text>
                <Icon as={ChevronRight} size={16} className="text-primary" />
              </View>
            </TouchableOpacity>
          </View>
          
          <Card className="bg-card border border-border">
            <CardContent className="p-0">
              {providersLoading ? (
                <View className="p-4 gap-4">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </View>
              ) : trustedProviders?.length > 0 ? (
                trustedProviders.map((provider, index) => (
                  <TouchableOpacity
                    key={provider.id}
                    className={cn(
                      "flex-row items-center p-4",
                      index !== 0 && "border-t border-border"
                    )}
                    onPress={() => router.push(`/(customer)/provider/${provider.id}` as any)}
                  >
                    <Avatar className="w-14 h-14 mr-4" alt={`${provider.first_name} ${provider.last_name} avatar`}>
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
                      <View className="flex-row items-center gap-2 mb-1">
                        <Text className="font-semibold text-foreground text-base">
                          {provider.first_name} {provider.last_name}
                        </Text>
                        {provider.is_verified && (
                          <View className="w-5 h-5 bg-success/10 rounded-full items-center justify-center">
                            <Icon as={CheckCircle} size={12} className="text-success" />
                          </View>
                        )}
                      </View>
                      <Text className="text-muted-foreground text-sm mb-2">
                        {provider.featured_service?.title || 'Service Provider'}
                      </Text>
                      <View className="flex-row items-center gap-4">
                        <View className="flex-row items-center">
                          <Icon as={Star} size={12} className="text-warning mr-1" />
                          <Text className="text-xs text-muted-foreground">
                            {provider.avg_rating?.toFixed(1) || 'New'}
                          </Text>
                        </View>
                        {provider.city && (
                          <View className="flex-row items-center">
                            <Icon as={MapPin} size={12} className="text-muted-foreground mr-1" />
                            <Text className="text-xs text-muted-foreground">{provider.city}</Text>
                          </View>
                        )}
                        <View className="flex-row items-center">
                          <Icon as={Users} size={12} className="text-muted-foreground mr-1" />
                          <Text className="text-xs text-muted-foreground">
                            {provider.total_reviews || 0} reviews
                          </Text>
                        </View>
                      </View>
                    </View>
                    <Icon as={ChevronRight} size={20} className="text-muted-foreground" />
                  </TouchableOpacity>
                ))
              ) : (
                <View className="items-center py-12 px-4">
                  <View className="w-16 h-16 bg-muted/20 rounded-full items-center justify-center mb-4">
                    <Icon as={Users} size={24} className="text-muted-foreground" />
                  </View>
                  <Text className="text-muted-foreground text-center font-medium mb-2">
                    No providers found
                  </Text>
                  <Text className="text-muted-foreground text-sm text-center">
                    Check back later for available providers in your area
                  </Text>
                </View>
              )}
            </CardContent>
          </Card>
        </View>

        {/* Next Appointment */}
        {nextBooking && (
          <View className="px-6 mb-6">
            <Text className="text-lg font-bold text-foreground mb-4">Upcoming Appointment</Text>
            <Card className="bg-primary/5 border border-primary/20">
              <CardContent className="p-4">
                <View className="flex-row items-center gap-4 mb-4">
                  <Avatar className="w-16 h-16 border-2 border-primary/20" alt="Provider avatar">
                    <AvatarFallback className="bg-primary/10">
                      <Text className="text-lg font-bold text-primary">
                        {nextBooking.provider_first_name?.[0] || '?'}{nextBooking.provider_last_name?.[0] || '?'}
                      </Text>
                    </AvatarFallback>
                  </Avatar>
                  <View className="flex-1">
                    <Text className="font-bold text-foreground text-lg mb-1">
                      {nextBooking.service_title}
                    </Text>
                    <Text className="text-muted-foreground text-sm mb-2">
                      with {nextBooking.provider_first_name} {nextBooking.provider_last_name}
                    </Text>
                    <View className="flex-row items-center gap-4">
                      <View className="flex-row items-center">
                        <Icon as={Calendar} size={14} className="text-primary mr-1" />
                        <Text className="text-muted-foreground text-xs">
                          {new Date(nextBooking.booking_date).toLocaleDateString()}
                        </Text>
                      </View>
                      <View className="flex-row items-center">
                        <Icon as={Clock} size={14} className="text-primary mr-1" />
                        <Text className="text-muted-foreground text-xs">
                          {nextBooking.start_time}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <View className="items-end">
                    <Text className="text-primary font-bold text-xl">
                      £{nextBooking.total_amount}
                    </Text>
                    <Badge variant="secondary" className="mt-1">
                      <Text className="text-xs capitalize">{nextBooking.status}</Text>
                    </Badge>
                  </View>
                </View>

                <View className="bg-accent/20 rounded-xl p-4 mb-4 border border-border">
                  <View className="flex-row items-start gap-3">
                    <Icon as={MapPin} size={16} className="text-muted-foreground mt-0.5" />
                    <View className="flex-1">
                      <Text className="text-muted-foreground text-sm font-medium mb-1">
                        Service Location
                      </Text>
                      <Text className="text-muted-foreground text-xs">
                        Location details will be confirmed closer to your appointment date
                      </Text>
                    </View>
                  </View>
                </View>

                <TouchableOpacity 
                  onPress={() => router.push(`/(customer)/booking/${nextBooking.id}` as any)}
                  className="bg-primary rounded-xl py-4 px-6 items-center active:bg-primary/90"
                >
                  <View className="flex-row items-center">
                    <Text className="text-primary-foreground font-semibold mr-2">
                      View Appointment Details
                    </Text>
                    <Icon as={ChevronRight} size={16} className="text-primary-foreground" />
                  </View>
                </TouchableOpacity>
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

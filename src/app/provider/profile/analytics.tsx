import React from 'react';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/text';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthOptimized } from '@/hooks';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/core/supabase';
import { useColorScheme } from '@/lib/core/useColorScheme';
import { cn } from '@/lib/utils';

interface AnalyticsData {
  totalBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  totalRevenue: number;
  averageRating: number;
  totalReviews: number;
  monthlyBookings: { month: string; count: number }[];
  topServices: { service_title: string; count: number }[];
}

export default function ProviderAnalyticsScreen() {
  const { user } = useAuthOptimized();
  const { colorScheme } = useColorScheme();

  // Fetch analytics data
  const {
    data: analytics,
    isLoading,
    refetch
  } = useQuery({
    queryKey: ['providerAnalytics', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('User not authenticated');

      // Get booking statistics
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          id,
          status,
          total_price,
          service_title,
          created_at
        `)
        .eq('provider_id', user.id);

      if (bookingsError) throw bookingsError;

      // Get reviews statistics
      const { data: reviews, error: reviewsError } = await supabase
        .from('reviews')
        .select('rating')
        .eq('provider_id', user.id);

      if (reviewsError) throw reviewsError;

      // Calculate metrics
      const totalBookings = bookings?.length || 0;
      const completedBookings = bookings?.filter(b => b.status === 'completed').length || 0;
      const cancelledBookings = bookings?.filter(b => b.status === 'cancelled').length || 0;
      const totalRevenue = bookings?.filter(b => b.status === 'completed')
        .reduce((sum, b) => sum + (b.total_price || 0), 0) || 0;
      const averageRating = reviews && reviews.length > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        : 0;

      // Monthly bookings (last 6 months)
      const monthlyBookings = [];
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthName = month.toLocaleDateString('en-US', { month: 'short' });
        const count = bookings?.filter(b => {
          const bookingDate = new Date(b.created_at);
          return bookingDate.getMonth() === month.getMonth() &&
                 bookingDate.getFullYear() === month.getFullYear();
        }).length || 0;
        monthlyBookings.push({ month: monthName, count });
      }

      // Top services
      const serviceCounts: Record<string, number> = {};
      bookings?.forEach(booking => {
        if (booking.service_title) {
          serviceCounts[booking.service_title] = (serviceCounts[booking.service_title] || 0) + 1;
        }
      });
      const topServices = Object.entries(serviceCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([service_title, count]) => ({ service_title, count }));

      return {
        totalBookings,
        completedBookings,
        cancelledBookings,
        totalRevenue,
        averageRating,
        totalReviews: reviews?.length || 0,
        monthlyBookings,
        topServices,
      } as AnalyticsData;
    },
    enabled: !!user?.id,
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(amount);
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={['top']}>
        <View className="flex-row items-center px-6 py-4 border-b border-border">
          <TouchableOpacity
            onPress={() => router.back()}
            className="mr-4 p-2 rounded-full bg-secondary"
          >
            <Ionicons name="arrow-back" size={20} className="text-secondary-foreground" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-foreground">Business Analytics</Text>
        </View>

        <ScrollView className="flex-1 px-6 py-6">
          <View className="gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <Skeleton className="w-32 h-6 mb-4" />
                  <View className="flex-row gap-4">
                    <Skeleton className="flex-1 h-20" />
                    <Skeleton className="flex-1 h-20" />
                  </View>
                </CardContent>
              </Card>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center px-6 py-4 border-b border-border">
        <TouchableOpacity
          onPress={() => router.back()}
          className="mr-4 p-2 rounded-full bg-secondary"
        >
          <Ionicons name="arrow-back" size={20} className="text-secondary-foreground" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-foreground">Business Analytics</Text>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-6 py-6 gap-6">
          {analytics ? (
            <>
              {/* Overview Stats */}
              <Card>
                <CardHeader>
                  <CardTitle>Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <View className="flex-row gap-4">
                    <View className="flex-1 items-center p-4 bg-primary/5 rounded-lg">
                      <Ionicons name="calendar" size={24} className="text-primary mb-2" />
                      <Text className="text-2xl font-bold text-primary">
                        {analytics.totalBookings}
                      </Text>
                      <Text className="text-sm text-muted-foreground text-center">
                        Total Bookings
                      </Text>
                    </View>
                    <View className="flex-1 items-center p-4 bg-green-500/10 rounded-lg">
                      <Ionicons name="checkmark-circle" size={24} className="text-green-600 mb-2" />
                      <Text className="text-2xl font-bold text-green-600">
                        {analytics.completedBookings}
                      </Text>
                      <Text className="text-sm text-muted-foreground text-center">
                        Completed
                      </Text>
                    </View>
                    <View className="flex-1 items-center p-4 bg-blue-500/10 rounded-lg">
                      <Ionicons name="cash" size={24} className="text-blue-600 mb-2" />
                      <Text className="text-2xl font-bold text-blue-600">
                        {formatCurrency(analytics.totalRevenue)}
                      </Text>
                      <Text className="text-sm text-muted-foreground text-center">
                        Total Revenue
                      </Text>
                    </View>
                  </View>
                </CardContent>
              </Card>

              {/* Performance Metrics */}
              <Card>
                <CardHeader>
                  <CardTitle>Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <View className="flex-row gap-4">
                    <View className="flex-1 items-center p-4 bg-yellow-500/10 rounded-lg">
                      <Ionicons name="star" size={24} className="text-yellow-600 mb-2" />
                      <Text className="text-2xl font-bold text-yellow-600">
                        {analytics.averageRating.toFixed(1)}
                      </Text>
                      <Text className="text-sm text-muted-foreground text-center">
                        Average Rating
                      </Text>
                    </View>
                    <View className="flex-1 items-center p-4 bg-purple-500/10 rounded-lg">
                      <Ionicons name="chatbubble" size={24} className="text-purple-600 mb-2" />
                      <Text className="text-2xl font-bold text-purple-600">
                        {analytics.totalReviews}
                      </Text>
                      <Text className="text-sm text-muted-foreground text-center">
                        Total Reviews
                      </Text>
                    </View>
                    <View className="flex-1 items-center p-4 bg-red-500/10 rounded-lg">
                      <Ionicons name="close-circle" size={24} className="text-red-600 mb-2" />
                      <Text className="text-2xl font-bold text-red-600">
                        {analytics.cancelledBookings}
                      </Text>
                      <Text className="text-sm text-muted-foreground text-center">
                        Cancelled
                      </Text>
                    </View>
                  </View>
                </CardContent>
              </Card>

              {/* Monthly Trend */}
              <Card>
                <CardHeader>
                  <CardTitle>Monthly Bookings Trend</CardTitle>
                </CardHeader>
                <CardContent>
                  <View className="flex-row justify-between items-end">
                    {analytics.monthlyBookings.map((month, index) => (
                      <View key={month.month} className="items-center flex-1">
                        <View
                          className="bg-primary rounded-t w-6 mb-2"
                          style={{ height: Math.max(20, (month.count / Math.max(...analytics.monthlyBookings.map(m => m.count))) * 80) }}
                        />
                        <Text className="text-xs text-muted-foreground">{month.month}</Text>
                        <Text className="text-sm font-semibold">{month.count}</Text>
                      </View>
                    ))}
                  </View>
                </CardContent>
              </Card>

              {/* Top Services */}
              {analytics.topServices.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Top Services</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <View className="gap-3">
                      {analytics.topServices.map((service, index) => (
                        <View key={service.service_title} className="flex-row items-center justify-between">
                          <View className="flex-row items-center flex-1">
                            <Badge variant="secondary" className="mr-3">
                              <Text>{index + 1}</Text>
                            </Badge>
                            <Text className="font-medium text-foreground flex-1">
                              {service.service_title}
                            </Text>
                          </View>
                          <Text className="text-muted-foreground">
                            {service.count} booking{service.count !== 1 ? 's' : ''}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </CardContent>
                </Card>
              )}

              {/* Insights */}
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-4">
                  <View className="flex-row items-start">
                    <Ionicons name="bulb" size={20} className="text-primary mr-3 mt-0.5" />
                    <View className="flex-1">
                      <Text className="text-primary font-semibold mb-1">Business Insights</Text>
                      <Text className="text-primary/80 text-sm">
                        {analytics.completedBookings > 0
                          ? `You've successfully completed ${analytics.completedBookings} bookings. Keep up the great work!`
                          : 'Start building your business by completing your first booking.'
                        }
                      </Text>
                    </View>
                  </View>
                </CardContent>
              </Card>
            </>
          ) : (
            <View className="items-center justify-center py-12">
              <View className="w-16 h-16 bg-muted rounded-full items-center justify-center mb-4">
                <Ionicons name="bar-chart-outline" size={32} className="text-muted-foreground" />
              </View>
              <Text className="text-xl font-bold text-foreground mb-2">No Data Available</Text>
              <Text className="text-muted-foreground text-center mb-6">
                Analytics will appear here once you start receiving bookings.
              </Text>
              <Button onPress={() => router.push('/provider/calendar')}>
                <Text>View Calendar</Text>
              </Button>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
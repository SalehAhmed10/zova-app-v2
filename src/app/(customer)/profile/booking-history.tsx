import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity, FlatList, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useColorScheme } from '@/lib/core/useColorScheme';
import { THEME } from '@/lib/theme';
import { Text } from '@/components/ui/text';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { useCustomerBookings, type BookingData } from '@/hooks/customer';
import { useAuthOptimized } from '@/hooks/shared';
import { ChevronLeft } from 'lucide-react-native';
import { cn } from '@/lib/utils';

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const formatTime = (timeStr: string) => {
  const [hours, minutes] = timeStr.split(':');
  const hour = parseInt(hours);
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${displayHour}:${minutes} ${period}`;
};

const formatCurrency = (amount: string) => {
  return `£${parseFloat(amount).toFixed(2)}`;
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed':
      return 'bg-success/10 border-success/20';
    case 'confirmed':
      return 'bg-info/10 border-info/20';
    case 'in_progress':
      return 'bg-warning/10 border-warning/20';
    case 'pending':
      return 'bg-orange/10 border-orange/20';
    case 'cancelled':
      return 'bg-destructive/10 border-destructive/20';
    default:
      return 'bg-muted/50 border-border';
  }
};

const getStatusText = (status: string) => {
  return status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ');
};

const BookingCard = ({ booking }: { booking: BookingData }) => {
  const { isDarkColorScheme } = useColorScheme();

  const providerName = booking.business_name || `${booking.provider_first_name} ${booking.provider_last_name}`;

  return (
    <Animated.View entering={FadeIn.duration(300)}>
      <Card className="mb-3  border-border/50 bg-card">
        <CardContent className="p-4">
          {/* Header with Service and Status */}
          <View className="flex-row justify-between items-start mb-3">
            <View className="flex-1 mr-3">
              <Text className="text-base font-bold text-foreground mb-1" numberOfLines={2}>
                {booking.service_title}
              </Text>
              <View className="flex-row items-center gap-1">
                <Ionicons name="person-outline" size={12} className="text-muted-foreground" />
                <Text className="text-sm text-muted-foreground" numberOfLines={1}>
                  {providerName}
                </Text>
              </View>
            </View>
            <Badge className={cn('text-xs px-2 py-1', getStatusColor(booking.status))}>
              <Text className="text-xs font-medium">
                {getStatusText(booking.status)}
              </Text>
            </Badge>
          </View>

          {/* Date and Time */}
          <View className="flex-row items-center gap-3 mb-3">
            <View className="flex-row items-center gap-1">
              <Ionicons name="calendar-outline" size={14} className="text-muted-foreground" />
              <Text className="text-sm text-muted-foreground">
                {formatDate(booking.booking_date)}
              </Text>
            </View>
            <View className="flex-row items-center gap-1">
              <Ionicons name="time-outline" size={14} className="text-muted-foreground" />
              <Text className="text-sm text-muted-foreground">
                {formatTime(booking.start_time)}
              </Text>
            </View>
          </View>

          {/* Price */}
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-1">
              <Ionicons name="cash-outline" size={14} className="text-muted-foreground" />
              <Text className="text-sm font-semibold text-foreground">
                {formatCurrency(booking.total_amount)}
              </Text>
            </View>

            {/* Action Button - Navigate to booking detail */}
            <Button
              variant="outline"
              size="sm"
              onPress={() => router.push(`/(customer)/booking/${booking.id}` as any)}
              className="px-3"
            >
              <Text className="text-xs">View Details</Text>
            </Button>
          </View>

          {/* Notes if available */}
          {booking.emergency_description && (
            <View className="mt-3 pt-3 border-t border-border/50">
              <Text className="text-xs text-muted-foreground" numberOfLines={2}>
                {booking.emergency_description}
              </Text>
            </View>
          )}
        </CardContent>
      </Card>
    </Animated.View>
  );
};

const BookingSkeleton = () => (
  <Card className="mb-3">
    <CardContent className="p-4">
      <View className="flex-row justify-between items-start mb-3">
        <View className="flex-1 mr-3">
          <Skeleton className="h-5 w-3/4 mb-2" />
          <Skeleton className="h-4 w-1/2" />
        </View>
        <Skeleton className="h-6 w-16" />
      </View>
      <View className="flex-row gap-3 mb-3">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-16" />
      </View>
      <View className="flex-row justify-between">
        <View className="flex-row gap-3">
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-16" />
        </View>
      </View>
    </CardContent>
  </Card>
);

export default function BookingHistoryScreen() {
  const { user } = useAuthOptimized();
  const { data: bookings, isLoading, refetch, isRefetching } = useCustomerBookings(user?.id);
  const [refreshing, setRefreshing] = useState(false);
  const { isDarkColorScheme } = useColorScheme();

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const renderBooking = ({ item }: { item: BookingData }) => (
    <BookingCard booking={item} />
  );

  const renderEmpty = () => (
    <View className="flex-1 items-center justify-center py-12">
      <Ionicons name="calendar-outline" size={48} className="text-muted-foreground mb-4" />
      <Text className="text-lg font-medium text-foreground mb-2">No bookings yet</Text>
      <Text className="text-sm text-muted-foreground text-center mb-6">
        Your booking history will appear here once you book services
      </Text>
      <Button onPress={() => router.push('/(customer)/search')}>
        <Text className="text-primary-foreground">Find Services</Text>
      </Button>
    </View>
  );

  const renderHeader = () => (
    <View className="px-4 py-4 border-b border-border bg-card/50">
      <Text className="text-2xl font-bold text-foreground mb-2">
        Booking History
      </Text>
      <Text className="text-sm text-muted-foreground">
        View all your past and upcoming bookings
      </Text>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 border-b border-border">
        <Button
          variant="ghost"
          size="sm"
          onPress={() => router.push('/(customer)/profile')}
          className="mr-2"
        >
          <ChevronLeft size={20} color={isDarkColorScheme ? THEME.dark.foreground : THEME.light.foreground} />
        </Button>
      </View>

      {isLoading ? (
        <ScrollView className="flex-1 px-4 pt-4">
          {Array.from({ length: 5 }).map((_, index) => (
            <BookingSkeleton key={index} />
          ))}
        </ScrollView>
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={(item) => item.id}
          renderItem={renderBooking}
          ListEmptyComponent={renderEmpty}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={{ flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing || isRefetching}
              onRefresh={onRefresh}
              tintColor={THEME.light.primary}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}
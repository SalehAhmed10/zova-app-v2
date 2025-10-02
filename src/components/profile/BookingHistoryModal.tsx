import React from 'react';
import { View, Modal, ScrollView, TouchableOpacity, FlatList, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from '@/lib/core/useColorScheme';
import { THEME } from '@/lib/core/theme';
import { Text } from '@/components/ui/text';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { useCustomerBookings, type BookingData } from '@/hooks/customer';
import { useProfileModalStore } from '@/stores/ui/profileModal';
import { useAuthOptimized } from '@/hooks/shared';
import { cn } from '@/lib/utils';

interface BookingHistoryModalProps {
  // No props needed - using Zustand for state management
}

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
      return 'bg-green-100 dark:bg-green-900/30 border-green-200 dark:border-green-800';
    case 'confirmed':
      return 'bg-blue-100 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800';
    case 'in_progress':
      return 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800';
    case 'pending':
      return 'bg-orange-100 dark:bg-orange-900/30 border-orange-200 dark:border-orange-800';
    case 'cancelled':
      return 'bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-800';
    default:
      return 'bg-muted border-border';
  }
};

const getStatusTextColor = (status: string) => {
  switch (status) {
    case 'completed':
      return 'text-green-700 dark:text-green-300';
    case 'confirmed':
      return 'text-blue-700 dark:text-blue-300';
    case 'in_progress':
      return 'text-yellow-700 dark:text-yellow-300';
    case 'pending':
      return 'text-orange-700 dark:text-orange-300';
    case 'cancelled':
      return 'text-red-700 dark:text-red-300';
    default:
      return 'text-muted-foreground';
  }
};

const getPaymentStatusColor = (status: string) => {
  switch (status) {
    case 'paid':
      return 'text-green-700 dark:text-green-300';
    case 'pending':
      return 'text-yellow-700 dark:text-yellow-300';
    case 'failed':
      return 'text-red-700 dark:text-red-300';
    case 'refunded':
      return 'text-blue-700 dark:text-blue-300';
    default:
      return 'text-muted-foreground';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'completed':
      return '✅';
    case 'confirmed':
      return '📅';
    case 'in_progress':
      return '🔄';
    case 'pending':
      return '⏳';
    case 'cancelled':
      return '❌';
    default:
      return '📋';
  }
};

const BookingCard = ({ booking }: { booking: BookingData }) => {
  const { colorScheme } = useColorScheme();

  return (
    <Animated.View entering={SlideInDown.delay(200).springify()}>
      <Card className="mb-4 border-border bg-card">
        <CardContent className="p-4">
          {/* Header */}
          <View className="flex-row items-start justify-between mb-3">
            <View className="flex-1">
              <Text variant="p" className="text-foreground font-semibold mb-1">
                {booking.service_title}
              </Text>
              <Text variant="small" className="text-muted-foreground">
                {booking.category_name} • {booking.subcategory_name}
              </Text>
            </View>
            <View className="items-end">
              <Badge
                variant="outline"
                className={cn('mb-2', getStatusColor(booking.status))}
              >
                <Text className={cn('text-xs mr-1', getStatusTextColor(booking.status))}>
                  {getStatusIcon(booking.status)}
                </Text>
                <Text className={cn('text-xs font-medium', getStatusTextColor(booking.status))}>
                  {booking.status.replace('_', ' ')}
                </Text>
              </Badge>
            </View>
          </View>

          {/* Details */}
          <View className="gap-2">
            <View className="flex-row items-center">
              <Ionicons name="calendar" size={16} color={THEME[colorScheme].mutedForeground} />
              <Text variant="small" className="text-foreground ml-2">
                {formatDate(booking.booking_date)} at {formatTime(booking.start_time)}
              </Text>
            </View>

            <View className="flex-row items-center">
              <Ionicons name="person" size={16} color={THEME[colorScheme].mutedForeground} />
              <Text variant="small" className="text-foreground ml-2">
                {booking.provider_first_name} {booking.provider_last_name}
                {booking.business_name && ` (${booking.business_name})`}
              </Text>
            </View>

            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center">
                <Ionicons name="cash" size={16} color={THEME[colorScheme].mutedForeground} />
                <Text variant="small" className="text-foreground font-medium ml-2">
                  {formatCurrency(booking.total_amount)}
                </Text>
              </View>
              <Text variant="small" className={cn(
                'font-medium capitalize',
                getPaymentStatusColor(booking.payment_status)
              )}>
                {booking.payment_status}
              </Text>
            </View>
          </View>
        </CardContent>
      </Card>
    </Animated.View>
  );
};

export function BookingHistoryModal({}: BookingHistoryModalProps) {
  const { colorScheme } = useColorScheme();
  const { user } = useAuthOptimized();

  // ✅ PURE ZUSTAND: Modal state management (replaces props)
  const { bookingHistoryModalVisible, closeBookingHistoryModal } = useProfileModalStore();

  // ✅ REACT QUERY: Booking data fetching (replaces props)
  const {
    data: bookings = [],
    isLoading,
    error,
    refetch,
    isRefetching
  } = useCustomerBookings(user?.id);

  const renderEmptyState = () => (
    <View className="flex-1 items-center justify-center py-12">
      <Animated.View entering={FadeIn.springify()}>
        <Text className="text-6xl mb-4">📋</Text>
        <Text variant="h4" className="text-foreground font-bold mb-2 text-center">
          No Bookings Yet
        </Text>
        <Text variant="p" className="text-muted-foreground text-center px-8">
          Your booking history will appear here once you start using ZOVA services.
        </Text>
      </Animated.View>
    </View>
  );

  const renderLoadingState = () => (
    <View className="flex-1 items-center justify-center py-12">
      <Animated.View entering={FadeIn.springify()}>
        <Text className="text-4xl mb-4">⏳</Text>
        <Text variant="p" className="text-muted-foreground">
          Loading your bookings...
        </Text>
      </Animated.View>
    </View>
  );

  const renderErrorState = () => (
    <View className="flex-1 items-center justify-center py-12">
      <Animated.View entering={FadeIn.springify()}>
        <Ionicons name="alert-circle" size={48} color={THEME[colorScheme].destructive} />
        <Text variant="h4" className="text-foreground font-bold mb-2 text-center mt-4">
          Unable to Load Bookings
        </Text>
        <Text variant="p" className="text-muted-foreground text-center px-8 mb-4">
          {error?.message || 'Something went wrong while loading your bookings.'}
        </Text>
        <TouchableOpacity
          onPress={() => refetch()}
          className="flex-row items-center gap-2 px-4 py-2 bg-primary rounded-lg"
          accessibilityLabel="Retry loading bookings"
          accessibilityRole="button"
        >
          <Ionicons name="refresh" size={16} color="white" />
          <Text className="text-primary-foreground font-medium">Try Again</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );

  return (
    <Modal
      visible={bookingHistoryModalVisible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={closeBookingHistoryModal}
      accessibilityViewIsModal={true}
      accessibilityLabel="Booking History"
    >
      <SafeAreaView className="flex-1 bg-background">
        {/* Header */}
        <View className="flex-row items-center justify-between px-6 py-4 border-b border-border">
          <TouchableOpacity
            onPress={closeBookingHistoryModal}
            className="p-2 -ml-2"
            accessibilityLabel="Close booking history modal"
            accessibilityRole="button"
          >
            <Ionicons name="close" size={24} color={THEME[colorScheme].foreground} />
          </TouchableOpacity>
          <Text className="text-lg font-semibold text-foreground flex-1 text-center mr-8">
            Booking History
          </Text>
          <View className="w-6" />
        </View>

        {/* Content */}
        <FlatList
          data={bookings}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <BookingCard booking={item} />}
          contentContainerStyle={{ padding: 24 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={THEME[colorScheme].primary}
              accessibilityLabel="Pull to refresh booking history"
            />
          }
          ListHeaderComponent={() => (
            <Animated.View entering={FadeIn.delay(100).springify()}>
              <View className="mb-6">
                <Text variant="small" className="text-muted-foreground">
                  {bookings.length} booking{bookings.length !== 1 ? 's' : ''} found
                </Text>
              </View>
            </Animated.View>
          )}
          ListEmptyComponent={
            error ? renderErrorState() : isLoading ? renderLoadingState() : renderEmptyState()
          }
        />
      </SafeAreaView>
    </Modal>
  );
}
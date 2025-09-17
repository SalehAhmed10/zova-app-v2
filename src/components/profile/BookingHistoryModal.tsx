import React from 'react';
import { View, Modal, ScrollView, Pressable, FlatList } from 'react-native';
import { Text } from '@/components/ui/text';
import { Card, CardContent } from '@/components/ui/card';
import { BookingData } from '@/hooks/useProfileData';
import { cn } from '@/lib/utils';

interface BookingHistoryModalProps {
  visible: boolean;
  onClose: () => void;
  bookings?: BookingData[]; // Make optional
  isLoading?: boolean;
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
      return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30';
    case 'confirmed':
      return 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30';
    case 'in_progress':
      return 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/30';
    case 'pending':
      return 'text-orange-600 bg-orange-100 dark:text-orange-400 dark:bg-orange-900/30';
    case 'cancelled':
      return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30';
    default:
      return 'text-muted-foreground bg-muted';
  }
};

const getPaymentStatusColor = (status: string) => {
  switch (status) {
    case 'paid':
      return 'text-green-600';
    case 'pending':
      return 'text-yellow-600';
    case 'failed':
      return 'text-red-600';
    case 'refunded':
      return 'text-blue-600';
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

const BookingCard = ({ booking }: { booking: BookingData }) => (
  <Card className="mb-4">
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
          <View className={cn(
            'px-2 py-1 rounded-full flex-row items-center',
            getStatusColor(booking.status)
          )}>
            <Text className="text-xs mr-1">{getStatusIcon(booking.status)}</Text>
            <Text className="text-xs font-medium capitalize">
              {booking.status.replace('_', ' ')}
            </Text>
          </View>
        </View>
      </View>

      {/* Details */}
      <View className="gap-2">
        <View className="flex-row items-center">
          <Text className="text-sm mr-2">📅</Text>
          <Text variant="small" className="text-foreground">
            {formatDate(booking.booking_date)} at {formatTime(booking.start_time)}
          </Text>
        </View>

        <View className="flex-row items-center">
          <Text className="text-sm mr-2">👤</Text>
          <Text variant="small" className="text-foreground">
            {booking.provider_first_name} {booking.provider_last_name}
            {booking.business_name && ` (${booking.business_name})`}
          </Text>
        </View>

        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <Text className="text-sm mr-2">💰</Text>
            <Text variant="small" className="text-foreground font-medium">
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
);

export function BookingHistoryModal({ 
  visible, 
  onClose, 
  bookings = [], // Default to empty array
  isLoading 
}: BookingHistoryModalProps) {
  const renderEmptyState = () => (
    <View className="flex-1 items-center justify-center py-12">
      <Text className="text-6xl mb-4">📋</Text>
      <Text variant="h4" className="text-foreground font-bold mb-2 text-center">
        No Bookings Yet
      </Text>
      <Text variant="p" className="text-muted-foreground text-center px-8">
        Your booking history will appear here once you start using ZOVA services.
      </Text>
    </View>
  );

  const renderLoadingState = () => (
    <View className="flex-1 items-center justify-center py-12">
      <Text className="text-4xl mb-4">⏳</Text>
      <Text variant="p" className="text-muted-foreground">
        Loading your bookings...
      </Text>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-background">
        {/* Header */}
        <View className="flex-row items-center justify-between p-4 border-b border-border">
          <Pressable onPress={onClose} className="p-2">
            <Text className="text-primary text-base">Close</Text>
          </Pressable>
          <Text variant="h4" className="text-foreground font-bold">
            Booking History
          </Text>
          <View className="w-16" /> {/* Spacer for centering */}
        </View>

        {/* Content */}
        {isLoading ? (
          renderLoadingState()
        ) : !bookings || bookings.length === 0 ? (
          renderEmptyState()
        ) : (
          <FlatList
            data={bookings}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <BookingCard booking={item} />}
            contentContainerStyle={{ padding: 16 }}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={() => (
              <View className="mb-4">
                <Text variant="small" className="text-muted-foreground">
                  {bookings?.length || 0} booking{(bookings?.length || 0) !== 1 ? 's' : ''} found
                </Text>
              </View>
            )}
          />
        )}
      </View>
    </Modal>
  );
}
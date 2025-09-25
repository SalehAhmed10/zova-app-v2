import React, { useState } from 'react';
import { View, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Text } from '@/components/ui/text';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { useProviderCalendarBookings } from '@/hooks/useProfileData';
import { useColorScheme } from '@/lib/useColorScheme';

import { cn } from '@/lib/utils';

interface BookingItem {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  customerName: string;
  serviceTitle: string;
  status: string;
  amount: number;
}

export default function ProviderBookingsScreen() {
  const { user } = useAuth();
  const { isDarkColorScheme } = useColorScheme();
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'pending' | 'confirmed' | 'completed'>('pending');

  // Get bookings for the next 30 days
  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 30);

  const {
    data: bookings = [],
    isLoading,
    refetch
  } = useProviderCalendarBookings(user?.id, startDate, endDate);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  // Filter bookings by status
  const filteredBookings = bookings.filter(booking => {
    switch (activeTab) {
      case 'pending':
        return booking.status === 'pending';
      case 'confirmed':
        return booking.status === 'confirmed';
      case 'completed':
        return booking.status === 'completed';
      default:
        return true;
    }
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500';
      case 'confirmed': return 'bg-green-500';
      case 'completed': return 'bg-blue-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Pending';
      case 'confirmed': return 'Confirmed';
      case 'completed': return 'Completed';
      case 'cancelled': return 'Cancelled';
      default: return status;
    }
  };

  const formatCurrency = (amount: number) => {
    return `£${amount.toFixed(2)}`;
  };

  const formatDateTime = (date: string, time: string) => {
    const bookingDate = new Date(`${date}T${time}`);
    const now = new Date();
    const isToday = bookingDate.toDateString() === now.toDateString();
    const isTomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toDateString() === bookingDate.toDateString();

    let dateStr = bookingDate.toLocaleDateString('en-GB', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });

    if (isToday) dateStr = 'Today';
    if (isTomorrow) dateStr = 'Tomorrow';

    const timeStr = bookingDate.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit'
    });

    return `${dateStr} at ${timeStr}`;
  };

  const BookingCard = ({ booking }: { booking: BookingItem }) => (
    <Card className="mb-3">
      <CardContent className="p-4">
        <View className="flex-row justify-between items-start mb-3">
          <View className="flex-1">
            <Text className="font-semibold text-foreground mb-1">
              {booking.customerName}
            </Text>
            <Text className="text-sm text-muted-foreground mb-2">
              {booking.serviceTitle}
            </Text>
            <Text className="text-sm text-foreground">
              {formatDateTime(booking.date, booking.startTime)}
            </Text>
          </View>
          <View className="items-end">
            <Badge
              className={cn("mb-2", getStatusColor(booking.status))}
              variant="secondary"
            >
              <Text className="text-white text-xs font-medium">
                {getStatusText(booking.status)}
              </Text>
            </Badge>
            <Text className="text-lg font-bold text-primary">
              {formatCurrency(booking.amount)}
            </Text>
          </View>
        </View>

        {activeTab === 'pending' && (
          <View className="flex-row gap-2">
            <Button
              size="sm"
              className="flex-1"
              onPress={() => {/* Handle accept */}}
            >
              <Text className="text-primary-foreground font-medium">Accept</Text>
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onPress={() => {/* Handle decline */}}
            >
              <Text className="text-foreground font-medium">Decline</Text>
            </Button>
          </View>
        )}

        {activeTab === 'confirmed' && (
          <View className="flex-row gap-2">
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onPress={() => router.push(`/provider/calendar`)}
            >
              <Text className="text-foreground font-medium">View in Calendar</Text>
            </Button>
            <Button
              size="sm"
              variant="destructive"
              className="flex-1"
              onPress={() => {/* Handle cancel */}}
            >
              <Text className="text-destructive-foreground font-medium">Cancel</Text>
            </Button>
          </View>
        )}
      </CardContent>
    </Card>
  );

  const tabs = [
    { key: 'pending', label: 'Pending', count: bookings.filter(b => b.status === 'pending').length },
    { key: 'confirmed', label: 'Confirmed', count: bookings.filter(b => b.status === 'confirmed').length },
    { key: 'completed', label: 'Completed', count: bookings.filter(b => b.status === 'completed').length },
  ];

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-6 py-4 border-b border-border">
        <TouchableOpacity onPress={() => router.back()}>
          <Text className="text-lg">←</Text>
        </TouchableOpacity>
        <Text className="text-lg font-semibold text-foreground">Bookings</Text>
        <View className="w-6" />
      </View>

      {/* Tab Navigation */}
      <View className="flex-row px-6 py-4 border-b border-border">
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            className={cn(
              "flex-1 items-center py-2 rounded-lg mx-1",
              activeTab === tab.key ? "bg-primary" : "bg-transparent"
            )}
            onPress={() => setActiveTab(tab.key as any)}
          >
            <Text className={cn(
              "text-sm font-medium",
              activeTab === tab.key ? "text-primary-foreground" : "text-muted-foreground"
            )}>
              {tab.label}
            </Text>
            {tab.count > 0 && (
              <View className={cn(
                "px-2 py-0.5 rounded-full mt-1",
                activeTab === tab.key ? "bg-primary-foreground/20" : "bg-muted"
              )}>
                <Text className={cn(
                  "text-xs",
                  activeTab === tab.key ? "text-primary-foreground" : "text-muted-foreground"
                )}>
                  {tab.count}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        className="flex-1"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View className="p-6">
          {isLoading ? (
            <View className="space-y-3">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="w-full h-32" />
              ))}
            </View>
          ) : filteredBookings.length > 0 ? (
            <View className="space-y-1">
              {filteredBookings.map((booking) => (
                <BookingCard key={booking.id} booking={booking} />
              ))}
            </View>
          ) : (
            <View className="items-center justify-center py-12">
              <Text className="text-4xl mb-4">📅</Text>
              <Text className="text-lg font-semibold text-foreground mb-2">
                No {activeTab} bookings
              </Text>
              <Text className="text-muted-foreground text-center">
                {activeTab === 'pending'
                  ? 'New booking requests will appear here'
                  : activeTab === 'confirmed'
                  ? 'Your confirmed appointments will show here'
                  : 'Completed bookings will appear here'
                }
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
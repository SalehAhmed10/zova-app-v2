import React, { useState, useMemo, useCallback } from 'react';
import { View, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/text';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthOptimized, useProviderBookings } from '@/hooks';
import { useUpdateBookingStatus } from '@/hooks/shared/useBookings';
import { useColorScheme } from '@/lib/core/useColorScheme';
import { THEME } from '@/lib/theme';
import { usePendingBookings } from '@/hooks/provider';
import { BookingRequestCard } from '@/components/provider';
import { FlashList } from '@shopify/flash-list';
import { cn, formatCurrency } from '@/lib/utils';
import { supabase } from '@/lib/core/supabase';



interface BookingItem {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  customerName: string;
  serviceTitle: string;
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'declined' | 'expired';
  amount: number;
}

export default function ProviderBookingsScreen() {
  // ✅ MIGRATED: Using optimized auth hook following copilot-rules.md
  const { user } = useAuthOptimized();
  const { isDarkColorScheme } = useColorScheme();
  const colors = THEME[isDarkColorScheme ? 'dark' : 'light'];
  const [activeTab, setActiveTab] = useState<'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'>('pending');

  // Get bookings for the next 30 days - memoized to prevent infinite re-rendering
  const dateRange = useMemo(() => {
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30);
    return { startDate, endDate };
  }, []);

  const {
    data: bookings = [],
    isLoading,
    refetch
  } = useProviderBookings(user?.id, dateRange.startDate, dateRange.endDate);

  // Get pending bookings that require provider response (with deadlines)
  const {
    data: pendingBookingsWithDeadline = [],
    isLoading: isPendingLoading,
    refetch: refetchPending
  } = usePendingBookings();

  // Pull to refresh state
  const [refreshing, setRefreshing] = useState(false);

  // Pull to refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetch(), refetchPending()]);
    } catch (error) {
      console.error('Error refreshing bookings:', error);
    } finally {
      setRefreshing(false);
    }
  }, [refetch, refetchPending]);

  const updateBookingStatusMutation = useUpdateBookingStatus();

  const handleAcceptBooking = async (bookingId: string) => {
    try {
      await updateBookingStatusMutation.mutateAsync({
        bookingId,
        status: 'confirmed',
      });
      await Promise.all([refetch(), refetchPending()]);
    } catch (error) {
      console.error('Error accepting booking:', error);
    }
  };

  const handleDeclineBooking = async (bookingId: string) => {
    try {
      await updateBookingStatusMutation.mutateAsync({
        bookingId,
        status: 'cancelled',
      });
      await Promise.all([refetch(), refetchPending()]);
    } catch (error) {
      console.error('Error declining booking:', error);
    }
  };

  const handleStartBooking = async (bookingId: string) => {
    try {
      await updateBookingStatusMutation.mutateAsync({
        bookingId,
        status: 'in_progress',
      });
      await Promise.all([refetch(), refetchPending()]);
    } catch (error) {
      console.error('Error starting booking:', error);
    }
  };

  const handleCompleteBooking = async (bookingId: string) => {
    try {
      // Use the enterprise complete-service Edge Function for proper payment capture
      const { data, error } = await supabase.functions.invoke('complete-service', {
        body: {
          booking_id: bookingId,
          test_mode: false // Set to false for production
        }
      });

      if (error) {
        console.error('Error completing service:', error);
        // Show user-friendly error message
        return;
      }

      console.log('Service completed successfully:', data);
      await Promise.all([refetch(), refetchPending()]);
    } catch (error) {
      console.error('Error completing booking:', error);
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    try {
      await updateBookingStatusMutation.mutateAsync({
        bookingId,
        status: 'cancelled',
      });
      await Promise.all([refetch(), refetchPending()]);
    } catch (error) {
      console.error('Error cancelling booking:', error);
    }
  };

  // Filter bookings by status
  const filteredBookings = bookings.filter(booking => {
    switch (activeTab) {
      case 'pending':
        return booking.status === 'pending';
      case 'confirmed':
        return booking.status === 'confirmed';
      case 'in_progress':
        return booking.status === 'in_progress';
      case 'completed':
        return booking.status === 'completed';
      case 'cancelled':
        return ['cancelled', 'declined', 'expired'].includes(booking.status);
      default:
        return true;
    }
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-600 dark:bg-yellow-500';
      case 'confirmed': return 'bg-green-600 dark:bg-green-500';
      case 'in_progress': return 'bg-blue-600 dark:bg-blue-500';
      case 'completed': return 'bg-emerald-600 dark:bg-emerald-500';
      case 'cancelled': return 'bg-red-600 dark:bg-red-500';
      case 'declined': return 'bg-red-600 dark:bg-red-500';
      case 'expired': return 'bg-muted-foreground';
      default: return 'bg-muted-foreground';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Pending';
      case 'confirmed': return 'Confirmed';
      case 'in_progress': return 'In Progress';
      case 'completed': return 'Completed';
      case 'cancelled': return 'Cancelled';
      case 'declined': return 'Declined';
      case 'expired': return 'Expired';
      default: return status.charAt(0).toUpperCase() + status.slice(1);
    }
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

  const handleBookingPress = (bookingId: string) => {
    router.push(`/provider/bookingdetail/${bookingId}` as any);
  };

  const BookingCard = ({ booking }: { booking: BookingItem }) => (
    <TouchableOpacity 
      activeOpacity={0.7}
      onPress={() => handleBookingPress(booking.id)}
    >
      <Card className="mb-3 border-border/50">
        <CardContent className="p-4">
          {/* Header with Customer and Status */}
          <View className="flex-row justify-between items-start mb-3">
            <View className="flex-row items-center flex-1">
              <View className="w-10 h-10 rounded-full bg-primary/10 dark:bg-primary/20 items-center justify-center mr-3">
                <Ionicons name="person" size={20} color={colors.primary} />
              </View>
              <View className="flex-1">
                <Text className="font-semibold text-foreground text-base">
                  {booking.customerName}
                </Text>
                <Text className="text-xs text-muted-foreground mt-0.5">
                  Customer
                </Text>
              </View>
            </View>
            <Badge
              className={cn("ml-2", getStatusColor(booking.status))}
              variant="secondary"
            >
              <Text className="text-primary-foreground text-xs font-medium">
                {getStatusText(booking.status)}
              </Text>
            </Badge>
          </View>

          {/* Service Info */}
          <View className="flex-row items-center mb-3 bg-muted/50 dark:bg-muted/30 p-3 rounded-lg">
            <Ionicons name="cut" size={18} color={colors.primary} />
            <Text className="text-sm text-foreground font-medium ml-2 flex-1">
              {booking.serviceTitle}
            </Text>
          </View>

          {/* Date/Time and Price Row */}
          <View className="flex-row justify-between items-center mb-3">
            <View className="flex-row items-center flex-1">
              <Ionicons name="calendar" size={16} color={colors.primary} />
              <Text className="text-sm text-foreground ml-2">
                {formatDateTime(booking.date, booking.startTime)}
              </Text>
            </View>
            <View className="flex-row items-center">
              <Ionicons name="cash" size={16} color={colors.success} />
              <Text className="text-lg font-bold text-primary ml-1">
                {formatCurrency(booking.amount)}
              </Text>
            </View>
          </View>

          {/* Tap for details hint */}
          <View className="flex-row items-center justify-center py-1 border-t border-border/30 mt-2">
            <Text className="text-xs text-muted-foreground mr-1">
              Tap for details
            </Text>
            <Ionicons name="chevron-forward" size={12} color={colors.primary} />
          </View>

          {/* Quick Action Buttons - Only show for pending/confirmed/in_progress */}
          {activeTab === 'pending' && (
            <View className="flex-row gap-2 mt-3" style={{ zIndex: 10 }}>
              <Button
                size="sm"
                className="flex-1"
                onPress={(e) => {
                  e.stopPropagation();
                  handleAcceptBooking(booking.id);
                }}
                disabled={updateBookingStatusMutation.isPending}
              >
                <Text className="text-primary-foreground font-medium">
                  {updateBookingStatusMutation.isPending ? 'Accepting...' : 'Accept'}
                </Text>
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                onPress={(e) => {
                  e.stopPropagation();
                  handleDeclineBooking(booking.id);
                }}
                disabled={updateBookingStatusMutation.isPending}
              >
                <Text className="text-foreground font-medium">
                  {updateBookingStatusMutation.isPending ? 'Declining...' : 'Decline'}
                </Text>
              </Button>
            </View>
          )}

          {activeTab === 'confirmed' && (
            <View className="flex-row gap-2 mt-3" style={{ zIndex: 10 }}>
              <Button
                size="sm"
                className="flex-1"
                onPress={(e) => {
                  e.stopPropagation();
                  handleStartBooking(booking.id);
                }}
                disabled={updateBookingStatusMutation.isPending}
              >
                <Text className="text-primary-foreground font-medium">
                  {updateBookingStatusMutation.isPending ? 'Starting...' : 'Start Service'}
                </Text>
              </Button>
              <Button
                size="sm"
                variant="destructive"
                className="flex-1"
                onPress={(e) => {
                  e.stopPropagation();
                  handleCancelBooking(booking.id);
                }}
                disabled={updateBookingStatusMutation.isPending}
              >
                <Text className="text-destructive-foreground font-medium">
                  {updateBookingStatusMutation.isPending ? 'Cancelling...' : 'Cancel'}
                </Text>
              </Button>
            </View>
          )}

          {activeTab === 'in_progress' && (
            <View className="flex-row gap-2 mt-3" style={{ zIndex: 10 }}>
              <Button
                size="sm"
                className="flex-1"
                onPress={(e) => {
                  e.stopPropagation();
                  handleCompleteBooking(booking.id);
                }}
                disabled={updateBookingStatusMutation.isPending}
              >
                <Text className="text-primary-foreground font-medium">
                  {updateBookingStatusMutation.isPending ? 'Completing...' : 'Mark Complete'}
                </Text>
              </Button>
            </View>
          )}
        </CardContent>
      </Card>
    </TouchableOpacity>
  );

  const tabs = [
    { 
      key: 'pending', 
      label: 'Pending', 
      count: bookings.filter(b => b.status === 'pending').length + pendingBookingsWithDeadline.length 
    },
    { key: 'confirmed', label: 'Confirmed', count: bookings.filter(b => b.status === 'confirmed').length },
    { key: 'in_progress', label: 'In Progress', count: bookings.filter(b => b.status === 'in_progress').length },
    { key: 'completed', label: 'Completed', count: bookings.filter(b => b.status === 'completed').length },
    { 
      key: 'cancelled', 
      label: 'Cancelled', 
      count: bookings.filter(b => ['cancelled', 'declined', 'expired'].includes(b.status)).length 
    },
  ];

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      {/* Header */}
      <View className="px-4 py-4 border-b border-border">
        <View className="flex-row items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onPress={() => router.back()}
            className="w-8 h-8 p-0"
          >
            <Ionicons name="chevron-back" size={24} color={colors.primary} />
          </Button>
          <Text className="text-xl font-bold text-foreground">
            My Bookings
          </Text>
          <View className="w-8" />
        </View>
      </View>

      {/* Status Tabs */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        className="px-4 py-2 border-b border-border max-h-14"
      >
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            onPress={() => setActiveTab(tab.key as any)}
            className={cn(
              "px-4 py-2 rounded-lg mr-2",
              activeTab === tab.key ? "bg-primary" : "bg-muted"
            )}
          >
            <View className="flex-row items-center">
              <Text className={cn(
                "font-medium",
                activeTab === tab.key ? "text-primary-foreground" : "text-muted-foreground"
              )}>
                {tab.label}
              </Text>
              {tab.count > 0 && (
                <View className={cn(
                  "ml-2 px-2 py-0.5 rounded-full",
                  activeTab === tab.key ? "bg-primary-foreground/20" : "bg-primary/10"
                )}>
                  <Text className={cn(
                    "text-xs font-bold",
                    activeTab === tab.key ? "text-primary-foreground" : "text-primary"
                  )}>
                    {tab.count}
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Bookings List */}
      <View className="flex-1">
        {isLoading || isPendingLoading ? (
          <View className="px-4 pt-4">
            {[1, 2, 3].map(i => (
              <Card key={i} className="mb-4">
                <CardContent className="p-4">
                  <Skeleton className="w-3/4 h-6 mb-2" />
                  <Skeleton className="w-1/2 h-4 mb-2" />
                  <View className="flex-row justify-between">
                    <Skeleton className="w-20 h-4" />
                    <Skeleton className="w-16 h-6" />
                  </View>
                </CardContent>
              </Card>
            ))}
          </View>
        ) : (
          <FlashList
            data={(() => {
              const items = [];
              
              // Add urgent header if there are urgent bookings
              if (activeTab === 'pending' && pendingBookingsWithDeadline.length > 0) {
                items.push({ type: 'urgent-header' as const, id: 'urgent-header' });
              }
              
              // Add urgent booking cards
              if (activeTab === 'pending' && pendingBookingsWithDeadline.length > 0) {
                pendingBookingsWithDeadline.forEach((booking, index) => {
                  items.push({ 
                    type: 'urgent' as const, 
                    booking, 
                    id: `urgent-${booking.id}-${index}` 
                  });
                });
              }
              
              // Add divider if both urgent and regular bookings exist
              if (activeTab === 'pending' && filteredBookings.length > 0 && pendingBookingsWithDeadline.length > 0) {
                items.push({ type: 'divider' as const, id: 'divider' });
              }
              
              // Add regular booking cards
              filteredBookings.forEach((booking, index) => {
                items.push({ 
                  type: 'regular' as const, 
                  booking, 
                  id: `regular-${booking.id}-${index}` 
                });
              });
              
              return items;
            })()}
            renderItem={({ item }) => {
              if (item.type === 'urgent-header') {
                return (
                  <View className="px-4 pt-2 pb-2">
                    <View className="flex-row items-center bg-destructive/10 p-3 rounded-lg">
                      <Ionicons name="alert-circle" size={20} color={colors.destructive} />
                      <Text className="ml-2 text-sm font-bold text-destructive flex-1">
                        ⏰ Urgent: Requires Response
                      </Text>
                      <View className="bg-destructive px-2.5 py-1 rounded-full">
                        <Text className="text-xs font-bold text-destructive-foreground">
                          {pendingBookingsWithDeadline.length}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              }
              if (item.type === 'urgent') {
                return (
                  <View className="px-4 pb-3">
                    <BookingRequestCard booking={item.booking} />
                  </View>
                );
              }
              if (item.type === 'divider') {
                return (
                  <View className="px-4 py-3">
                    <View className="flex-row items-center">
                      <View className="flex-1 h-px bg-border" />
                      <Text className="mx-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Other Pending ({filteredBookings.length})
                      </Text>
                      <View className="flex-1 h-px bg-border" />
                    </View>
                  </View>
                );
              }
              return (
                <View className="px-4 pb-3">
                  <BookingCard booking={item.booking} />
                </View>
              );
            }}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingTop: 4, paddingBottom: 8 }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[colors.primary]}
                tintColor={colors.primary}
              />
            }
            ListEmptyComponent={
              <View className="items-center justify-center py-16 px-6">
                <View className="w-20 h-20 rounded-full bg-primary/10 dark:bg-primary/20 items-center justify-center mb-4">
                  <Ionicons 
                    name={
                      activeTab === 'pending' ? 'time-outline' :
                      activeTab === 'confirmed' ? 'calendar-outline' : 
                      activeTab === 'in_progress' ? 'play-circle-outline' :
                      activeTab === 'completed' ? 'checkmark-done-outline' :
                      'close-circle-outline'
                    } 
                    size={40} 
                    color={colors.primary}
                  />
                </View>
                <Text className="text-xl font-bold text-foreground mb-2">
                  No {
                    activeTab === 'pending' ? 'Pending' : 
                    activeTab === 'confirmed' ? 'Confirmed' : 
                    activeTab === 'in_progress' ? 'In Progress' :
                    activeTab === 'completed' ? 'Completed' :
                    'Cancelled'
                  } Bookings
                </Text>
                <Text className="text-muted-foreground text-center leading-5">
                  {activeTab === 'pending'
                    ? "New booking requests will appear here. You'll be notified when customers book your services."
                    : activeTab === 'confirmed'
                    ? 'Accepted appointments will show here. Accept pending bookings to see them listed.'
                    : activeTab === 'in_progress'
                    ? 'Active services in progress will appear here. Start confirmed bookings to see them here.'
                    : activeTab === 'completed'
                    ? 'Your completed bookings history will appear here. Mark in-progress bookings as complete.'
                    : 'Cancelled, declined, and expired bookings will appear here.'
                  }
                </Text>
              </View>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}
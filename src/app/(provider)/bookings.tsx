import React, { useState, useCallback, useMemo } from 'react';
import { View, ScrollView, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/text';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { DeleteConfirmationDialog } from '@/components/ui/alert-dialog';

import { useAuthStore } from '@/stores/auth';
import { useUpdateBookingStatus, useProviderBookings } from '@/hooks/shared/useBookings';
import { useColorScheme } from '@/lib/core/useColorScheme';
import { THEME } from '@/lib/theme';
import { usePendingBookings } from '@/hooks/provider/usePendingBookings';
import { useBookingActions } from '@/hooks/provider/useBookingActions';
import { CountdownTimer } from '@/components/provider';
import { FlashList } from '@shopify/flash-list';
import { cn, formatCurrency } from '@/lib/utils';
import { supabase } from '@/lib/supabase';



interface BookingItem {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  customerName: string;
  serviceTitle: string;
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'declined' | 'expired';
  amount: number | null | undefined;
  service_price?: number;
  total_amount_paid_by_customer?: number;
  booking_mode?: 'normal' | 'sos';
  provider_response_deadline?: string; // ISO timestamp for urgent bookings
}

export default function ProviderBookingsScreen() {
  // ✅ MIGRATED: Using Zustand store following copilot-rules.md
  const user = useAuthStore((state) => state.user);
  const { isDarkColorScheme } = useColorScheme();
  const colors = THEME[isDarkColorScheme ? 'dark' : 'light'];
  const [activeTab, setActiveTab] = useState<'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'>('pending');

  // Confirmation dialog state for cancelling/declining bookings
  const [cancelConfirmationState, setCancelConfirmationState] = useState<{
    isOpen: boolean;
    bookingId: string | null;
    action: 'cancel' | 'decline'; // Track whether this is a cancel or decline action
  }>({ isOpen: false, bookingId: null, action: 'cancel' });

  // ✅ UNIFIED BOOKING ACTIONS: Using new consolidated hook for all booking state changes
  const { 
    acceptBooking, 
    declineBooking, 
    completeBooking,
    cancelBooking,
    isAccepting,
    isDeclining,
    isCompleting,
    isCanceling
  } = useBookingActions();

  // ✅ FIXED: Using React Query hook for provider bookings (server state management)
  // Automatically fetches and caches bookings for this provider
  const {
    data: bookings = [],
    isLoading,
    refetch
  } = useProviderBookings();

  // Get pending bookings that require provider response (with deadlines)
  const {
    data: pendingBookingsWithDeadline = [],
    isLoading: isPendingLoading,
    refetch: refetchPending
  } = usePendingBookings();

  // Pull to refresh state
  const [refreshing, setRefreshing] = useState(false);

  // Handle pull-to-refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetch(), refetchPending()]);
    } finally {
      setRefreshing(false);
    }
  }, [refetch, refetchPending]);

  // ✅ WRAPPER: Handle completion and refetch
  const handleCompleteBookingWrapper = useCallback(async (bookingId: string) => {
    try {
      await completeBooking(bookingId);
      // Refetch to update the UI
      await Promise.all([refetch(), refetchPending()]);
    } catch (error) {
      console.error('Error completing booking:', error);
    }
  }, [completeBooking, refetch, refetchPending]);

  // Transform pending bookings to BookingItem format for use in BookingCard
  const transformedPendingBookings = useMemo(() => {
    return pendingBookingsWithDeadline.map(booking => {
      // Use actual booking date and time from the booking record
      const dateStr = booking.booking_date || new Date().toISOString().split('T')[0];
      const timeStr = booking.start_time || '00:00';

      // Look up booking_mode from booking data (it's now included in pendingBookingsWithDeadline)
      const bookingMode = booking.booking_mode || 'normal';

      return {
        id: booking.id,
        date: dateStr,
        startTime: timeStr,
        endTime: timeStr,
        customerName: booking.customer 
          ? `${booking.customer.first_name || ''} ${booking.customer.last_name || ''}`.trim() || booking.customer.email
          : 'Unknown Customer',
        serviceTitle: booking.service?.title || 'Unknown Service',
        status: 'pending' as const,
        amount: booking.total_amount,
        service_price: booking.service?.base_price,
        total_amount_paid_by_customer: booking.total_amount,
        booking_mode: bookingMode as 'normal' | 'sos',
        provider_response_deadline: booking.provider_response_deadline || undefined,
      } as BookingItem;
    });
  }, [pendingBookingsWithDeadline]);

  const updateBookingStatusMutation = useUpdateBookingStatus();

  const handleAcceptBookingWrapper = async (bookingId: string) => {
    try {
      await acceptBooking(bookingId);
      await Promise.all([refetch(), refetchPending()]);
    } catch (error) {
      console.error('Error accepting booking:', error);
    }
  };

  const handleDeclineBookingWrapper = async (bookingId: string | null) => {
    if (!bookingId) {
      console.error('❌ [handleDeclineBookingWrapper] No booking ID provided');
      return;
    }

    try {
      // Use unified hook which handles the alert and refund
      await declineBooking({ bookingId });
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

  const handleCancelBooking = async (bookingId: string) => {
    try {
      console.log('🎯 [CancelBooking] Starting for booking:', bookingId);

      // Use the cancel-booking Edge Function for proper booking cancellation with refund
      const { data: authSession } = await supabase.auth.getSession();
      if (!authSession.session?.access_token) {
        throw new Error('Not authenticated');
      }

      const response = await supabase.functions.invoke('cancel-booking', {
        body: { booking_id: bookingId },
        headers: {
          'Authorization': `Bearer ${authSession.session.access_token}`,
        },
      });

      console.log('📡 [CancelBooking] Raw response:', {
        data: response.data,
        error: response.error,
      });

      const { data, error } = response;

      // Check if response was successful
      if (!error && data && typeof data === 'object' && 'success' in data) {
        console.log('✅ [CancelBooking] Success:', data);
        Alert.alert('Success', (data as any).message || 'Booking cancelled and customer refunded.');
        await Promise.all([refetch(), refetchPending()]);
        return;
      }

      // Handle error response
      if (error || (data && typeof data === 'object' && 'error' in data)) {
        const errorMessage = (data as any)?.details || (data as any)?.error || error?.message || 'Unknown error';
        console.error('❌ [CancelBooking] Error:', errorMessage);
        Alert.alert('Error', `Failed to cancel booking: ${errorMessage}`);
        return;
      }

      console.warn('⚠️ [CancelBooking] Unexpected response format:', response);
      Alert.alert('Warning', 'Unexpected response format from server');
    } catch (error) {
      console.error('💥 [CancelBooking] Exception:', error);
      Alert.alert('Error', `Unexpected error: ${(error as any)?.message || 'Unknown'}`);
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
    router.push(`/(provider)/bookingdetail/${bookingId}` as any);
  };

  const BookingCard = ({ booking, isUrgent = false }: { booking: BookingItem; isUrgent?: boolean }) => (
    <TouchableOpacity 
      activeOpacity={0.7}
      onPress={() => handleBookingPress(booking.id)}
    >
      <Card className={cn(
        "mb-3 border-border/50",
        isUrgent && "border-destructive/50 bg-destructive/5 dark:bg-destructive/10"
      )}>
        <CardContent className="p-4">
          {/* Header with Customer, Booking Mode Badge, and Status */}
          <View className="flex-row justify-between items-start mb-3">
            <View className="flex-row items-center flex-1">
              <View className={cn(
                "w-10 h-10 rounded-full items-center justify-center mr-3",
                booking.booking_mode === 'sos' 
                  ? 'bg-destructive/20 dark:bg-destructive/30' 
                  : 'bg-primary/10 dark:bg-primary/20'
              )}>
                <Ionicons 
                  name={booking.booking_mode === 'sos' ? 'alert-circle' : 'person'} 
                  size={20} 
                  color={booking.booking_mode === 'sos' ? colors.destructive : colors.primary} 
                />
              </View>
              <View className="flex-1">
                <Text className="font-semibold text-foreground text-base">
                  {booking.customerName}
                </Text>
                <Text className="text-xs text-muted-foreground mt-0.5">
                  {booking.booking_mode === 'sos' ? '🚨 SOS Booking' : 'Standard Booking'}
                </Text>
              </View>
            </View>
            
            {/* Booking Mode Badge */}
            <Badge
              className={cn(
                "ml-2",
                booking.booking_mode === 'sos' 
                  ? 'bg-destructive' 
                  : 'bg-primary'
              )}
              variant="secondary"
            >
              <Text className="text-primary-foreground text-xs font-medium uppercase tracking-wider">
                {booking.booking_mode === 'sos' ? '🚨 SOS' : 'Normal'}
              </Text>
            </Badge>
          </View>

          {/* Countdown Timer for SOS Bookings in Pending Tab */}
          {isUrgent && booking.provider_response_deadline && (
            <View className="mb-3 p-2 bg-destructive/10 rounded-lg flex-row items-center justify-between">
              <CountdownTimer deadline={booking.provider_response_deadline} />
              <View className="px-2 py-1 bg-destructive/20 rounded">
                <Text className="text-xs font-bold text-destructive">⏱️ URGENT</Text>
              </View>
            </View>
          )}

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
                {formatCurrency(booking.amount ?? booking.total_amount_paid_by_customer ?? booking.service_price ?? 0)}
              </Text>
            </View>
          </View>

          {/* Status Badge Row */}
          <View className="flex-row justify-between items-center py-2 border-t border-border/30 mt-2 mb-2">
            <Badge
              className={cn("", getStatusColor(booking.status))}
              variant="secondary"
            >
              <Text className="text-primary-foreground text-xs font-medium">
                {getStatusText(booking.status)}
              </Text>
            </Badge>
            <View className="flex-row items-center">
              <Text className="text-xs text-muted-foreground mr-1">
                Tap for details
              </Text>
              <Ionicons name="chevron-forward" size={12} color={colors.primary} />
            </View>
          </View>

          {/* Quick Action Buttons - Only show for pending/confirmed/in_progress */}
          {activeTab === 'pending' && (
            <View className="flex-row gap-2 mt-3" style={{ zIndex: 10 }}>
              <Button
                size="sm"
                className="flex-1"
                onPress={(e) => {
                  e.stopPropagation();
                  handleAcceptBookingWrapper(booking.id);
                }}
                disabled={isAccepting}
              >
                <Text className="text-primary-foreground font-medium">
                  {isAccepting ? 'Accepting...' : 'Accept'}
                </Text>
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                onPress={(e) => {
                  e.stopPropagation();
                  setCancelConfirmationState({ isOpen: true, bookingId: booking.id, action: 'decline' });
                }}
                disabled={isDeclining}
              >
                <Text className="text-foreground font-medium">
                  {isDeclining ? 'Declining...' : 'Decline'}
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
                  setCancelConfirmationState({
                    isOpen: true,
                    bookingId: booking.id,
                    action: 'cancel',
                  });
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
                  handleCompleteBookingWrapper(booking.id);
                }}
                disabled={isCompleting}
              >
                <Text className="text-primary-foreground font-medium">
                  {isCompleting ? 'Completing...' : 'Mark Complete'}
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
      // ✅ FIXED: Don't double-count - pendingBookingsWithDeadline is a subset of pending bookings
      count: bookings.filter(b => b.status === 'pending').length
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
              
              // ✅ FIXED: Use TRANSFORMED pending bookings (with enriched data) for urgent SOS bookings
              const sosBookingsWithDeadline = transformedPendingBookings.filter(
                b => b && b.booking_mode === 'sos'
              );
              
              // Add urgent header if there are urgent SOS bookings
              if (activeTab === 'pending' && sosBookingsWithDeadline.length > 0) {
                items.push({ type: 'urgent-header' as const, id: 'urgent-header' });
              }
              
              // Add urgent SOS booking cards
              if (activeTab === 'pending' && sosBookingsWithDeadline.length > 0) {
                sosBookingsWithDeadline.forEach((booking, index) => {
                  items.push({ 
                    type: 'urgent' as const, 
                    booking, 
                    id: `urgent-${booking.id}-${index}` 
                  });
                });
              }
              
              // Add divider if both urgent and regular bookings exist
              if (activeTab === 'pending' && filteredBookings.length > 0 && sosBookingsWithDeadline.length > 0) {
                items.push({ type: 'divider' as const, id: 'divider' });
              }
              
              // Add regular booking cards (excluding urgent SOS ones to avoid duplication)
              const urgentIds = new Set(sosBookingsWithDeadline.map(b => b.id));
              const regularBookings = filteredBookings.filter(b => !urgentIds.has(b.id));
              
              regularBookings.forEach((booking, index) => {
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
                // Get SOS count - only count SOS bookings with deadline in pending tab
                const sosCount = pendingBookingsWithDeadline.filter(
                  b => b && filteredBookings.some(fb => fb.id === b.id && fb.booking_mode === 'sos')
                ).length;
                
                return (
                  <View className="px-4 pt-2 pb-2">
                    <View className="flex-row items-center bg-destructive/10 p-3 rounded-lg">
                      <Ionicons name="alert-circle" size={20} color={colors.destructive} />
                      <Text className="ml-2 text-sm font-bold text-destructive flex-1">
                        ⏰ Urgent: SOS Bookings
                      </Text>
                      <View className="bg-destructive px-2.5 py-1 rounded-full">
                        <Text className="text-xs font-bold text-destructive-foreground">
                          {sosCount}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              }
              if (item.type === 'urgent') {
                return (
                  <View className="px-4 pb-3">
                    <BookingCard booking={item.booking} isUrgent={true} />
                  </View>
                );
              }
              if (item.type === 'divider') {
                // Calculate regular bookings count (excluding SOS ones already shown above)
                const urgentIds = new Set(pendingBookingsWithDeadline.filter(
                  b => b && filteredBookings.some(fb => fb.id === b.id && fb.booking_mode === 'sos')
                ).map(b => b.id));
                const regularCount = filteredBookings.filter(b => !urgentIds.has(b.id)).length;
                
                return (
                  <View className="px-4 py-3">
                    <View className="flex-row items-center">
                      <View className="flex-1 h-px bg-border" />
                      <Text className="mx-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Other Pending ({regularCount})
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

      {/* Booking Cancellation/Decline Confirmation Dialog */}
      <DeleteConfirmationDialog
        isOpen={cancelConfirmationState.isOpen}
        title={cancelConfirmationState.action === 'decline' ? 'Decline Booking?' : 'Cancel Booking?'}
        description={cancelConfirmationState.action === 'decline' 
          ? 'Decline this service request? The customer will be refunded immediately.'
          : 'Are you sure you want to cancel this booking? The customer will be refunded immediately.'
        }
        confirmText={cancelConfirmationState.action === 'decline' ? 'Decline' : 'Cancel Booking'}
        cancelText="Keep It"
        isDangerous={true}
        onConfirm={() => {
          if (cancelConfirmationState.bookingId) {
            if (cancelConfirmationState.action === 'decline') {
              handleDeclineBookingWrapper(cancelConfirmationState.bookingId);
            } else {
              handleCancelBooking(cancelConfirmationState.bookingId);
            }
          }
          setCancelConfirmationState({ isOpen: false, bookingId: null, action: 'cancel' });
        }}
        onCancel={() => setCancelConfirmationState({ isOpen: false, bookingId: null, action: 'cancel' })}
      />
    </SafeAreaView>
  );
}
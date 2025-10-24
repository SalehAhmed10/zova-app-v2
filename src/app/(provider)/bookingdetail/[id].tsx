import React from 'react';
import { View, ScrollView, TouchableOpacity, Linking, Alert, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/text';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useProviderBookingDetail } from '@/hooks/provider';
import { useUpdateBookingStatus, useCompleteService } from '@/hooks/shared/useBookings';
import { useProviderAccess } from '@/hooks/provider/useProviderAccess';
import { useColorScheme } from '@/lib/core/useColorScheme';
import { THEME } from '@/lib/theme';
import { cn, formatCurrency } from '@/lib/utils';

export default function ProviderBookingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isDarkColorScheme, colorScheme } = useColorScheme();
  const colors = THEME[colorScheme];
  
  // ✅ REACT QUERY + ZUSTAND: Access control for payment gates
  const { 
    canAcceptBookings, 
    needsPaymentSetup,
    getPrimaryCTA 
  } = useProviderAccess();
  
  const {
    data: booking,
    isLoading,
    refetch
  } = useProviderBookingDetail(id);

  const updateBookingStatusMutation = useUpdateBookingStatus();
  const completeServiceMutation = useCompleteService();

  /**
   * ✅ PAYMENT GATE: Booking Accept Action Guard
   * This is the HIGHEST conversion touchpoint (80-90%)
   * Shows Alert modal if payment not setup
   */
  const handleAcceptBooking = async () => {
    if (!booking) return;
    
    // ✅ ACTION GUARD: Check payment setup before accepting
    if (!canAcceptBookings && needsPaymentSetup) {
      Alert.alert(
        '💳 Payment Setup Required',
        'You need to connect your payment account before accepting bookings. This ensures you can receive payments from customers.',
        [
          {
            text: 'Setup Payments',
            onPress: () => router.push('/(provider)/setup-payment' as any),
            style: 'default'
          },
          {
            text: 'Not Now',
            style: 'cancel'
          }
        ]
      );
      return; // Block the action
    }
    
    // Payment is active, proceed with accepting booking
    try {
      await updateBookingStatusMutation.mutateAsync({
        bookingId: booking.id,
        status: 'confirmed',
      });
      await refetch();
    } catch (error) {
      console.error('Error accepting booking:', error);
      Alert.alert('Error', 'Failed to accept booking. Please try again.');
    }
  };

  const handleDeclineBooking = async () => {
    if (!booking) return;

    Alert.alert(
      'Decline Booking',
      'Are you sure you want to decline this booking? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            try {
              await updateBookingStatusMutation.mutateAsync({
                bookingId: booking.id,
                status: 'declined',
              });
              await refetch();
            } catch (error) {
              console.error('Error declining booking:', error);
              Alert.alert('Error', 'Failed to decline booking. Please try again.');
            }
          }
        }
      ]
    );
  };

  const handleStartBooking = async () => {
    if (!booking) return;
    
    try {
      await updateBookingStatusMutation.mutateAsync({
        bookingId: booking.id,
        status: 'in_progress',
      });
      await refetch();
    } catch (error) {
      console.error('Error starting booking:', error);
      Alert.alert('Error', 'Failed to start booking. Please try again.');
    }
  };

  const handleCompleteBooking = async () => {
    if (!booking) return;

    Alert.alert(
      'Complete Service',
      'Are you sure you want to mark this service as complete? This will release payment to you and notify the customer.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete Service',
          style: 'default',
          onPress: async () => {
            try {
              await completeServiceMutation.mutateAsync(booking.id);
              Alert.alert(
                'Service Completed',
                'The service has been marked as complete. Payment will be released to you shortly.',
                [{ text: 'OK' }]
              );
            } catch (error) {
              console.error('Error completing service:', error);
              Alert.alert(
                'Error',
                'Failed to complete service. Please try again.',
                [{ text: 'OK' }]
              );
            }
          }
        }
      ]
    );
  };

  const handleCancelBooking = async () => {
    if (!booking) return;

    Alert.alert(
      'Cancel Booking',
      'Are you sure you want to cancel this booking? The customer will be notified.',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              await updateBookingStatusMutation.mutateAsync({
                bookingId: booking.id,
                status: 'cancelled',
              });
              await refetch();
            } catch (error) {
              console.error('Error cancelling booking:', error);
              Alert.alert('Error', 'Failed to cancel booking. Please try again.');
            }
          }
        }
      ]
    );
  };

  const handleCallCustomer = () => {
    if (booking?.customerPhone) {
      Linking.openURL(`tel:${booking.customerPhone}`);
    } else {
      Alert.alert('No Phone Number', 'Customer phone number is not available.');
    }
  };

  const handleEmailCustomer = () => {
    if (booking?.customerEmail) {
      Linking.openURL(`mailto:${booking.customerEmail}`);
    } else {
      Alert.alert('No Email', 'Customer email is not available.');
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'pending':
        return {
          bg: 'bg-yellow-50 dark:bg-yellow-950/20',
          border: 'border-yellow-200 dark:border-yellow-800',
          badge: 'bg-yellow-500',
          text: 'text-yellow-900 dark:text-yellow-200',
          icon: 'time-outline',
          description: 'Awaiting your review'
        };
      case 'confirmed':
        return {
          bg: 'bg-green-50 dark:bg-green-950/20',
          border: 'border-green-200 dark:border-green-800',
          badge: 'bg-green-500',
          text: 'text-green-900 dark:text-green-200',
          icon: 'checkmark-circle',
          description: 'You accepted this booking'
        };
      case 'in_progress':
        return {
          bg: 'bg-blue-50 dark:bg-blue-950/20',
          border: 'border-blue-200 dark:border-blue-800',
          badge: 'bg-blue-500',
          text: 'text-blue-900 dark:text-blue-200',
          icon: 'play-circle',
          description: 'Service in progress'
        };
      case 'completed':
        return {
          bg: 'bg-emerald-50 dark:bg-emerald-950/20',
          border: 'border-emerald-200 dark:border-emerald-800',
          badge: 'bg-emerald-500',
          text: 'text-emerald-900 dark:text-emerald-200',
          icon: 'checkmark-done-circle',
          description: 'Service completed'
        };
      case 'cancelled':
      case 'declined':
        return {
          bg: 'bg-red-50 dark:bg-red-950/20',
          border: 'border-red-200 dark:border-red-800',
          badge: 'bg-red-500',
          text: 'text-red-900 dark:text-red-200',
          icon: 'close-circle',
          description: 'Booking ' + status
        };
      default:
        return {
          bg: 'bg-gray-50 dark:bg-gray-950/20',
          border: 'border-gray-200 dark:border-gray-800',
          badge: 'bg-gray-500',
          text: 'text-gray-900 dark:text-gray-200',
          icon: 'help-circle',
          description: status.charAt(0).toUpperCase() + status.slice(1)
        };
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Pending Review';
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
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });

    if (isToday) dateStr = 'Today';
    if (isTomorrow) dateStr = 'Tomorrow';

    const timeStr = bookingDate.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit'
    });

    return { dateStr, timeStr };
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours === 0) return `${mins} minutes`;
    if (mins === 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
    return `${hours}h ${mins}m`;
  };

  const getActionButtons = () => {
    if (!booking) return null;

    switch (booking.status) {
      case 'pending':
        return (
          <View className="gap-3">
            <Button
              className="w-full"
              size="lg"
              onPress={handleAcceptBooking}
              disabled={updateBookingStatusMutation.isPending}
            >
              <View className="flex-row items-center gap-2">
                <Ionicons name="checkmark-circle" size={20} color="white" />
                <Text className="text-primary-foreground font-bold">
                  {updateBookingStatusMutation.isPending ? 'Accepting...' : 'Accept Booking'}
                </Text>
              </View>
            </Button>
            <Button
              variant="outline"
              className="w-full"
              size="lg"
              onPress={handleDeclineBooking}
              disabled={updateBookingStatusMutation.isPending}
            >
              <View className="flex-row items-center gap-2">
                <Ionicons name="close-circle" size={20} color={colors.foreground} />
                <Text className="text-foreground font-bold">
                  {updateBookingStatusMutation.isPending ? 'Declining...' : 'Decline Booking'}
                </Text>
              </View>
            </Button>
          </View>
        );

      case 'confirmed':
        return (
          <View className="gap-3">
            <Button
              className="w-full"
              size="lg"
              onPress={handleStartBooking}
              disabled={updateBookingStatusMutation.isPending}
            >
              <View className="flex-row items-center gap-2">
                <Ionicons name="play-circle" size={20} color="white" />
                <Text className="text-primary-foreground font-bold">
                  {updateBookingStatusMutation.isPending ? 'Starting...' : 'Start Service'}
                </Text>
              </View>
            </Button>
            <Button
              variant="outline"
              className="w-full"
              size="lg"
              onPress={handleCancelBooking}
              disabled={updateBookingStatusMutation.isPending}
            >
              <View className="flex-row items-center gap-2">
                <Ionicons name="trash" size={20} color={colors.foreground} />
                <Text className="text-foreground font-bold">
                  {updateBookingStatusMutation.isPending ? 'Cancelling...' : 'Cancel Booking'}
                </Text>
              </View>
            </Button>
          </View>
        );

      case 'in_progress':
        return (
          <Button
            className="w-full"
            size="lg"
            onPress={handleCompleteBooking}
            disabled={completeServiceMutation.isPending}
          >
            <View className="flex-row items-center gap-2">
              <Ionicons name="checkmark-done-circle" size={20} color="white" />
              <Text className="text-primary-foreground font-bold">
                {completeServiceMutation.isPending ? 'Completing...' : 'Mark as Complete'}
              </Text>
            </View>
          </Button>
        );

      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={['top']}>
        {/* Header Skeleton */}
        <View className="px-4 py-4 border-b border-border">
          <View className="flex-row items-center justify-between">
            <Skeleton className="w-8 h-8" />
            <Skeleton className="w-32 h-6" />
            <View className="w-8" />
          </View>
        </View>
        
        {/* Content Skeleton */}
        <ScrollView className="flex-1 px-4 pt-6">
          <Card className="mb-4">
            <CardContent className="p-4">
              <Skeleton className="w-full h-6 mb-4" />
              <Skeleton className="w-3/4 h-4 mb-2" />
              <Skeleton className="w-1/2 h-4" />
            </CardContent>
          </Card>
          
          {[1, 2, 3].map(i => (
            <Card key={i} className="mb-4">
              <CardContent className="p-4">
                <Skeleton className="w-1/3 h-5 mb-3" />
                <Skeleton className="w-full h-4 mb-2" />
                <Skeleton className="w-2/3 h-4" />
              </CardContent>
            </Card>
          ))}
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (!booking) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={['top']}>
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
              Booking Details
            </Text>
            <View className="w-8" />
          </View>
        </View>
        
        <View className="flex-1 items-center justify-center px-6">
          <View className="w-20 h-20 rounded-full bg-muted items-center justify-center mb-4">
            <Ionicons name="alert-circle-outline" size={40} color={colors.primary} />
          </View>
          <Text className="text-xl font-bold text-foreground mb-2">
            Booking Not Found
          </Text>
          <Text className="text-muted-foreground text-center">
            The booking you're looking for doesn't exist or may have been deleted.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const { dateStr, timeStr } = formatDateTime(booking.bookingDate, booking.startTime);
  const statusStyle = getStatusStyle(booking.status);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      {/* Header - Minimal */}
      <View className="px-4 py-3 border-b border-border bg-background/50">
        <View className="flex-row items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onPress={() => router.back()}
            className="w-8 h-8 p-0"
          >
            <Ionicons name="chevron-back" size={24} color={colors.primary} />
          </Button>
          <Text className="text-base font-semibold text-foreground">
            Booking Details
          </Text>
          <View className="w-8" />
        </View>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-4 pt-4 pb-8">
          {/* Status Header - Modern Design */}
          <Card className={cn("mb-6 border", statusStyle.border, statusStyle.bg)}>
            <CardContent className="p-5">
              <View className="flex-row items-start gap-4">
                <View className={cn("w-14 h-14 rounded-full items-center justify-center flex-shrink-0", statusStyle.badge + "/10", "border-2", statusStyle.badge + "/30")}>
                  <Ionicons 
                    name={statusStyle.icon as any} 
                    size={28} 
                    color={statusStyle.badge === 'bg-yellow-500' ? '#f59e0b' :
                           statusStyle.badge === 'bg-green-500' ? '#10b981' :
                           statusStyle.badge === 'bg-blue-500' ? '#3b82f6' :
                           statusStyle.badge === 'bg-emerald-500' ? '#059669' :
                           statusStyle.badge === 'bg-red-500' ? '#ef4444' : '#6b7280'}
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                    Booking Status
                  </Text>
                  <Text className="text-2xl font-bold text-foreground mb-2">
                    {getStatusText(booking.status)}
                  </Text>
                  <Text className={cn("text-sm font-medium", statusStyle.text)}>
                    {statusStyle.description}
                  </Text>
                </View>
              </View>
            </CardContent>
          </Card>

          {/* Service Header - Modern */}
          <Card className="mb-4 bg-primary/5 border-primary/20">
            <CardContent className="p-5">
              <View className="flex-row items-start gap-4">
                <View className="w-14 h-14 bg-primary/10 rounded-lg items-center justify-center flex-shrink-0 border border-primary/20">
                  <Ionicons name="briefcase" size={24} color={colors.primary} />
                </View>
                <View className="flex-1">
                  <Text className="text-xs font-semibold text-primary uppercase tracking-wide mb-1">
                    {booking.categoryName}
                  </Text>
                  <Text className="text-xl font-bold text-foreground mb-1">
                    {booking.serviceTitle}
                  </Text>
                  <Text className="text-sm text-muted-foreground">
                    {booking.subcategoryName}
                  </Text>
                </View>
              </View>
            </CardContent>
          </Card>

          {/* Customer Quick Actions */}
          <Card className="mb-4">
            <CardContent className="p-5">
              <View className="flex-row items-center gap-4 mb-5">
                <View className="w-14 h-14 rounded-full bg-primary/10 items-center justify-center border-2 border-primary/20">
                  <Ionicons name="person-circle" size={32} color={colors.primary} />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-bold text-foreground">
                    {booking.customerName}
                  </Text>
                  <Text className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Customer
                  </Text>
                </View>
              </View>
              
              {/* Large Action Buttons */}
              <View className="gap-3">
                {booking.customerPhone && (
                  <Pressable
                    onPress={handleCallCustomer}
                    className="flex-row items-center gap-3 p-4 bg-primary/5 border border-primary/20 rounded-lg active:bg-primary/10"
                  >
                    <View className="w-10 h-10 bg-primary/10 rounded-full items-center justify-center">
                      <Ionicons name="call" size={18} color={colors.primary} />
                    </View>
                    <View className="flex-1">
                      <Text className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Call Customer
                      </Text>
                      <Text className="text-sm font-medium text-foreground">
                        {booking.customerPhone}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} />
                  </Pressable>
                )}
                
                {booking.customerEmail && (
                  <Pressable
                    onPress={handleEmailCustomer}
                    className="flex-row items-center gap-3 p-4 bg-primary/5 border border-primary/20 rounded-lg active:bg-primary/10"
                  >
                    <View className="w-10 h-10 bg-primary/10 rounded-full items-center justify-center">
                      <Ionicons name="mail" size={18} color={colors.primary} />
                    </View>
                    <View className="flex-1">
                      <Text className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Email Customer
                      </Text>
                      <Text className="text-sm font-medium text-foreground">
                        {booking.customerEmail}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} />
                  </Pressable>
                )}
              </View>
            </CardContent>
          </Card>

          {/* Booking Details - Modern Grid */}
          <Card className="mb-4">
            <CardHeader>
              <Text className="text-base font-bold text-foreground">When & Where</Text>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <View className="gap-4">
                {/* Date Row */}
                <View className="flex-row items-center gap-4 p-3 bg-muted/30 rounded-lg">
                  <View className="w-10 h-10 bg-primary/10 rounded-full items-center justify-center">
                    <Ionicons name="calendar-outline" size={18} color={colors.primary} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Date
                    </Text>
                    <Text className="text-sm font-semibold text-foreground">
                      {dateStr}
                    </Text>
                  </View>
                </View>

                {/* Time Row */}
                <View className="flex-row items-center gap-4 p-3 bg-muted/30 rounded-lg">
                  <View className="w-10 h-10 bg-primary/10 rounded-full items-center justify-center">
                    <Ionicons name="time-outline" size={18} color={colors.primary} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Time
                    </Text>
                    <Text className="text-sm font-semibold text-foreground">
                      {timeStr}
                      {booking.endTime && ` - ${new Date(`2000-01-01T${booking.endTime}`).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`}
                    </Text>
                  </View>
                </View>

                {/* Duration Row */}
                {booking.durationMinutes && (
                  <View className="flex-row items-center gap-4 p-3 bg-muted/30 rounded-lg">
                    <View className="w-10 h-10 bg-primary/10 rounded-full items-center justify-center">
                      <Ionicons name="hourglass-outline" size={18} color={colors.primary} />
                    </View>
                    <View className="flex-1">
                      <Text className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Duration
                      </Text>
                      <Text className="text-sm font-semibold text-foreground">
                        {formatDuration(booking.durationMinutes)}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Location Row */}
                {booking.serviceAddress && (
                  <View className="flex-row items-start gap-4 p-3 bg-muted/30 rounded-lg">
                    <View className="w-10 h-10 bg-primary/10 rounded-full items-center justify-center flex-shrink-0 mt-0.5">
                      <Ionicons name="location-outline" size={18} color={colors.primary} />
                    </View>
                    <View className="flex-1">
                      <Text className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Location
                      </Text>
                      <Text className="text-sm font-semibold text-foreground">
                        {booking.serviceAddress}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            </CardContent>
          </Card>

          {/* Service Details & Notes Combined */}
          {(booking.serviceDescription || booking.customerNotes) && (
            <Card className="mb-4">
              <CardHeader>
                <Text className="text-base font-bold text-foreground">Service Details</Text>
              </CardHeader>
              <CardContent className="p-5 pt-0 gap-4">
                {booking.serviceDescription && (
                  <View>
                    <Text className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                      What They Need
                    </Text>
                    <Text className="text-sm text-foreground leading-relaxed">
                      {booking.serviceDescription}
                    </Text>
                  </View>
                )}
                
                {booking.customerNotes && (
                  <View className={booking.serviceDescription ? 'border-t border-border pt-4' : ''}>
                    <Text className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                      Customer Notes
                    </Text>
                    <View className="p-3 bg-muted/30 rounded-lg border-l-2 border-primary">
                      <Text className="text-sm text-foreground leading-relaxed">
                        {booking.customerNotes}
                      </Text>
                    </View>
                  </View>
                )}
              </CardContent>
            </Card>
          )}

          {/* Payment & Escrow Information */}
          <Card className="mb-6">
            <CardHeader>
              <Text className="text-base font-bold text-foreground">Payment Information</Text>
            </CardHeader>
            <CardContent className="p-5 pt-0 gap-4">
              {/* Pricing Breakdown */}
              <View className="space-y-3">
                <View className="flex-row justify-between items-center p-3 bg-muted/30 rounded-lg">
                  <View className="flex-row items-center gap-2">
                    <Ionicons name="pricetag-outline" size={16} color={colors.primary} />
                    <Text className="text-sm text-muted-foreground">Service Fee</Text>
                  </View>
                  <Text className="font-semibold text-foreground">
                    {formatCurrency(booking.baseAmount)}
                  </Text>
                </View>
                
                <View className="flex-row justify-between items-center p-3 bg-muted/30 rounded-lg">
                  <View className="flex-row items-center gap-2">
                    <Ionicons name="layers-outline" size={16} color={colors.primary} />
                    <Text className="text-sm text-muted-foreground">Platform Fee</Text>
                  </View>
                  <Text className="font-semibold text-foreground">
                    {formatCurrency(booking.platformFee)}
                  </Text>
                </View>
                
                <View className="border-t border-border my-2" />
                
                <View className="flex-row justify-between items-center p-4 bg-primary/5 border border-primary/20 rounded-lg">
                  <Text className="text-base font-bold text-foreground">Total</Text>
                  <Text className="text-2xl font-bold text-primary">
                    {formatCurrency(booking.totalAmount)}
                  </Text>
                </View>
              </View>

              {/* Escrow Information */}
              <View className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mt-4">
                <View className="flex-row items-start gap-3">
                  <Ionicons name="shield-checkmark-outline" size={18} color={isDarkColorScheme ? '#60a5fa' : '#3b82f6'} className="mt-0.5" />
                  <View className="flex-1">
                    <Text className="text-xs font-bold text-blue-900 dark:text-blue-200 uppercase tracking-wide mb-1">
                      Funds in Escrow
                    </Text>
                    <Text className="text-xs text-blue-800 dark:text-blue-300 leading-relaxed">
                      Payment is securely held and released to you only after the service is completed and confirmed
                    </Text>
                  </View>
                </View>
              </View>

              {/* Payment Status */}
              <View className="flex-row items-center gap-2 p-3 bg-muted/30 rounded-lg">
                <View className={cn(
                  "w-2.5 h-2.5 rounded-full",
                  booking.paymentStatus === 'paid' ? 'bg-green-500' : 
                  booking.paymentStatus === 'pending' ? 'bg-yellow-500' : 'bg-red-500'
                )} />
                <Text className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Status: {booking.paymentStatus.charAt(0).toUpperCase() + booking.paymentStatus.slice(1)}
                </Text>
              </View>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          {getActionButtons()}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
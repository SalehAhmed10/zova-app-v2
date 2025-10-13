import React from 'react';
import { View, ScrollView, TouchableOpacity, Linking, Alert } from 'react-native';
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500';
      case 'confirmed': return 'bg-green-500';
      case 'in_progress': return 'bg-blue-500';
      case 'completed': return 'bg-emerald-500';
      case 'cancelled': return 'bg-red-500';
      case 'declined': return 'bg-red-500';
      case 'expired': return 'bg-gray-500';
      default: return 'bg-gray-500';
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
          <View className="flex-row gap-3">
            <Button
              className="flex-1"
              onPress={handleAcceptBooking}
              disabled={updateBookingStatusMutation.isPending}
            >
              <Text className="text-primary-foreground font-semibold">
                {updateBookingStatusMutation.isPending ? 'Accepting...' : 'Accept Booking'}
              </Text>
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onPress={handleDeclineBooking}
              disabled={updateBookingStatusMutation.isPending}
            >
              <Text className="text-foreground font-semibold">
                {updateBookingStatusMutation.isPending ? 'Declining...' : 'Decline'}
              </Text>
            </Button>
          </View>
        );

      case 'confirmed':
        return (
          <View className="flex-row gap-3">
            <Button
              className="flex-1"
              onPress={handleStartBooking}
              disabled={updateBookingStatusMutation.isPending}
            >
              <Text className="text-primary-foreground font-semibold">
                {updateBookingStatusMutation.isPending ? 'Starting...' : 'Start Service'}
              </Text>
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onPress={handleCancelBooking}
              disabled={updateBookingStatusMutation.isPending}
            >
              <Text className="text-destructive-foreground font-semibold">
                {updateBookingStatusMutation.isPending ? 'Cancelling...' : 'Cancel'}
              </Text>
            </Button>
          </View>
        );

      case 'in_progress':
        return (
          <Button
            className="w-full"
            onPress={handleCompleteBooking}
            disabled={completeServiceMutation.isPending}
          >
            <Text className="text-primary-foreground font-semibold">
              {completeServiceMutation.isPending ? 'Completing...' : 'Mark as Complete'}
            </Text>
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
            Booking Details
          </Text>
          <View className="w-8" />
        </View>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-4 pt-6 pb-8">
          {/* Status Header */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <View className="items-center">
                <Badge
                  className={cn("mb-3", getStatusColor(booking.status))}
                  variant="secondary"
                >
                  <Text className="text-white text-sm font-semibold">
                    {getStatusText(booking.status)}
                  </Text>
                </Badge>
                <Text className="text-2xl font-bold text-foreground mb-2">
                  {booking.serviceTitle}
                </Text>
                <Text className="text-lg text-muted-foreground text-center">
                  {booking.categoryName} • {booking.subcategoryName}
                </Text>
              </View>
            </CardContent>
          </Card>

          {/* Customer Information */}
          <Card className="mb-4">
            <CardHeader>
              <Text className="text-lg font-semibold text-foreground">Customer Information</Text>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <View className="flex-row items-center mb-4">
                <View className="w-12 h-12 rounded-full bg-primary/10 items-center justify-center mr-4">
                  <Ionicons name="person" size={24} color={colors.primary} />
                </View>
                <View className="flex-1">
                  <Text className="text-lg font-semibold text-foreground">
                    {booking.customerName}
                  </Text>
                  <Text className="text-sm text-muted-foreground">
                    Customer
                  </Text>
                </View>
              </View>
              
              <View className="flex-row gap-3">
                {booking.customerPhone && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onPress={handleCallCustomer}
                  >
                    <Ionicons name="call" size={16} color={colors.primary} />
                    <Text className="text-foreground ml-2">Call</Text>
                  </Button>
                )}
                {booking.customerEmail && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onPress={handleEmailCustomer}
                  >
                    <Ionicons name="mail" size={16} color={colors.primary} />
                    <Text className="text-foreground ml-2">Email</Text>
                  </Button>
                )}
              </View>
            </CardContent>
          </Card>

          {/* Booking Details */}
          <Card className="mb-4">
            <CardHeader>
              <Text className="text-lg font-semibold text-foreground">Booking Details</Text>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <View className="gap-4">
                <View className="flex-row items-center">
                  <Ionicons name="calendar-outline" size={20} color={colors.primary} />
                  <View className="ml-3 flex-1">
                    <Text className="text-sm text-muted-foreground">Date</Text>
                    <Text className="text-base font-semibold text-foreground">{dateStr}</Text>
                  </View>
                </View>

                <View className="flex-row items-center">
                  <Ionicons name="time-outline" size={20} color={colors.primary} />
                  <View className="ml-3 flex-1">
                    <Text className="text-sm text-muted-foreground">Time</Text>
                    <Text className="text-base font-semibold text-foreground">
                      {timeStr}
                      {booking.endTime && ` - ${new Date(`2000-01-01T${booking.endTime}`).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`}
                    </Text>
                  </View>
                </View>

                {booking.durationMinutes && (
                  <View className="flex-row items-center">
                    <Ionicons name="hourglass-outline" size={20} color={colors.primary} />
                    <View className="ml-3 flex-1">
                      <Text className="text-sm text-muted-foreground">Duration</Text>
                      <Text className="text-base font-semibold text-foreground">
                        {formatDuration(booking.durationMinutes)}
                      </Text>
                    </View>
                  </View>
                )}

                {booking.serviceAddress && (
                  <View className="flex-row items-start">
                    <Ionicons name="location-outline" size={20} color={colors.primary} />
                    <View className="ml-3 flex-1">
                      <Text className="text-sm text-muted-foreground">Location</Text>
                      <Text className="text-base font-semibold text-foreground">
                        {booking.serviceAddress}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            </CardContent>
          </Card>

          {/* Service Description */}
          {booking.serviceDescription && (
            <Card className="mb-4">
              <CardHeader>
                <Text className="text-lg font-semibold text-foreground">Service Description</Text>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <Text className="text-base text-foreground leading-relaxed">
                  {booking.serviceDescription}
                </Text>
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          {booking.customerNotes && (
            <Card className="mb-4">
              <CardHeader>
                <Text className="text-lg font-semibold text-foreground">Customer Notes</Text>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <Text className="text-base text-foreground leading-relaxed">
                  {booking.customerNotes}
                </Text>
              </CardContent>
            </Card>
          )}

          {/* Pricing Details */}
          <Card className="mb-6">
            <CardHeader>
              <Text className="text-lg font-semibold text-foreground">Pricing</Text>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <View className="gap-3">
                <View className="flex-row justify-between items-center">
                  <Text className="text-base text-foreground">Service Fee</Text>
                  <Text className="text-base font-semibold text-foreground">
                    {formatCurrency(booking.baseAmount)}
                  </Text>
                </View>
                
                <View className="flex-row justify-between items-center">
                  <Text className="text-base text-foreground">Platform Fee</Text>
                  <Text className="text-base font-semibold text-foreground">
                    {formatCurrency(booking.platformFee)}
                  </Text>
                </View>
                
                <View className="h-px bg-border my-2" />
                
                <View className="flex-row justify-between items-center">
                  <Text className="text-lg font-bold text-foreground">Total</Text>
                  <Text className="text-xl font-bold text-primary">
                    {formatCurrency(booking.totalAmount)}
                  </Text>
                </View>
                
                <View className="flex-row items-center mt-2">
                  <View className={cn(
                    "w-2 h-2 rounded-full mr-2",
                    booking.paymentStatus === 'paid' ? 'bg-green-500' : 
                    booking.paymentStatus === 'pending' ? 'bg-yellow-500' : 'bg-red-500'
                  )} />
                  <Text className="text-sm text-muted-foreground">
                    Payment: {booking.paymentStatus.charAt(0).toUpperCase() + booking.paymentStatus.slice(1)}
                  </Text>
                </View>
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
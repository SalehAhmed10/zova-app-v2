import React, { useState } from 'react';
import { View, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Ionicons } from '@expo/vector-icons';

// React Query hooks
import { useCustomerBookingDetail } from '@/hooks/customer/useBookings';
import { useCancelBooking } from '@/hooks/customer';

// UI Components
import { Skeleton } from '@/components/ui/skeleton';
import { ReviewPrompt } from '@/components/ui/review-prompt';

export default function BookingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: booking, isLoading } = useCustomerBookingDetail(id);
  const cancelBookingMutation = useCancelBooking();
  const [isProcessing, setIsProcessing] = useState(false);
  const [showReviewPrompt, setShowReviewPrompt] = useState(false);

  const handleCancelBooking = () => {
    Alert.alert(
      'Cancel Booking',
      'Are you sure you want to cancel this booking? You will receive a full refund.',
      [
        { text: 'No', style: 'cancel' },
        { 
          text: 'Yes, Cancel', 
          style: 'destructive',
          onPress: async () => {
            setIsProcessing(true);
            try {
              await cancelBookingMutation.mutateAsync({
                bookingId: id!,
                reason: 'Customer requested cancellation',
              });
              router.back();
            } catch (error) {
              console.error('Cancel booking error:', error);
              // Error handling is done in the hook
            } finally {
              setIsProcessing(false);
            }
          }
        }
      ]
    );
  };

  const handleRescheduleBooking = () => {
    // Navigate to reschedule screen (could be implemented later)
    Alert.alert('Coming Soon', 'Rescheduling feature will be available soon!');
  };

  const handleContactProvider = () => {
    // Navigate to messages or contact provider
    Alert.alert('Coming Soon', 'Contact provider feature will be available soon!');
  };

  const handleLeaveReview = () => {
    setShowReviewPrompt(true);
  };

  const handleReviewDismissed = () => {
    setShowReviewPrompt(false);
  };

  const handleReviewSubmitted = () => {
    // Refresh booking data to show review submitted status
    // The query will be invalidated by the useSubmitReview hook
  };



  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 px-4 py-4">
          <Skeleton className="w-full h-8 mb-4" />
          <Card className="mb-4">
            <CardContent className="p-4">
              <Skeleton className="w-3/4 h-6 mb-2" />
              <Skeleton className="w-1/2 h-4 mb-2" />
              <Skeleton className="w-full h-20" />
            </CardContent>
          </Card>
        </View>
      </SafeAreaView>
    );
  }

  if (!booking) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 justify-center items-center px-4">
          <Ionicons name="alert-circle" size={48} className="text-destructive mb-4" />
          <Text className="text-xl font-semibold text-foreground mb-2">
            Booking Not Found
          </Text>
          <Text className="text-muted-foreground text-center mb-6">
            The booking you're looking for doesn't exist or may have been deleted.
          </Text>
          <Button onPress={() => router.back()}>
            <Text className="text-primary-foreground font-medium">Go Back</Text>
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView className="flex-1">
        {/* Header */}
        <View className="px-4 py-4 border-b border-border">
          <View className="flex-row items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onPress={() => router.back()}
              className="w-8 h-8 p-0"
            >
              <Ionicons name="chevron-back" size={24} className="text-primary" />
            </Button>
            <Text className="text-xl font-bold text-foreground">
              Booking Details
            </Text>
            <View className="w-8" />
          </View>
        </View>

        <View className="px-4 py-4">
          {/* Service Information */}
          <Card className="mb-4">
            <CardHeader>
              <CardTitle className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-3 flex-1">
                  {booking.sos_booking && (
                    <Badge variant="destructive" className="bg-red-500">
                      <View className="flex-row items-center gap-1">
                        <Ionicons name="medical" size={12} color="white" />
                        <Text className="text-xs text-white font-semibold">SOS</Text>
                      </View>
                    </Badge>
                  )}
                  <Text className="text-lg font-semibold text-foreground flex-1">
                    {booking.service_title}
                  </Text>

                  <Badge variant={
                    booking.status === 'confirmed' ? 'default' :
                      booking.status === 'completed' ? 'secondary' :
                        booking.status === 'cancelled' ? 'destructive' : 'outline'
                  }>
                    <Text className="text-xs capitalize">{booking.status}</Text>
                  </Badge>
                </View>
             
              </CardTitle>
            </CardHeader>
            <CardContent>
              {booking.sos_booking && (
                <Text className="text-xs text-orange-600 font-medium mb-3">
                  Emergency Booking • Fast Response
                </Text>
              )}
              
              <View className="gap-3">
                {/* Provider Info */}
                <View className="flex-row items-center gap-3">
                  <Ionicons name="person" size={16} className="text-muted-foreground" />
                  <Text className="text-foreground">
                    {booking.business_name || `${booking.provider_first_name} ${booking.provider_last_name}`}
                  </Text>
                </View>

                {/* Date & Time */}
                <View className="flex-row items-start gap-3">
                  <Ionicons name="calendar" size={16} className="text-muted-foreground mt-0.5" />
                  <Text className="text-foreground flex-1" numberOfLines={0}>
                    {new Date(booking.booking_date).toLocaleDateString('en-GB', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })} at {booking.start_time}
                  </Text>
                </View>

                {/* Location */}
                {booking.service_location && (
                  <View className="flex-row items-center gap-3">
                    <Ionicons name="location" size={16} className="text-muted-foreground" />
                    <Text className="text-foreground flex-1">
                      {booking.service_location}
                    </Text>
                  </View>
                )}

                {/* Notes */}
                {booking.emergency_description && (
                  <View className="flex-row items-start gap-3">
                    <Ionicons name="document-text" size={16} className="text-muted-foreground mt-0.5" />
                    <View className="flex-1">
                      <Text className="text-sm font-medium text-foreground mb-1">Notes:</Text>
                      <Text className="text-sm text-muted-foreground">
                        {booking.emergency_description}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            </CardContent>
          </Card>

          {/* Price Information */}
          <Card className="mb-4">
            <CardHeader>
              <CardTitle>
                <Text className="text-lg font-semibold text-foreground">Price Details</Text>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <View className="gap-2">
                <View className="flex-row justify-between">
                  <Text className="text-foreground">Base Amount:</Text>
                  <Text className="text-foreground">£{Number(booking.base_amount || 0).toFixed(2)}</Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-foreground">Platform Fee:</Text>
                  <Text className="text-foreground">£{Number(booking.platform_fee || 0).toFixed(2)}</Text>
                </View>
                <View className="border-t border-border pt-2 mt-2">
                  <View className="flex-row justify-between">
                    <Text className="text-lg font-semibold text-foreground">Total:</Text>
                    <Text className="text-lg font-bold text-primary">
                      £{Number(booking.total_amount || 0).toFixed(2)}
                    </Text>
                  </View>
                </View>
              </View>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <View className="gap-3">
            {booking.status === 'confirmed' && (
              <>
                <Button
                  onPress={handleContactProvider}
                  className="w-full"
                  variant="outline"
                >
                  <View className="flex-row items-center gap-2">
                    <Ionicons name="chatbubbles" size={16} color="#007AFF" />
                    <Text className="text-primary font-medium">Contact Provider</Text>
                  </View>
                </Button>

                <Button
                  onPress={handleRescheduleBooking}
                  className="w-full"
                  variant="outline"
                >
                  <View className="flex-row items-center gap-2">
                    <Ionicons name="time" size={16} color="#007AFF" />
                    <Text className="text-primary font-medium">Reschedule</Text>
                  </View>
                </Button>

                <Button
                  onPress={handleCancelBooking}
                  className="w-full"
                  variant="destructive"
                  disabled={isProcessing}
                >
                  <View className="flex-row items-center gap-2">
                    <Ionicons name="close-circle" size={16} color="white" />
                    <Text className="text-primary-foreground font-medium">
                      {isProcessing ? 'Processing...' : 'Cancel Booking'}
                    </Text>
                  </View>
                </Button>

                <View className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg mt-2">
                  <View className="flex-row items-center gap-2 mb-2">
                    <Ionicons name="information-circle" size={20} color="#007AFF" />
                    <Text className="text-blue-600 dark:text-blue-400 font-medium">Booking Confirmed</Text>
                  </View>
                  <Text className="text-blue-600 dark:text-blue-400 text-sm">
                    Your booking is confirmed! The provider will contact you shortly or arrive at the scheduled time. 
                    {booking.sos_booking && " As this is an SOS booking, expect faster response time."}
                  </Text>
                </View>
              </>
            )}

            {booking.status === 'in_progress' && (
              <>
                <Button
                  onPress={handleContactProvider}
                  className="w-full"
                  variant="outline"
                >
                  <View className="flex-row items-center gap-2">
                    <Ionicons name="chatbubbles" size={16} color="#007AFF" />
                    <Text className="text-primary font-medium">Contact Provider</Text>
                  </View>
                </Button>

                <View className="bg-green-50 dark:bg-green-950 p-4 rounded-lg">
                  <View className="flex-row items-center gap-2 mb-2">
                    <Ionicons name="play-circle" size={20} color="#22c55e" />
                    <Text className="text-green-600 dark:text-green-400 font-medium">Service in Progress</Text>
                  </View>
                  <Text className="text-green-600 dark:text-green-400 text-sm">
                    Your provider is currently working on your service. You'll be notified when it's completed.
                  </Text>
                </View>
              </>
            )}

            {booking.status === 'completed' && (
              <>
                {!(booking as any).customer_review_submitted && (
                  <Button
                    onPress={handleLeaveReview}
                    className="w-full"
                  >
                    <View className="flex-row items-center gap-2">
                      <Ionicons name="star" size={16} color="white" />
                      <Text className="text-primary-foreground font-medium">Leave Review</Text>
                    </View>
                  </Button>
                )}

                {(booking as any).customer_review_submitted && (
                  <View className="bg-green-50 dark:bg-green-950 p-4 rounded-lg mb-4">
                    <View className="flex-row items-center gap-2 mb-2">
                      <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
                      <Text className="text-green-600 dark:text-green-400 font-medium">Review Submitted</Text>
                    </View>
                    <Text className="text-green-600 dark:text-green-400 text-sm">
                      Thank you for your feedback! Your review helps other customers.
                    </Text>
                  </View>
                )}

                <View className="bg-green-50 dark:bg-green-950 p-4 rounded-lg">
                  <View className="flex-row items-center gap-2 mb-2">
                    <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
                    <Text className="text-green-600 dark:text-green-400 font-medium">Service Completed</Text>
                  </View>
                  <Text className="text-green-600 dark:text-green-400 text-sm">
                    Great! Your service has been completed. {!(booking as any).customer_review_submitted && 'Please leave a review to help other customers.'}
                  </Text>
                </View>
              </>
            )}

            {booking.status === 'pending' && (
              <>
                <Button
                  onPress={handleCancelBooking}
                  className="w-full"
                  variant="destructive"
                  disabled={cancelBookingMutation.isPending || isProcessing}
                >
                  <View className="flex-row items-center gap-2">
                    <Ionicons name="close-circle" size={16} color="white" />
                    <Text className="text-primary-foreground font-medium">
                      {(cancelBookingMutation.isPending || isProcessing) ? 'Cancelling & Processing Refund...' : 'Cancel Booking'}
                    </Text>
                  </View>
                </Button>

                <View className="bg-yellow-50 dark:bg-yellow-950 p-4 rounded-lg">
                  <View className="flex-row items-center gap-2 mb-2">
                    <Ionicons name="time" size={20} color="#f59e0b" />
                    <Text className="text-yellow-600 dark:text-yellow-400 font-medium">Awaiting Provider Response</Text>
                  </View>
                  <Text className="text-yellow-600 dark:text-yellow-400 text-sm">
                    Your booking request has been sent to the provider. They will respond shortly to confirm availability.
                  </Text>
                </View>
              </>
            )}

            {booking.status === 'cancelled' && (
              <View className="bg-red-50 dark:bg-red-950 p-4 rounded-lg">
                <View className="flex-row items-center gap-2 mb-2">
                  <Ionicons name="close-circle" size={20} color="#ef4444" />
                  <Text className="text-red-600 dark:text-red-400 font-medium">Booking Cancelled</Text>
                </View>
                <Text className="text-red-600 dark:text-red-400 text-sm">
                  This booking has been cancelled. You can book a new service anytime.
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      <ReviewPrompt
        bookingId={id!}
        providerName={`${booking.provider_first_name} ${booking.provider_last_name}`}
        serviceName={booking.service_title}
        isVisible={showReviewPrompt}
        onDismiss={handleReviewDismissed}
        onReviewSubmitted={handleReviewSubmitted}
      />
    </SafeAreaView>
  );
}
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
          {/* Status Card - Large and Prominent */}
          <View className="mb-4 p-4 rounded-lg border-l-4" style={{
            backgroundColor: 
              booking.status === 'confirmed' ? '#fef3c7' :
              booking.status === 'completed' ? '#dcfce7' :
              booking.status === 'in_progress' ? '#dbeafe' :
              booking.status === 'cancelled' ? '#fee2e2' :
              '#fef3c7',
            borderLeftColor:
              booking.status === 'confirmed' ? '#f59e0b' :
              booking.status === 'completed' ? '#22c55e' :
              booking.status === 'in_progress' ? '#0ea5e9' :
              booking.status === 'cancelled' ? '#ef4444' :
              '#f59e0b'
          }}>
            <View className="flex-row items-start gap-3">
              <View className="w-12 h-12 rounded-full items-center justify-center" style={{
                backgroundColor:
                  booking.status === 'confirmed' ? '#fcd34d' :
                  booking.status === 'completed' ? '#86efac' :
                  booking.status === 'in_progress' ? '#7dd3fc' :
                  booking.status === 'cancelled' ? '#fca5a5' :
                  '#fcd34d'
              }}>
                <Ionicons 
                  name={
                    booking.status === 'confirmed' ? 'checkmark-circle' :
                    booking.status === 'completed' ? 'checkmark-done-circle' :
                    booking.status === 'in_progress' ? 'play-circle' :
                    booking.status === 'cancelled' ? 'close-circle' :
                    'time-outline'
                  }
                  size={24}
                  color={
                    booking.status === 'confirmed' ? '#b45309' :
                    booking.status === 'completed' ? '#15803d' :
                    booking.status === 'in_progress' ? '#0369a1' :
                    booking.status === 'cancelled' ? '#991b1b' :
                    '#b45309'
                  }
                />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-bold mb-1" style={{
                  color:
                    booking.status === 'confirmed' ? '#b45309' :
                    booking.status === 'completed' ? '#15803d' :
                    booking.status === 'in_progress' ? '#0369a1' :
                    booking.status === 'cancelled' ? '#991b1b' :
                    '#b45309'
                }}>
                  {booking.status === 'confirmed' ? 'CONFIRMED' :
                   booking.status === 'completed' ? 'COMPLETED' :
                   booking.status === 'in_progress' ? 'IN PROGRESS' :
                   booking.status === 'cancelled' ? 'CANCELLED' :
                   'PENDING'}
                </Text>
                <Text className="text-xs leading-4" style={{
                  color:
                    booking.status === 'confirmed' ? '#92400e' :
                    booking.status === 'completed' ? '#166534' :
                    booking.status === 'in_progress' ? '#164e63' :
                    booking.status === 'cancelled' ? '#7c2d12' :
                    '#92400e'
                }}>
                  {booking.status === 'confirmed' ? 'Your booking is confirmed! Provider will arrive at the scheduled time.' :
                   booking.status === 'completed' ? 'Service completed successfully.' :
                   booking.status === 'in_progress' ? 'Service is in progress.' :
                   booking.status === 'cancelled' ? 'This booking has been cancelled.' :
                   'Awaiting provider response to confirm availability.'}
                </Text>
              </View>
            </View>
          </View>

          {/* Service Header */}
          <View className="mb-4 flex-row items-start gap-3">
            <View className="w-12 h-12 bg-primary/10 rounded-lg items-center justify-center">
              <Ionicons name="construct" size={24} className="text-primary" />
            </View>
            <View className="flex-1">
              <Text className="text-lg font-bold text-foreground">
                {booking.service_title}
              </Text>
              {booking.sos_booking && (
                <View className="flex-row items-center gap-1 mt-1">
                  <Ionicons name="medical" size={12} color="#ef4444" />
                  <Text className="text-xs text-red-600 font-semibold">Emergency Booking • Fast Response</Text>
                </View>
              )}
            </View>
          </View>

          {/* Provider Info Card */}
          <Card className="mb-4 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
            <CardContent className="p-4">
              <View className="flex-row items-center gap-3">
                <View className="w-10 h-10 bg-primary/20 rounded-full items-center justify-center">
                  <Ionicons name="person" size={18} className="text-primary" />
                </View>
                <View className="flex-1">
                  <Text className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">
                    Service Provider
                  </Text>
                  <Text className="text-base font-bold text-foreground">
                    {booking.business_name || `${booking.provider_first_name} ${booking.provider_last_name}`}
                  </Text>
                </View>
              </View>
            </CardContent>
          </Card>

          {/* When & Where - Grid Layout */}
          <Card className="mb-4 bg-card">
            <CardHeader>
              <CardTitle>
                <Text className="text-lg font-bold text-foreground">When & Where</Text>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <View className="gap-3">
                {/* Date Row */}
                <View className="bg-muted/30 rounded-lg p-3 flex-row items-center gap-3">
                  <View className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg items-center justify-center">
                    <Ionicons name="calendar" size={18} color="#0ea5e9" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-xs font-semibold text-muted-foreground mb-0.5">DATE</Text>
                    <Text className="text-sm font-semibold text-foreground">
                      {new Date(booking.booking_date).toLocaleDateString('en-GB', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </Text>
                  </View>
                </View>

                {/* Time Row */}
                <View className="bg-muted/30 rounded-lg p-3 flex-row items-center gap-3">
                  <View className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-lg items-center justify-center">
                    <Ionicons name="time" size={18} color="#f97316" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-xs font-semibold text-muted-foreground mb-0.5">TIME</Text>
                    <Text className="text-sm font-semibold text-foreground">
                      {booking.start_time}
                    </Text>
                  </View>
                </View>

                {/* Location Row */}
                {booking.service_location && (
                  <View className="bg-muted/30 rounded-lg p-3 flex-row items-start gap-3">
                    <View className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg items-center justify-center">
                      <Ionicons name="location" size={18} color="#10b981" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-xs font-semibold text-muted-foreground mb-0.5">LOCATION</Text>
                      <Text className="text-sm font-semibold text-foreground" numberOfLines={2}>
                        {booking.service_location}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Notes Section */}
                {booking.emergency_description && (
                  <View className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-3 border-l-4 border-blue-400">
                    <View className="flex-row items-start gap-2 mb-2">
                      <Ionicons name="document-text" size={16} color="#0ea5e9" />
                      <Text className="text-xs font-bold text-blue-900 dark:text-blue-200 flex-1">CUSTOMER NOTES</Text>
                    </View>
                    <Text className="text-sm text-blue-800 dark:text-blue-300 leading-4">
                      {booking.emergency_description}
                    </Text>
                  </View>
                )}
              </View>
            </CardContent>
          </Card>

          {/* Price Information */}
          <Card className="mb-4 bg-card">
            <CardHeader>
              <CardTitle>
                <Text className="text-lg font-semibold text-foreground">Price Details</Text>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <View className="gap-2">
                <View className="flex-row justify-between">
                  <Text className="text-foreground">Service Fee:</Text>
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

              {/* 🔴 CRITICAL: Escrow Explanation Card */}
              <View className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mt-4">
                <View className="flex-row items-start gap-3">
                  <Ionicons name="shield-checkmark-outline" size={20} color="#3b82f6" />
                  <View className="flex-1">
                    <Text className="text-xs font-bold text-blue-900 dark:text-blue-200 mb-1">
                      💳 SECURE PAYMENT (ESCROW)
                    </Text>
                    <Text className="text-xs text-blue-800 dark:text-blue-300 leading-4">
                      Your payment is securely held and released to the provider only after the service is completed and you're satisfied with the work.
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
                  className="w-full h-12"
                  variant="outline"
                >
                  <View className="flex-row items-center justify-center gap-2 w-full">
                    <Ionicons name="chatbubbles" size={18} color="#0ea5e9" />
                    <Text className="text-primary font-semibold text-base">Contact Provider</Text>
                  </View>
                </Button>

                <Button
                  onPress={handleRescheduleBooking}
                  className="w-full h-12"
                  variant="outline"
                >
                  <View className="flex-row items-center justify-center gap-2 w-full">
                    <Ionicons name="time" size={18} color="#0ea5e9" />
                    <Text className="text-primary font-semibold text-base">Reschedule</Text>
                  </View>
                </Button>

                <Button
                  onPress={handleCancelBooking}
                  className="w-full h-12"
                  variant="destructive"
                  disabled={isProcessing}
                >
                  <View className="flex-row items-center justify-center gap-2 w-full">
                    <Ionicons name="close-circle" size={18} color="white" />
                    <Text className="text-primary-foreground font-semibold text-base">
                      {isProcessing ? 'Processing...' : 'Cancel Booking'}
                    </Text>
                  </View>
                </Button>

                <View className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800 mt-2">
                  <View className="flex-row items-center gap-2 mb-2">
                    <Ionicons name="information-circle" size={18} color="#0ea5e9" />
                    <Text className="text-blue-900 dark:text-blue-200 font-semibold text-sm">Booking Confirmed</Text>
                  </View>
                  <Text className="text-blue-800 dark:text-blue-300 text-xs leading-4">
                    Your booking is confirmed! The provider will contact you shortly or arrive at the scheduled time.{' '}
                    {booking.sos_booking && 'As this is an SOS booking, expect faster response time.'}
                  </Text>
                </View>
              </>
            )}

            {booking.status === 'in_progress' && (
              <>
                <Button
                  onPress={handleContactProvider}
                  className="w-full h-12"
                  variant="outline"
                >
                  <View className="flex-row items-center justify-center gap-2 w-full">
                    <Ionicons name="chatbubbles" size={18} color="#0ea5e9" />
                    <Text className="text-primary font-semibold text-base">Contact Provider</Text>
                  </View>
                </Button>

                <View className="bg-green-50 dark:bg-green-950/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                  <View className="flex-row items-center gap-2 mb-2">
                    <Ionicons name="play-circle" size={18} color="#10b981" />
                    <Text className="text-green-900 dark:text-green-200 font-semibold text-sm">Service in Progress</Text>
                  </View>
                  <Text className="text-green-800 dark:text-green-300 text-xs leading-4">
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
                    className="w-full h-12"
                  >
                    <View className="flex-row items-center justify-center gap-2 w-full">
                      <Ionicons name="star" size={18} color="white" />
                      <Text className="text-primary-foreground font-semibold text-base">Leave Review</Text>
                    </View>
                  </Button>
                )}

                {(booking as any).customer_review_submitted && (
                  <View className="bg-green-50 dark:bg-green-950/20 p-4 rounded-lg border border-green-200 dark:border-green-800 mb-3">
                    <View className="flex-row items-center gap-2 mb-2">
                      <Ionicons name="checkmark-circle" size={18} color="#10b981" />
                      <Text className="text-green-900 dark:text-green-200 font-semibold text-sm">Review Submitted</Text>
                    </View>
                    <Text className="text-green-800 dark:text-green-300 text-xs leading-4">
                      Thank you for your feedback! Your review helps other customers.
                    </Text>
                  </View>
                )}

                <View className="bg-green-50 dark:bg-green-950/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                  <View className="flex-row items-center gap-2 mb-2">
                    <Ionicons name="checkmark-done-circle" size={18} color="#10b981" />
                    <Text className="text-green-900 dark:text-green-200 font-semibold text-sm">Service Completed</Text>
                  </View>
                  <Text className="text-green-800 dark:text-green-300 text-xs leading-4">
                    Great! Your service has been completed.{' '}
                    {!(booking as any).customer_review_submitted && 'Please leave a review to help other customers.'}
                  </Text>
                </View>
              </>
            )}

            {booking.status === 'pending' && (
              <>
                <Button
                  onPress={handleCancelBooking}
                  className="w-full h-12"
                  variant="destructive"
                  disabled={cancelBookingMutation.isPending || isProcessing}
                >
                  <View className="flex-row items-center justify-center gap-2 w-full">
                    <Ionicons name="close-circle" size={18} color="white" />
                    <Text className="text-primary-foreground font-semibold text-base">
                      {(cancelBookingMutation.isPending || isProcessing) ? 'Processing Refund...' : 'Cancel Booking'}
                    </Text>
                  </View>
                </Button>

                <View className="bg-yellow-50 dark:bg-yellow-950/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <View className="flex-row items-center gap-2 mb-2">
                    <Ionicons name="time" size={18} color="#f59e0b" />
                    <Text className="text-yellow-900 dark:text-yellow-200 font-semibold text-sm">Awaiting Response</Text>
                  </View>
                  <Text className="text-yellow-800 dark:text-yellow-300 text-xs leading-4">
                    Your booking request has been sent to the provider. They will respond shortly to confirm availability.
                  </Text>
                </View>
              </>
            )}

            {booking.status === 'cancelled' && (
              <View className="bg-red-50 dark:bg-red-950/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
                <View className="flex-row items-center gap-2 mb-2">
                  <Ionicons name="close-circle" size={18} color="#ef4444" />
                  <Text className="text-red-900 dark:text-red-200 font-semibold text-sm">Booking Cancelled</Text>
                </View>
                <Text className="text-red-800 dark:text-red-300 text-xs leading-4">
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
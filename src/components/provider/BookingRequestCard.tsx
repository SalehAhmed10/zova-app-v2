import React, { useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Card, CardContent } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { CountdownTimer } from './CountdownTimer';
import { DeclineReasonModal } from './DeclineReasonModal';
import { useAcceptBooking } from '@/hooks/provider/useAcceptBooking';
import { useDeclineBooking } from '@/hooks/provider/useDeclineBooking';

interface BookingRequestCardProps {
  booking: {
    id: string;
    provider_response_deadline: string;
    base_amount: number;
    total_amount: number;
    created_at: string;
    customer: {
      email: string;
      first_name?: string;
      last_name?: string;
    };
    service: {
      title: string;
      description?: string;
      base_price: number;
    };
  };
}

/**
 * Card displaying a pending booking request with accept/decline actions
 */
export function BookingRequestCard({ booking }: BookingRequestCardProps) {
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  
  const acceptMutation = useAcceptBooking();
  const declineMutation = useDeclineBooking();

  const isProcessing = acceptMutation.isPending || declineMutation.isPending;

  const customerName = booking.customer.first_name && booking.customer.last_name
    ? `${booking.customer.first_name} ${booking.customer.last_name}`
    : booking.customer.email;

  const handleAccept = () => {
    acceptMutation.mutate(booking.id);
  };

  const handleDecline = (reason: string) => {
    declineMutation.mutate({
      bookingId: booking.id,
      reason,
    });
    setShowDeclineModal(false);
  };

  return (
    <>
      <Card className="mb-4">
        <CardContent className="p-4">
          {/* Header */}
          <View className="flex-row justify-between items-start mb-3">
            <View className="flex-1">
              <Text variant="h4" className="mb-1">
                {booking.service.title}
              </Text>
              <Text className="text-muted-foreground text-sm">
                Customer: {customerName}
              </Text>
            </View>
            <CountdownTimer deadline={booking.provider_response_deadline} />
          </View>

          {/* Service Details */}
          {booking.service.description && (
            <Text className="text-sm text-muted-foreground mb-3">
              {booking.service.description}
            </Text>
          )}

          {/* Pricing */}
          <View className="flex-row justify-between items-center mb-4 pb-3 border-b border-border">
            <Text className="text-sm text-muted-foreground">
              Service Price:
            </Text>
            <Text className="font-semibold">
              £{booking.base_amount.toFixed(2)}
            </Text>
          </View>

          {/* Actions */}
          <View className="flex-row gap-3">
            <Button
              variant="default"
              onPress={handleAccept}
              disabled={isProcessing}
              className="flex-1"
            >
              {acceptMutation.isPending ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text className="text-primary-foreground font-semibold">
                  Accept
                </Text>
              )}
            </Button>
            
            <Button
              variant="outline"
              onPress={() => setShowDeclineModal(true)}
              disabled={isProcessing}
              className="flex-1"
            >
              {declineMutation.isPending ? (
                <ActivityIndicator size="small" />
              ) : (
                <Text className="font-semibold">Decline</Text>
              )}
            </Button>
          </View>

          {/* Processing Indicator */}
          {isProcessing && (
            <View className="mt-3 flex-row items-center justify-center gap-2">
              <ActivityIndicator size="small" />
              <Text className="text-sm text-muted-foreground">
                Processing...
              </Text>
            </View>
          )}
        </CardContent>
      </Card>

      <DeclineReasonModal
        visible={showDeclineModal}
        onClose={() => setShowDeclineModal(false)}
        onConfirm={handleDecline}
      />
    </>
  );
}

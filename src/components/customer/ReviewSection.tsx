import React, { useState } from 'react';
import { View, ScrollView } from 'react-native';
import { Text } from '@/components/ui/text';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useUserReviews, UserReview } from '@/hooks/customer/useUserReviews';
import { useColorScheme } from '@/lib/core/useColorScheme';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ProviderResponseModal } from '@/components/provider/ProviderResponseModal';

interface ReviewCardProps {
  review: UserReview;
  showRespondButton?: boolean;
  onRespondPress?: (review: UserReview) => void;
}

const ReviewCard = React.memo(({ review, showRespondButton, onRespondPress }: ReviewCardProps) => {
  const { colorScheme } = useColorScheme();

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Unknown date';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (timeString: string | null) => {
    if (!timeString) return '';
    return new Date(`1970-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const renderStars = (rating: number) => {
    return '⭐'.repeat(rating) + '☆'.repeat(5 - rating);
  };

  return (
    <Card className="bg-card border-border mb-3">
      <CardContent className="p-4">
        {/* Header with rating and date */}
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-lg font-semibold text-foreground">
            {renderStars(review.rating)}
          </Text>
          <Text className="text-sm text-muted-foreground">
            {formatDate(review.created_at)}
          </Text>
        </View>

        {/* Provider and Service Information */}
        {(review.provider_name || review.provider_business_name || review.service_title) && (
          <View className="mb-3 p-3 bg-muted/30 rounded-lg">
            {review.provider_name && (
              <Text className="text-sm font-medium text-foreground mb-1">
                Provider: {review.provider_name}
              </Text>
            )}
            {review.provider_business_name && (
              <Text className="text-sm text-muted-foreground mb-2">
                {review.provider_business_name}
              </Text>
            )}
            {review.service_title && (
              <Text className="text-sm font-medium text-foreground mb-1">
                Service: {review.service_title}
              </Text>
            )}
            {review.service_description && (
              <Text className="text-xs text-muted-foreground mb-2">
                {review.service_description}
              </Text>
            )}
          </View>
        )}

        {/* Booking Information */}
        {(review.booking_date || review.booking_start_time || review.service_address) && (
          <View className="mb-3 p-3 bg-muted/20 rounded-lg">
            <Text className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
              Booking Details
            </Text>
            {review.booking_date && (
              <Text className="text-sm text-foreground mb-1">
                📅 {formatDate(review.booking_date)}
                {review.booking_start_time && ` at ${formatTime(review.booking_start_time)}`}
              </Text>
            )}
            {review.service_address && (
              <Text className="text-sm text-foreground">
                📍 {review.service_address}
              </Text>
            )}
          </View>
        )}

        {/* Review Comment */}
        {review.comment && (
          <Text className="text-foreground mb-3 leading-5">
            {review.comment}
          </Text>
        )}

        {/* Provider Response */}
        {review.provider_response && (
          <View className="bg-muted/50 rounded-lg p-3 mt-3">
            <Text className="text-sm font-medium text-muted-foreground mb-1">
              Provider Response:
            </Text>
            <Text className="text-foreground text-sm leading-5">
              {review.provider_response}
            </Text>
            {review.provider_response_at && (
              <Text className="text-xs text-muted-foreground mt-2">
                Responded {formatDate(review.provider_response_at)}
              </Text>
            )}
          </View>
        )}

        {/* Anonymous indicator */}
        {review.is_anonymous && (
          <View className="flex-row items-center mt-2">
            <Text className="text-xs text-muted-foreground">
              Posted anonymously
            </Text>
          </View>
        )}

        {/* Respond button for provider */}
        {showRespondButton && onRespondPress && (
          <View className="mt-4">
            <Button
              onPress={() => onRespondPress(review)}
              className="w-full"
              variant="outline"
            >
              Respond to Review
            </Button>
          </View>
        )}
      </CardContent>
    </Card>
  );
});

interface ReviewSectionProps {
  userId?: string;
  showRespondButton?: boolean;
}

export const ReviewSection = React.memo(({ userId, showRespondButton = false }: ReviewSectionProps) => {
  const { data: reviews, isLoading, error } = useUserReviews(userId);
  const [responseModalVisible, setResponseModalVisible] = useState(false);
  const [selectedReview, setSelectedReview] = useState<UserReview | null>(null);

  const handleRespondPress = (review: UserReview) => {
    setSelectedReview(review);
    setResponseModalVisible(true);
  };

  const handleResponseSubmit = () => {
    setResponseModalVisible(false);
    setSelectedReview(null);
  };

  if (isLoading) {
    return (
      <View className="px-6">
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <Skeleton className="h-4 w-3/4 mb-2" />
            <Skeleton className="h-4 w-1/2 mb-3" />
            <Skeleton className="h-16 w-full" />
          </CardContent>
        </Card>
      </View>
    );
  }

  if (error) {
    return (
      <View className="px-6">
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <Text className="text-destructive text-center">
              Failed to load reviews. Please try again.
            </Text>
          </CardContent>
        </Card>
      </View>
    );
  }

  if (!reviews || reviews.length === 0) {
    return (
      <View className="px-6">
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <Text className="text-muted-foreground text-center">
              No reviews yet. Complete a service to leave your first review!
            </Text>
          </CardContent>
        </Card>
      </View>
    );
  }

  return (
    <>
      <View className="px-6">
        {reviews.map((review) => (
          <ReviewCard
            key={review.id}
            review={review}
            showRespondButton={showRespondButton && !review.provider_response}
            onRespondPress={handleRespondPress}
          />
        ))}
      </View>

      {/* Provider Response Modal */}
      <ProviderResponseModal
        visible={responseModalVisible}
        onClose={() => setResponseModalVisible(false)}
        reviewId={selectedReview?.id || ''}
        customerName={selectedReview?.customer_name || 'Anonymous Customer'}
        reviewText={selectedReview?.comment || 'No comment provided'}
        onSubmitSuccess={handleResponseSubmit}
      />
    </>
  );
});
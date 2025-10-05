import React, { useState } from 'react';
import { View, TouchableOpacity, Modal, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useSubmitReview } from '@/hooks/shared/useSubmitReview';
import { cn } from '@/lib/utils';
import { THEME } from '@/lib/core/theme';
import { useColorScheme } from '@/lib/core/useColorScheme';

interface ReviewModalProps {
  visible: boolean;
  onClose: () => void;
  bookingId: string;
  providerName: string;
  serviceName: string;
  onSubmitSuccess?: () => void;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({
  visible,
  onClose,
  bookingId,
  providerName,
  serviceName,
  onSubmitSuccess,
}) => {
  const { colorScheme } = useColorScheme();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);

  const submitReviewMutation = useSubmitReview();

  const handleSubmit = async () => {
    if (rating === 0) {
      // Show error - rating required
      return;
    }

    try {
      await submitReviewMutation.mutateAsync({
        booking_id: bookingId,
        rating,
        comment: comment.trim() || undefined,
        is_anonymous: isAnonymous,
      });

      // Reset form and close modal
      setRating(0);
      setComment('');
      setIsAnonymous(false);
      onSubmitSuccess?.();
      onClose();
    } catch (error) {
      console.error('Failed to submit review:', error);
      // Error handling would be shown here
    }
  };

  const renderStars = () => {
    return (
      <View className="flex-row justify-center mb-6">
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => setRating(star)}
            className="mx-2"
          >
            <Text
              className={cn(
                "text-3xl",
                star <= rating
                  ? "text-yellow-400"
                  : "text-muted-foreground"
              )}
            >
              ★
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
        <View className="flex-1 px-6">
          {/* Header */}
          <View className="flex-row items-center justify-between py-4">
            <Text className="text-xl font-bold text-foreground">
              Rate Your Experience
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Text className="text-2xl text-muted-foreground">✕</Text>
            </TouchableOpacity>
          </View>

          {/* Service Info */}
          <Card className="mb-6 bg-card border-border">
            <CardContent className="p-4">
              <Text className="text-lg font-semibold text-foreground mb-1">
                {serviceName}
              </Text>
              <Text className="text-muted-foreground">
                with {providerName}
              </Text>
            </CardContent>
          </Card>

          {/* Rating Section */}
          <View className="items-center mb-6">
            <Text className="text-lg font-medium text-foreground mb-4">
              How would you rate this service?
            </Text>
            {renderStars()}
            <Text className="text-sm text-muted-foreground">
              {rating === 0 ? 'Tap to rate' : `${rating} star${rating !== 1 ? 's' : ''}`}
            </Text>
          </View>

          {/* Comment Section */}
          <View className="mb-6">
            <Text className="text-base font-medium text-foreground mb-2">
              Share your feedback (optional)
            </Text>
            <Textarea
              placeholder="Tell us about your experience..."
              value={comment}
              onChangeText={setComment}
              className="min-h-[100px]"
              maxLength={500}
            />
            <Text className="text-xs text-muted-foreground text-right mt-1">
              {comment.length}/500
            </Text>
          </View>

          {/* Anonymous Option */}
          <View className="flex-row items-center mb-6">
            <TouchableOpacity
              onPress={() => setIsAnonymous(!isAnonymous)}
              className="flex-row items-center"
            >
              <View
                className={cn(
                  "w-5 h-5 rounded border-2 mr-3 items-center justify-center",
                  isAnonymous
                    ? "bg-primary border-primary"
                    : "border-muted-foreground"
                )}
              >
                {isAnonymous && (
                  <Text className="text-xs text-primary-foreground font-bold">✓</Text>
                )}
              </View>
              <Text className="text-foreground">Submit anonymously</Text>
            </TouchableOpacity>
          </View>

          {/* Submit Button */}
          <View className="flex-row gap-3">
            <Button
              variant="outline"
              onPress={onClose}
              className="flex-1"
              disabled={submitReviewMutation.isPending}
            >
              <Text>Skip</Text>
            </Button>
            <Button
              onPress={handleSubmit}
              className="flex-1"
              disabled={rating === 0 || submitReviewMutation.isPending}
            >
              <Text>
                {submitReviewMutation.isPending ? 'Submitting...' : 'Submit Review'}
              </Text>
            </Button>
          </View>

          {/* Error Message */}
          {submitReviewMutation.isError && (
            <Text className="text-destructive text-center mt-4">
              Failed to submit review. Please try again.
            </Text>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
};
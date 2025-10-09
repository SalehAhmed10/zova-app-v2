import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, Alert, Modal } from 'react-native';
import { useSubmitReview } from '@/hooks/shared/useSubmitReview';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Star, X } from 'lucide-react-native';
import { useColorScheme } from '@/lib/core/useColorScheme';
import { THEME } from '@/lib/theme';

interface ReviewModalProps {
  bookingId: string;
  providerName: string;
  serviceName: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({
  bookingId,
  providerName,
  serviceName,
  onClose,
  onSuccess,
}) => {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const { colorScheme } = useColorScheme();

  const submitReviewMutation = useSubmitReview();

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert('Rating Required', 'Please select a star rating before submitting.');
      return;
    }

    try {
      await submitReviewMutation.mutateAsync({
        booking_id: bookingId,
        rating,
        comment: comment.trim() || undefined,
        is_anonymous: isAnonymous,
      });

      Alert.alert(
        'Review Submitted',
        'Thank you for your feedback!',
        [
          {
            text: 'OK',
            onPress: () => {
              onSuccess?.();
              onClose();
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert(
        'Submission Failed',
        error instanceof Error ? error.message : 'Failed to submit review. Please try again.'
      );
    }
  };

  const renderStars = () => {
    return (
      <View className="flex-row justify-center mb-4">
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => setRating(star)}
            className="mx-1"
          >
            <Star
              size={32}
              fill={star <= rating ? THEME[colorScheme].primary : 'none'}
              color={star <= rating ? THEME[colorScheme].primary : THEME[colorScheme].mutedForeground}
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <Modal
      visible={true}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/50 justify-center items-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <View className="flex-row justify-between items-center">
              <CardTitle className="text-lg">Rate Your Experience</CardTitle>
              <TouchableOpacity onPress={onClose}>
                <X size={24} color={THEME[colorScheme].mutedForeground} />
              </TouchableOpacity>
            </View>
          </CardHeader>

          <CardContent className="gap-4">
            <View className="text-center">
              <Text className="text-sm text-muted-foreground mb-1">
                Service: {serviceName}
              </Text>
              <Text className="text-sm text-muted-foreground">
                Provider: {providerName}
              </Text>
            </View>

            <View className="items-center">
              <Text className="text-base font-medium mb-2">How was your experience?</Text>
              {renderStars()}
              <Text className="text-sm text-muted-foreground">
                {rating === 0 ? 'Tap to rate' : `${rating} star${rating > 1 ? 's' : ''}`}
              </Text>
            </View>

            <View>
              <Text className="text-base font-medium mb-2">Share your thoughts (optional)</Text>
              <TextInput
                className="border border-border rounded-lg p-3 min-h-[80px] text-base"
                placeholder="Tell others about your experience..."
                value={comment}
                onChangeText={setComment}
                multiline
                numberOfLines={3}
                maxLength={500}
              />
              <Text className="text-xs text-muted-foreground mt-1 text-right">
                {comment.length}/500
              </Text>
            </View>

            <View className="flex-row items-center gap-2">
              <TouchableOpacity
                onPress={() => setIsAnonymous(!isAnonymous)}
                className="flex-row items-center"
              >
                <View className={`w-5 h-5 border-2 border-primary rounded mr-2 ${
                  isAnonymous ? 'bg-primary' : 'bg-background'
                }`}>
                  {isAnonymous && <Text className="text-primary-foreground text-xs">✓</Text>}
                </View>
                <Text className="text-sm">Submit anonymously</Text>
              </TouchableOpacity>
            </View>

            <View className="flex-row gap-3 pt-4">
              <Button
                variant="outline"
                onPress={onClose}
                className="flex-1"
                disabled={submitReviewMutation.isPending}
              >
                <Text>Cancel</Text>
              </Button>
              <Button
                onPress={handleSubmit}
                className="flex-1"
                disabled={submitReviewMutation.isPending || rating === 0}
              >
                <Text>
                  {submitReviewMutation.isPending ? 'Submitting...' : 'Submit Review'}
                </Text>
              </Button>
            </View>
          </CardContent>
        </Card>
      </View>
    </Modal>
  );
};
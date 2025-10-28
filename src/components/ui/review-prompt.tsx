import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, TextInput, Alert } from 'react-native';
import { BottomSheetModal, BottomSheetBackdrop, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useColorScheme } from '@/lib/core/useColorScheme';
import { THEME } from '@/lib/theme';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Star, X } from 'lucide-react-native';
import { useSubmitReview } from '@/hooks/customer/useSubmitReview';

interface ReviewPromptProps {
  bookingId: string;
  providerName: string;
  serviceName: string;
  isVisible: boolean;
  onDismiss: () => void;
  onReviewSubmitted?: () => void;
}

export const ReviewPrompt: React.FC<ReviewPromptProps> = ({
  bookingId,
  providerName,
  serviceName,
  isVisible,
  onDismiss,
  onReviewSubmitted,
}) => {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const bottomSheetModalRef = useRef<BottomSheetModal>(null);
  const { colorScheme } = useColorScheme();

  const submitReviewMutation = useSubmitReview();

  // Handle modal visibility
  useEffect(() => {
    if (isVisible) {
      bottomSheetModalRef.current?.present();
    } else {
      bottomSheetModalRef.current?.dismiss();
    }
  }, [isVisible]);

  // Reset form when modal opens
  useEffect(() => {
    if (isVisible) {
      setRating(0);
      setComment('');
      setIsAnonymous(false);
    }
  }, [isVisible]);

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
              onReviewSubmitted?.();
              onDismiss();
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

  const handleReviewLater = () => {
    onDismiss();
  };

  const handleSheetChanges = useCallback((index: number) => {
    if (index === -1) {
      onDismiss();
    }
  }, [onDismiss]);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
      />
    ),
    []
  );

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
    <BottomSheetModal
      ref={bottomSheetModalRef}
      index={0}
      snapPoints={['70%']}
      onChange={handleSheetChanges}
      backdropComponent={renderBackdrop}
      backgroundStyle={{
        backgroundColor: THEME[colorScheme].card
      }}
      handleIndicatorStyle={{ backgroundColor: THEME[colorScheme].mutedForeground }}
    >
      <BottomSheetScrollView 
        className="flex-1" 
        contentContainerStyle={{ 
          flexGrow: 1, 
          backgroundColor: THEME[colorScheme].background,
          paddingBottom: 20 
        }}
      >
        <View className="px-6 py-6">
          {/* Header */}
          <View className="items-center mb-6">
            <View className="w-16 h-16 bg-primary/10 rounded-full items-center justify-center mb-4">
              <Star size={32} color={THEME[colorScheme].primary} fill={THEME[colorScheme].primary} />
            </View>
            <Text className="text-xl font-semibold text-center mb-2 text-foreground">
              How was your experience?
            </Text>
            <Text className="text-muted-foreground text-center mb-4">
              Help others by rating your service with {providerName}
            </Text>
            <Text className="text-sm text-muted-foreground text-center">
              Service: {serviceName}
            </Text>
          </View>

          {/* Rating Stars */}
          <View className="mb-6">
            <Text className="text-center text-foreground font-medium mb-2">
              Rate your experience
            </Text>
            {renderStars()}
          </View>

          {/* Comment Input */}
          <View className="mb-6">
            <Text className="text-foreground font-medium mb-2">
              Share your feedback (optional)
            </Text>
            <TextInput
              value={comment}
              onChangeText={setComment}
              placeholder="Tell us about your experience..."
              placeholderTextColor={THEME[colorScheme].mutedForeground}
              multiline
              numberOfLines={4}
              className="border border-border rounded-lg p-3 text-foreground bg-background min-h-[100px]"
              style={{
                textAlignVertical: 'top',
              }}
            />
          </View>

          {/* Anonymous Toggle */}
          <View className="flex-row items-center justify-between mb-6">
            <Text className="text-foreground font-medium">
              Submit anonymously
            </Text>
            <TouchableOpacity
              onPress={() => setIsAnonymous(!isAnonymous)}
              className={`w-12 h-6 rounded-full p-1 ${isAnonymous ? 'bg-primary' : 'bg-muted'}`}
            >
              <View
                className={`w-4 h-4 rounded-full bg-background transition-all ${
                  isAnonymous ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </TouchableOpacity>
          </View>

          {/* Action Buttons */}
          <View className="gap-3">
            <Button
              onPress={handleSubmit}
              disabled={submitReviewMutation.isPending}
              className="w-full"
            >
              <Text className="text-primary-foreground font-medium">
                {submitReviewMutation.isPending ? 'Submitting...' : 'Submit Review'}
              </Text>
            </Button>

            <Button variant="outline" onPress={handleReviewLater} className="w-full">
              <Text className="text-foreground">Maybe Later</Text>
            </Button>
          </View>

          {/* Close Button */}
          <TouchableOpacity
            onPress={onDismiss}
            className="absolute top-4 right-4 p-2"
          >
            <X size={20} color={THEME[colorScheme].mutedForeground} />
          </TouchableOpacity>
        </View>
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
};
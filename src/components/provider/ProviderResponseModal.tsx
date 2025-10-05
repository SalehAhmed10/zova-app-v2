import React, { useState } from 'react';
import { View, TouchableOpacity, Modal, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useSubmitProviderResponse } from '@/hooks/shared/useSubmitProviderResponse';
import { cn } from '@/lib/utils';
import { THEME } from '@/lib/core/theme';
import { useColorScheme } from '@/lib/core/useColorScheme';

interface ProviderResponseModalProps {
  visible: boolean;
  onClose: () => void;
  reviewId: string;
  customerName: string;
  reviewText: string;
  onSubmitSuccess?: () => void;
}

export const ProviderResponseModal: React.FC<ProviderResponseModalProps> = ({
  visible,
  onClose,
  reviewId,
  customerName,
  reviewText,
  onSubmitSuccess,
}) => {
  const { colorScheme } = useColorScheme();
  const [response, setResponse] = useState('');

  const submitResponseMutation = useSubmitProviderResponse();

  const handleSubmit = async () => {
    if (!response.trim()) {
      // Show error - response required
      return;
    }

    try {
      await submitResponseMutation.mutateAsync({
        review_id: reviewId,
        response: response.trim(),
      });

      // Reset form and close modal
      setResponse('');
      onSubmitSuccess?.();
      onClose();
    } catch (error) {
      console.error('Failed to submit provider response:', error);
      // Error handling would be shown here
    }
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
              Respond to Review
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Text className="text-2xl text-muted-foreground">✕</Text>
            </TouchableOpacity>
          </View>

          {/* Customer Review */}
          <Card className="mb-6 bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg">
                Review from {customerName}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Text className="text-foreground leading-5">
                "{reviewText}"
              </Text>
            </CardContent>
          </Card>

          {/* Response Section */}
          <View className="mb-6">
            <Text className="text-base font-medium text-foreground mb-2">
              Your Response
            </Text>
            <Textarea
              placeholder="Write a professional response to this review..."
              value={response}
              onChangeText={setResponse}
              className="min-h-[120px]"
              maxLength={1000}
            />
            <Text className="text-xs text-muted-foreground text-right mt-1">
              {response.length}/1000
            </Text>
          </View>

          {/* Guidelines */}
          <View className="mb-6 p-4 bg-muted/30 rounded-lg">
            <Text className="text-sm font-medium text-foreground mb-2">
              Response Guidelines:
            </Text>
            <Text className="text-sm text-muted-foreground leading-5">
              • Be professional and courteous{'\n'}
              • Address the customer's concerns{'\n'}
              • Thank them for their feedback{'\n'}
              • Keep responses under 1000 characters
            </Text>
          </View>

          {/* Submit Button */}
          <View className="flex-row gap-3">
            <Button
              variant="outline"
              onPress={onClose}
              className="flex-1"
              disabled={submitResponseMutation.isPending}
            >
              <Text>Cancel</Text>
            </Button>
            <Button
              onPress={handleSubmit}
              className="flex-1"
              disabled={!response.trim() || submitResponseMutation.isPending}
            >
              <Text>
                {submitResponseMutation.isPending ? 'Submitting...' : 'Submit Response'}
              </Text>
            </Button>
          </View>

          {/* Error Message */}
          {submitResponseMutation.isError && (
            <Text className="text-destructive text-center mt-4">
              Failed to submit response. Please try again.
            </Text>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
};
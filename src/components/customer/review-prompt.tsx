import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface ReviewPromptProps {
  visible: boolean;
  onReview: () => void;
  onSkip: () => void;
  providerName: string;
  serviceName: string;
}

export const ReviewPrompt: React.FC<ReviewPromptProps> = ({
  visible,
  onReview,
  onSkip,
  providerName,
  serviceName,
}) => {
  if (!visible) return null;

  return (
    <View className="absolute bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border">
      <Card className="bg-card border-0 border-t border-border rounded-none">
        <CardContent className="p-6">
          {/* Header */}
          <View className="items-center mb-4">
            <Text className="text-2xl mb-2">⭐</Text>
            <Text className="text-lg font-semibold text-foreground text-center">
              How was your service?
            </Text>
            <Text className="text-muted-foreground text-center text-sm">
              Help others by rating {providerName}
            </Text>
          </View>

          {/* Service Info */}
          <View className="bg-muted/50 rounded-lg p-3 mb-4">
            <Text className="text-sm font-medium text-foreground">
              {serviceName}
            </Text>
            <Text className="text-xs text-muted-foreground">
              with {providerName}
            </Text>
          </View>

          {/* Action Buttons */}
          <View className="flex-row gap-3">
            <Button
              variant="outline"
              onPress={onSkip}
              className="flex-1"
            >
              <Text>Maybe Later</Text>
            </Button>
            <Button
              onPress={onReview}
              className="flex-1"
            >
              <Text>Leave Review</Text>
            </Button>
          </View>
        </CardContent>
      </Card>
    </View>
  );
};
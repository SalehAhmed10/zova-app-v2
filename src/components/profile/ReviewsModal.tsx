import React, { useRef, useCallback, useEffect } from 'react';
import { View } from 'react-native';
import { BottomSheetModal, BottomSheetBackdrop, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ReviewSection } from '@/components/customer/ReviewSection';
import { useColorScheme } from '@/lib/core/useColorScheme';
import { THEME } from '@/lib/core/theme';
import { cn } from '@/lib/utils';


interface ReviewsModalProps {
  visible: boolean;
  onClose: () => void;
  userId?: string;
}

export const ReviewsModal = React.memo(({ visible, onClose, userId }: ReviewsModalProps) => {
  const bottomSheetModalRef = useRef<BottomSheetModal>(null);
  const { colorScheme } = useColorScheme();

  // Handle modal visibility
  useEffect(() => {
    if (visible) {
      bottomSheetModalRef.current?.present();
    } else {
      bottomSheetModalRef.current?.dismiss();
    }
  }, [visible]);

  const handleSheetChanges = useCallback((index: number) => {
    if (index === -1) {
      onClose();
    }
  }, [onClose]);

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

  return (
    <BottomSheetModal
      ref={bottomSheetModalRef}
      index={0}
      snapPoints={['85%']}
      onChange={handleSheetChanges}
      backdropComponent={renderBackdrop}
      backgroundStyle={{
        backgroundColor: THEME[colorScheme].card
      }}
      handleIndicatorStyle={{
        backgroundColor: THEME[colorScheme].mutedForeground
      }}
    >
      <BottomSheetScrollView 
        className="flex-1" 
        contentContainerStyle={{ 
          flexGrow: 1, 
          backgroundColor: THEME[colorScheme].background,
          paddingBottom: 20 
        }}
      >
        {/* Header */}
        <View className="px-6 py-4 border-b border-border bg-card">
          <Text className="text-xl font-bold text-foreground">
            My Reviews
          </Text>
        </View>

        {/* Content with proper top spacing */}
        <View className="pt-4">
          <ReviewSection userId={userId} />
        </View>
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
});
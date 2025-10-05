import React, { useState } from 'react';
import { Modal, View, TouchableOpacity, ScrollView } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';

interface DeclineReasonModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}

const PRESET_REASONS = [
  'Schedule conflict',
  'Not available at this time',
  'Service not offered anymore',
  'Location too far',
  'Other',
];

/**
 * Modal for selecting or entering a decline reason
 * Provides preset options and custom input
 */
export function DeclineReasonModal({
  visible,
  onClose,
  onConfirm,
}: DeclineReasonModalProps) {
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [customReason, setCustomReason] = useState<string>('');

  const handleConfirm = () => {
    const finalReason = selectedReason === 'Other' 
      ? customReason 
      : selectedReason;

    if (!finalReason.trim()) {
      return; // Don't submit empty reason
    }

    onConfirm(finalReason);
    
    // Reset state
    setSelectedReason('');
    setCustomReason('');
  };

  const handleCancel = () => {
    setSelectedReason('');
    setCustomReason('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleCancel}
    >
      <View className="flex-1 justify-end bg-black/50">
        <Card className="rounded-t-3xl border-t-2 border-border">
          <CardContent className="p-6">
            <Text variant="h3" className="mb-4">
              Reason for Declining
            </Text>
            
            <ScrollView className="max-h-96">
              <View className="gap-3 mb-4">
                {PRESET_REASONS.map((reason) => (
                  <TouchableOpacity
                    key={reason}
                    onPress={() => setSelectedReason(reason)}
                    className={`
                      p-4 rounded-lg border-2
                      ${selectedReason === reason 
                        ? 'border-primary bg-primary/10' 
                        : 'border-border bg-card'
                      }
                    `}
                  >
                    <Text 
                      className={
                        selectedReason === reason 
                          ? 'text-primary font-semibold' 
                          : 'text-foreground'
                      }
                    >
                      {reason}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {selectedReason === 'Other' && (
                <View className="mb-4">
                  <Text className="mb-2 text-sm text-muted-foreground">
                    Please specify:
                  </Text>
                  <Input
                    placeholder="Enter reason..."
                    value={customReason}
                    onChangeText={setCustomReason}
                    multiline
                    numberOfLines={3}
                    maxLength={500}
                    className="min-h-24"
                  />
                  <Text className="mt-1 text-xs text-muted-foreground text-right">
                    {customReason.length}/500
                  </Text>
                </View>
              )}
            </ScrollView>

            <View className="flex-row gap-3 mt-6">
              <Button
                variant="outline"
                onPress={handleCancel}
                className="flex-1"
              >
                <Text>Cancel</Text>
              </Button>
              <Button
                variant="default"
                onPress={handleConfirm}
                disabled={!selectedReason || (selectedReason === 'Other' && !customReason.trim())}
                className="flex-1"
              >
                <Text>Confirm Decline</Text>
              </Button>
            </View>
          </CardContent>
        </Card>
      </View>
    </Modal>
  );
}

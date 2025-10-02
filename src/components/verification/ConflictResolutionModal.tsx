/**
 * ✅ CONFLICT RESOLUTION MODAL COMPONENT
 * Handles cross-device verification conflicts
 *
 * Scenario: Provider starts verification on Device A, then tries to continue on Device B
 * This modal helps resolve which device/session should take precedence
 */

import React, { useState } from 'react';
import { View, Alert, Platform } from 'react-native';
import { useMutation } from '@tanstack/react-query';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useProviderVerificationStore } from '@/stores/verification/provider-verification';
import { supabase } from '@/lib/core/supabase';

interface ConflictResolutionModalProps {
  visible: boolean;
  onClose: () => void;
  conflictData: {
    currentDevice: string;
    conflictingDevice: string;
    lastActivity: Date;
    currentStep: number;
    conflictingStep: number;
  } | null;
}

export const ConflictResolutionModal: React.FC<ConflictResolutionModalProps> = ({
  visible,
  onClose,
  conflictData
}) => {
  const [isResolving, setIsResolving] = useState(false);
  const { initializeSession, setCurrentStep } = useProviderVerificationStore();

  // ✅ REACT QUERY: Resolve conflict by keeping current session
  const keepCurrentMutation = useMutation({
    mutationFn: async () => {
      if (!conflictData) throw new Error('No conflict data');

      console.log('[ConflictResolution] Keeping current session');

      // End the conflicting session
      const { error } = await supabase
        .from('provider_verification_sessions')
        .update({
          is_active: false,
          ended_at: new Date().toISOString()
        })
        .eq('device_fingerprint', conflictData.conflictingDevice);

      if (error) throw error;

      // Initialize current session
      await initializeSession();

      return true;
    },
    onSuccess: () => {
      console.log('[ConflictResolution] Successfully kept current session');
      onClose();
    },
    onError: (error) => {
      console.error('[ConflictResolution] Failed to keep current session:', error);
      Alert.alert('Error', 'Failed to resolve conflict. Please try again.');
    }
  });

  // ✅ REACT QUERY: Resolve conflict by using server data
  const useServerMutation = useMutation({
    mutationFn: async () => {
      if (!conflictData) throw new Error('No conflict data');

      console.log('[ConflictResolution] Using server session data');

      // End current session and sync with server
      await initializeSession();

      // Set step to match server
      setCurrentStep(conflictData.conflictingStep);

      return true;
    },
    onSuccess: () => {
      console.log('[ConflictResolution] Successfully synced with server');
      onClose();
    },
    onError: (error) => {
      console.error('[ConflictResolution] Failed to sync with server:', error);
      Alert.alert('Error', 'Failed to sync with server. Please try again.');
    }
  });

  if (!visible || !conflictData) return null;

  const handleKeepCurrent = () => {
    Alert.alert(
      'Keep Current Progress',
      'This will end the session on your other device. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Keep Current',
          onPress: () => keepCurrentMutation.mutate()
        }
      ]
    );
  };

  const handleUseServer = () => {
    Alert.alert(
      'Use Other Device Progress',
      `This will sync your progress to step ${conflictData.conflictingStep}. Continue?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Use Server Data',
          onPress: () => useServerMutation.mutate()
        }
      ]
    );
  };

  const formatDeviceName = (device: string) => {
    if (device === 'current') return 'This device';
    if (Platform.OS === 'ios') return 'Your iPhone';
    if (Platform.OS === 'android') return 'Your Android device';
    return 'Your other device';
  };

  return (
    <AlertDialog open={visible} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-foreground">
            Verification Conflict Detected
          </AlertDialogTitle>
          <AlertDialogDescription className="text-muted-foreground">
            You have an active verification session on another device. Please choose how to proceed.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <View className="py-4">
          {/* Current Device Info */}
          <View className="bg-primary/5 rounded-lg p-3 mb-3">
            <Text className="text-foreground font-medium mb-1">
              {formatDeviceName('current')}
            </Text>
            <Text className="text-muted-foreground text-sm">
              Current step: {conflictData.currentStep} of 9
            </Text>
          </View>

          {/* Conflicting Device Info */}
          <View className="bg-muted rounded-lg p-3 mb-4">
            <Text className="text-foreground font-medium mb-1">
              {formatDeviceName(conflictData.conflictingDevice)}
            </Text>
            <Text className="text-muted-foreground text-sm mb-1">
              Current step: {conflictData.conflictingStep} of 9
            </Text>
            <Text className="text-muted-foreground text-xs">
              Last active: {conflictData.lastActivity.toLocaleString()}
            </Text>
          </View>

          <Text className="text-muted-foreground text-sm text-center">
            Choose which progress to keep. The other session will be ended.
          </Text>
        </View>

        <AlertDialogFooter className="flex-row gap-2">
          <AlertDialogCancel asChild>
            <Button variant="outline" className="flex-1">
              <Text className="text-muted-foreground">Cancel</Text>
            </Button>
          </AlertDialogCancel>

          <Button
            variant="outline"
            onPress={handleUseServer}
            disabled={useServerMutation.isPending}
            className="flex-1"
          >
            <Text className="text-foreground">
              {useServerMutation.isPending ? 'Syncing...' : 'Use Other Device'}
            </Text>
          </Button>

          <AlertDialogAction asChild>
            <Button
              onPress={handleKeepCurrent}
              disabled={keepCurrentMutation.isPending}
              className="flex-1"
            >
              <Text className="text-primary-foreground">
                {keepCurrentMutation.isPending ? 'Ending...' : 'Keep This Device'}
              </Text>
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
/**
 * ✅ SESSION RECOVERY BANNER COMPONENT
 * Shows when provider has incomplete verification and offers to resume
 */

import React from 'react';
import { View, Alert } from 'react-native';
import { router } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useVerificationSessionRecovery } from '@/hooks/verification';
import { useProviderVerificationStore } from '@/stores/verification/provider-verification';
import { supabase } from '@/lib/supabase';

interface SessionRecoveryBannerProps {
  className?: string;
}

export const SessionRecoveryBanner: React.FC<SessionRecoveryBannerProps> = ({
  className = ''
}) => {
  const { shouldResumeVerification, lastStepCompleted, sessionId, isLoading } = useVerificationSessionRecovery();
  const { initializeSession, setCurrentStep } = useProviderVerificationStore();

  // ✅ REACT QUERY: Resume verification session
  const resumeMutation = useMutation({
    mutationFn: async () => {
      if (!sessionId) throw new Error('No session ID available');

      console.log('[SessionRecovery] Resuming session:', sessionId);

      // Update session activity
      const { error } = await supabase
        .from('provider_verification_sessions')
        .update({
          last_activity_at: new Date().toISOString(),
          is_active: true
        })
        .eq('session_id', sessionId);

      if (error) throw error;

      // Initialize the store with the session
      await initializeSession();

      // Set the current step to resume from
      const resumeStep = Math.max(1, lastStepCompleted + 1);
      setCurrentStep(resumeStep);

      return resumeStep;
    },
    onSuccess: (resumeStep) => {
      console.log('[SessionRecovery] Successfully resumed at step:', resumeStep);
      router.replace('/(provider-verification)');
    },
    onError: (error) => {
      console.error('[SessionRecovery] Failed to resume session:', error);
      Alert.alert(
        'Resume Failed',
        'Unable to resume your verification. Please start over.',
        [
          {
            text: 'Start Over',
            onPress: () => router.replace('/(provider-verification)')
          }
        ]
      );
    }
  });

  // Don't show if not needed or loading
  if (!shouldResumeVerification || isLoading) {
    return null;
  }

  const handleResume = () => {
    Alert.alert(
      'Resume Verification',
      `You were on step ${lastStepCompleted} of 9. Would you like to continue from step ${lastStepCompleted + 1}?`,
      [
        {
          text: 'Start Over',
          style: 'destructive',
          onPress: () => router.replace('/(provider-verification)')
        },
        {
          text: 'Resume',
          onPress: () => resumeMutation.mutate()
        }
      ]
    );
  };

  return (
    <Card className={`border-primary/20 bg-primary/5 ${className}`}>
      <CardContent className="p-4">
        <View className="flex-row items-start gap-3">
          <View className="w-8 h-8 bg-primary/10 rounded-full items-center justify-center mt-0.5">
            <Text className="text-primary font-bold text-base">⏯</Text>
          </View>

          <View className="flex-1">
            <Text className="text-foreground font-semibold mb-1">
              Resume Your Verification
            </Text>

            <Text className="text-muted-foreground text-sm mb-3">
              You have incomplete verification progress. Continue where you left off at step <Text className="text-muted-foreground text-sm">{lastStepCompleted}</Text> of 9.
            </Text>

            <View className="flex-row gap-2">
              <Button
                variant="default"
                size="sm"
                onPress={handleResume}
                disabled={resumeMutation.isPending}
                className="flex-1"
              >
                <Text className="text-primary-foreground font-medium">
                  {resumeMutation.isPending ? 'Resuming...' : 'Resume Verification'}
                </Text>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onPress={() => router.replace('/(provider-verification)')}
                className="flex-1"
              >
                <Text className="text-muted-foreground font-medium">
                  Start Over
                </Text>
              </Button>
            </View>
          </View>
        </View>
      </CardContent>
    </Card>
  );
};
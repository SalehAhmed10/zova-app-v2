/**
 * Business Bio Screen for Provider Verification
 *
 * ✅ FULLY MIGRATED TO SINGLE-SOURCE ARCHITECTURE
 * - React Query for server state (bio data from database)
 * - Zustand for global state management (UI transient state only)
 * - Database as single source of truth
 *
 * Architecture Changes:
 * - Removed: useProviderVerificationStore, manual mutations, complex sync logic
 * - Added: Single-source verification hooks, centralized mutations, real-time subscriptions
 * - Improved: Local state management, atomic updates, error handling
 */

import { View, Alert } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ✅ SINGLE-SOURCE: Use new verification hooks
import { useVerificationData, useUpdateStepCompletion, useVerificationRealtime } from '@/hooks/provider/useVerificationSingleSource';
import { useVerificationNavigation } from '@/hooks/provider';
import { useAuthStore } from '@/stores/auth';
import { useCallback, useEffect, useState } from 'react';

import { Button, Input, ScreenWrapper, Textarea } from '@/components';
import { VerificationHeader } from '@/components/verification/VerificationHeader';
import { Text } from 'react-native';

// UI Components



export default function BusinessBioScreen() {
  const { user } = useAuthStore();
  const providerId = user?.id;

  // ✅ SINGLE-SOURCE: Use new verification hooks
  const { data: verificationData, isLoading: verificationLoading } = useVerificationData(providerId);
  const updateStepMutation = useUpdateStepCompletion();
  const { navigateNext, navigateBack } = useVerificationNavigation();

  // Real-time subscription for live updates
  useVerificationRealtime(providerId);

  // Safe area insets with fallback
  let insets = { top: 0, bottom: 0, left: 0, right: 0 };
  try {
    insets = useSafeAreaInsets();
  } catch (error) {
    console.warn('useSafeAreaInsets not available:', error);
  }

  // ✅ LOCAL STATE: Form data (transient, not persisted to store)
  const [businessDescription, setBusinessDescription] = useState('');
  const [yearsOfExperience, setYearsOfExperience] = useState('');

  // ✅ SYNC: Initialize form with existing data from verification data
  useEffect(() => {
    if (verificationData?.profile) {
      console.log('[Bio] Syncing existing bio data to form');
      setBusinessDescription(verificationData.profile.business_description || '');
      setYearsOfExperience(verificationData.profile.years_of_experience?.toString() || '');
    }
  }, [verificationData?.profile]);

  // ✅ FORM VALIDATION
  const validateForm = useCallback(() => {
    if (!businessDescription.trim()) {
      Alert.alert('Description Required', 'Please write a brief description about your business.');
      return false;
    }
    if (businessDescription.length < 50) {
      Alert.alert('Description Too Short', 'Your business description should be at least 50 characters long.');
      return false;
    }
    if (businessDescription.length > 500) {
      Alert.alert('Description Too Long', 'Your description should be no more than 500 characters.');
      return false;
    }
    if (!yearsOfExperience.trim()) {
      Alert.alert('Experience Required', 'Please enter your years of experience.');
      return false;
    }
    const years = parseInt(yearsOfExperience);
    if (isNaN(years) || years < 0 || years > 50) {
      Alert.alert('Invalid Experience', 'Please enter a valid number of years (0-50).');
      return false;
    }
    return true;
  }, [businessDescription, yearsOfExperience]);

  // ✅ FORM SUBMISSION: Use single-source mutation
  const handleSubmit = useCallback(async () => {
    if (!validateForm()) return;

    if (!providerId) {
      Alert.alert('Error', 'Provider ID not found. Please try logging in again.');
      return;
    }

    try {
      console.log('[Bio] Submitting bio data:', { businessDescription: businessDescription.substring(0, 50), yearsOfExperience });

      // ✅ SINGLE-SOURCE: Use centralized mutation to update step completion
      await updateStepMutation.mutateAsync({
        providerId,
        stepNumber: 6, // Bio is now step 6 (services removed)
        completed: true,
        data: {
          businessDescription: businessDescription.trim(),
          yearsOfExperience: parseInt(yearsOfExperience),
        },
      });

      navigateNext();
    } catch (error) {
      console.error('[Bio] Submit error:', error);
      Alert.alert('Save Failed', 'Failed to save your information. Please try again.');
    }
  }, [validateForm, providerId, businessDescription, yearsOfExperience, updateStepMutation, navigateNext]);

  return (
    <View className="flex-1 bg-background">
      <VerificationHeader 
        step={6} 
        title="Business Bio" 
      />
      <ScreenWrapper scrollable={true} contentContainerClassName="px-6 py-4">
      {/* Form */}
      <Animated.View entering={SlideInDown.delay(400).springify()}>
        {/* Business Description */}
        <View className="mb-6">
          <Text className="text-sm font-medium text-foreground mb-2">
            Business Description 
          </Text>
          <Textarea
            placeholder="Tell customers about your business, your approach to service, and what makes you unique..."
            value={businessDescription}
            onChangeText={setBusinessDescription}
            numberOfLines={6}
            maxLength={500}
            className="min-h-[120px] placeholder:text-muted-foreground"
          />
          <Text className="text-xs text-muted-foreground mt-1">
            {businessDescription.length}/500 characters (minimum 50)
          </Text>
        </View>

        {/* Years of Experience */}
        <View>
          <Text className="text-sm font-medium text-foreground mb-2">
            Years of Experience *
          </Text>
          <Input
            placeholder="Years of experience"
            value={yearsOfExperience}
            onChangeText={(text) => {
              // Only allow numbers
              const numericText = text.replace(/[^0-9]/g, '');
              setYearsOfExperience(numericText);
            }}
            keyboardType="numeric"
            maxLength={2}
            className="placeholder:text-muted-foreground"
          />
          <Text className="text-xs text-muted-foreground mt-1">
            Enter a number from 0 to 50
          </Text>
        </View>
      </Animated.View>

      {/* Tips */}
      <Animated.View entering={SlideInDown.delay(600).springify()} className="my-6">
        <View className="p-4 bg-accent/50 rounded-lg border border-accent">
          <Text className="font-semibold text-accent-foreground mb-2">
            💡 Writing Tips
          </Text>
          <View>
            <Text className="text-accent-foreground text-sm mb-1">
              • Be authentic and professional - customers want to trust you
            </Text>
            <Text className="text-accent-foreground text-sm mb-1">
              • Highlight what makes your business unique
            </Text>
            <Text className="text-accent-foreground text-sm mb-1">
              • Mention any certifications or special training
            </Text>
            <Text className="text-accent-foreground text-sm">
              • Focus on customer benefits and quality service
            </Text>
          </View>
        </View>
      </Animated.View>

      {/* Continue Button */}
      <Animated.View entering={SlideInDown.delay(800).springify()} className="mb-4">
        <Button
          size="lg"
          onPress={handleSubmit}
          disabled={updateStepMutation.isPending || !businessDescription.trim() || !yearsOfExperience.trim()}
          className="w-full"
        >
          <Text className="font-semibold text-primary-foreground">
            {updateStepMutation.isPending ? 'Saving...' : 'Continue to Terms'}
          </Text>
        </Button>
      </Animated.View>

      {/* Back Button */}
      <Animated.View entering={SlideInDown.delay(1000).springify()}>
        <Button
          variant="outline"
          size="lg"
          onPress={navigateBack}
          className="w-full"
        >
            <Text className='text-foreground'>Back to Portfolio</Text>
        </Button>
      </Animated.View>
    </ScreenWrapper>
    </View>
  );
}
/**
 * Business Terms Screen for Provider Verification
 *
 * ✅ FULLY MIGRATED TO SINGLE-SOURCE ARCHITECTURE
 * - React Query for server state (terms data from database)
 * - Zustand for global state management (UI transient state only)
 * - Database as single source of truth
 *
 * Architecture Changes:
 * - Removed: useProviderVerificationStore, manual mutations, complex sync logic
 * - Added: Single-source verification hooks, centralized mutations, real-time subscriptions
 * - Improved: Local state management, atomic updates, error handling
 */
import React, { useState, useCallback } from 'react';
import { View, Alert, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FileText, CheckCircle, Info, DollarSign, AlertCircle, Home } from 'lucide-react-native';

// ✅ SINGLE-SOURCE: Use new verification hooks
import { useVerificationData, useUpdateStepCompletion, useVerificationRealtime } from '@/hooks/provider/useVerificationSingleSource';
import { useAuthStore } from '@/stores/auth';

// UI Components
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Icon } from '@/components/ui/icon';
import { VerificationHeader } from '@/components/verification/VerificationHeader';
import { ScreenWrapper } from '@/components';

export default function BusinessTermsScreen() {
  const { user } = useAuthStore();
  const providerId = user?.id;

  // ✅ SINGLE-SOURCE: Use new verification hooks
  const { data: verificationData, isLoading: verificationLoading } = useVerificationData(providerId);
  const updateStepMutation = useUpdateStepCompletion();

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
  const [houseCallAvailable, setHouseCallAvailable] = useState(false);
  const [houseCallExtraFee, setHouseCallExtraFee] = useState('');

  // ✅ SYNC: Initialize form with existing data from verification data
  React.useEffect(() => {
    if (verificationData?.businessTerms) {
      console.log('[Terms] Syncing existing terms data to form');
      setHouseCallAvailable(verificationData.businessTerms.house_call_available || false);
      setHouseCallExtraFee(verificationData.businessTerms.house_call_extra_fee?.toString() || '');
    }
  }, [verificationData?.businessTerms]);

  // ✅ FORM VALIDATION
  const validateForm = useCallback(() => {
    const houseCallFee = houseCallAvailable ? parseInt(houseCallExtraFee) : 0;

    if (houseCallAvailable && (isNaN(houseCallFee) || houseCallFee < 0)) {
      Alert.alert('Invalid House Call Fee', 'House call extra fee must be a valid positive number.');
      return false;
    }
    return true;
  }, [houseCallAvailable, houseCallExtraFee]);

  // ✅ FORM SUBMISSION: Use single-source mutation
  const handleSubmit = useCallback(async () => {
    if (!validateForm()) return;

    if (!providerId) {
      Alert.alert('Error', 'Provider ID not found. Please try logging in again.');
      return;
    }

    try {
      console.log('[Terms] Submitting terms data:', {
        houseCallAvailable,
        houseCallExtraFee: houseCallAvailable ? parseInt(houseCallExtraFee) : 0
      });

      // ✅ SINGLE-SOURCE: Use centralized mutation to update step completion
      await updateStepMutation.mutateAsync({
        providerId,
        stepNumber: 7, // Terms is now step 7 (services removed)
        completed: true,
        data: {
          termsAccepted: true,
          houseCallAvailable,
          houseCallExtraFee: houseCallAvailable ? parseInt(houseCallExtraFee) : 0,
        },
      });

      router.push('/(provider-verification)/complete');
    } catch (error) {
      console.error('[Terms] Submit error:', error);
      Alert.alert('Save Failed', 'Failed to save terms. Please try again.');
    }
  }, [validateForm, providerId, houseCallAvailable, houseCallExtraFee, updateStepMutation]);

  return (
    <View className="flex-1 bg-background">
      <VerificationHeader 
        step={7} 
        title="Terms & Conditions" 
      />
      <ScreenWrapper scrollable={true} contentContainerClassName="px-6 py-4">
      {/* Form Sections */}
      <Animated.View entering={SlideInDown.delay(400).springify()}>
        {/* Section 1: House Call Service (Optional) */}
        <View className="mb-8 p-4 bg-card rounded-xl border border-border">
          <View className="flex-row items-center mb-4">
            <View className="w-10 h-10 bg-primary/10 rounded-lg items-center justify-center mr-3">
              <Icon as={Home} size={24} className="text-primary" />
            </View>
            <Text className="font-semibold text-foreground text-lg">House Call Service</Text>
          </View>

          <TouchableOpacity 
            onPress={() => setHouseCallAvailable(!houseCallAvailable)}
            className={`flex-row items-center p-3 border rounded-lg mb-3 ${
              houseCallAvailable 
                ? 'bg-primary/5 border-primary' 
                : 'bg-background border-border'
            }`}
            activeOpacity={0.7}
          >
            <View className={`w-6 h-6 rounded border-2 items-center justify-center mr-3 ${
              houseCallAvailable 
                ? 'bg-primary border-primary' 
                : 'border-border'
            }`}>
              {houseCallAvailable && (
                <Text className="text-primary-foreground text-lg leading-none">✓</Text>
              )}
            </View>
            <Text className={`font-medium ${houseCallAvailable ? 'text-primary' : 'text-foreground'}`}>
              I offer house call services
            </Text>
          </TouchableOpacity>

          {houseCallAvailable && (
            <Animated.View entering={FadeIn.duration(300)}>
              <View className="flex-row items-baseline mb-2">
                <Text className="text-sm font-medium text-foreground">
                  Extra Service Fee
                </Text>
                <Text className="text-xs text-muted-foreground ml-2">(optional)</Text>
              </View>
              <View className="relative">
                <Input
                  placeholder="15"
                  value={houseCallExtraFee}
                  onChangeText={(text) => {
                    if (text === '') {
                      setHouseCallExtraFee('');
                      return;
                    }
                    const numericText = text.replace(/[^0-9.]/g, '');
                    setHouseCallExtraFee(numericText);
                  }}
                  keyboardType="decimal-pad"
                  className="placeholder:text-muted-foreground/30 pr-10"
                />
                <View className="absolute right-3 top-0 bottom-0 justify-center">
                  <Text className="text-muted-foreground font-medium">£</Text>
                </View>
              </View>
              <Text className="text-xs text-muted-foreground mt-2">
                Additional charge for traveling to customer location
              </Text>
            </Animated.View>
          )}
        </View>
      </Animated.View>

      {/* Info Section */}
      <Animated.View entering={SlideInDown.delay(600).springify()} className="mb-8">
        <View className="p-4 bg-primary/5 rounded-xl border border-primary/20">
          <View className="flex-row items-center mb-3">
            <View className="w-8 h-8 bg-primary/10 rounded-full items-center justify-center mr-2">
              <Icon as={Info} size={18} className="text-primary" />
            </View>
            <Text className="font-semibold text-foreground">
              How Payment Works
            </Text>
          </View>
          <View className="pl-1">
            <Text className="text-muted-foreground text-sm leading-relaxed">
              Your full service price is charged immediately and held securely in escrow. Once you complete the service, you'll automatically receive your payment via Stripe. The platform keeps a 10% booking fee.
            </Text>
          </View>
        </View>
      </Animated.View>

      {/* Continue Button */}
      <Animated.View entering={SlideInDown.delay(800).springify()} className="mb-3">
        <Button
          size="lg"
          onPress={handleSubmit}
          disabled={updateStepMutation.isPending}
          className="w-full"
        >
          <Text className="font-semibold text-primary-foreground">
            {updateStepMutation.isPending ? 'Saving Terms...' : 'Complete Verification'}
          </Text>
        </Button>
      </Animated.View>

      {/* Back Button */}
      <Animated.View entering={SlideInDown.delay(900).springify()}>
        <Button
          variant="outline"
          size="lg"
          onPress={() => {
            // Go to bio (step 6) - previous step before terms (step 7)
            router.push('/(provider-verification)/bio');
          }}
          disabled={updateStepMutation.isPending}
          className="w-full"
        >
          <Text className="text-foreground font-medium">← Back to Business Bio</Text>
        </Button>
      </Animated.View>
    </ScreenWrapper>
    </View>
  );
}
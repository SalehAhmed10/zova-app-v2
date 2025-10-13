import React from 'react';
import { View, Alert, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { FileText, CheckCircle, Info } from 'lucide-react-native';

import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScreenWrapper } from '@/components/ui/screen-wrapper';
import { Icon } from '@/components/ui/icon';
import { VerificationHeader } from '@/components/verification/VerificationHeader';
import { useProviderVerificationStore } from '@/stores/verification/provider-verification';
import { useSaveVerificationStep } from '@/hooks/provider/useProviderVerificationQueries';
import { useAuthOptimized } from '@/hooks';
import { useVerificationNavigation } from '@/hooks/provider';
import { VerificationFlowManager } from '@/lib/verification/verification-flow-manager';
import { supabase } from '@/lib/supabase';

export default function BusinessTermsScreen() {
  // ✅ MIGRATED: Using optimized auth hook and React Query + Zustand
  const { user } = useAuthOptimized();
  
  // ✅ ZUSTAND: Get terms data from store
  const { 
    termsData,
    updateTermsData,
    completeStepSimple,
  } = useProviderVerificationStore();
  
  // ✅ REACT QUERY: Mutation for saving terms
  const saveTermsMutation = useSaveVerificationStep();
  
  // ✅ CENTRALIZED NAVIGATION: Replace manual routing
  const { navigateBack } = useVerificationNavigation();

  // ✅ REACT QUERY: Fetch existing terms data from database
  const { data: existingTermsData } = useQuery({
    queryKey: ['providerTerms', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      console.log('[Terms] Fetching existing terms data from database...');
      const { data, error } = await supabase
        .from('provider_business_terms')
        .select('deposit_percentage, cancellation_fee_percentage, cancellation_policy')
        .eq('provider_id', user.id)
        .maybeSingle();
      
      if (error && error.code !== 'PGRST116') {
        console.error('[Terms] Error fetching terms data:', error);
        return null;
      }
      
      console.log('[Terms] Existing terms from database:', {
        deposit: data?.deposit_percentage,
        cancellationFee: data?.cancellation_fee_percentage,
        policy: data?.cancellation_policy?.substring(0, 50)
      });
      return data;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // ✅ NO useEffect! Pure computation with useMemo for data sync: Database → Store
  React.useMemo(() => {
    // Sync database → store (pure side effect during render, NOT in useEffect!)
    if (existingTermsData && termsData.depositPercentage === null) {
      console.log('[Terms] Syncing from database to store');
      updateTermsData({
        depositPercentage: existingTermsData.deposit_percentage,
        cancellationFeePercentage: existingTermsData.cancellation_fee_percentage,
        cancellationPolicy: existingTermsData.cancellation_policy,
      });
    }
  }, [existingTermsData, termsData.depositPercentage, updateTermsData]);

  // ✅ OPTIMIZED: Form validation using Zustand data
  const validateForm = () => {
    const deposit = termsData.depositPercentage;
    const cancellationFee = termsData.cancellationFeePercentage;
    const policy = termsData.cancellationPolicy;

    if (deposit === null || deposit === undefined || deposit < 0 || deposit > 100) {
      Alert.alert('Invalid Deposit', 'Deposit percentage must be between 0 and 100.');
      return false;
    }
    if (cancellationFee === null || cancellationFee === undefined || cancellationFee < 0 || cancellationFee > 100) {
      Alert.alert('Invalid Cancellation Fee', 'Cancellation fee percentage must be between 0 and 100.');
      return false;
    }
    if (!policy?.trim()) {
      Alert.alert('Cancellation Policy Required', 'Please describe your cancellation policy.');
      return false;
    }
    if (policy.length < 50) {
      Alert.alert('Policy Too Short', 'Your cancellation policy should be at least 50 characters long.');
      return false;
    }
    return true;
  };

  // ✅ REACT QUERY MUTATION: Handle form submission
  const handleSubmit = async () => {
    if (!validateForm() || !user?.id) return;

    try {
      // ✅ REACT QUERY: Use mutation to save data
      await saveTermsMutation.mutateAsync({
        providerId: user.id,
        step: 'terms',
        data: {
          depositPercentage: termsData.depositPercentage,
          cancellationFeePercentage: termsData.cancellationFeePercentage,
          cancellationPolicy: termsData.cancellationPolicy,
        },
      });

      // ✅ EXPLICIT: Complete step 8 and navigate using flow manager
      const result = VerificationFlowManager.completeStepAndNavigate(
        8, // Always step 8 for terms
        {
          depositPercentage: termsData.depositPercentage,
          cancellationFeePercentage: termsData.cancellationFeePercentage,
          cancellationPolicy: termsData.cancellationPolicy,
          termsAccepted: true,
        },
        (step, stepData) => {
          // Update Zustand store
          completeStepSimple(step, stepData);
        }
      );
      
      console.log('[Terms] Navigation result:', result);
    } catch (error) {
      console.error('[TermsScreen] Submit error:', error);
      Alert.alert('Error', 'Failed to save terms. Please try again.');
    }
  };

  return (
    <View className="flex-1 bg-background">
      <VerificationHeader 
        step={8} 
        title="Terms & Conditions" 
      />
      <ScreenWrapper scrollable={true} contentContainerClassName="px-6 py-4">
      {/* Form */}
      <Animated.View entering={SlideInDown.delay(400).springify()}>
        {/* Deposit Percentage */}
        <View className="mb-6">
          <Text className="text-sm font-medium text-foreground mb-2">
            Deposit Percentage *
          </Text>
          <View className="relative">
            <Input
              placeholder="Enter deposit percentage (e.g., 25)"
              value={termsData.depositPercentage?.toString() || ''}
              onChangeText={(text) => {
                // Allow empty input or numbers with decimal point
                if (text === '') {
                  updateTermsData({ depositPercentage: null });
                  return;
                }
                
                const numericText = text.replace(/[^0-9.]/g, '');
                const value = parseFloat(numericText);
                
                if (!isNaN(value)) {
                  updateTermsData({ depositPercentage: value });
                }
                // If invalid, don't update (keep previous value)
              }}
              keyboardType="decimal-pad"
              maxLength={5}
              className="placeholder:text-muted-foreground/30"
            />
            <View className="absolute right-3 top-0 bottom-0 justify-center">
              <Text className="text-muted-foreground">%</Text>
            </View>
          </View>
          <Text className="text-xs text-muted-foreground mt-1">
            Percentage of total service cost required as deposit (0-100%)
          </Text>
        </View>

        {/* Cancellation Fee Percentage */}
        <View className="mb-6">
          <Text className="text-sm font-medium text-foreground mb-2">
            Cancellation Fee Percentage *
          </Text>
          <View className="relative">
            <Input
              placeholder="Enter cancellation fee percentage (e.g., 50)"
              value={termsData.cancellationFeePercentage?.toString() || ''}
              onChangeText={(text) => {
                // Allow empty input or numbers with decimal point
                if (text === '') {
                  updateTermsData({ cancellationFeePercentage: null });
                  return;
                }
                
                const numericText = text.replace(/[^0-9.]/g, '');
                const value = parseFloat(numericText);
                
                if (!isNaN(value)) {
                  updateTermsData({ cancellationFeePercentage: value });
                }
                // If invalid, don't update (keep previous value)
              }}
              keyboardType="decimal-pad"
              maxLength={5}
              className="placeholder:text-muted-foreground/30"
            />
            <View className="absolute right-3 top-0 bottom-0 justify-center">
              <Text className="text-muted-foreground">%</Text>
            </View>
          </View>
          <Text className="text-xs text-muted-foreground mt-1">
            Percentage of deposit charged for cancellations (0-100%)
          </Text>
        </View>

        {/* Cancellation Policy */}
        <View>
          <Text className="text-sm font-medium text-foreground mb-2">
            Cancellation Policy *
          </Text>
          <Textarea
            placeholder="Describe your cancellation policy, including notice requirements and any exceptions..."
            value={termsData.cancellationPolicy || ''}
            onChangeText={(text) => updateTermsData({ cancellationPolicy: text })}
            maxLength={500}
            className="min-h-[100px]"
            placeholderClassName="text-muted-foreground/30"
          />
          <Text className="text-xs text-muted-foreground mt-1">
            {(termsData.cancellationPolicy || '').length}/500 characters (minimum 50)
          </Text>
        </View>
      </Animated.View>

      {/* Example Terms */}
      <Animated.View entering={SlideInDown.delay(600).springify()} className="my-6">
        <View className="flex-row p-4 bg-success/10 rounded-lg border border-success/20">
          <View className="mr-3 mt-0.5">
            <Icon as={CheckCircle} size={20} className="text-success" />
          </View>
          <View className="flex-1">
            <Text className="font-semibold text-foreground mb-2">
              Example Policy
            </Text>
            <Text className="text-muted-foreground text-sm">
              "Cancellations must be made at least 24 hours in advance. Cancellations within 24 hours will incur a 50% deposit fee. Emergency cancellations (medical, family emergencies) may be waived at my discretion with appropriate documentation."
            </Text>
          </View>
        </View>
      </Animated.View>

      {/* Guidelines */}
      <Animated.View entering={SlideInDown.delay(700).springify()} className="mb-6">
        <View className="flex-row p-4 bg-primary/5 rounded-lg border border-primary/20">
          <View className="mr-3 mt-0.5">
            <Icon as={FileText} size={20} className="text-primary" />
          </View>
          <View className="flex-1">
            <Text className="font-semibold text-foreground mb-2">
              Policy Guidelines
            </Text>
            <View>
              <Text className="text-muted-foreground text-sm mb-1">
                • Be clear about notice requirements (e.g., 24 hours, 48 hours)
              </Text>
              <Text className="text-muted-foreground text-sm mb-1">
                • Consider exceptions for emergencies or special circumstances
              </Text>
              <Text className="text-muted-foreground text-sm mb-1">
                • Keep fees reasonable and industry-appropriate
              </Text>
              <Text className="text-muted-foreground text-sm">
                • Be professional but understanding in your tone
              </Text>
            </View>
          </View>
        </View>
      </Animated.View>

      {/* Continue Button */}
      <Animated.View entering={SlideInDown.delay(800).springify()} className="mb-4">
        <Button
          size="lg"
          onPress={handleSubmit}
          disabled={
            saveTermsMutation.isPending ||
            termsData.depositPercentage === null ||
            termsData.depositPercentage === undefined ||
            termsData.cancellationFeePercentage === null ||
            termsData.cancellationFeePercentage === undefined ||
            !termsData.cancellationPolicy?.trim()
          }
          className="w-full"
        >
          <Text className="font-semibold text-primary-foreground">
            {saveTermsMutation.isPending ? 'Saving...' : 'Continue to Payment Setup'}
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
          <Text>Back to Business Bio</Text>
        </Button>
      </Animated.View>
    </ScreenWrapper>
    </View>
  );
}
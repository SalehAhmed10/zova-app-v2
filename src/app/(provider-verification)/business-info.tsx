import React, { useMemo } from 'react';
import { View } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { router } from 'expo-router';
import { Info, AlertCircle } from 'lucide-react-native';

import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScreenWrapper } from '@/components/ui/screen-wrapper';
import { Icon } from '@/components/ui/icon';
import { VerificationHeader } from '@/components/verification/VerificationHeader';
import { useProviderVerificationStore, useProviderVerificationSelectors } from '@/stores/verification/provider-verification';
import { useAuthOptimized } from '@/hooks';
import { useSaveVerificationStep } from '@/hooks/provider/useProviderVerificationQueries';
import { useVerificationNavigation } from '@/hooks/provider';
import { VerificationFlowManager } from '@/lib/verification/verification-flow-manager';
import { supabase } from '@/lib/supabase';

interface BusinessInfoForm {
  businessName: string;
  phoneNumber: string;
  address: string;
  city: string;
  postalCode: string;
}

export default function BusinessInfoScreen() {
  // ✅ MIGRATED: Using optimized auth hook and React Query + Zustand
  const { user } = useAuthOptimized();
  
  // ✅ ZUSTAND: Get business data from store
  const { 
    businessData, 
    updateBusinessData, 
    completeStepSimple,
    currentStep,
  } = useProviderVerificationStore();
  
  // ✅ REACT QUERY: Fetch existing business info from database
  const { data: existingBusinessInfo, isLoading: isLoadingBusinessInfo } = useQuery({
    queryKey: ['businessInfo', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      console.log('[Business Info] Fetching existing data for provider:', user.id);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('business_name, phone_number, country_code, address, city, postal_code')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('[Business Info] Error fetching existing data:', error);
        return null;
      }

      console.log('[Business Info] Existing data found:', {
        businessName: data?.business_name,
        phoneNumber: data?.phone_number,
        hasAddress: !!data?.address
      });

      return data;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes - data doesn't change often
  });
  
  // ✅ REACT QUERY: Mutation for saving business info
  const saveBusinessInfoMutation = useSaveVerificationStep();
  
  // ✅ CENTRALIZED NAVIGATION: Replace manual routing
  const { navigateNext, navigateBack } = useVerificationNavigation();

  // ✅ PURE COMPUTATION: Merge database data with store data (NO useEffect!)
  // Following copilot-rules.md: React Query + Zustand with NO side effects
  const formDefaultValues = useMemo(() => {
    // Priority: Database data → Store data → Empty string
    const values = {
      businessName: existingBusinessInfo?.business_name || businessData.businessName || '',
      phoneNumber: existingBusinessInfo?.phone_number || businessData.phoneNumber || '',
      address: existingBusinessInfo?.address || businessData.address || '',
      city: existingBusinessInfo?.city || businessData.city || '',
      postalCode: existingBusinessInfo?.postal_code || businessData.postalCode || '',
    };

    // ✅ SYNC TO STORE: Only if database has data but store is empty
    // This is a pure side effect during render, not in useEffect
    if (existingBusinessInfo?.business_name && !businessData.businessName) {
      console.log('[Business Info] Syncing database data to store');
      updateBusinessData({
        businessName: existingBusinessInfo.business_name || '',
        phoneNumber: existingBusinessInfo.phone_number || '',
        countryCode: existingBusinessInfo.country_code || '+44',
        address: existingBusinessInfo.address || '',
        city: existingBusinessInfo.city || '',
        postalCode: existingBusinessInfo.postal_code || '',
      });
    }

    return values;
  }, [existingBusinessInfo, businessData]);

  // ✅ REACT HOOK FORM: Use computed default values (re-initializes when data changes)
  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<BusinessInfoForm>({
    mode: 'onChange',
    defaultValues: formDefaultValues,
    values: formDefaultValues, // ✅ KEY FIX: Auto-updates form when data changes
  });

  // ✅ REACT QUERY MUTATION: Handle form submission  
  const onSubmit = async (data: BusinessInfoForm) => {
    if (!user?.id) return;
    
    try {
      console.log('[Business Info] Starting submission with data:', data);
      
      // ✅ ZUSTAND: Update verification store first
      updateBusinessData({
        businessName: data.businessName,
        phoneNumber: data.phoneNumber,
        address: data.address,
        city: data.city,
        postalCode: data.postalCode,
        countryCode: '+44', // Default to UK
      });

      // ✅ REACT QUERY: Use mutation to save data
      await saveBusinessInfoMutation.mutateAsync({
        providerId: user.id,
        step: 'business-info',
        data: {
          businessName: data.businessName,
          phoneNumber: data.phoneNumber,
          address: data.address,
          city: data.city,
          postalCode: data.postalCode,
          countryCode: '+44',
        },
      });

      // ✅ EXPLICIT: Complete step 3 and navigate using flow manager
      const result = VerificationFlowManager.completeStepAndNavigate(
        3, // Always step 3 for business info
        data,
        (step, stepData) => {
          // Update Zustand store
          completeStepSimple(step, stepData);
        }
      );
      
      console.log('[Business Info] Navigation result:', result);
      console.log('[Business Info] Submission completed successfully');
    } catch (error) {
      console.error('[Business Info] Error saving business info:', error);
      // TODO: Show error toast instead of setSubmitError
    }
  };

  return (
    <View className="flex-1 bg-background">
      {/* ✅ Screen-owned header - always accurate */}
      <VerificationHeader
        step={3}
        title="Business Information"
      />

      <ScreenWrapper contentContainerClassName="px-6 py-4" className="flex-1">
        {/* Header */}
        <Animated.View 
          entering={FadeIn.delay(200).springify()}
          className="items-center mb-8"
        >
          <View className="w-16 h-16 bg-primary rounded-2xl justify-center items-center mb-4">
            <Text className="text-2xl">🏢</Text>
          </View>
          <Text className="text-2xl font-bold text-foreground mb-2">
            Business Information
          </Text>
          <Text className="text-base text-muted-foreground text-center">
            Tell us about your business details
          </Text>
        </Animated.View>

      {/* Form */}
      <Animated.View entering={SlideInDown.delay(400).springify()} className="gap-4">
        
        {/* Business Name */}
        <View>
          <Text className="text-sm font-medium text-foreground mb-3">
            Business Name
          </Text>
          <Controller
            control={control}
            name="businessName"
            rules={{
              required: 'Business name is required',
              minLength: {
                value: 2,
                message: 'Business name must be at least 2 characters',
              },
            }}
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                placeholder="Enter your business name"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                autoCapitalize="words"
                className={errors.businessName ? 'border-destructive' : ''}
              />
            )}
          />
          {errors.businessName && (
            <Text className="text-sm text-destructive mt-1">
              {errors.businessName.message}
            </Text>
          )}
          <Text className="text-xs text-muted-foreground mt-1">
            This is how your business will appear to customers
          </Text>
        </View>

        {/* Phone Number */}
        <View>
          <Text className="text-sm font-medium text-foreground mb-3">
            Phone Number
          </Text>
          <View className="flex-row gap-3">
            <View className="w-20">
              <Input
                value="+44"
                editable={false}
                className="bg-muted text-center"
              />
            </View>
            <View className="flex-1">
              <Controller
                control={control}
                name="phoneNumber"
                rules={{
                  required: 'Phone number is required',
                  pattern: {
                    value: /^[0-9]{10,11}$/,
                    message: 'Please enter a valid phone number',
                  },
                }}
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    placeholder="1234567890"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    keyboardType="phone-pad"
                    className={errors.phoneNumber ? 'border-destructive' : ''}
                  />
                )}
              />
            </View>
          </View>
          {errors.phoneNumber && (
            <Text className="text-sm text-destructive mt-1">
              {errors.phoneNumber.message}
            </Text>
          )}
        </View>

        {/* Address */}
        <View>
          <Text className="text-sm font-medium text-foreground mb-3">
            Business Address
          </Text>
          <Controller
            control={control}
            name="address"
            rules={{
              required: 'Business address is required',
              minLength: {
                value: 5,
                message: 'Address must be at least 5 characters',
              },
            }}
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                placeholder="Enter your business address"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                autoCapitalize="words"
                className={errors.address ? 'border-destructive' : ''}
              />
            )}
          />
          {errors.address && (
            <Text className="text-sm text-destructive mt-1">
              {errors.address.message}
            </Text>
          )}
        </View>

        {/* City and Postal Code */}
        <View className="flex-row gap-3">
          <View className="flex-1">
            <Text className="text-sm font-medium text-foreground mb-3">
              City
            </Text>
            <Controller
              control={control}
              name="city"
              rules={{
                required: 'City is required',
                minLength: {
                  value: 2,
                  message: 'City must be at least 2 characters',
                },
              }}
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  placeholder="London"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  autoCapitalize="words"
                  className={errors.city ? 'border-destructive' : ''}
                />
              )}
            />
            {errors.city && (
              <Text className="text-sm text-destructive mt-1">
                {errors.city.message}
              </Text>
            )}
          </View>

          <View className="flex-1">
            <Text className="text-sm font-medium text-foreground mb-3">
              Postal Code
            </Text>
            <Controller
              control={control}
              name="postalCode"
              rules={{
                required: 'Postal code is required',
                pattern: {
                  value: /^[A-Za-z0-9\s]{5,10}$/,
                  message: 'Please enter a valid postal code',
                },
              }}
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  placeholder="SW1A 1AA"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  autoCapitalize="characters"
                  className={errors.postalCode ? 'border-destructive' : ''}
                />
              )}
            />
            {errors.postalCode && (
              <Text className="text-sm text-destructive mt-1">
                {errors.postalCode.message}
              </Text>
            )}
          </View>
        </View>

        {/* Info Note */}
        <View className="flex-row p-4 bg-primary/5 rounded-lg border border-primary/20">
          <View className="mr-3 mt-0.5">
            <Icon as={Info} size={20} className="text-primary" />
          </View>
          <View className="flex-1">
            <Text className="font-semibold text-foreground mb-2">
              Business Information
            </Text>
            <Text className="text-muted-foreground text-sm">
              This information will be used to set up your business profile and 
              help customers find and contact you. You can update these details later.
            </Text>
          </View>
        </View>

        {/* Error Display */}
        {saveBusinessInfoMutation.error && (
          <View className="flex-row p-4 bg-destructive/10 rounded-lg border border-destructive/20">
            <View className="mr-3 mt-0.5">
              <Icon as={AlertCircle} size={20} className="text-destructive" />
            </View>
            <View className="flex-1">
              <Text className="font-semibold text-destructive mb-2">
                Error
              </Text>
              <Text className="text-destructive/90 text-sm">
                {saveBusinessInfoMutation.error.message}
              </Text>
            </View>
          </View>
        )}

        {/* Continue Button */}
        <Button
          size="lg"
          onPress={handleSubmit(onSubmit)}
          disabled={!isValid || saveBusinessInfoMutation.isPending}
          className="w-full mt-6"
        >
          <Text className="font-semibold text-primary-foreground">
            {saveBusinessInfoMutation.isPending ? 'Saving...' : 'Continue to Category Selection'}
          </Text>
        </Button>

        {/* Back Button */}
        <Button
          variant="outline"
          size="lg"
          onPress={navigateBack}
          className="w-full"
        >
          <Text>Back to Identity Verification</Text>
        </Button>
      </Animated.View>
      </ScreenWrapper>
    </View>
  );
}
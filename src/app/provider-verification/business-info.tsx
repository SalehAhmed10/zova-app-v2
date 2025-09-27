import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScreenWrapper } from '@/components/ui/screen-wrapper';
import { useProviderVerificationStore, useProviderVerificationSelectors } from '@/stores/verification/provider-verification';
import { useAuthOptimized } from '@/hooks';
import { useSaveVerificationStep } from '@/hooks/provider/useProviderVerificationQueries';

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
    completeStepAndNext,
  } = useProviderVerificationStore();
  
  // ✅ REACT QUERY: Mutation for saving business info
  const saveBusinessInfoMutation = useSaveVerificationStep();

  // ✅ OPTIMIZED: React Hook Form with Zustand integration
  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<BusinessInfoForm>({
    mode: 'onChange',
    defaultValues: {
      businessName: businessData.businessName || '',
      phoneNumber: businessData.phoneNumber || '',
      address: businessData.address || '',
      city: businessData.city || '',
      postalCode: businessData.postalCode || '',
    },
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

      // ✅ ZUSTAND: Mark step as completed and move to next
      completeStepAndNext(3, data);
      
      console.log('[Business Info] Submission completed successfully');
    } catch (error) {
      console.error('[Business Info] Error saving business info:', error);
      // TODO: Show error toast instead of setSubmitError
    }
  };

  return (
    <ScreenWrapper scrollable={true} contentContainerClassName="px-6 py-4">
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
        <View className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <Text className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
            ℹ️ Business Information
          </Text>
          <Text className="text-blue-800 dark:text-blue-200 text-sm">
            This information will be used to set up your business profile and 
            help customers find and contact you. You can update these details later.
          </Text>
        </View>

        {/* Error Display */}
        {saveBusinessInfoMutation.error && (
          <View className="p-4 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
            <Text className="font-semibold text-red-900 dark:text-red-100 mb-2">
              ❌ Error
            </Text>
            <Text className="text-red-800 dark:text-red-200 text-sm">
              {saveBusinessInfoMutation.error.message}
            </Text>
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
          onPress={() => router.back()}
          className="w-full"
        >
          <Text>Back to Identity Verification</Text>
        </Button>
      </Animated.View>
    </ScreenWrapper>
  );
}
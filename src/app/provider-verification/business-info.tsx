import React, { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScreenWrapper } from '@/components/ui/screen-wrapper';
import { supabase } from '@/lib/supabase';
import { useProviderVerificationStore, useProviderVerificationSelectors } from '@/stores/provider-verification';

interface BusinessInfoForm {
  businessName: string;
  phoneNumber: string;
  address: string;
  city: string;
  postalCode: string;
}

export default function BusinessInfoScreen() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { 
    businessData, 
    updateBusinessData, 
    completeStep, 
    completeStepAndNext,
    nextStep,
    previousStep,
    providerId
  } = useProviderVerificationStore();

  const { canGoBack } = useProviderVerificationSelectors();

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

  const onSubmit = async (data: BusinessInfoForm) => {
    setIsSubmitting(true);
    setSubmitError(null);
    
    try {
      console.log('[Business Info] Starting submission with data:', data);
      
      // Update verification store
      updateBusinessData({
        businessName: data.businessName,
        phoneNumber: data.phoneNumber,
        address: data.address,
        city: data.city,
        postalCode: data.postalCode,
        countryCode: '+44', // Default to UK
      });

      // First check if profile exists
      console.log('[Business Info] Checking if profile exists for provider:', providerId);
      const { data: existingProfile, error: checkError } = await supabase
        .from('profiles')
        .select('id, business_name')
        .eq('id', providerId)
        .single();

      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is "not found"
        console.error('[Business Info] Error checking profile existence:', checkError);
        throw new Error('Failed to check profile existence');
      }

      if (!existingProfile) {
        console.error('[Business Info] Profile not found for provider:', providerId);
        throw new Error('Provider profile not found. Please try logging out and back in.');
      }

      console.log('[Business Info] Profile found:', existingProfile);

      // Save to database - update profile with business info (with timeout)
      console.log('[Business Info] Saving to database for provider:', providerId);
      console.log('[Business Info] Data to save:', {
        business_name: data.businessName,
        phone_number: data.phoneNumber,
        address: data.address,
        city: data.city,
        postal_code: data.postalCode,
        country_code: '+44',
      });
      
      // Add timeout to prevent hanging
      const dbPromise = supabase
        .from('profiles')
        .update({
          business_name: data.businessName,
          phone_number: data.phoneNumber,
          address: data.address,
          city: data.city,
          postal_code: data.postalCode,
          country_code: '+44',
        })
        .eq('id', providerId)
        .select();

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Database operation timed out')), 10000); // 10 second timeout
      });

      const { data: dbResult, error: dbError } = await Promise.race([dbPromise, timeoutPromise]) as any;

      console.log('[Business Info] Database response:', { data: dbResult, error: dbError });

      console.log('[Business Info] Database response:', { data: dbResult, error: dbError });

      if (dbError) {
        console.error('[Business Info] Database error:', dbError);
        throw new Error('Failed to save business information');
      }

      console.log('[Business Info] Database update successful');

      // Mark step as completed and move to next in one atomic operation
      console.log('[Business Info] Step 3 completed, calling completeStepAndNext()');
      completeStepAndNext(3, data);
      
      console.log('[Business Info] Submission completed successfully');
    } catch (error) {
      console.error('[Business Info] Error saving business info:', error);
      setSubmitError(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
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
        {submitError && (
          <View className="p-4 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
            <Text className="font-semibold text-red-900 dark:text-red-100 mb-2">
              ❌ Error
            </Text>
            <Text className="text-red-800 dark:text-red-200 text-sm">
              {submitError}
            </Text>
          </View>
        )}

        {/* Continue Button */}
        <Button
          size="lg"
          onPress={handleSubmit(onSubmit)}
          disabled={!isValid || isSubmitting}
          className="w-full mt-6"
        >
          <Text className="font-semibold text-primary-foreground">
            {isSubmitting ? 'Saving...' : 'Continue to Category Selection'}
          </Text>
        </Button>

        {/* Back Button - only show if not first step */}
        {canGoBack && (
          <Button
            variant="outline"
            size="lg"
            onPress={previousStep}
            className="w-full"
          >
            <Text>Back to Identity Verification</Text>
          </Button>
        )}
      </Animated.View>
    </ScreenWrapper>
  );
}
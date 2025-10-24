import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useForm, Controller, useWatch } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { router } from 'expo-router';
import { Info, AlertCircle, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react-native';

import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScreenWrapper } from '@/components/ui/screen-wrapper';
import { Icon } from '@/components/ui/icon';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SearchableCountrySelect } from '@/components/ui/searchable-country-select';
import { SearchableCitySelect } from '@/components/ui/searchable-city-select';
import { SearchableCountryCodeSelect } from '@/components/ui/searchable-country-code-select';
import { VerificationHeader } from '@/components/verification/VerificationHeader';
import { useVerificationData, useUpdateStepCompletion, useVerificationRealtime } from '@/hooks/provider/useVerificationSingleSource';
import { useAuthStore } from '@/stores/auth';
import { useGeocoding } from '@/hooks/shared/useGeocoding';
import { VerificationFlowManager } from '@/lib/verification/verification-flow-manager';
import { COUNTRIES, getCountryByCode } from '@/constants/countries';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

interface BusinessInfoForm {
  businessName: string;
  businessBio: string;
  phone_country_code?: {
    name: string;
    dial_code: string;
    code: string;
    flag: string;
  };
  phone_number: string;
  address: string;
  city: string;
  postalCode: string;
  country_code: string;
}

export default function BusinessInfoScreen() {
  // ✅ MIGRATED: Using new single-source verification hooks
  const { user } = useAuthStore();
  const { data: verificationData, isLoading: verificationLoading } = useVerificationData(user?.id);
  const updateStepMutation = useUpdateStepCompletion();

  // Real-time subscription for live updates
  useVerificationRealtime(user?.id);

  // ✅ GEOCODING: Address validation hook
  const {
    validateAddress: validateGeocoding,
    isValidating: isGeocoding, 
    validationError: geocodingError, 
    validationWarning: geocodingWarning 
  } = useGeocoding();
  
  // ✅ STATE: UI state management
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [addressValidated, setAddressValidated] = useState(false);
  
  // ✅ REACT QUERY: Fetch existing business info from database
  const { data: existingBusinessInfo, isLoading: isLoadingBusinessInfo } = useQuery({
    queryKey: ['businessInfo', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      console.log('[Business Info] Fetching existing data for provider:', user.id);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('business_name, business_bio, phone_number, country_code, address, city, postal_code, latitude, longitude')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('[Business Info] Error fetching existing data:', error);
        return null;
      }

      console.log('[Business Info] Existing data found:', {
        businessName: data?.business_name,
        businessBio: data?.business_bio,
        phoneNumber: data?.phone_number,
        hasAddress: !!data?.address,
        hasCoordinates: !!(data?.latitude && data?.longitude)
      });

      return data;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes - data doesn't change often
  });
  
  // ✅ REACT QUERY: Mutation for saving business info
  const saveBusinessInfoMutation = useUpdateStepCompletion();

  // ✅ PURE COMPUTATION: Merge database data with verification data (NO useEffect!)
  // Following copilot-rules.md: React Query + Zustand with NO side effects
  const formDefaultValues = useMemo(() => {
    // Get business info from verification data (stored in businessTerms)
    const businessInfoData = verificationData?.businessTerms;

    // Parse phone number to extract country code
    let phoneCountryCode = undefined;
    let phoneNumber = existingBusinessInfo?.phone_number || businessInfoData?.phoneNumber || '';

    if (phoneNumber && (existingBusinessInfo?.country_code || businessInfoData?.countryCode)) {
      // Use the user's country_code from profile to determine phone country code
      const countryCode = existingBusinessInfo?.country_code || businessInfoData?.countryCode || '+44';
      const userCountry = COUNTRIES.find(c => c.value === countryCode || `+${c.value}` === countryCode);

      if (userCountry) {
        const Country = require('country-state-city').Country;
        const fullCountry = Country.getCountryByCode(userCountry.code);
        const expectedDialCode = fullCountry?.phonecode ? `+${fullCountry.phonecode}` : countryCode;

        // Try to extract the phone number without country code
        const phoneCodeMatch = phoneNumber.match(/^(\+\d{1,4})\s*(.+)$/);
        if (phoneCodeMatch) {
          phoneNumber = phoneCodeMatch[2]; // Remove the dial code from phone number
        }

        // Set phone country code based on user's country
        phoneCountryCode = {
          name: userCountry.label,
          dial_code: expectedDialCode,
          code: userCountry.value,
          flag: userCountry.flag || '🇬🇧',
        };
      }
    }

    // Priority: Database data → Verification data → Empty string
    // ✅ SANITIZE country_code: If it starts with '+', it's a phone code, use default 'GB'
    const dbCountryCode = existingBusinessInfo?.country_code;
    const sanitizedCountryCode = dbCountryCode && dbCountryCode.startsWith('+')
      ? 'GB' // Default to GB if we got a phone code instead of ISO code
      : dbCountryCode || businessInfoData?.countryCode || 'GB';

    console.log('[Business Info] Country code sanitization:', {
      raw: dbCountryCode,
      sanitized: sanitizedCountryCode
    });

    const values = {
      businessName: existingBusinessInfo?.business_name || businessInfoData?.businessName || '',
      businessBio: existingBusinessInfo?.business_bio || businessInfoData?.businessBio || '',
      phone_country_code: phoneCountryCode,
      phone_number: phoneNumber,
      address: existingBusinessInfo?.address || businessInfoData?.address || '',
      city: existingBusinessInfo?.city || businessInfoData?.city || '',
      postalCode: existingBusinessInfo?.postal_code || businessInfoData?.postalCode || '',
      country_code: sanitizedCountryCode,
    };

    return values;
  }, [existingBusinessInfo, verificationData]);  // ✅ REACT HOOK FORM: Use computed default values (re-initializes when data changes)
  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<BusinessInfoForm>({
    mode: 'onChange',
    defaultValues: formDefaultValues,
    values: formDefaultValues, // ✅ KEY FIX: Auto-updates form when data changes
  });

  // Watch country_code to enable/disable city selection
  const selectedCountryCode = useWatch({
    control,
    name: 'country_code',
  });

  // ✅ REACT QUERY MUTATION: Handle form submission  
  const onSubmit = async (data: BusinessInfoForm) => {
    if (!user?.id) return;
    
    setIsSubmitting(true);
    try {
      console.log('[Business Info] Starting submission with data:', data);
      
      // ✅ VALIDATE ADDRESS: Use geocoding if any address fields provided
      let coordinates = null;
      if (data.address || data.city || data.country_code) {
        const countryInfo = getCountryByCode(data.country_code);
        const addressComponents = {
          address: data.address,
          city: data.city,
          postal_code: data.postalCode,
          country: countryInfo?.name || data.country_code,
        };

        console.log('[Business Info] 🔍 Starting address validation...');
        console.log('[Business Info] 📍 Address components:', addressComponents);

        const validationResult = await validateGeocoding(addressComponents);

        console.log('[Business Info] ✅ Validation result:', {
          isValid: validationResult.isValid,
          hasCoordinates: !!validationResult.coordinates,
          coordinates: validationResult.coordinates,
          warning: validationResult.warning,
          error: geocodingError
        });

        if (!validationResult.isValid) {
          // Address validation failed, but we'll still allow saving (lenient validation)
          console.warn('[Business Info] ⚠️ Address validation failed:', geocodingError);
          console.log('[Business Info] 💾 Allowing save without coordinates due to lenient validation');
        } else {
          coordinates = validationResult.coordinates;
          setAddressValidated(true);

          if (coordinates) {
            console.log('[Business Info] 📌 Coordinates found and will be saved:', coordinates);
          } else {
            console.log('[Business Info] 📭 No coordinates found, saving address without location data');
          }

          if (validationResult.warning) {
            console.warn('[Business Info] ⚠️ Address saved with warning:', validationResult.warning);
          } else {
            console.log('[Business Info] ✅ Address validated successfully');
          }
        }
      } else {
        console.log('[Business Info] ⏭️ No address fields provided, skipping geocoding validation');
      }
      
      // Combine phone country code + number
      const fullPhoneNumber = data.phone_country_code && data.phone_number
        ? `${data.phone_country_code.dial_code} ${data.phone_number}`.trim()
        : data.phone_number;

      // ✅ REACT QUERY: Use mutation to save data with coordinates
      await saveBusinessInfoMutation.mutateAsync({
        providerId: user.id,
        stepNumber: 3,
        completed: true,
        data: {
          businessName: data.businessName,
          businessBio: data.businessBio,
          phoneNumber: fullPhoneNumber,
          address: data.address,
          city: data.city,
          postalCode: data.postalCode,
          countryCode: data.country_code,
          coordinates, // Include coordinates if validation succeeded
        },
      });

      // ✅ EXPLICIT: Navigate to next step
      router.push('/(provider-verification)/category');

      console.log('[Business Info] Submission completed successfully');
    } catch (error) {
      console.error('[Business Info] Error saving business info:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View className="flex-1 bg-background">
      {/* ✅ Screen-owned header - always accurate */}
      <VerificationHeader
        step={3}
        title="Business Information"
      />

      <ScreenWrapper contentContainerClassName="px-4 py-4" className="flex-1">
        {/* Header */}
        <Animated.View 
          entering={FadeIn.delay(200).springify()}
          className="items-center mb-6"
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
        
        {/* Basic Information Card */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="gap-4">
            {/* Business Name */}
            <View>
              <Text className="text-sm font-medium text-foreground mb-2">
                Business Name *
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
                    placeholder="e.g. Nails by Joe B"
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

            {/* Business Bio */}
            <View>
              <Text className="text-sm font-medium text-foreground mb-2">
                Business Bio * (Max 150 characters)
              </Text>
              <Controller
                control={control}
                name="businessBio"
                rules={{
                  required: 'Business bio is required',
                  maxLength: {
                    value: 150,
                    message: 'Bio must not exceed 150 characters',
                  },
                }}
                render={({ field: { onChange, onBlur, value } }) => (
                  <>
                    <Textarea
                      placeholder="e.g. Hybrid lash and nail specialist. 5 years experience, helping clients look their best."
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      numberOfLines={3}
                      maxLength={150}
                      className={errors.businessBio ? 'border-destructive' : ''}
                    />
                    <Text className="text-xs text-muted-foreground mt-1 text-right">
                      {value?.length || 0}/150
                    </Text>
                  </>
                )}
              />
              {errors.businessBio && (
                <Text className="text-sm text-destructive mt-1">
                  {errors.businessBio.message}
                </Text>
              )}
              <Text className="text-xs text-muted-foreground mt-1">
                Professional language only. No vulgar content.
              </Text>
            </View>

            {/* Phone Number with Country Code */}
            <View>
              <Text className="text-sm font-medium text-foreground mb-2">
                Phone Number *
              </Text>
              <View className="flex-row gap-3">
                <View className="w-28">
                  <Controller
                    control={control}
                    name="phone_country_code"
                    rules={{ required: 'Country code required' }}
                    render={({ field: { onChange, value } }) => (
                      <SearchableCountryCodeSelect
                        value={value}
                        onValueChange={onChange}
                        placeholder="Code"
                      />
                    )}
                  />
                </View>
                <View className="flex-1">
                  <Controller
                    control={control}
                    name="phone_number"
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
                        className={errors.phone_number ? 'border-destructive' : ''}
                      />
                    )}
                  />
                </View>
              </View>
              {(errors.phone_country_code || errors.phone_number) && (
                <Text className="text-sm text-destructive mt-1">
                  {errors.phone_country_code?.message || errors.phone_number?.message}
                </Text>
              )}
            </View>
          </CardContent>
        </Card>

        {/* Business Address Card */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Business Address</CardTitle>
          </CardHeader>
          <CardContent className="gap-4">
            {/* Country Selection */}
            <View>
              <Text className="text-sm font-medium text-foreground mb-2">
                Country *
              </Text>
              <Controller
                control={control}
                name="country_code"
                rules={{ required: 'Please select your country' }}
                render={({ field: { onChange, value } }) => {
                  // Find the country object from the string code
                  const countryObject = value ? COUNTRIES.find(c => c.value === value) : undefined;
                  
                  return (
                    <SearchableCountrySelect
                      value={countryObject as any}
                      onValueChange={(country) => {
                        // Extract just the ISO code string from the country object
                        onChange(country?.value);
                        console.log('[Business Info] Country selected:', country?.value);
                      }}
                      placeholder="Select country"
                      countries={COUNTRIES}
                    />
                  );
                }}
              />
              {errors.country_code && (
                <Text className="text-sm text-destructive mt-1">
                  {errors.country_code.message}
                </Text>
              )}
            </View>

            {/* City Selection */}
            <View>
              <Text className="text-sm font-medium text-foreground mb-2">
                City *
              </Text>
              <Controller
                control={control}
                name="city"
                rules={{ required: 'City is required' }}
                render={({ field: { onChange, value } }) => (
                  <SearchableCitySelect
                    countryCode={selectedCountryCode}
                    value={value}
                    onValueChange={onChange}
                    placeholder={selectedCountryCode ? "Select city" : "Select country first"}
                    disabled={!selectedCountryCode}
                  />
                )}
              />
              {errors.city && (
                <Text className="text-sm text-destructive mt-1">
                  {errors.city.message}
                </Text>
              )}
            </View>

            {/* Address */}
            <View>
              <Text className="text-sm font-medium text-foreground mb-2">
                Street Address *
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

            {/* Postal Code */}
            <View>
              <Text className="text-sm font-medium text-foreground mb-2">
                Postal Code *
              </Text>
              <Controller
                control={control}
                name="postalCode"
                rules={{
                  required: 'Postal code is required',
                  pattern: {
                    value: /^[A-Za-z0-9\s]{3,10}$/,
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

            {/* Address Validation Status */}
            {(isGeocoding || geocodingError || geocodingWarning || addressValidated) && (
              <View className={cn(
                "flex-row items-center gap-2 p-3 rounded-lg",
                isGeocoding && "bg-muted",
                geocodingError && "bg-destructive/10",
                geocodingWarning && "bg-yellow-500/10",
                addressValidated && "bg-green-500/10"
              )}>
                {isGeocoding && (
                  <>
                    <Icon as={Loader2} className="text-muted-foreground animate-spin" size={16} />
                    <Text className="text-sm text-muted-foreground flex-1">Validating address...</Text>
                  </>
                )}
                {geocodingError && !isGeocoding && (
                  <>
                    <Icon as={AlertCircle} className="text-destructive" size={16} />
                    <Text className="text-sm text-destructive flex-1">{geocodingError}</Text>
                  </>
                )}
                {geocodingWarning && !geocodingError && !isGeocoding && (
                  <>
                    <Icon as={AlertTriangle} className="text-yellow-500" size={16} />
                    <Text className="text-sm text-yellow-700 dark:text-yellow-300 flex-1">{geocodingWarning}</Text>
                  </>
                )}
                {addressValidated && !geocodingError && !geocodingWarning && !isGeocoding && (
                  <>
                    <Icon as={CheckCircle} className="text-green-500" size={16} />
                    <Text className="text-sm text-green-700 dark:text-green-300 flex-1">Address verified ✓</Text>
                  </>
                )}
              </View>
            )}
          </CardContent>
        </Card>

        {/* Info Note */}
        <View className="flex-row p-4 bg-primary/5 rounded-lg border border-primary/20">
          <View className="mr-3 mt-0.5">
            <Icon as={Info} size={20} className="text-primary" />
          </View>
          <View className="flex-1">
            <Text className="font-semibold text-foreground mb-2">
              Important Information
            </Text>
            <Text className="text-muted-foreground text-sm">
              Your business information will be visible to customers. We'll validate your address to help customers find you. You can update these details later from your profile.
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
                Error Saving Information
              </Text>
              <Text className="text-destructive/90 text-sm">
                {saveBusinessInfoMutation.error.message || 'Failed to save business information. Please try again.'}
              </Text>
            </View>
          </View>
        )}

        {/* Continue Button */}
        <Button
          size="lg"
          onPress={handleSubmit(onSubmit)}
          disabled={!isValid || isSubmitting || isGeocoding}
          className="w-full mt-4"
        >
          {(isSubmitting || isGeocoding) ? (
            <View className="flex-row items-center gap-2">
              <Icon as={Loader2} className="text-primary-foreground animate-spin" size={20} />
              <Text className="font-semibold text-primary-foreground">
                {isGeocoding ? 'Validating Address...' : 'Saving...'}
              </Text>
            </View>
          ) : (
            <Text className="font-semibold text-primary-foreground">
              Continue to Category Selection
            </Text>
          )}
        </Button>

        {/* Back Button */}
        <Button
          variant="outline"
          size="lg"
          onPress={() => {
            // Go to selfie (step 2) - previous step before business info (step 3)
            router.push('/(provider-verification)/selfie');
          }}
          disabled={isSubmitting}
          className="w-full"
        >
          <Text>Back to Identity Verification</Text>
        </Button>
      </Animated.View>
      </ScreenWrapper>
    </View>
  );
}
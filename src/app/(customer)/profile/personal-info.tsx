import React, { useState, useEffect } from 'react';
import { View, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useColorScheme } from '@/lib/core/useColorScheme';
import { THEME } from '@/lib/theme';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useForm, Controller, useWatch } from 'react-hook-form';
import { useUpdateProfile } from '@/hooks';
import { useProfile } from '@/hooks/shared/useProfileData';
import { useAuthOptimized } from '@/hooks';
import { useGeocoding } from '@/hooks/shared/useGeocoding';
import { COUNTRIES, getCountryByCode } from '@/constants/countries';
import { SearchableCountrySelect } from '@/components/ui/searchable-country-select';
import { SearchableCitySelect } from '@/components/ui/searchable-city-select';
import { SearchableCountryCodeSelect } from '@/components/ui/searchable-country-code-select';
import { ChevronLeft, CheckCircle, AlertCircle, AlertTriangle, Loader2 } from 'lucide-react-native';
import { cn } from '@/lib/utils';

interface PersonalInfoForm {
  first_name: string;
  last_name: string;
  email: string;
  phone_country_code?: {
    name: string;
    dial_code: string;
    code: string;
    flag: string;
  };
  phone_number?: string;
  bio?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  country_code: string; // Changed from country: string
}

export default function PersonalInfoScreen() {
  const { user } = useAuthOptimized();
  const queryClient = useQueryClient();
  const { data: profileData, isLoading, error, refetch } = useProfile(user?.id);
  const updateProfileMutation = useUpdateProfile();
  const { validateAddress: validateGeocoding, isValidating: isGeocoding, validationError: geocodingError, validationWarning: geocodingWarning, lastValidatedCoordinates } = useGeocoding();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [addressValidated, setAddressValidated] = useState(false);
  const { isDarkColorScheme } = useColorScheme();

  // Debug logging
  console.log('[PersonalInfo] User ID:', user?.id);
  console.log('[PersonalInfo] Profile Data:', profileData);
  console.log('[PersonalInfo] Is Loading:', isLoading);
  console.log('[PersonalInfo] Error:', error);

  // 🔥 TEMPORARY: Force cache invalidation on mount
  React.useEffect(() => {
    if (user?.id) {
      console.log('[PersonalInfo] 🔄 Invalidating profile cache...');
      queryClient.invalidateQueries({ queryKey: ['profile', user.id] });
      refetch();
    }
  }, [user?.id, queryClient, refetch]);

  const { control, handleSubmit, formState: { errors, isDirty }, reset, watch } = useForm<PersonalInfoForm>({
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      phone_country_code: undefined,
      phone_number: '',
      bio: '',
      address: '',
      city: '',
      postal_code: '',
      country_code: '',
    }
  });

  // Watch country_code to enable/disable city selection
  const selectedCountryCode = useWatch({
    control,
    name: 'country_code',
  });

  // Update form when profile data loads
  useEffect(() => {
    if (profileData) {
      // Parse phone number to extract country code
      let phoneCountryCode = undefined;
      let phoneNumber = profileData.phone_number || '';

      if (phoneNumber && profileData.country_code) {
        // Use the user's country_code from profile to determine phone country code
        const userCountry = COUNTRIES.find(c => c.code === profileData.country_code);
        
        if (userCountry) {
          const fullCountry = require('country-state-city').Country.getCountryByCode(userCountry.code);
          const expectedDialCode = fullCountry?.phonecode ? `+${fullCountry.phonecode}` : '';
          
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
            flag: userCountry.flag || '🇺🇸',
          };
        }
      }

      reset({
        first_name: profileData.first_name || '',
        last_name: profileData.last_name || '',
        email: profileData.email || '',
        phone_country_code: phoneCountryCode,
        phone_number: phoneNumber,
        bio: profileData.bio || '',
        address: profileData.address || '',
        city: profileData.city || '',
        postal_code: profileData.postal_code || '',
        country_code: profileData.country_code || '',
      });
      // Clear geocoding state when profile data loads
      setAddressValidated(false);
    }
  }, [profileData, reset]);

  const onSubmit = async (data: PersonalInfoForm) => {
    if (!profileData?.id) return;

    setIsSubmitting(true);
    try {
      // Validate address if any address fields are provided
      let coordinates = null;
      if (data.address || data.city || data.country_code) {
        const countryInfo = getCountryByCode(data.country_code);
        const addressComponents = {
          address: data.address,
          city: data.city,
          postal_code: data.postal_code,
          country: countryInfo?.name || data.country_code, // Use country name for geocoding
        };

        console.log('[PersonalInfo] 🔍 Starting address validation...');
        console.log('[PersonalInfo] 📍 Address components:', addressComponents);

        const validationResult = await validateGeocoding(addressComponents);

        console.log('[PersonalInfo] ✅ Validation result:', {
          isValid: validationResult.isValid,
          hasCoordinates: !!validationResult.coordinates,
          coordinates: validationResult.coordinates,
          warning: validationResult.warning,
          error: geocodingError
        });

        if (!validationResult.isValid) {
          // Address validation failed, but we'll still allow saving
          // The geocoding error will be shown to the user
          console.warn('[PersonalInfo] ⚠️ Address validation failed:', geocodingError);
          console.log('[PersonalInfo] 💾 Allowing save without coordinates due to lenient validation');
        } else {
          coordinates = validationResult.coordinates;
          setAddressValidated(true);

          if (coordinates) {
            console.log('[PersonalInfo] 📌 Coordinates found and will be saved:', coordinates);
          } else {
            console.log('[PersonalInfo] 📭 No coordinates found, saving address without location data');
          }

          if (validationResult.warning) {
            console.warn('[PersonalInfo] ⚠️ Address saved with warning:', validationResult.warning);
          } else {
            console.log('[PersonalInfo] ✅ Address validated successfully');
          }
        }
      } else {
        console.log('[PersonalInfo] ⏭️ No address fields provided, skipping geocoding validation');
      }

      await updateProfileMutation.mutateAsync({
        id: profileData.id,
        first_name: data.first_name,
        last_name: data.last_name,
        phone_number: data.phone_country_code && data.phone_number
          ? `${data.phone_country_code.dial_code} ${data.phone_number}`.trim()
          : data.phone_number,
        bio: data.bio,
        address: data.address,
        city: data.city,
        postal_code: data.postal_code,
        country: getCountryByCode(data.country_code)?.name || '',
        country_code: data.country_code,
        coordinates: coordinates,
      });

      console.log('[PersonalInfo] 📤 Submitting profile update with coordinates:', coordinates);

      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
      }, 2000);
    } catch (error) {
      console.error('Failed to update profile:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading || !profileData) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 items-center justify-center">
          <Loader2 size={32} className="text-primary animate-spin mb-2" />
          <Text className="text-muted-foreground">Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-border">
        <View className="flex-row items-center">
          <Button
            variant="ghost"
            size="sm"
            onPress={() => router.push('/(customer)/profile')}
            className="mr-2"
          >
            <ChevronLeft size={20} color={isDarkColorScheme ? THEME.dark.foreground : THEME.light.foreground} />
          </Button>
          <Text variant="h3">Personal Information</Text>
        </View>
        {showSuccess && (
          <View className="flex-row items-center">
            <CheckCircle size={20} className="text-green-500 mr-1" />
            <Text className="text-green-600 text-sm font-medium">Saved</Text>
          </View>
        )}
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
        className="flex-1"
      >
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          <View className="px-0 py-4 gap-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="gap-4">
              <View className="flex-row gap-3">
                <View className="flex-1">
                  <Text className="text-sm font-medium mb-2">First Name</Text>
                  <Controller
                    control={control}
                    name="first_name"
                    rules={{ required: 'First name is required' }}
                    render={({ field: { onChange, value } }) => (
                      <Input
                        value={value}
                        onChangeText={onChange}
                        placeholder="Enter first name"
                        className={cn("h-11", errors.first_name && 'border-destructive')}
                      />
                    )}
                  />
                  {errors.first_name && (
                    <Text className="text-destructive text-xs mt-1">{errors.first_name.message}</Text>
                  )}
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-medium mb-2">Last Name</Text>
                  <Controller
                    control={control}
                    name="last_name"
                    rules={{ required: 'Last name is required' }}
                    render={({ field: { onChange, value } }) => (
                      <Input
                        value={value}
                        onChangeText={onChange}
                        placeholder="Enter last name"
                        className={cn("h-11", errors.last_name && 'border-destructive')}
                      />
                    )}
                  />
                  {errors.last_name && (
                    <Text className="text-destructive text-xs mt-1">{errors.last_name.message}</Text>
                  )}
                </View>
              </View>

              <View>
                <Text className="text-sm font-medium mb-2">Email</Text>
                <Controller
                  control={control}
                  name="email"
                  rules={{
                    required: 'Email is required',
                    pattern: {
                      value: /^\S+@\S+$/i,
                      message: 'Invalid email address'
                    }
                  }}
                  render={({ field: { onChange, value } }) => (
                    <Input
                      value={value}
                      onChangeText={onChange}
                      placeholder="Enter email"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      className={cn("h-11", errors.email && 'border-destructive')}
                    />
                  )}
                />
                {errors.email && (
                  <Text className="text-destructive text-xs mt-1">{errors.email.message}</Text>
                )}
              </View>

              <View>
                <Text className="text-sm font-medium mb-2">Phone Number</Text>
                <View className="flex-row gap-2">
                  <View className="w-[35%]">
                    <Controller
                      control={control}
                      name="phone_country_code"
                      render={({ field: { onChange, value } }) => (
                        <SearchableCountryCodeSelect
                          value={value}
                          onValueChange={onChange}
                          placeholder="+1"
                        />
                      )}
                    />
                  </View>
                  <View className="w-[65%]">
                    <Controller
                      control={control}
                      name="phone_number"
                      rules={{
                        validate: (value) => {
                          if (watch('phone_country_code') && !value?.trim()) {
                            return 'Phone number is required when country code is selected';
                          }
                          if (value && !/^[\d\s\-\(\)\+]+$/.test(value)) {
                            return 'Please enter a valid phone number';
                          }
                          return true;
                        }
                      }}
                      render={({ field: { onChange, value } }) => (
                        <Input
                          value={value}
                          onChangeText={onChange}
                          placeholder="Enter phone number"
                          keyboardType="phone-pad"
                          className={cn("h-11", errors.phone_number && 'border-destructive')}
                        />
                      )}
                    />
                  </View>
                </View>
                {errors.phone_number && (
                  <Text className="text-destructive text-xs mt-1">{errors.phone_number.message}</Text>
                )}
              </View>
            </CardContent>
          </Card>

          {/* About */}
          <Card>
            <CardHeader>
              <CardTitle>About</CardTitle>
            </CardHeader>
            <CardContent>
              <View>
                <Text className="text-sm font-medium mb-2">Bio</Text>
                <Controller
                  control={control}
                  name="bio"
                  rules={{
                    maxLength: {
                      value: 500,
                      message: 'Bio must be less than 500 characters'
                    }
                  }}
                  render={({ field: { onChange, value } }) => (
                    <Textarea
                      value={value}
                      onChangeText={onChange}
                      placeholder="Tell us about yourself..."
                      className={cn("min-h-[80px]", errors.bio && 'border-destructive')}
                    />
                  )}
                />
                {errors.bio && (
                  <Text className="text-destructive text-xs mt-1">{errors.bio.message}</Text>
                )}
                {watch('bio') && (
                  <Text className="text-muted-foreground text-xs mt-1 text-right">
                    {watch('bio').length}/500 characters
                  </Text>
                )}
              </View>
            </CardContent>
          </Card>

          {/* Address */}
          <Card>
            <CardHeader>
              <CardTitle>Address</CardTitle>
            </CardHeader>
            <CardContent className="gap-4">
              <View>
                <Text className="text-sm font-medium mb-2">Street Address</Text>
                <Controller
                  control={control}
                  name="address"
                  rules={{
                    validate: (value) => {
                      const hasAnyAddressField = watch('city') || watch('postal_code') || watch('country_code');
                      if (hasAnyAddressField && !value?.trim()) {
                        return 'Street address is required when providing other address details';
                      }
                      return true;
                    }
                  }}
                  render={({ field: { onChange, value } }) => (
                    <Input
                      value={value}
                      onChangeText={onChange}
                      placeholder="Enter street address"
                      className={cn("h-11", errors.address && 'border-destructive')}
                    />
                  )}
                />
                {errors.address && (
                  <Text className="text-destructive text-xs mt-1">{errors.address.message}</Text>
                )}
              </View>

              <View className="flex-row gap-3">
                <View className="flex-1">
                  <Text className="text-sm font-medium mb-2">City</Text>
                  <Controller
                    control={control}
                    name="city"
                    rules={{
                      validate: (value) => {
                        const hasAnyAddressField = watch('address') || watch('postal_code') || watch('country_code');
                        if (hasAnyAddressField && !value?.trim()) {
                          return 'City is required when providing other address details';
                        }
                        return true;
                      }
                    }}
                    render={({ field: { onChange, value } }) => (
                      <SearchableCitySelect
                        value={value}
                        onValueChange={onChange}
                        placeholder="Select city"
                        countryCode={selectedCountryCode}
                        disabled={!selectedCountryCode}
                        className={cn(errors.city && 'border-destructive')}
                      />
                    )}
                  />
                  {errors.city && (
                    <Text className="text-destructive text-xs mt-1">{errors.city.message}</Text>
                  )}
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-medium mb-2">Postal Code</Text>
                  <Controller
                    control={control}
                    name="postal_code"
                    rules={{
                      validate: (value) => {
                        const hasAnyAddressField = watch('address') || watch('city') || watch('country_code');
                        if (hasAnyAddressField && !value?.trim()) {
                          return 'Postal code is required when providing other address details';
                        }
                        // Basic postal code validation (alphanumeric, spaces, hyphens)
                        if (value && !/^[A-Za-z0-9\s\-]+$/.test(value)) {
                          return 'Please enter a valid postal code';
                        }
                        return true;
                      }
                    }}
                    render={({ field: { onChange, value } }) => (
                      <Input
                        value={value}
                        onChangeText={onChange}
                        placeholder="Enter postal code"
                        className={cn("h-11", errors.postal_code && 'border-destructive')}
                      />
                    )}
                  />
                  {errors.postal_code && (
                    <Text className="text-destructive text-xs mt-1">{errors.postal_code.message}</Text>
                  )}
                </View>
              </View>

              <View>
                <Text className="text-sm font-medium mb-2">Country</Text>
                <Controller
                  control={control}
                  name="country_code"
                  rules={{ required: 'Country is required' }}
                  render={({ field: { onChange, value } }) => {
                    const selectedCountry = COUNTRIES.find(c => c.value === value);
                    return (
                      <SearchableCountrySelect
                        value={selectedCountry}
                        onValueChange={(country) => onChange(country?.value || '')}
                        placeholder="Select country"
                        countries={COUNTRIES}
                        className={cn(errors.country_code && 'border-destructive')}
                      />
                    );
                  }}
                />
                {errors.country_code && (
                  <Text className="text-destructive text-xs mt-1">{errors.country_code.message}</Text>
                )}
              </View>

              {/* Geocoding Status */}
              {(isGeocoding || geocodingError || geocodingWarning || addressValidated) && (
                <View className="flex-row items-center gap-2 p-3 rounded-lg bg-muted">
                  {isGeocoding && (
                    <>
                      <Loader2 size={16} className="text-muted-foreground animate-spin" />
                      <Text className="text-sm text-muted-foreground">Validating address...</Text>
                    </>
                  )}
                  {geocodingError && !isGeocoding && (
                    <>
                      <AlertCircle size={16} className="text-destructive" />
                      <Text className="text-sm text-destructive">{geocodingError}</Text>
                    </>
                  )}
                  {geocodingWarning && !isGeocoding && !geocodingError && (
                    <>
                        <AlertTriangle size={16} className="text-secondary-foreground" />
                      <Text className="text-sm text-secondary-foreground">{geocodingWarning}</Text>
                    </>
                  )}
                  {addressValidated && !isGeocoding && !geocodingError && !geocodingWarning && (
                    <>
                      <CheckCircle size={16} className="text-green-600" />
                      <Text className="text-sm text-green-600">Address validated successfully</Text>
                    </>
                  )}
                </View>
              )}
            </CardContent>
          </Card>
        </View>
      </ScrollView>

      {/* Save Button */}
      <View className="px-4 pt-2 pb-1 border-t border-border bg-background">
        <Button
          onPress={handleSubmit(onSubmit)}
          disabled={isSubmitting || !isDirty}
          className="w-full"
        >
          <Text className="text-primary-foreground font-medium">
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </Text>
        </Button>
      </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
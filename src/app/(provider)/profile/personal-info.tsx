import React, { useState, useEffect } from 'react';
import { View, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useColorScheme } from '@/lib/core/useColorScheme';
import { THEME } from '@/lib/theme';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useForm, Controller } from 'react-hook-form';
import { Ionicons } from '@expo/vector-icons';
import { useProfile, useUpdateProfile } from '@/hooks/shared/useProfileData';
import { useAuthStore } from '@/stores/auth';
import { CheckCircle } from 'lucide-react-native';
import { cn } from '@/lib/utils';

interface BusinessInfoForm {
  first_name: string;
  last_name: string;
  email: string;
  phone_number?: string;
  bio?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  country: string;
  country_code?: string;
}

export default function PersonalInfoScreen() {
  const user = useAuthStore((state) => state.user);
  const { data: profileData, isLoading, error } = useProfile(user?.id);
  const updateProfileMutation = useUpdateProfile();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const { isDarkColorScheme, colorScheme } = useColorScheme();
  const colors = THEME[colorScheme];

  console.log('[PersonalInfo] 🔍 Component state:', {
    userId: user?.id,
    isLoading,
    hasData: !!profileData,
    hasError: !!error,
    profileDataKeys: profileData ? Object.keys(profileData).slice(0, 5) : null,
  });

  const { control, handleSubmit, formState: { errors: formErrors, isDirty }, reset } = useForm<BusinessInfoForm>({
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      phone_number: '',
      bio: '',
      address: '',
      city: '',
      postal_code: '',
      country: '',
      country_code: '',
    }
  });

  // Update form when profile data loads
  useEffect(() => {
    if (profileData && profileData.id) {
      console.log('[PersonalInfo] 📋 Profile data loaded, updating form:', {
        first_name: profileData.first_name,
        last_name: profileData.last_name,
        email: profileData.email,
        has_all_fields: !!(profileData.first_name && profileData.last_name && profileData.email),
      });
      
      reset({
        first_name: profileData.first_name || '',
        last_name: profileData.last_name || '',
        email: profileData.email || '',
        phone_number: profileData.phone_number || '',
        bio: profileData.bio || '',
        address: profileData.address || '',
        city: profileData.city || '',
        postal_code: profileData.postal_code || '',
        country: profileData.country || '',
        country_code: profileData.country_code || '',
      });
    } else if (profileData && !profileData.id) {
      console.warn('[PersonalInfo] ⚠️ Profile data missing id field:', Object.keys(profileData));
    }
  }, [profileData, reset]);

  const onSubmit = async (data: BusinessInfoForm) => {
    if (!profileData?.id) {
      console.error('[PersonalInfo] ❌ No profileData.id available');
      return;
    }

    setIsSubmitting(true);
    try {
      console.log('[PersonalInfo] 💾 Submitting profile update:', {
        id: profileData.id,
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        phone_number: data.phone_number,
      });

      await updateProfileMutation.mutateAsync({
        id: profileData.id,
        first_name: data.first_name,
        last_name: data.last_name,
        phone_number: data.phone_number,
        bio: data.bio,
        address: data.address,
        city: data.city,
        postal_code: data.postal_code,
        country: data.country,
      });

      console.log('[PersonalInfo] ✅ Profile updated successfully');
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        router.back();
      }, 2000);
    } catch (error) {
      console.error('[PersonalInfo] ❌ Failed to update profile:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 items-center justify-center">
          <Text className="text-muted-foreground">Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header */}
      <View className="px-4 py-4 border-b border-border">
        <View className="flex-row items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onPress={() => router.back()}
            className="w-8 h-8 p-0"
          >
            <Ionicons name="chevron-back" size={24} color={colors.primary} />
          </Button>
          <Text className="text-xl font-bold text-foreground">
            Business Profile
          </Text>
          <View className="w-8 h-8 items-center justify-center">
            {showSuccess && (
              <CheckCircle size={20} color={colors.success} />
            )}
          </View>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
        className="flex-1"
      >
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          <View className="p-4 gap-6">
          {/* Business Information */}
          <Card>
            <CardHeader>
              <CardTitle>Business Information</CardTitle>
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
                        className={cn(formErrors.first_name && 'border-destructive')}
                      />
                    )}
                  />
                  {formErrors.first_name && (
                    <Text className="text-destructive text-xs mt-1">{formErrors.first_name.message}</Text>
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
                        className={cn(formErrors.last_name && 'border-destructive')}
                      />
                    )}
                  />
                  {formErrors.last_name && (
                    <Text className="text-destructive text-xs mt-1">{formErrors.last_name.message}</Text>
                  )}
                </View>
              </View>

              <View>
                <Text className="text-sm font-medium mb-2">Business Email</Text>
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
                      placeholder="Enter business email"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      className={cn(formErrors.email && 'border-destructive')}
                    />
                  )}
                />
                {formErrors.email && (
                  <Text className="text-destructive text-xs mt-1">{formErrors.email.message}</Text>
                )}
              </View>

              <View>
                <Text className="text-sm font-medium mb-2">Business Phone</Text>
                <Controller
                  control={control}
                  name="phone_number"
                  render={({ field: { onChange, value } }) => (
                    <Input
                      value={value}
                      onChangeText={onChange}
                      placeholder="Enter business phone number"
                      keyboardType="phone-pad"
                    />
                  )}
                />
              </View>
            </CardContent>
          </Card>

          {/* Business Description */}
          <Card>
            <CardHeader>
              <CardTitle>Business Description</CardTitle>
            </CardHeader>
            <CardContent>
              <View>
                <Text className="text-sm font-medium mb-2">About Your Business</Text>
                <Controller
                  control={control}
                  name="bio"
                  render={({ field: { onChange, value } }) => (
                    <Textarea
                      value={value}
                      onChangeText={onChange}
                      placeholder="Describe your business, services, and what makes you unique..."
                      className="min-h-[100px]"
                    />
                  )}
                />
              </View>
            </CardContent>
          </Card>

          {/* Business Address */}
          <Card>
            <CardHeader>
              <CardTitle>Business Address</CardTitle>
            </CardHeader>
            <CardContent className="gap-4">
              <View>
                <Text className="text-sm font-medium mb-2">Street Address</Text>
                <Controller
                  control={control}
                  name="address"
                  render={({ field: { onChange, value } }) => (
                    <Input
                      value={value}
                      onChangeText={onChange}
                      placeholder="Enter business street address"
                    />
                  )}
                />
              </View>

              <View className="flex-row gap-3">
                <View className="flex-1">
                  <Text className="text-sm font-medium mb-2">City</Text>
                  <Controller
                    control={control}
                    name="city"
                    render={({ field: { onChange, value } }) => (
                      <Input
                        value={value}
                        onChangeText={onChange}
                        placeholder="Enter city"
                      />
                    )}
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-medium mb-2">Postal Code</Text>
                  <Controller
                    control={control}
                    name="postal_code"
                    render={({ field: { onChange, value } }) => (
                      <Input
                        value={value}
                        onChangeText={onChange}
                        placeholder="Enter postal code"
                      />
                    )}
                  />
                </View>
              </View>

              <View>
                <Text className="text-sm font-medium mb-2">Country</Text>
                <Controller
                  control={control}
                  name="country"
                  rules={{ required: 'Country is required' }}
                  render={({ field: { onChange, value } }) => (
                    <Input
                      value={value}
                      onChangeText={onChange}
                      placeholder="Enter country"
                      className={cn(formErrors.country && 'border-destructive')}
                    />
                  )}
                />
                {formErrors.country && (
                  <Text className="text-destructive text-xs mt-1">{formErrors.country.message}</Text>
                )}
              </View>
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
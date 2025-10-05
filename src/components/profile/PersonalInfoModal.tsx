import React, { useState, useEffect } from 'react';
import { View, Modal, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useForm, Controller } from 'react-hook-form';
import { useUpdateProfile } from '@/hooks';
import type { ProfileData } from '@/hooks/shared/useProfileData';
import { cn } from '@/lib/utils';

interface PersonalInfoModalProps {
  visible: boolean;
  onClose: () => void;
  profileData?: ProfileData;
}

interface PersonalInfoForm {
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

export function PersonalInfoModal({ visible, onClose, profileData }: PersonalInfoModalProps) {
  const updateProfileMutation = useUpdateProfile();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Reset success state when modal opens/closes
  useEffect(() => {
    if (!visible) {
      setShowSuccess(false);
    }
  }, [visible]);

  const { control, handleSubmit, formState: { errors, isDirty } } = useForm<PersonalInfoForm>({
    defaultValues: {
      first_name: profileData?.first_name || '',
      last_name: profileData?.last_name || '',
      email: profileData?.email || '',
      phone_number: profileData?.phone_number || '', // Use phone_number from database
      bio: profileData?.bio || '',
      address: profileData?.address || '',
      city: profileData?.city || '',
      postal_code: profileData?.postal_code || '',
      country: profileData?.country || 'GB',
    },
  });

  const onSubmit = async (data: PersonalInfoForm) => {
    if (!profileData?.id) {
      console.log('[PersonalInfoModal] No profile ID available');
      return;
    }

    console.log('[PersonalInfoModal] Starting profile update for user:', profileData.id);
    console.log('[PersonalInfoModal] Update data:', data);

    try {
      setIsSubmitting(true);
      const result = await updateProfileMutation.mutateAsync({
        id: profileData.id,
        first_name: data.first_name,
        last_name: data.last_name,
        phone_number: data.phone_number, // Map form phone_number to database phone_number
        bio: data.bio,
        address: data.address,
        city: data.city,
        postal_code: data.postal_code,
        country: data.country,
      });

      console.log('[PersonalInfoModal] ✅ Profile update successful:', result);
      setShowSuccess(true);
      // Auto-hide success message after 3 seconds
      setTimeout(() => setShowSuccess(false), 3000);
      onClose();
    } catch (error) {
      console.error('[PersonalInfoModal] ❌ Failed to update profile:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const FormField = ({ 
    name, 
    label, 
    placeholder, 
    multiline = false,
    keyboardType = 'default' as any,
    disabled = false
  }: {
    name: keyof PersonalInfoForm;
    label: string;
    placeholder: string;
    multiline?: boolean;
    keyboardType?: 'default' | 'email-address' | 'phone-pad';
    disabled?: boolean;
  }) => (
    <View className="mb-4">
      <Text variant="small" className="text-foreground font-medium mb-2">
        {label}
      </Text>
      <Controller
        control={control}
        name={name}
        rules={{
          required: ['first_name', 'last_name', 'email'].includes(name) ? `${label} is required` : false,
          pattern: name === 'email' ? {
            value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
            message: 'Invalid email address'
          } : undefined,
        }}
        render={({ field: { onChange, onBlur, value } }) => (
          name === 'bio' ? (
            <Textarea
              placeholder={placeholder}
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              numberOfLines={4}
              editable={!disabled}
              className={cn(
                'min-h-[100px]',
                errors[name] && 'border-destructive',
                disabled && 'opacity-60 bg-muted'
              )}
            />
          ) : (
            <Input
              placeholder={placeholder}
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              keyboardType={keyboardType}
              editable={!disabled}
              className={cn(
                'min-h-[44px]',
                errors[name] && 'border-destructive',
                disabled && 'opacity-60 bg-muted'
              )}
            />
          )
        )}
      />
      {errors[name] && (
        <Text variant="small" className="text-destructive mt-1">
          {errors[name]?.message}
        </Text>
      )}
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
        <View className="flex-row items-center justify-between p-4 border-b border-border">
          <Pressable onPress={onClose} className="p-2">
            <Text className="text-primary text-base">Cancel</Text>
          </Pressable>
          <Text variant="h4" className="text-foreground font-bold">
            Personal Information
          </Text>
          <View className="w-16" /> 
        </View>

        <ScrollView className="flex-1 p-4" showsVerticalScrollIndicator={false}>
          {showSuccess && (
            <View className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <Text className="text-green-800 dark:text-green-200 text-center font-medium">
                ✅ Profile updated successfully!
              </Text>
            </View>
          )}
          
          <Card>
            <CardHeader>
              <CardTitle>Profile Details</CardTitle>
            </CardHeader>
            <CardContent className="gap-0">
              <FormField
                name="first_name"
                label="First Name"
                placeholder="Enter your first name"
              />
              
              <FormField
                name="last_name"
                label="Last Name"
                placeholder="Enter your last name"
              />
              
              <FormField
                name="email"
                label="Email Address"
                placeholder="Enter your email"
                keyboardType="email-address"
                disabled={true}
              />
              
              <FormField
                name="phone_number"
                label="Phone Number"
                placeholder="Enter your phone number"
                keyboardType="phone-pad"
              />
              
              <FormField
                name="bio"
                label="Bio"
                placeholder="Tell us about yourself..."
                multiline
              />
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Address Information</CardTitle>
            </CardHeader>
            <CardContent className="gap-0">
              <FormField
                name="address"
                label="Street Address"
                placeholder="Enter your street address"
              />
              
              <FormField
                name="city"
                label="City"
                placeholder="Enter your city"
              />
              
              <FormField
                name="postal_code"
                label="Postal Code"
                placeholder="Enter your postal code"
              />
              
              <FormField
                name="country"
                label="Country"
                placeholder="Enter your country"
              />
            </CardContent>
          </Card>

          {/* Save Button */}
          <View className="mt-6 mb-8">
            <Button
              onPress={handleSubmit(onSubmit)}
              disabled={!isDirty || isSubmitting}
              className={cn(
                'h-12',
                (!isDirty || isSubmitting) && 'opacity-50'
              )}
            >
              <Text className="text-primary-foreground font-semibold text-base">
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </Text>
            </Button>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
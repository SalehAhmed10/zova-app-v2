import React, { useState } from 'react';
import { View, Modal, ScrollView, Pressable } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useForm, Controller } from 'react-hook-form';
import { ProfileData, useUpdateProfile } from '@/hooks/useProfileData';
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
  phone?: string;
  bio?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  country: string;
}

export function PersonalInfoModal({ visible, onClose, profileData }: PersonalInfoModalProps) {
  const updateProfileMutation = useUpdateProfile();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { control, handleSubmit, formState: { errors, isDirty } } = useForm<PersonalInfoForm>({
    defaultValues: {
      first_name: profileData?.first_name || '',
      last_name: profileData?.last_name || '',
      email: profileData?.email || '',
      phone: profileData?.phone || '',
      bio: profileData?.bio || '',
      address: profileData?.address || '',
      city: profileData?.city || '',
      postal_code: profileData?.postal_code || '',
      country: profileData?.country || 'GB',
    },
  });

  const onSubmit = async (data: PersonalInfoForm) => {
    if (!profileData?.id) return;
    
    try {
      setIsSubmitting(true);
      await updateProfileMutation.mutateAsync({
        id: profileData.id,
        ...data,
      });
      onClose();
    } catch (error) {
      console.error('Failed to update profile:', error);
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
      <View className="flex-1 bg-background">
    
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
                name="phone"
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
      </View>
    </Modal>
  );
}
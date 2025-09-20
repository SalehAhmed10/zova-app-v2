import React, { useState } from 'react';
import { View, Alert, Image } from 'react-native';
import { router } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import * as ImagePicker from 'expo-image-picker';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { ScreenWrapper } from '@/components/ui/screen-wrapper';
import { useProviderVerificationStore } from '@/stores/provider-verification';
import { supabase } from '@/lib/supabase';

interface DocumentForm {
  documentType: 'passport' | 'driving_license' | 'id_card';
}

export default function DocumentVerificationScreen() {
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  const { 
    documentData, 
    updateDocumentData, 
    completeStep, 
    nextStep,
    providerId 
  } = useProviderVerificationStore();

  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
    watch,
  } = useForm<DocumentForm>({
    mode: 'onChange',
    defaultValues: {
      documentType: documentData.documentType || 'passport',
    },
  });

  const documentType = watch('documentType');

  const getDocumentTypeInfo = (type: string) => {
    const info = {
      passport: {
        title: 'Passport',
        description: 'Upload a clear photo of your passport photo page',
        icon: '📘',
      },
      driving_license: {
        title: 'Driving License',
        description: 'Upload a clear photo of your driving license (front side)',
        icon: '🚗',
      },
      id_card: {
        title: 'ID Card',
        description: 'Upload a clear photo of your national ID card (front side)',
        icon: '🆔',
      },
    };
    return info[type as keyof typeof info];
  };

  const pickImage = async () => {
    try {
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'We need camera roll permissions to upload your document.');
        return;
      }

      // Pick image
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 10],
        quality: 0.8,
        base64: false,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const takePhoto = async () => {
    try {
      // Request permission
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'We need camera permissions to take a photo.');
        return;
      }

      // Take photo
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [16, 10],
        quality: 0.8,
        base64: false,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  const uploadDocument = async (uri: string) => {
    // TODO: Implement Supabase storage upload
    // For now, return the local URI
    return uri;
  };

  const onSubmit = async (data: DocumentForm) => {
    if (!selectedImage) {
      Alert.alert('Document Required', 'Please upload your document before continuing.');
      return;
    }

    setLoading(true);
    try {
      // Upload document to storage
      const documentUrl = await uploadDocument(selectedImage);
      
      // Update verification store
      updateDocumentData({
        documentType: data.documentType,
        documentUrl,
        verificationStatus: 'pending',
      });

      // TODO: Save to database
      // await saveDocumentToDatabase(providerId, data.documentType, documentUrl);

      // Mark step as completed and move to next
      completeStep(1, { documentType: data.documentType, documentUrl });
      
      Alert.alert(
        'Document Uploaded',
        'Your document has been uploaded successfully and is pending verification.',
        [
          {
            text: 'Continue',
            onPress: () => {
              nextStep();
              router.push('/provider-verification/selfie' as any);
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error uploading document:', error);
      Alert.alert('Upload Failed', 'Failed to upload document. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const currentDocumentInfo = getDocumentTypeInfo(documentType);

  return (
    <ScreenWrapper scrollable={true} contentContainerClassName="px-6 py-4">
      {/* Header */}
      <Animated.View 
        entering={FadeIn.delay(200).springify()}
        className="items-center mb-8"
      >
        <View className="w-16 h-16 bg-primary rounded-2xl justify-center items-center mb-4">
          <Text className="text-2xl">{currentDocumentInfo?.icon}</Text>
        </View>
        <Text className="text-2xl font-bold text-foreground mb-2">
          Document Verification
        </Text>
        <Text className="text-base text-muted-foreground text-center">
          Upload a valid ID document to verify your identity
        </Text>
      </Animated.View>

      {/* Document Type Selection */}
      <Animated.View entering={SlideInDown.delay(400).springify()} className="mb-6">
        <Text className="text-sm font-medium text-foreground mb-3">
          Document Type
        </Text>
        <Controller
          control={control}
          name="documentType"
          rules={{ required: 'Please select a document type' }}
          render={({ field: { onChange, value } }) => (
            <Select
              options={[
                {
                  label: 'Passport',
                  value: 'passport',
                  description: 'International passport'
                },
                {
                  label: 'Driving License',
                  value: 'driving_license',
                  description: 'Valid driving license'
                },
                {
                  label: 'ID Card',
                  value: 'id_card',
                  description: 'National ID card'
                }
              ]}
              value={value}
              onValueChange={onChange}
              placeholder="Select document type"
              variant={errors.documentType ? 'error' : 'default'}
            />
          )}
        />
        {errors.documentType && (
          <Text className="text-sm text-destructive mt-1">
            {errors.documentType.message}
          </Text>
        )}
      </Animated.View>

      {/* Document Info */}
      <Animated.View entering={SlideInDown.delay(600).springify()} className="mb-6">
        <View className="p-4 bg-muted/50 rounded-lg border border-border">
          <View className="flex-row items-center mb-2">
            <Text className="text-lg mr-2">{currentDocumentInfo?.icon}</Text>
            <Text className="font-semibold text-foreground">
              {currentDocumentInfo?.title}
            </Text>
          </View>
          <Text className="text-muted-foreground">
            {currentDocumentInfo?.description}
          </Text>
        </View>
      </Animated.View>

      {/* Document Upload */}
      <Animated.View entering={SlideInDown.delay(800).springify()} className="mb-6">
        <Text className="text-sm font-medium text-foreground mb-3">
          Document Image
        </Text>
        
        {selectedImage ? (
          <View className="mb-4">
            <Image 
              source={{ uri: selectedImage }} 
              className="w-full h-48 rounded-lg bg-muted"
              resizeMode="cover"
            />
            <Button
              variant="outline"
              size="sm"
              onPress={() => setSelectedImage(null)}
              className="mt-2"
            >
              <Text>Remove Image</Text>
            </Button>
          </View>
        ) : (
          <View className="border-2 border-dashed border-border rounded-lg p-8 items-center bg-muted/20">
            <Text className="text-4xl mb-2">📄</Text>
            <Text className="text-foreground font-medium mb-2">
              Upload Your Document
            </Text>
            <Text className="text-muted-foreground text-center mb-4">
              Take a clear photo or select from gallery
            </Text>
            
            <View className="flex-row gap-3">
              <Button
                variant="outline"
                size="sm"
                onPress={takePhoto}
              >
                <Text>Take Photo</Text>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onPress={pickImage}
              >
                <Text>Choose from Gallery</Text>
              </Button>
            </View>
          </View>
        )}
      </Animated.View>

      {/* Guidelines */}
      <Animated.View entering={SlideInDown.delay(1000).springify()} className="mb-6">
        <View className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <Text className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
            📋 Document Guidelines
          </Text>
          <View className="space-y-1">
            <Text className="text-blue-800 dark:text-blue-200 text-sm">
              • Document must be clear and readable
            </Text>
            <Text className="text-blue-800 dark:text-blue-200 text-sm">
              • All corners should be visible
            </Text>
            <Text className="text-blue-800 dark:text-blue-200 text-sm">
              • No glare or shadows
            </Text>
            <Text className="text-blue-800 dark:text-blue-200 text-sm">
              • Document must be valid and not expired
            </Text>
          </View>
        </View>
      </Animated.View>

      {/* Continue Button */}
      <Animated.View entering={SlideInDown.delay(1200).springify()} className="mb-4">
        <Button
          size="lg"
          onPress={handleSubmit(onSubmit)}
          disabled={!isValid || !selectedImage || loading}
          className="w-full"
        >
          <Text className="font-semibold text-primary-foreground">
            {loading ? 'Uploading...' : 'Continue to Identity Verification'}
          </Text>
        </Button>
      </Animated.View>

      {/* Back Button */}
      <Animated.View entering={SlideInDown.delay(1400).springify()}>
        <Button
          variant="outline"
          size="lg"
          onPress={() => router.back()}
          className="w-full"
        >
          <Text>Go Back</Text>
        </Button>
      </Animated.View>
    </ScreenWrapper>
  );
}
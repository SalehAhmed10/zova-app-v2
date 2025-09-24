import React, { useState, useEffect } from 'react';
import { View, Alert, Image } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import * as ImagePicker from 'expo-image-picker';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { ScreenWrapper } from '@/components/ui/screen-wrapper';
import { supabase } from '@/lib/supabase';
import { createStorageService } from '@/lib/organized-storage';
import { StoragePathUtils } from '@/lib/storage-paths';
import { useProviderVerificationStore, useProviderVerificationSelectors } from '@/stores/provider-verification';

export default function SelfieVerificationScreen() {
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageLoadError, setImageLoadError] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  
  const { 
    selfieData, 
    updateSelfieData, 
    completeStep,
    completeStepAndNext, 
    nextStep,
    previousStep,
    providerId
  } = useProviderVerificationStore();

  const { canGoBack, steps, completionPercentage } = useProviderVerificationSelectors();

  // Log verification step completion status
  const logStepCompletionStatus = () => {
    console.log('[Verification Steps Status]');
    Object.values(steps).forEach(step => {
      const status = step.isCompleted ? '✓' : '✗';
      console.log(`${status} Step ${step.stepNumber}: ${step.title} - ${step.isCompleted ? 'Completed' : 'Incomplete'}`);
    });
    console.log(`Completion: ${completionPercentage}%`);
  };

  // Check for existing selfie data on mount
  useEffect(() => {
    const loadExistingSelfie = async () => {
      if (!providerId) return;

      try {
        // First, try to load selfie data from database if not in store
        if (!selfieData.selfieUrl) {
          console.log('No selfie in store, checking database...');

          const { data: profile, error } = await supabase
            .from('profiles')
            .select('selfie_verification_url')
            .eq('id', providerId)
            .single();

          if (!error && profile?.selfie_verification_url) {
            console.log('Found selfie in database, getting fresh signed URL...');

            // Extract file path from the stored signed URL
            const filePath = StoragePathUtils.extractFilePathFromUrl(profile.selfie_verification_url);
            if (!filePath) {
              console.error('Could not extract file path from URL:', profile.selfie_verification_url);
              return;
            }

            // Always get a fresh signed URL since stored URLs might be expired
            const storageService = createStorageService(providerId);
            const signedUrlResult = await storageService.getSignedUrl(filePath);
            if (signedUrlResult.success && signedUrlResult.signedUrl) {
              updateSelfieData({
                selfieUrl: signedUrlResult.signedUrl,
                verificationStatus: 'pending'
              });

              // Set the image directly since we have a fresh signed URL
              setSelectedImage(signedUrlResult.signedUrl);
              setImageLoadError(false);
            } else {
              console.error('Failed to get fresh signed URL:', signedUrlResult.error);
            }
          } else {
            console.log('No selfie found in database either');
          }
        } else {
          // selfieData.selfieUrl exists, but it might be expired - get a fresh one
          console.log('Existing selfie found in store, refreshing signed URL...');

          // Extract file path from the stored signed URL
          const filePath = StoragePathUtils.extractFilePathFromUrl(selfieData.selfieUrl);
          if (!filePath) {
            console.error('Could not extract file path from stored URL:', selfieData.selfieUrl);
            // Fall back to stored URL if we can't extract path
            setSelectedImage(selfieData.selfieUrl);
            return;
          }

          const storageService = createStorageService(providerId);
          const signedUrlResult = await storageService.getSignedUrl(filePath);
          if (signedUrlResult.success && signedUrlResult.signedUrl) {
            // Update the store with fresh URL
            updateSelfieData({
              ...selfieData,
              selfieUrl: signedUrlResult.signedUrl
            });

            // Set the image with fresh URL
            setSelectedImage(signedUrlResult.signedUrl);
            setImageLoadError(false);
          } else {
            console.error('Failed to refresh signed URL:', signedUrlResult.error);
            // Fall back to stored URL if refresh fails
            setSelectedImage(selfieData.selfieUrl);
          }
        }
      } catch (error) {
        console.error('Error loading existing selfie:', error);
      }
    };

    loadExistingSelfie();
  }, [providerId]); // Only depend on providerId to avoid infinite loops

  const handleImageError = (error: any) => {
    console.error('Selfie image load error:', error);
    console.error('Failed URL:', selectedImage || selfieData.selfieUrl);
    setImageLoadError(true);
  };

  const handleRetryImage = async () => {
    if (!selfieData.selfieUrl || retryCount >= 2) return;

    setIsRetrying(true);
    setRetryCount(prev => prev + 1);

    try {
      // Extract file path from the stored signed URL
      const filePath = StoragePathUtils.extractFilePathFromUrl(selfieData.selfieUrl);
      if (!filePath) {
        throw new Error('Could not extract file path from URL');
      }

      // Try to get a fresh signed URL
      const storageService = createStorageService(providerId);
      const freshSignedUrlResult = await storageService.getSignedUrl(filePath);
      if (!freshSignedUrlResult.success || !freshSignedUrlResult.signedUrl) {
        throw new Error(freshSignedUrlResult.error || 'Failed to get fresh signed URL');
      }
      const freshSignedUrl = freshSignedUrlResult.signedUrl;
      
      // Update the store with fresh URL
      updateSelfieData({
        ...selfieData,
        selfieUrl: freshSignedUrl
      });
      
      // Update selectedImage state to trigger re-render with fresh URL
      setSelectedImage(freshSignedUrl);
      
      // Reset error state to trigger reload
      setImageLoadError(false);
    } catch (error) {
      console.error('Failed to retry selfie image load:', error);
    } finally {
      setIsRetrying(false);
    }
  };

  const takeSelfie = async () => {
    try {
      // Request permission
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'We need camera permissions to take a selfie.');
        return;
      }

      // Take selfie
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: false,
        cameraType: ImagePicker.CameraType.front,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        console.log('Camera result:', asset);
        
        // Validate file type from asset info
        if (asset.mimeType && !['image/jpeg', 'image/jpg', 'image/png'].includes(asset.mimeType)) {
          Alert.alert('Invalid File Type', 'Please take a photo in JPG or PNG format.');
          return;
        }
        
        setSelectedImage(asset.uri);
      }
    } catch (error) {
      console.error('Error taking selfie:', error);
      Alert.alert('Error', 'Failed to take selfie. Please try again.');
    }
  };

  const uploadSelfie = async (uri: string) => {
    if (!providerId) {
      throw new Error('Provider ID not found');
    }

    const storageService = createStorageService(providerId);

    // Upload selfie using organized storage service
    const result = await storageService.uploadSelfie(uri);

    if (!result.success) {
      throw new Error(result.error || 'Failed to upload selfie');
    }

    return result.filePath!;
  };

  const handleSubmit = async () => {
    if (!selectedImage && !selfieData.selfieUrl) {
      Alert.alert('Selfie Required', 'Please take a selfie before continuing.');
      return;
    }

    // Prevent multiple submissions
    if (loading) return;

    setLoading(true);
    try {
      let signedUrl: string;

      // Check if we have a new local image that needs uploading
      const isNewLocalImage = selectedImage && selectedImage.startsWith('file://');

      if (isNewLocalImage) {
        // Upload new selfie to storage
        const selfieUrl = await uploadSelfie(selectedImage);
        
        // Get a signed URL for the uploaded image
        const storageService = createStorageService(providerId);
        const signedUrlResult = await storageService.getSignedUrl(selfieUrl);
        if (!signedUrlResult.success || !signedUrlResult.signedUrl) {
          throw new Error(signedUrlResult.error || 'Failed to get signed URL for uploaded selfie');
        }
        signedUrl = signedUrlResult.signedUrl;
        
        // Update verification store
        updateSelfieData({
          selfieUrl: signedUrl,
          verificationStatus: 'pending',
        });

        // Save to database - update profile with selfie URL
        const { error: dbError } = await supabase
          .from('profiles')
          .update({
            selfie_verification_url: signedUrl,
          })
          .eq('id', providerId);

        if (dbError) {
          console.error('Database error:', dbError);
          throw new Error('Failed to save selfie information');
        }

        // Clear local image and show uploaded image
        setSelectedImage(null);
      } else {
        // Already have an uploaded selfie, just use the existing one
        signedUrl = selfieData.selfieUrl;
      }
      
      // Mark step as completed and move to next in one atomic operation
      completeStepAndNext(2, { selfieUrl: signedUrl });
      
      // Log verification step completion status after completing the step
      logStepCompletionStatus();
      
      Alert.alert(
        isNewLocalImage ? 'Selfie Uploaded' : 'Selfie Verified',
        isNewLocalImage 
          ? 'Your selfie has been uploaded successfully and is pending verification.' 
          : 'Your existing selfie verification is confirmed.',
        [
          {
            text: 'Continue',
            onPress: () => {
              // Navigation already handled by completeStepAndNext above
              console.log('Selfie verification confirmation acknowledged');
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error uploading selfie:', error);
      Alert.alert('Upload Failed', 'Failed to upload selfie. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenWrapper 
      scrollable={true} 
      contentContainerClassName="px-6 py-4"
      edges={['top', 'bottom']}
    >
      {/* Header */}
      <Animated.View 
        entering={FadeIn.delay(200).springify()}
        className="items-center mb-8"
      >
        <View className="w-16 h-16 bg-primary rounded-2xl justify-center items-center mb-4">
          <Text className="text-2xl">🤳</Text>
        </View>
        <Text className="text-2xl font-bold text-foreground mb-2">
          Identity Verification
        </Text>
        <Text className="text-base text-muted-foreground text-center">
          Take a clear selfie to verify your identity
        </Text>
      </Animated.View>

      {/* Selfie Upload */}
      <Animated.View entering={SlideInDown.delay(400).springify()} className="mb-6">
        <Text className="text-sm font-medium text-foreground mb-3">
          Live Selfie
        </Text>
        
        {(selectedImage || selfieData.selfieUrl) ? (
          <View className="items-center mb-4">
            <View className="relative">
              {!imageLoadError ? (
                <Image 
                  source={{ uri: selectedImage || selfieData.selfieUrl }}
                  className="w-64 h-64 rounded-full border-4 border-primary"
                  resizeMode="cover"
                  onLoadStart={() => console.log('Image loading started:', selectedImage || selfieData.selfieUrl)}
                  onLoad={() => {
                    console.log('Image loaded successfully');
                    setImageLoadError(false);
                  }}
                  onError={handleImageError}
                />
              ) : (
                <View className="w-64 h-64 rounded-full bg-muted border-4 border-primary items-center justify-center">
                  <Text className="text-6xl mb-2">🤳</Text>
                  <Text className="text-muted-foreground text-center px-4 text-sm">
                    Selfie uploaded but preview unavailable
                  </Text>
                  {!selectedImage && (
                    <Button
                      variant="outline"
                      size="sm"
                      onPress={handleRetryImage}
                      disabled={isRetrying}
                      className="mt-2"
                    >
                      <Text className="text-xs">
                        {isRetrying ? 'Retrying...' : 'Retry Load'}
                      </Text>
                    </Button>
                  )}
                </View>
              )}
              {/* Loading indicator */}
              {loading && (
                <View className="absolute inset-0 bg-black/50 rounded-full items-center justify-center">
                  <Text className="text-white">Uploading...</Text>
                </View>
              )}
            </View>
            {selectedImage && !selfieData.selfieUrl && (
              <Button
                variant="outline"
                size="sm"
                onPress={() => setSelectedImage(null)}
                className="mt-4"
              >
                <Text>Retake Selfie</Text>
              </Button>
            )}
            {selfieData.selfieUrl && (
              <View className="mt-4 items-center space-y-2">
                <Text className="text-green-600 dark:text-green-400 text-sm font-medium">
                  ✓ Selfie uploaded successfully
                </Text>
                <Text className="text-muted-foreground text-xs">
                  Pending verification review
                </Text>
                {!selectedImage && (
                  <Button
                    variant="outline"
                    size="sm"
                    onPress={takeSelfie}
                    className="mt-2"
                  >
                    <Text>Retake Selfie</Text>
                  </Button>
                )}
              </View>
            )}
          </View>
        ) : (
          <View className="border-2 border-dashed border-border rounded-lg p-8 items-center bg-muted/20">
            <View className="w-32 h-32 rounded-full bg-muted/50 items-center justify-center mb-4">
              <Text className="text-6xl">🤳</Text>
            </View>
            <Text className="text-foreground font-medium mb-2">
              Take a Selfie
            </Text>
            <Text className="text-muted-foreground text-center mb-4">
              Look directly at the camera for verification
            </Text>
            
            <Button
              onPress={takeSelfie}
              className="min-w-[150px]"
            >
              <Text className="text-primary-foreground font-medium">Take Selfie</Text>
            </Button>
          </View>
        )}
      </Animated.View>

      {/* Guidelines */}
      <Animated.View entering={SlideInDown.delay(600).springify()} className="mb-6">
        <View className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
          <Text className="font-semibold text-green-900 dark:text-green-100 mb-2">
            ✅ Selfie Guidelines
          </Text>
          <View className="space-y-1">
            <Text className="text-green-800 dark:text-green-200 text-sm">
              • Look directly at the camera
            </Text>
            <Text className="text-green-800 dark:text-green-200 text-sm">
              • Ensure good lighting on your face
            </Text>
            <Text className="text-green-800 dark:text-green-200 text-sm">
              • Remove sunglasses and hats
            </Text>
            <Text className="text-green-800 dark:text-green-200 text-sm">
              • Keep a neutral expression
            </Text>
            <Text className="text-green-800 dark:text-green-200 text-sm">
              • Make sure your face fills the frame
            </Text>
          </View>
        </View>
      </Animated.View>

      {/* Security Note */}
      <Animated.View entering={SlideInDown.delay(800).springify()} className="mb-6">
        <View className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <Text className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
            🔒 Your Privacy Matters
          </Text>
          <Text className="text-blue-800 dark:text-blue-200 text-sm">
            Your selfie is used only for identity verification and is stored securely. 
            It will not be shared with customers or used for any other purposes.
          </Text>
        </View>
      </Animated.View>

      {/* Continue Button */}
      <Animated.View entering={SlideInDown.delay(1000).springify()} className="mb-4">
        <Button
          size="lg"
          onPress={handleSubmit}
          disabled={(!selectedImage && !selfieData.selfieUrl) || loading}
          className="w-full"
        >
          <Text className="font-semibold text-primary-foreground">
            {loading ? 'Uploading...' : selfieData.selfieUrl ? 'Continue to Business Information' : 'Upload Selfie'}
          </Text>
        </Button>
      </Animated.View>

      {/* Back Button */}
      {canGoBack && (
        <Animated.View entering={SlideInDown.delay(1200).springify()}>
          <Button
            variant="outline"
            size="lg"
            onPress={previousStep}
            className="w-full"
          >
            <Text>Back to Document Upload</Text>
          </Button>
        </Animated.View>
      )}
    </ScreenWrapper>
  );
}
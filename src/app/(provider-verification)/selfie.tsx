import React, { useEffect } from 'react';
import { View, Alert, Platform, Image as RNImage } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import * as ImagePicker from 'expo-image-picker';
import { Camera, Loader2, User, AlertCircle } from 'lucide-react-native';
import { router } from 'expo-router';

import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { ScreenWrapper } from '@/components/ui/screen-wrapper';
import { Icon } from '@/components/ui/icon';
import { VerificationHeader } from '@/components/verification/VerificationHeader';
import { supabase } from '@/lib/supabase';
import { createStorageService } from '@/lib/storage/organized-storage';
import { StoragePathUtils } from '@/lib/storage/storage-paths';
import { useImageHandlingStore } from '@/stores/ui';
import { useVerificationData, useUpdateStepCompletion, useVerificationRealtime } from '@/hooks/provider/useVerificationSingleSource';
import { VerificationFlowManager } from '@/lib/verification/verification-flow-manager';
import { useAuthStore } from '@/stores/auth';

export default function SelfieVerificationScreen() {
  // ✅ AUTH: Get current user/provider ID
  const user = useAuthStore((state) => state.user);
  const providerId = user?.id;

  // ✅ SINGLE-SOURCE: Use new verification hooks
  const { data: verificationData, isLoading: verificationLoading } = useVerificationData(providerId);
  const updateStepCompletion = useUpdateStepCompletion();

  // ✅ ZUSTAND: Image handling state (replaces useState patterns)
  const {
    selectedImage,
    setSelectedImage,
    imageLoadError,
    setImageLoadError,
    isRetrying,
    setIsRetrying,
    retryCount,
    incrementRetryCount,
    canRetry,
    getRetryMessage,
    reset: resetImageState
  } = useImageHandlingStore();
  
  const queryClient = useQueryClient();

  // ✅ HELPER: Get selfie data from verification data
  const getSelfieData = () => {
    if (!verificationData?.profile) return null;
    return {
      selfieUrl: verificationData.profile.selfie_verification_url,
      verificationStatus: verificationData.progress?.steps_completed?.['2'] ? 'completed' : 'pending'
    };
  };

  const selfieData = getSelfieData();

  // ✅ REACT QUERY: Generate fresh signed URL for existing selfie
  const { data: freshSelfieUrl, isLoading: generatingUrl, refetch: refetchSelfieUrl } = useQuery({
    queryKey: ['selfieSignedUrl', providerId, verificationData?.profile?.selfie_verification_url],
    queryFn: async () => {
      if (!providerId || !verificationData) return null;

      const storedUrl = verificationData.profile?.selfie_verification_url;
      
      if (!storedUrl) {
        console.log('[Selfie] No selfie found in verification data');
        return null;
      }

      console.log('[Selfie] Generating fresh signed URL for existing selfie');

      // Extract file path from stored URL
      const filePath = StoragePathUtils.extractFilePathFromUrl(storedUrl);
      if (!filePath) {
        console.error('[Selfie] Could not extract file path from URL');
        return null;
      }

      // Get fresh signed URL (crucial - old URLs expire after 1 hour)
      const storageService = createStorageService(providerId);
      const signedUrlResult = await storageService.getSignedUrl(filePath);
      
      if (signedUrlResult.success && signedUrlResult.signedUrl) {
        console.log('[Selfie] ✅ Generated fresh signed URL');
        return signedUrlResult.signedUrl;
      } else {
        console.error('[Selfie] Failed to generate fresh signed URL:', signedUrlResult.error);
        return null;
      }
    },
    enabled: !!providerId && !!verificationData?.profile?.selfie_verification_url,
    staleTime: 30 * 60 * 1000, // 30 minutes - URLs last 1 hour
    gcTime: 60 * 60 * 1000, // Keep in cache for 1 hour
  });

  // ✅ Use fresh URL if available, otherwise fall back to stored URL
  const displaySelfieUrl = freshSelfieUrl || verificationData?.profile?.selfie_verification_url;



  // ✅ REACT QUERY MUTATION: Upload selfie
  const uploadSelfieMutation = useMutation({
    mutationFn: async (uri: string) => {
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
    },
    onSuccess: (filePath) => {
      console.log('[Selfie] Upload successful:', filePath);
    },
    onError: (error: any) => {
      console.error('[Selfie] Upload failed:', error);
      Alert.alert('Upload Failed', 'Failed to upload selfie. Please try again.');
    }
  });

  // ✅ SINGLE-SOURCE: Submit selfie verification using new hook
  const submitSelfieMutation = useMutation({
    mutationFn: async (imageUri: string | null) => {
      if (!providerId) throw new Error('Provider ID not found');
      if (!imageUri && !displaySelfieUrl) {
        throw new Error('No selfie available');
      }

      console.log('[Selfie] Submission mutation started:', { imageUri: !!imageUri, displaySelfieUrl: !!displaySelfieUrl });

      let signedUrl: string;

      // Check if we have a new local image that needs uploading
      const isNewLocalImage = imageUri && imageUri.startsWith('file://');

      if (isNewLocalImage) {
        console.log('[Selfie] New image detected, uploading...');
        // Upload new selfie to storage
        const selfieUrl = await uploadSelfieMutation.mutateAsync(imageUri);
        
        // Get a signed URL for the uploaded image
        const storageService = createStorageService(providerId);
        const signedUrlResult = await storageService.getSignedUrl(selfieUrl);
        if (!signedUrlResult.success || !signedUrlResult.signedUrl) {
          throw new Error(signedUrlResult.error || 'Failed to get signed URL for uploaded selfie');
        }
        signedUrl = signedUrlResult.signedUrl;
        
        // Update profile with selfie URL
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

        // ✅ SINGLE-SOURCE: Use new atomic step completion
        console.log('[Selfie] Calling updateStepCompletion for new image');
        await updateStepCompletion.mutateAsync({
          providerId,
          stepNumber: 2,
          completed: true,
          data: { selfieUrl: signedUrl }
        });

        return { isNew: true, signedUrl };
      } else {
        // Already have an uploaded selfie, just use the existing one
        console.log('[Selfie] Using existing selfie, marking step complete');
        signedUrl = displaySelfieUrl || '';
        
        // ✅ BUG #7 FIX: Still need to mark step as complete even for existing selfie
        console.log('[Selfie] Calling updateStepCompletion for existing image');
        await updateStepCompletion.mutateAsync({
          providerId,
          stepNumber: 2,
          completed: true,
          data: { selfieUrl: signedUrl }
        });
        
        return { isNew: false, signedUrl };
      }
    },
    onSuccess: async ({ isNew, signedUrl }) => {
      console.log('[Selfie] Mutation succeeded, clearing state and showing alert:', { isNew });
      // ✅ Don't await invalidation - let it happen in background
      // This prevents the "Processing..." state from hanging
      queryClient.invalidateQueries({ queryKey: ['verification-data', providerId] });
      
      // Clear local image
      setSelectedImage(null);

      console.log('[Selfie] Showing success alert');
      // Show success alert
      Alert.alert(
        isNew ? 'Selfie Uploaded' : 'Selfie Verified',
        isNew 
          ? 'Your selfie has been uploaded successfully and is pending verification.' 
          : 'Your existing selfie verification is confirmed.',
        [
          {
            text: 'Continue',
            onPress: () => {
              console.log('Selfie verification confirmation acknowledged');
              
              // Navigate to next step
              router.push('/(provider-verification)/business-info');
              
              console.log('[Selfie] ✅ Completed step 2, navigating to business info');
            },
          },
        ]
      );
    },
    onError: (error: any) => {
      console.error('[Selfie] Submission failed:', error);
      Alert.alert('Upload Failed', 'Failed to upload selfie. Please try again.');
    }
  });

  const handleImageError = (error: any) => {
    console.error('Selfie image load error:', error);
    console.error('Failed URL:', selectedImage || displaySelfieUrl);
    setImageLoadError(true);
  };

  const handleRetryImage = async () => {
    if (!displaySelfieUrl || retryCount >= 2) return;

    setIsRetrying(true);
    incrementRetryCount();

    try {
      // Extract file path from the stored signed URL
      const filePath = StoragePathUtils.extractFilePathFromUrl(displaySelfieUrl || '');
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

  // ✅ OPTIMIZED: Handle form submission with React Query mutation
  const handleSubmit = async () => {
    if (!selectedImage && !displaySelfieUrl) {
      Alert.alert('Selfie Required', 'Please take a selfie before continuing.');
      return;
    }

    console.log('[Selfie] handleSubmit called:', {
      hasSelectedImage: !!selectedImage,
      hasDisplaySelfieUrl: !!displaySelfieUrl,
      willUploadNew: !!selectedImage
    });

    // Submit using React Query mutation
    // Pass selectedImage if new photo taken, otherwise pass null (indicates using existing)
    submitSelfieMutation.mutate(selectedImage || null);
  };

  return (
    <View className="flex-1 bg-background">
      {/* ✅ Screen-owned header - always accurate */}
      <VerificationHeader
        step={2}
        title="Identity Verification"
      />

      <ScreenWrapper contentContainerClassName="px-6 py-4" className="flex-1">
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
        
        {selectedImage || displaySelfieUrl ? (
          <View className="items-center mb-4">
            {selectedImage ? (
              // New selfie taken - show preview with native Image
              <View className="w-64 h-64 rounded-full border-4 border-primary bg-muted overflow-hidden">
                <RNImage
                  source={{ uri: selectedImage }}
                  className="w-full h-full"
                  style={{ width: 256, height: 256 }}
                  resizeMode="cover"
                  onLoad={() => console.log('[Selfie] ✅ New selfie preview loaded')}
                  onError={(error) => console.log('[Selfie] New selfie preview error:', error.nativeEvent?.error)}
                  testID="selfie-new-preview"
                />
              </View>
            ) : generatingUrl ? (
              // Show loading while generating fresh URL
              <View className="w-64 h-64 rounded-full border-4 border-primary bg-muted items-center justify-center">
                <View className="w-10 h-10 bg-primary/10 rounded-full items-center justify-center">
                  <Icon as={Loader2} size={20} className="text-primary animate-spin" />
                </View>
              </View>
            ) : displaySelfieUrl ? (
              // Show image with fresh signed URL using native Image component
              <View className="w-64 h-64 rounded-full border-4 border-primary bg-muted overflow-hidden">
                {!imageLoadError ? (
                  <RNImage
                    source={{ uri: displaySelfieUrl }}
                    className="w-full h-full"
                    style={{ width: 256, height: 256 }}
                    resizeMode="cover"
                    onLoad={() => {
                      console.log('[Selfie] ✅ Existing selfie image loaded successfully');
                      setImageLoadError(false);
                    }}
                    onError={async (error) => {
                      console.log('[Selfie] ❌ Existing selfie failed to load:', error.nativeEvent?.error);
                      console.log('[Selfie] 🔄 Attempting to refresh signed URL');
                      try {
                        // Extract file path from URL and get fresh signed URL
                        const filePath = StoragePathUtils.extractFilePathFromUrl(displaySelfieUrl);
                        if (!filePath) {
                          throw new Error('Could not extract file path');
                        }
                        
                        const storageService = createStorageService(providerId);
                        const freshUrlResult = await storageService.getSignedUrl(filePath);
                        
                        if (freshUrlResult.success && freshUrlResult.signedUrl) {
                          console.log('[Selfie] ✅ Refreshed signed URL, triggering refetch');
                          // Refetch to get the new URL
                          refetchSelfieUrl();
                          setImageLoadError(false);
                        } else {
                          throw new Error('Failed to get fresh URL');
                        }
                      } catch (refreshError) {
                        console.error('[Selfie] Failed to refresh URL:', refreshError);
                        setImageLoadError(true);
                      }
                    }}
                    testID="selfie-existing-preview"
                  />
                ) : (
                  <View className="w-full h-full items-center justify-center bg-muted">
                    <Text className="text-5xl mb-2">🤳</Text>
                    <Text className="text-muted-foreground text-center px-4 text-xs">
                      Selfie unavailable
                    </Text>
                  </View>
                )}
              </View>
            ) : null
            }

            {/* Loading indicator overlay */}
            {submitSelfieMutation.isPending && (
              <View className="absolute inset-0 bg-background/80 rounded-full items-center justify-center">
                <View className="w-10 h-10 bg-primary/10 rounded-full items-center justify-center">
                  <Icon as={Loader2} size={20} className="text-primary animate-spin" />
                </View>
              </View>
            )}
            {selectedImage && !displaySelfieUrl && (
              <Button
                variant="outline"
                size="sm"
                onPress={() => setSelectedImage(null)}
                className="mt-4"
              >
                <Text>Retake Selfie</Text>
              </Button>
            )}
            {displaySelfieUrl && (
              <View className="mt-4 items-center gap-2">
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
          <View className="gap-1">
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
        <View className="flex-row p-4 bg-primary/5 rounded-lg border border-primary/20">
          <View className="mr-3 mt-0.5">
            <Icon as={User} size={20} className="text-primary" />
          </View>
          <View className="flex-1">
            <Text className="font-semibold text-foreground mb-2">
              Your Privacy Matters
            </Text>
            <Text className="text-muted-foreground text-sm">
              Your selfie is used only for identity verification and is stored securely. 
              It will not be shared with customers or used for any other purposes.
            </Text>
          </View>
        </View>
      </Animated.View>

      {/* Continue Button */}
      <Animated.View entering={SlideInDown.delay(1000).springify()} className="mb-4">
        <Button
          size="lg"
          onPress={handleSubmit}
          disabled={(!selectedImage && !displaySelfieUrl) || submitSelfieMutation.isPending || generatingUrl}
          className="w-full"
        >
          <Text className="font-semibold text-primary-foreground">
            {submitSelfieMutation.isPending ? 'Uploading...' : 
             generatingUrl ? 'Loading...' :
             displaySelfieUrl ? 'Continue to Business Information' : 'Upload Selfie'}
          </Text>
        </Button>
      </Animated.View>

      {/* Back Button */}
      <Animated.View 
        entering={SlideInDown.delay(1200).springify()} 
        className="mb-6"
        style={Platform.OS === 'android' ? { marginBottom: 32 } : undefined}
      >
        <Button
          variant="outline"
          size="lg"
          onPress={() => {
            // Go to index (step 1) - start of verification flow
            router.push('/(provider-verification)');
          }}
          className="w-full"
        >
          <Text>Back to Document Upload</Text>
        </Button>
      </Animated.View>
      </ScreenWrapper>

      {/* Upload Loading Overlay */}
      {submitSelfieMutation.isPending && (
        <View className="absolute inset-0 bg-background/95 items-center justify-center z-50">
          <View className="bg-card border border-border rounded-2xl p-8 items-center shadow-sm">
            <View className="w-16 h-16 bg-primary/10 rounded-full items-center justify-center mb-4">
              <Icon as={Loader2} size={32} className="text-primary animate-spin" />
            </View>
            <Text className="text-foreground font-semibold text-lg mb-2">
              Processing Selfie...
            </Text>
            <Text className="text-muted-foreground text-center text-sm">
              Please wait while we upload and verify your photo
            </Text>
            <View className="flex-row items-center mt-4 px-4 py-2 bg-primary/5 rounded-full">
              <Icon as={Camera} size={16} className="text-primary mr-2" />
              <Text className="text-primary text-sm font-medium">
                Verifying identity
              </Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}
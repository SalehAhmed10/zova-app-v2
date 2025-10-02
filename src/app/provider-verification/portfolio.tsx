import React, { useState } from 'react';
import { View, Alert, Image, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import * as ImagePicker from 'expo-image-picker';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { ScreenWrapper } from '@/components/ui/screen-wrapper';
import { VerificationHeader } from '@/components/verification/VerificationHeader';
import { useProviderVerificationStore, useProviderVerificationHydration } from '@/stores/verification/provider-verification';
import { supabase } from '@/lib/core/supabase';
import { createStorageService } from '@/lib/storage/organized-storage';
import { useVerificationNavigation } from '@/hooks/provider';
import { VerificationFlowManager } from '@/lib/verification/verification-flow-manager';

export default function PortfolioUploadScreen() {
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const queryClient = useQueryClient();
  
  const {
    portfolioData,
    updatePortfolioData,
    completeStep,
    completeStepSimple,
    previousStep,
    providerId
  } = useProviderVerificationStore();  const isHydrated = useProviderVerificationHydration();

  // ✅ CENTRALIZED NAVIGATION: Replace manual routing
  const { navigateBack } = useVerificationNavigation();

  // Don't render until hydrated
  if (!isHydrated) {
    return (
      <ScreenWrapper>
        <View className="flex-1 items-center justify-center">
          <Text>Loading...</Text>
        </View>
      </ScreenWrapper>
    );
  }

  // ✅ REACT QUERY: Fetch existing portfolio images
  const { data: existingImages = [], isLoading: fetchingExisting } = useQuery({
    queryKey: ['portfolioImages', providerId],
    queryFn: async () => {
      if (!providerId) throw new Error('Provider ID required');

      console.log('[Portfolio] Fetching existing images for provider:', providerId);
      
      const { data, error } = await supabase
        .from('provider_portfolio_images')
        .select('*')
        .eq('provider_id', providerId)
        .order('sort_order', { ascending: true });

      if (error && error.code !== 'PGRST116') {
        console.error('[Portfolio] Error fetching portfolio images:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        console.log('[Portfolio] No existing images found');
        return [];
      }

      console.log('[Portfolio] Found existing portfolio images:', data.length);
      
      // Create organized storage service for signed URL generation
      const storageService = createStorageService(providerId);
      
      // Generate signed URLs using the organized storage service
      const signedUrlResults = await storageService.getPortfolioSignedUrls(
        data.map(img => ({ id: img.id.toString(), image_url: img.image_url }))
      );
      
      // Map results back to image data with signed URLs
      const imagesWithSignedUrls = data
        .map((img) => {
          const signedUrlData = signedUrlResults.find(result => result.id === img.id.toString());
          if (!signedUrlData?.signedUrl) {
            console.error('[Portfolio] Failed to get signed URL for image:', img.id);
            return null;
          }
          
          return { ...img, image_url: signedUrlData.signedUrl };
        })
        .filter(img => img !== null);

      // Update store with existing images
      const portfolioImages = imagesWithSignedUrls.map(img => ({
        id: img.id.toString(),
        url: img.image_url,
        altText: img.alt_text,
        sortOrder: img.sort_order,
      }));
      
      updatePortfolioData({ images: portfolioImages });
      
      return imagesWithSignedUrls;
    },
    enabled: !!providerId && isHydrated,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // ✅ REACT QUERY MUTATION: Upload portfolio images
  const uploadPortfolioMutation = useMutation({
    mutationFn: async (images: string[]) => {
      if (!providerId) throw new Error('Provider ID required');

      console.log('[Portfolio] Starting upload process for', images.length, 'images');

      // Delete existing images if we're replacing them
      if (existingImages.length === 0) {
        await supabase
          .from('provider_portfolio_images')
          .delete()
          .eq('provider_id', providerId);
      }

      // Create organized storage service for this provider
      const storageService = createStorageService(providerId);

      // Upload new images to Supabase storage using organized paths
      const uploadPromises = images.map(async (imageUri, index) => {
        const result = await storageService.uploadPortfolioImage(
          imageUri, 
          existingImages.length + index,
          Date.now()
        );
        
        if (!result.success) {
          throw new Error(result.error || `Failed to upload image ${index}`);
        }
        
        return {
          fileName: result.fileName || result.filePath || `portfolio_${index}`,
          filePath: result.filePath || result.url || '',
          sortOrder: existingImages.length + index
        };
      });

      const uploadResults = await Promise.all(uploadPromises);

      // Create portfolio images array with file paths
      const newPortfolioImages = uploadResults.map((result) => ({
        id: result.fileName,
        url: result.filePath,
        sortOrder: result.sortOrder,
      }));

      // Save new portfolio images to database with file paths
      const portfolioImageRecords = newPortfolioImages.map(image => ({
        provider_id: providerId,
        image_url: image.url,
        alt_text: `Portfolio image ${image.sortOrder + 1}`,
        sort_order: image.sortOrder,
        verification_status: 'pending',
        is_featured: image.sortOrder === 0 && existingImages.length === 0,
      }));

      const { error: dbError } = await supabase
        .from('provider_portfolio_images')
        .insert(portfolioImageRecords);

      if (dbError) throw dbError;

      // ✅ SAVE PROGRESS: Update provider_onboarding_progress table
      const { error: progressError } = await supabase
        .from('provider_onboarding_progress')
        .upsert({
          provider_id: providerId,
          current_step: 6, // Portfolio is step 6
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'provider_id'
        });

      if (progressError) {
        console.error('[Portfolio] Error saving progress:', progressError);
        // Don't throw here - progress saving failure shouldn't block the main operation
      }
      
      const allPortfolioImages = [...existingImages.map(img => ({
        id: img.id.toString(),
        url: img.image_url, 
        altText: img.alt_text,
        sortOrder: img.sort_order,
      })), ...newPortfolioImages];

      return allPortfolioImages;
    },
    onSuccess: (portfolioImages) => {
      console.log('[Portfolio] Upload successful, updating store');
      updatePortfolioData({ images: portfolioImages });
      
      // ✅ EXPLICIT: Complete step 6 and navigate using flow manager
      const result = VerificationFlowManager.completeStepAndNavigate(
        6, // Always step 6 for portfolio
        { images: portfolioImages },
        (step, stepData) => {
          // Update Zustand store
          completeStepSimple(step, stepData);
        }
      );
      
      console.log('[Portfolio] Navigation result:', result);
      queryClient.invalidateQueries({ queryKey: ['portfolioImages', providerId] });
      setSelectedImages([]); // Clear selected images after successful upload
    },
    onError: (error: any) => {
      console.error('[Portfolio] Upload failed:', error);
      Alert.alert('Save Failed', 'Failed to upload portfolio images. Please try again.');
    }
  });

  // ✅ REACT QUERY MUTATION: Delete portfolio image
  const deletePortfolioImageMutation = useMutation({
    mutationFn: async (imageIndex: number) => {
      const imageToDelete = existingImages[imageIndex];
      if (!imageToDelete) throw new Error('Image not found');

      console.log('[Portfolio] Deleting image:', imageToDelete.id);

      const { error } = await supabase
        .from('provider_portfolio_images')
        .delete()
        .eq('id', imageToDelete.id);

      if (error) throw error;

      return imageIndex;
    },
    onSuccess: (deletedIndex) => {
      console.log('[Portfolio] Image deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['portfolioImages', providerId] });
    },
    onError: (error: any) => {
      console.error('[Portfolio] Delete failed:', error);
      Alert.alert('Delete Failed', 'Failed to delete image. Please try again.');
    }
  });

  // ✅ REACT QUERY MUTATION: Clear all portfolio images
  const clearPortfolioMutation = useMutation({
    mutationFn: async () => {
      if (!providerId) throw new Error('Provider ID required');

      console.log('[Portfolio] Clearing all portfolio images');

      const { error } = await supabase
        .from('provider_portfolio_images')
        .delete()
        .eq('provider_id', providerId);

      if (error) throw error;
    },
    onSuccess: () => {
      console.log('[Portfolio] All images cleared successfully');
      queryClient.invalidateQueries({ queryKey: ['portfolioImages', providerId] });
    },
    onError: (error: any) => {
      console.error('[Portfolio] Clear failed:', error);
      Alert.alert('Clear Failed', 'Failed to clear images. Please try again.');
    }
  });

  const pickImages = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'We need access to your photos to upload portfolio images.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: false, // Disabled because allowsMultipleSelection is enabled
        aspect: [16, 10],
        quality: 0.8,
        allowsMultipleSelection: true,
      });

      if (!result.canceled && result.assets) {
        const newImages = result.assets.map(asset => asset.uri);
        const totalImages = selectedImages.length + newImages.length + existingImages.length;
        
        if (totalImages > portfolioData.maxImages) {
          Alert.alert('Too many images', `You can only upload up to ${portfolioData.maxImages} images total.`);
          return;
        }
        
        setSelectedImages(prev => [...prev, ...newImages]);
      }
    } catch (error) {
      console.error('Error picking images:', error);
      Alert.alert('Error', 'Failed to select images. Please try again.');
    }
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  // ✅ OPTIMIZED: Handle form submission with React Query mutation
  const handleSubmit = async () => {
    // If we have existing images and no new selections, just proceed
    if (existingImages.length > 0 && selectedImages.length === 0) {
      console.log('[Portfolio] Using existing portfolio images, completing step');
      const portfolioImages = existingImages.map(img => ({
        id: img.id.toString(),
        url: img.image_url,
        altText: img.alt_text,
        sortOrder: img.sort_order,
      }));
      // ✅ EXPLICIT: Complete step 6 and navigate using flow manager
      const result = VerificationFlowManager.completeStepAndNavigate(
        6, // Always step 6 for portfolio
        { images: portfolioImages },
        (step, stepData) => {
          // Update Zustand store
          completeStepSimple(step, stepData);
        }
      );
      
      console.log('[Portfolio] Navigation result:', result);
      return;
    }
    
    if (selectedImages.length === 0 && existingImages.length === 0) {
      Alert.alert('Portfolio Required', 'Please upload at least one portfolio image.');
      return;
    }

    // Upload new images using React Query mutation
    if (selectedImages.length > 0) {
      uploadPortfolioMutation.mutate(selectedImages);
    }
  };

  return (
    <View className="flex-1 bg-background">
      <VerificationHeader 
        step={6} 
        title="Upload Portfolio" 
      />
      <ScreenWrapper scrollable={true} contentContainerClassName="px-6 py-4">

      {/* Upload Area */}
      {/* Existing Images Section */}
      {existingImages.length > 0 && selectedImages.length === 0 && (
        <Animated.View entering={SlideInDown.delay(400).springify()} className="mb-6">
          <View className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800 mb-4">
            <View className="flex-row items-center mb-2">
              <Text className="text-green-700 dark:text-green-300 font-semibold">
                ✅ Existing Portfolio Found
              </Text>
            </View>
            <Text className="text-green-700 dark:text-green-300 text-sm">
              You have {existingImages.length} portfolio image{existingImages.length > 1 ? 's' : ''} already uploaded
            </Text>
          </View>

          <View className="flex-row flex-wrap gap-3 mb-4">
            {existingImages.map((img, index) => (
              <View key={img.id} className="relative">
                <Image 
                  source={{ uri: img.image_url }} 
                  className="w-24 h-24 rounded-lg bg-muted"
                  resizeMode="cover"
                  onError={(error) => {
                    console.error('Existing portfolio image load error:', error);
                    console.error('Failed URL:', img.image_url);
                  }}
                  onLoad={() => {
                    console.log('Existing portfolio image loaded successfully:', img.image_url);
                  }}
                />
                <Pressable
                  onPress={() => deletePortfolioImageMutation.mutate(index)}
                  disabled={deletePortfolioImageMutation.isPending}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-destructive rounded-full items-center justify-center"
                >
                  <Text className="text-white text-xs font-bold">×</Text>
                </Pressable>
              </View>
            ))}
          </View>

          <View className="flex-row gap-2 mb-4">
            <Button
              variant="outline"
              size="sm"
              onPress={() => {
                clearPortfolioMutation.mutate();
                setSelectedImages([]);
              }}
              disabled={clearPortfolioMutation.isPending}
              className="flex-1"
            >
              <Text>Replace All</Text>
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onPress={pickImages}
              disabled={existingImages.length + selectedImages.length >= portfolioData.maxImages}
              className="flex-1"
            >
              <Text>Add More</Text>
            </Button>
          </View>
        </Animated.View>
      )}

      {/* Image Selection */}
      {(existingImages.length === 0 || selectedImages.length > 0) && (
        <Animated.View entering={SlideInDown.delay(400).springify()} className="mb-6">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-sm font-medium text-foreground">
              Portfolio Images ({existingImages.length + selectedImages.length}/{portfolioData.maxImages})
            </Text>
            <Button
              variant="outline"
              size="sm"
              onPress={pickImages}
              disabled={selectedImages.length >= portfolioData.maxImages}
            >
              <Text>Add Images</Text>
            </Button>
          </View>

          {selectedImages.length > 0 ? (
            <View className="flex-row flex-wrap gap-3">
              {selectedImages.map((uri, index) => (
                <View key={index} className="relative">
                  <Image 
                    source={{ uri }} 
                    className="w-24 h-24 rounded-lg bg-muted"
                    resizeMode="cover"
                  />
                  <Pressable
                    onPress={() => removeImage(index)}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-destructive rounded-full items-center justify-center"
                  >
                    <Text className="text-white text-xs font-bold">×</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          ) : (
            <View className="border-2 border-dashed border-border rounded-lg p-8 items-center bg-muted/20">
              <Text className="text-4xl mb-2">📷</Text>
              <Text className="text-foreground font-medium mb-2">
                Add Portfolio Images
              </Text>
              <Text className="text-muted-foreground text-center mb-4">
                Show customers your best work
              </Text>
              <Button onPress={pickImages}>
                <Text className="text-primary-foreground">Select Images</Text>
              </Button>
            </View>
          )}
        </Animated.View>
      )}

      {/* Guidelines */}
      <Animated.View entering={SlideInDown.delay(600).springify()} className="mb-6">
        <View className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
          <Text className="font-semibold text-green-900 dark:text-green-100 mb-2">
            📸 Portfolio Guidelines
          </Text>
          <View className="space-y-1">
            <Text className="text-green-800 dark:text-green-200 text-sm">
              • Upload high-quality, well-lit images
            </Text>
            <Text className="text-green-800 dark:text-green-200 text-sm">
              • Show your best and most recent work
            </Text>
            <Text className="text-green-800 dark:text-green-200 text-sm">
              • No offensive or inappropriate content
            </Text>
            <Text className="text-green-800 dark:text-green-200 text-sm">
              • Images will be reviewed before approval
            </Text>
          </View>
        </View>
      </Animated.View>

      {/* Continue Button */}
      <Animated.View entering={SlideInDown.delay(800).springify()} className="mb-4">
        <Button
          size="lg"
          onPress={handleSubmit}
          disabled={(selectedImages.length === 0 && existingImages.length === 0) || uploadPortfolioMutation.isPending || fetchingExisting}
          className="w-full"
        >
          <Text className="font-semibold text-primary-foreground">
            {uploadPortfolioMutation.isPending ? 'Saving...' : 
             fetchingExisting ? 'Loading...' :
             (existingImages.length > 0 && selectedImages.length === 0) ? 'Use Existing Portfolio' : 
             'Continue to Business Bio'}
          </Text>
        </Button>
      </Animated.View>

      {/* Back Button */}
      <Animated.View entering={SlideInDown.delay(1000).springify()}>
        <Button
          variant="outline"
          size="lg"
          onPress={navigateBack}
          className="w-full"
        >
          <Text>Back to Services</Text>
        </Button>
      </Animated.View>
    </ScreenWrapper>
    </View>
  );
}
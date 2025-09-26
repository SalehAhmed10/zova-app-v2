import React, { useState, useEffect } from 'react';
import { View, Alert, Image, Pressable } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import * as ImagePicker from 'expo-image-picker';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { ScreenWrapper } from '@/components/ui/screen-wrapper';
import { useProviderVerificationStore, useProviderVerificationHydration } from '@/stores/verification/provider-verification';
import { supabase } from '@/lib/core/supabase';
import { createStorageService } from '@/lib/storage/organized-storage';

export default function PortfolioUploadScreen() {
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingExisting, setFetchingExisting] = useState(true);
  
  const { 
    portfolioData, 
    updatePortfolioData, 
    completeStep,
    completeStepAndNext, 
    nextStep,
    previousStep,
    providerId 
  } = useProviderVerificationStore();

  const isHydrated = useProviderVerificationHydration();

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

  // Fetch existing portfolio images
  useEffect(() => {
    const fetchExistingPortfolio = async () => {
      if (!providerId || !isHydrated) return;

      try {
        setFetchingExisting(true);
        const { data, error } = await supabase
          .from('provider_portfolio_images')
          .select('*')
          .eq('provider_id', providerId)
          .order('sort_order', { ascending: true });

        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching portfolio images:', error);
          return;
        }

        if (data && data.length > 0) {
          console.log('Found existing portfolio images:', data.length);
          
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
                console.error('Failed to get signed URL for image:', img.id);
                return null;
              }
              
              return { ...img, image_url: signedUrlData.signedUrl };
            })
            .filter(img => img !== null); // Remove failed ones
          
          setExistingImages(imagesWithSignedUrls);
          
          // Update store with existing images
          const portfolioImages = imagesWithSignedUrls.map(img => ({
            id: img.id.toString(),
            url: img.image_url,
            altText: img.alt_text,
            sortOrder: img.sort_order,
          }));
          
          updatePortfolioData({ images: portfolioImages });
        }
      } catch (error) {
        console.error('Error fetching existing portfolio:', error);
      } finally {
        setFetchingExisting(false);
      }
    };

    fetchExistingPortfolio();
  }, [providerId, isHydrated, updatePortfolioData]);

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

  const handleSubmit = async () => {
    // If we have existing images and no new selections, just proceed
    if (existingImages.length > 0 && selectedImages.length === 0) {
      console.log('Using existing portfolio images, completing step');
      const portfolioImages = existingImages.map(img => ({
        id: img.id.toString(),
        url: img.image_url,
        altText: img.alt_text,
        sortOrder: img.sort_order,
      }));
      completeStepAndNext(6, { images: portfolioImages });
      return;
    }
    
    if (selectedImages.length === 0 && existingImages.length === 0) {
      Alert.alert('Portfolio Required', 'Please upload at least one portfolio image.');
      return;
    }

    setLoading(true);
    try {
      // Get current user  
      if (!providerId) {
        Alert.alert('Error', 'Provider ID not found');
        return;
      }

      let allPortfolioImages = [];

      // If we have new images to upload
      if (selectedImages.length > 0) {
        // Delete existing images if we're replacing them
        if (existingImages.length === 0) { // Only delete if we're starting fresh
          await supabase
            .from('provider_portfolio_images')
            .delete()
            .eq('provider_id', providerId);
        }

        // Create organized storage service for this provider
        const storageService = createStorageService(providerId);

        // Upload new images to Supabase storage using organized paths
        const uploadPromises = selectedImages.map(async (imageUri, index) => {
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
            filePath: result.filePath || result.url || '', // Store file path for signed URLs
            sortOrder: existingImages.length + index
          };
        });

        const uploadResults = await Promise.all(uploadPromises);

        // Create portfolio images array with file paths (not URLs)
        const newPortfolioImages = uploadResults.map((result, index) => ({
          id: result.fileName,
          url: result.filePath, // Store file path, not URL
          sortOrder: result.sortOrder,
        }));

        // Save new portfolio images to database with file paths
        const portfolioImageRecords = newPortfolioImages.map(image => ({
          provider_id: providerId,
          image_url: image.url, // This is now a file path for signed URLs
          alt_text: `Portfolio image ${image.sortOrder + 1}`,
          sort_order: image.sortOrder,
          verification_status: 'pending',
          is_featured: image.sortOrder === 0 && existingImages.length === 0, // First image is featured only if no existing
        }));

        const { error: dbError } = await supabase
          .from('provider_portfolio_images')
          .insert(portfolioImageRecords);

        if (dbError) throw dbError;
        
        allPortfolioImages = [...existingImages.map(img => ({
          id: img.id.toString(),
          url: img.image_url, 
          altText: img.alt_text,
          sortOrder: img.sort_order,
        })), ...newPortfolioImages];
      } else {
        // Using only existing images
        allPortfolioImages = existingImages.map(img => ({
          id: img.id.toString(),
          url: img.image_url,
          altText: img.alt_text,
          sortOrder: img.sort_order,
        }));
      }

      // Update verification store
      updatePortfolioData({ images: allPortfolioImages });
      completeStepAndNext(6, { images: allPortfolioImages });
    } catch (error) {
      console.error('Error saving portfolio:', error);
      Alert.alert('Save Failed', 'Failed to upload portfolio images. Please try again.');
    } finally {
      setLoading(false);
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
          <Text className="text-2xl">🖼️</Text>
        </View>
        <Text className="text-2xl font-bold text-foreground mb-2">
          Portfolio Upload
        </Text>
        <Text className="text-base text-muted-foreground text-center">
          Showcase your best work with up to {portfolioData.maxImages} images
        </Text>
      </Animated.View>

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
                  onPress={() => {
                    setExistingImages(prev => prev.filter((_, i) => i !== index));
                  }}
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
                setExistingImages([]);
                setSelectedImages([]);
              }}
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
          disabled={(selectedImages.length === 0 && existingImages.length === 0) || loading || fetchingExisting}
          className="w-full"
        >
          <Text className="font-semibold text-primary-foreground">
            {loading ? 'Saving...' : 
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
          onPress={previousStep}
          className="w-full"
        >
          <Text>Back to Services</Text>
        </Button>
      </Animated.View>
    </ScreenWrapper>
  );
}
import React, { useState } from 'react';
import { View, Alert, Image, Pressable, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import * as ImagePicker from 'expo-image-picker';
import { Upload, Loader2, Images } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { ScreenWrapper } from '@/components/ui/screen-wrapper';
import { Icon } from '@/components/ui/icon';
import { Skeleton } from '@/components/ui/skeleton';
import { VerificationHeader } from '@/components/verification/VerificationHeader';
import { useVerificationData, useUpdateStepCompletion, useVerificationRealtime } from '@/hooks/provider/useVerificationSingleSource';
import { supabase } from '@/lib/supabase';
import { createStorageService } from '@/lib/storage/organized-storage';
import { useVerificationNavigation } from '@/hooks/provider';
import { useAuthStore } from '@/stores/auth';

export default function PortfolioUploadScreen() {
  const insets = useSafeAreaInsets();
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [deletingImageIndex, setDeletingImageIndex] = useState<number | null>(null);
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const providerId = user?.id;

  // ✅ SINGLE-SOURCE: Use new verification hooks
  const { data: verificationData, isLoading: verificationLoading } = useVerificationData(providerId);
  const updateStepMutation = useUpdateStepCompletion();
  const { navigateNext, navigateBack } = useVerificationNavigation();

  // Real-time subscription for live updates
  useVerificationRealtime(providerId);

  // Portfolio configuration
  const portfolioConfig = {
    maxImages: 10, // Maximum portfolio images allowed
  };

  // ✅ REACT QUERY: Fetch existing portfolio images
  const { data: existingImages = [], isLoading: fetchingExisting, isFetching: refetchingImages } = useQuery({
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

      return imagesWithSignedUrls;
    },
    enabled: !!providerId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // ✅ REACT QUERY MUTATION: Upload portfolio images (APPEND mode)
  const uploadPortfolioMutation = useMutation({
    mutationFn: async (images: string[]) => {
      if (!providerId) throw new Error('Provider ID required');

      console.log('[Portfolio] Starting upload process for', images.length, 'new images (append mode)');

      // Create organized storage service for this provider
      const storageService = createStorageService(providerId);

      // Calculate next sort order based on existing images
      // Use max sort_order + 1, not just the count (in case of deletions or duplicates)
      const maxSortOrder = existingImages.length > 0 
        ? Math.max(...existingImages.map(img => img.sort_order || 0))
        : -1;
      const nextSortOrder = maxSortOrder + 1;

      // Upload new images to Supabase storage using organized paths
      const uploadPromises = images.map(async (imageUri, index) => {
        const result = await storageService.uploadPortfolioImage(
          imageUri, 
          nextSortOrder + index,
          Date.now()
        );
        
        if (!result.success) {
          throw new Error(result.error || `Failed to upload image ${index}`);
        }
        
        return {
          fileName: result.fileName || result.filePath || `portfolio_${nextSortOrder + index}`,
          filePath: result.filePath || result.url || '',
          sortOrder: nextSortOrder + index
        };
      });

      const uploadResults = await Promise.all(uploadPromises);

      // Create portfolio images array with file paths
      const newPortfolioImages = uploadResults.map((result) => ({
        id: result.fileName,
        url: result.filePath,
        sortOrder: result.sortOrder,
      }));

      // Save new portfolio images to database with file paths (APPEND, don't replace)
      const portfolioImageRecords = newPortfolioImages.map(image => ({
        provider_id: providerId,
        image_url: image.url,
        alt_text: `Portfolio image ${image.sortOrder + 1}`,
        sort_order: image.sortOrder,
        verification_status: 'pending',
        is_featured: false, // Never set featured for appended images
      }));

      // ✅ IMPORTANT: Check if these images already exist to avoid duplicates
      // Query database directly to avoid stale cache issues
      const { data: existingDbImages, error: fetchError } = await supabase
        .from('provider_portfolio_images')
        .select('image_url')
        .eq('provider_id', providerId);

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('[Portfolio] Error checking existing images:', fetchError);
        // Continue anyway - don't fail on dedup check
      }

      const existingPaths = (existingDbImages || []).map(img => img.image_url);
      const uniqueRecords = portfolioImageRecords.filter(
        record => !existingPaths.includes(record.image_url)
      );

      if (uniqueRecords.length === 0) {
        console.log('[Portfolio] All images already exist in database, skipping insert');
        return newPortfolioImages;
      }

      const { error: dbError } = await supabase
        .from('provider_portfolio_images')
        .insert(uniqueRecords);

      if (dbError) throw dbError;

      console.log('[Portfolio] New images appended successfully:', uniqueRecords.length, 'new records');
      
      return newPortfolioImages;
    },
    onSuccess: (newPortfolioImages) => {
      console.log('[Portfolio] Upload successful, completing step');
      
      // ✅ SINGLE-SOURCE: Use centralized mutation to update step completion
      // NOTE: Don't pass images data - portfolio images are already inserted in the upload mutation
      updateStepMutation.mutate(
        {
          providerId,
          stepNumber: 5, // Portfolio is now step 5 (services removed)
          completed: true,
          // No data needed - portfolio images already inserted above
        },
        {
          onSuccess: () => {
            console.log('[Portfolio] Step completion confirmed, refetching images');
            setSelectedImages([]); // Clear selected images after successful upload
            // Force refetch to show newly uploaded images
            queryClient.invalidateQueries({ queryKey: ['portfolioImages', providerId] });
          },
          onError: (error) => {
            console.error('[Portfolio] Step completion failed:', error);
            Alert.alert('Error', 'Failed to complete portfolio upload. Please try again.');
          }
        }
      );
    },
    onError: (error: any) => {
      console.error('[Portfolio] Upload failed:', error);
      Alert.alert('Save Failed', 'Failed to upload portfolio images. Please try again.');
    }
  });

  // ✅ REACT QUERY MUTATION: Replace all portfolio images (delete old from storage + DB)
  const replacePortfolioMutation = useMutation({
    mutationFn: async (images: string[]) => {
      if (!providerId) throw new Error('Provider ID required');

      console.log('[Portfolio] Starting replace all process for', images.length, 'images');

      // ✅ Step 1: Fetch existing images to get storage paths
      const { data: existingImagesToDelete, error: fetchError } = await supabase
        .from('provider_portfolio_images')
        .select('*')
        .eq('provider_id', providerId);

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('[Portfolio] Error fetching images for deletion:', fetchError);
        throw fetchError;
      }

      // ✅ Step 2: Delete old files from storage
      if (existingImagesToDelete && existingImagesToDelete.length > 0) {
        const storagePathsToDelete = existingImagesToDelete
          .map(img => {
            let storagePath = img.image_url;
            
            // If it's a signed URL, extract the path between /sign/ and ?
            if (img.image_url.includes('http')) {
              const signedUrlMatch = img.image_url.match(/\/sign\/([^?]+)/);
              if (signedUrlMatch) {
                storagePath = signedUrlMatch[1]; // Full path including bucket prefix
              }
            }
            
            // Remove bucket name prefix if present
            if (storagePath.startsWith('verification-images/')) {
              storagePath = storagePath.replace('verification-images/', '');
            }
            
            return storagePath;
          })
          .filter((path): path is string => path !== null && path.length > 0);

        if (storagePathsToDelete.length > 0) {
          console.log('[Portfolio] Deleting', storagePathsToDelete.length, 'old files from storage');
          console.log('[Portfolio] Storage paths to delete:', storagePathsToDelete);
          
          try {
            const { error: storageError } = await supabase.storage
              .from('verification-images')
              .remove(storagePathsToDelete);

            if (storageError) {
              console.error('[Portfolio] Storage deletion error:', storageError);
              console.warn('[Portfolio] Continuing with DB deletion despite storage error');
            } else {
              console.log('[Portfolio] Old files deleted from storage successfully');
            }
          } catch (error) {
            console.error('[Portfolio] Storage deletion exception:', error);
            console.warn('[Portfolio] Continuing with DB deletion despite storage exception');
          }
        }
      }

      // ✅ Step 3: Delete all from database
      const { error: deleteError } = await supabase
        .from('provider_portfolio_images')
        .delete()
        .eq('provider_id', providerId);

      if (deleteError && deleteError.code !== 'PGRST116') {
        console.error('[Portfolio] Error clearing existing images:', deleteError);
        throw deleteError;
      }

      console.log('[Portfolio] Cleared existing images from database, uploading new portfolio');

      // Create organized storage service for this provider
      const storageService = createStorageService(providerId);

      // Upload new images with fresh sort order (0-based)
      const uploadPromises = images.map(async (imageUri, index) => {
        const result = await storageService.uploadPortfolioImage(
          imageUri, 
          index,
          Date.now()
        );
        
        if (!result.success) {
          throw new Error(result.error || `Failed to upload image ${index}`);
        }
        
        return {
          fileName: result.fileName || result.filePath || `portfolio_${index}`,
          filePath: result.filePath || result.url || '',
          sortOrder: index
        };
      });

      const uploadResults = await Promise.all(uploadPromises);

      // Create portfolio images array with file paths
      const newPortfolioImages = uploadResults.map((result) => ({
        id: result.fileName,
        url: result.filePath,
        sortOrder: result.sortOrder,
      }));

      // Save new portfolio images to database
      const portfolioImageRecords = newPortfolioImages.map(image => ({
        provider_id: providerId,
        image_url: image.url,
        alt_text: `Portfolio image ${image.sortOrder + 1}`,
        sort_order: image.sortOrder,
        verification_status: 'pending',
        is_featured: image.sortOrder === 0,
      }));

      const { error: dbError } = await supabase
        .from('provider_portfolio_images')
        .insert(portfolioImageRecords);

      if (dbError) throw dbError;

      console.log('[Portfolio] Portfolio replaced successfully');
      
      return newPortfolioImages;
    },
    onSuccess: (newPortfolioImages) => {
      console.log('[Portfolio] Replace successful, completing step');
      
      updateStepMutation.mutate(
        {
          providerId,
          stepNumber: 5,
          completed: true,
          // No data needed - portfolio images already inserted above
        },
        {
          onSuccess: () => {
            console.log('[Portfolio] Step completion confirmed after replace, refetching images');
            setSelectedImages([]);
            // Force refetch to show replaced images
            queryClient.invalidateQueries({ queryKey: ['portfolioImages', providerId] });
          },
          onError: (error) => {
            console.error('[Portfolio] Step completion failed after replace:', error);
            Alert.alert('Error', 'Failed to complete portfolio replacement. Please try again.');
          }
        }
      );
    },
    onError: (error: any) => {
      console.error('[Portfolio] Replace failed:', error);
      Alert.alert('Save Failed', 'Failed to replace portfolio images. Please try again.');
    }
  });

  // ✅ REACT QUERY MUTATION: Delete portfolio image (from DB and Storage)
  const deletePortfolioImageMutation = useMutation({
    mutationFn: async (imageIndex: number) => {
      const imageToDelete = existingImages[imageIndex];
      if (!imageToDelete) throw new Error('Image not found');

      console.log('[Portfolio] Deleting image from DB and Storage:', imageToDelete.id);
      console.log('[Portfolio] Image URL for deletion:', imageToDelete.image_url);

      // ✅ Step 1: Delete from Supabase Storage
      let storagePath = '';
      
      // Extract path from signed URL or use raw path from DB
      if (imageToDelete.image_url.includes('http')) {
        // It's a signed URL - extract the path part between /sign/ and ?
        const signedUrlMatch = imageToDelete.image_url.match(/\/sign\/([^?]+)/);
        if (signedUrlMatch) {
          storagePath = signedUrlMatch[1]; // Full path: "verification-images/providers/..."
        }
      } else if (imageToDelete.image_url.includes('providers/')) {
        // It's a raw path from DB - needs bucket prefix
        storagePath = `verification-images/${imageToDelete.image_url}`;
      } else {
        storagePath = imageToDelete.image_url;
      }
      
      console.log('[Portfolio] Raw image_url from DB:', imageToDelete.image_url);
      console.log('[Portfolio] Extracted storage path for deletion:', storagePath);
      
      if (storagePath) {
        try {
          // Supabase .remove() expects the full path within the bucket (without bucket name prefix in JS SDK v2)
          // Actually, we need to pass just the path WITHOUT the bucket name
          let pathForRemoval = storagePath;
          if (pathForRemoval.startsWith('verification-images/')) {
            pathForRemoval = pathForRemoval.replace('verification-images/', '');
          }
          
          console.log('[Portfolio] Path being sent to .remove():', pathForRemoval);
          
          const { error: storageError } = await supabase.storage
            .from('verification-images')
            .remove([pathForRemoval]);

          if (storageError) {
            console.error('[Portfolio] Storage deletion error:', storageError);
            console.error('[Portfolio] Failed path:', pathForRemoval);
            console.warn('[Portfolio] Continuing with DB deletion despite storage error');
          } else {
            console.log('[Portfolio] Image deleted from storage successfully');
          }
        } catch (error) {
          console.error('[Portfolio] Storage deletion exception:', error);
          console.error('[Portfolio] Attempted path:', storagePath);
          console.warn('[Portfolio] Continuing with DB deletion despite storage exception');
        }
      }

      // ✅ Step 2: Delete from Database (always execute)
      const { error: dbError } = await supabase
        .from('provider_portfolio_images')
        .delete()
        .eq('id', imageToDelete.id);

      if (dbError) {
        console.error('[Portfolio] Database deletion error:', dbError);
        throw dbError;
      }

      console.log('[Portfolio] Image deleted from database successfully');
      return imageIndex;
    },
    onSuccess: (deletedIndex) => {
      console.log('[Portfolio] Image deleted completely (DB + Storage)');
      setDeletingImageIndex(null);
      queryClient.invalidateQueries({ queryKey: ['portfolioImages', providerId] });
    },
    onError: (error: any) => {
      console.error('[Portfolio] Delete failed:', error);
      setDeletingImageIndex(null);
      Alert.alert('Delete Failed', 'Failed to delete image. Please try again.');
    }
  });

  // ✅ REACT QUERY MUTATION: Clear all portfolio images (from DB and Storage)
  const clearPortfolioMutation = useMutation({
    mutationFn: async () => {
      if (!providerId) throw new Error('Provider ID required');

      console.log('[Portfolio] Clearing all portfolio images and storage files');

      // ✅ Step 1: Fetch all existing images to get storage paths
      const { data: imagesToDelete, error: fetchError } = await supabase
        .from('provider_portfolio_images')
        .select('*')
        .eq('provider_id', providerId);

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('[Portfolio] Error fetching images for deletion:', fetchError);
        throw fetchError;
      }

      if (imagesToDelete && imagesToDelete.length > 0) {
        // ✅ Step 2: Delete all files from storage
        const storagePathsToDelete = imagesToDelete
          .map(img => {
            let storagePath = '';
            
            if (img.image_url.includes('http')) {
              // It's a signed URL - extract the path part between /sign/ and ?
              const signedUrlMatch = img.image_url.match(/\/sign\/([^?]+)/);
              if (signedUrlMatch) {
                storagePath = signedUrlMatch[1]; // Full path: "verification-images/providers/..."
              }
            } else if (img.image_url.includes('providers/')) {
              // It's a raw path from DB - needs bucket prefix
              storagePath = `verification-images/${img.image_url}`;
            } else {
              storagePath = img.image_url;
            }
            
            // Remove bucket prefix for .remove() API
            if (storagePath.startsWith('verification-images/')) {
              storagePath = storagePath.replace('verification-images/', '');
            }
            
            return storagePath;
          })
          .filter((path): path is string => path !== null && path.length > 0);

        if (storagePathsToDelete.length > 0) {
          console.log('[Portfolio] Deleting', storagePathsToDelete.length, 'files from storage');
          console.log('[Portfolio] Storage paths to delete:', storagePathsToDelete);
          
          try {
            const { error: storageError } = await supabase.storage
              .from('verification-images')
              .remove(storagePathsToDelete);

            if (storageError) {
              console.error('[Portfolio] Storage deletion error:', storageError);
              console.warn('[Portfolio] Continuing with DB deletion despite storage error');
            } else {
              console.log('[Portfolio] All files deleted from storage successfully');
            }
          } catch (error) {
            console.error('[Portfolio] Storage deletion exception:', error);
            console.warn('[Portfolio] Continuing with DB deletion despite storage exception');
          }
        }
      }

      // ✅ Step 3: Delete all from Database
      const { error: dbError } = await supabase
        .from('provider_portfolio_images')
        .delete()
        .eq('provider_id', providerId);

      if (dbError) {
        console.error('[Portfolio] Database deletion error:', dbError);
        throw dbError;
      }

      console.log('[Portfolio] All images cleared from database successfully');
    },
    onSuccess: () => {
      console.log('[Portfolio] All images cleared completely (DB + Storage)');
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
        
        if (totalImages > portfolioConfig.maxImages) {
          Alert.alert('Too many images', `You can only upload up to ${portfolioConfig.maxImages} images total.`);
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
      
      // ✅ SINGLE-SOURCE: Use centralized mutation to update step completion
      await updateStepMutation.mutateAsync({
        providerId,
        stepNumber: 5, // Portfolio is now step 5 (services removed)
        completed: true,
        data: { images: portfolioImages },
      });

      navigateNext();
      return;
    }
    
    if (selectedImages.length === 0 && existingImages.length === 0) {
      Alert.alert('Portfolio Required', 'Please upload at least one portfolio image.');
      return;
    }

    // Upload new images using React Query mutation
    if (selectedImages.length > 0) {
      // ✅ APPEND mode: Add images to existing portfolio
      uploadPortfolioMutation.mutate(selectedImages);
    }
  };

  // ✅ Handle Replace All action
  const handleReplaceAll = async () => {
    const result = await new Promise<boolean>((resolve) => {
      Alert.alert(
        'Replace Portfolio',
        'Are you sure you want to replace all existing images?',
        [
          { text: 'Cancel', onPress: () => resolve(false), style: 'cancel' },
          { text: 'Replace', onPress: () => resolve(true), style: 'destructive' },
        ]
      );
    });

    if (result && selectedImages.length > 0) {
      replacePortfolioMutation.mutate(selectedImages);
    }
  };

  return (
    <View className="flex-1 bg-background">
      <VerificationHeader 
        step={5} 
        title="Upload Portfolio" 
      />
      <ScreenWrapper scrollable contentContainerClassName="px-4 py-6 pb-32">

      {/* Upload Area */}
      {/* Existing Images Section with Skeleton Loading */}
      {(existingImages.length > 0 || refetchingImages) && selectedImages.length === 0 && (
        <Animated.View entering={SlideInDown.delay(200).springify()} className="mb-8">
          {/* Success Banner */}
          <View className="bg-success/5 border border-success/30 rounded-xl p-4 mb-6">
            <View className="flex-row items-start">
              <View className="w-10 h-10 bg-success/20 rounded-full items-center justify-center mr-3 mt-1">
                <Icon as={Upload} size={20} className="text-success" />
              </View>
              <View className="flex-1">
                <Text className="text-success font-bold text-base mb-1">
                  {refetchingImages ? 'Updating Portfolio...' : 'Portfolio Ready'}
                </Text>
                <Text className="text-success/80 text-sm leading-4">
                  {refetchingImages 
                    ? 'Syncing your images with storage...'
                    : `${existingImages.length} image${existingImages.length > 1 ? 's' : ''} uploaded • Ready to continue`
                  }
                </Text>
              </View>
            </View>
          </View>

          {/* Images Grid */}
          {refetchingImages && existingImages.length === 0 ? (
            <View className="mb-6">
              <Text className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Portfolio Gallery
              </Text>
              <View className="flex-row flex-wrap gap-3">
                {[0, 1, 2, 3].map((index) => (
                  <Skeleton 
                    key={index}
                    className="w-[calc(50%-6px)] h-32 rounded-lg"
                  />
                ))}
              </View>
            </View>
          ) : (
            <View className="mb-6">
              <Text className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Portfolio Gallery ({existingImages.length})
              </Text>
              <View className="flex-row flex-wrap gap-3">
                {existingImages.map((img, index) => (
                  <View 
                    key={img.id} 
                    className="relative"
                    style={{ width: '48%', aspectRatio: 1 }}
                  >
                    <Image 
                      source={{ uri: img.image_url }} 
                      style={{ 
                        width: '100%', 
                        height: '100%',
                        borderRadius: 8,
                        backgroundColor: '#f5f5f5'
                      }}
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
                        setDeletingImageIndex(index);
                        deletePortfolioImageMutation.mutate(index);
                      }}
                      disabled={deletingImageIndex === index || refetchingImages}
                      className="absolute z-50 w-8 h-8 bg-destructive rounded-full items-center justify-center shadow-lg"
                      style={{ top: -6, right: -6 }}
                    >
                      {deletingImageIndex === index ? (
                        <ActivityIndicator size="small" color="white" />
                      ) : (
                        <Text className="text-white text-lg font-bold leading-none">×</Text>
                      )}
                    </Pressable>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Action Buttons */}
          <View className="flex-row gap-3">
            <Button
              variant="outline"
              size="sm"
              onPress={() => {
                setSelectedImages([]);
                clearPortfolioMutation.mutate();
              }}
              disabled={clearPortfolioMutation.isPending || refetchingImages}
              className="flex-1"
            >
              <Text className="text-xs font-semibold">
                {clearPortfolioMutation.isPending ? 'Clearing...' : 'Clear All'}
              </Text>
            </Button>
            
            <Button
              size="sm"
              onPress={pickImages}
              disabled={existingImages.length + selectedImages.length >= portfolioConfig.maxImages || refetchingImages}
              className="flex-1"
            >
              <Text className="text-xs font-semibold text-primary-foreground">Add More</Text>
            </Button>
          </View>
        </Animated.View>
      )}

      {/* Image Selection */}
      {(existingImages.length === 0 || selectedImages.length > 0) && !refetchingImages && (
        <Animated.View entering={SlideInDown.delay(200).springify()} className="mb-10">
          {selectedImages.length > 0 && (
            <View className="mb-6">
              <Text className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Selected Images ({selectedImages.length})
              </Text>
              <View className="flex-row flex-wrap gap-3">
                {selectedImages.map((uri, index) => (
                  <View 
                    key={index} 
                    className="relative"
                    style={{ width: '48%', aspectRatio: 1 }}
                  >
                    <Image 
                      source={{ uri }} 
                      style={{ 
                        width: '100%', 
                        height: '100%',
                        borderRadius: 8,
                        backgroundColor: '#f5f5f5'
                      }}
                      resizeMode="cover"
                      onLoad={() => console.log('[Portfolio] Selected image loaded:', index)}
                      onError={(error) => console.error('[Portfolio] Selected image failed to load:', index, error)}
                    />
                    <Pressable
                      onPress={() => removeImage(index)}
                      className="absolute z-50 w-8 h-8 bg-destructive rounded-full items-center justify-center shadow-lg"
                      style={{ top: -6, right: -6 }}
                    >
                      <Text className="text-white text-lg font-bold leading-none">×</Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            </View>
          )}

          {existingImages.length === 0 && selectedImages.length === 0 && (
            <Animated.View entering={FadeIn.delay(300)} className="bg-card border border-border rounded-2xl p-8 items-center mb-10 shadow-sm overflow-hidden">
              {/* Content */}
              <View className="items-center w-full">
                {/* Large Icon */}
                <View className="w-20 h-20 bg-primary/15 rounded-full items-center justify-center mb-6 border-2 border-primary/20">
                  <Icon as={Images} size={40} className="text-primary" />
                </View>
                
                {/* Main Heading */}
                <Text className="text-foreground font-bold text-2xl mb-2 text-center">
                  Build Your Portfolio
                </Text>
                
                {/* Subtitle */}
                <Text className="text-muted-foreground text-center text-sm mb-4 leading-5">
                  Upload images that showcase your best work and services
                </Text>
                
                {/* Benefit Bullets */}
                <View className="bg-primary/5 border border-primary/10 rounded-xl px-4 py-3 mb-6 w-full">
                  <View className="flex-row items-start mb-3">
                    <Text className="text-primary font-bold mr-2.5 text-base">✓</Text>
                    <Text className="text-muted-foreground text-xs flex-1 leading-4">
                      <Text className="font-semibold text-foreground">Professional first impression</Text> with quality images
                    </Text>
                  </View>
                  <View className="flex-row items-start mb-3">
                    <Text className="text-primary font-bold mr-2.5 text-base">✓</Text>
                    <Text className="text-muted-foreground text-xs flex-1 leading-4">
                      <Text className="font-semibold text-foreground">Build customer trust</Text> with recent work samples
                    </Text>
                  </View>
                  <View className="flex-row items-start">
                    <Text className="text-primary font-bold mr-2.5 text-base">✓</Text>
                    <Text className="text-muted-foreground text-xs flex-1 leading-4">
                      <Text className="font-semibold text-foreground">Increase bookings</Text> with visual proof of expertise
                    </Text>
                  </View>
                </View>
                
                {/* CTA Button */}
                <Button onPress={pickImages} size="lg" className="w-full">
                  <Icon as={Images} size={18} className="text-primary-foreground mr-2" />
                  <Text className="text-primary-foreground font-bold">Select Images to Upload</Text>
                </Button>
              </View>
            </Animated.View>
          )}

          {selectedImages.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onPress={pickImages}
              disabled={existingImages.length + selectedImages.length >= portfolioConfig.maxImages}
              className="w-full mb-8"
            >
              <Text className="text-xs font-semibold">Add More ({existingImages.length + selectedImages.length}/{portfolioConfig.maxImages})</Text>
            </Button>
          )}
        </Animated.View>
      )}
    </ScreenWrapper>

    {/* Fixed Bottom Action Buttons */}
    <View
      className="px-4 bg-background border-t border-border"
      style={{
        paddingBottom: Math.max(insets.bottom + 20, 32),
        paddingTop: 16,
      }}
    >
      <Animated.View entering={SlideInDown.delay(300).springify()} className="mb-3">
        <Button
          size="lg"
          onPress={handleSubmit}
          disabled={(selectedImages.length === 0 && existingImages.length === 0) || uploadPortfolioMutation.isPending || replacePortfolioMutation.isPending || fetchingExisting || refetchingImages}
          className="w-full"
        >
          <Text className="font-bold text-primary-foreground">
            {uploadPortfolioMutation.isPending || replacePortfolioMutation.isPending ? 'Uploading...' : 
             fetchingExisting ? 'Loading...' :
             refetchingImages ? 'Syncing...' :
             (existingImages.length > 0 && selectedImages.length === 0) ? 'Continue to Next Step' : 
             'Upload & Continue'}
          </Text>
        </Button>
      </Animated.View>

      <Animated.View entering={SlideInDown.delay(400).springify()}>
        <Button
          variant="outline"
          size="lg"
          onPress={navigateBack}
          disabled={uploadPortfolioMutation.isPending || replacePortfolioMutation.isPending}
          className="w-full"
        >
          <Text className="font-semibold text-foreground">Go Back</Text>
        </Button>
      </Animated.View>
    </View>

    {/* Upload Loading Overlay */}
    {(uploadPortfolioMutation.isPending || replacePortfolioMutation.isPending) && (
      <View className="absolute inset-0 bg-background/95 items-center justify-center z-50">
        <View className="bg-card border border-border rounded-2xl p-8 items-center shadow-sm">
          <View className="w-16 h-16 bg-primary/10 rounded-full items-center justify-center mb-4">
            <Icon as={Loader2} size={32} className="text-primary animate-spin" />
          </View>
          <Text className="text-foreground font-semibold text-lg mb-2">
            Uploading Portfolio...
          </Text>
          <Text className="text-muted-foreground text-center text-sm">
            Please wait while we upload your images
          </Text>
          <View className="flex-row items-center mt-4 px-4 py-2 bg-primary/5 rounded-full">
            <Icon as={Upload} size={16} className="text-primary mr-2" />
            <Text className="text-primary text-sm font-medium">
              {selectedImages.length} image{selectedImages.length !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>
      </View>
    )}
    </View>
  );
}
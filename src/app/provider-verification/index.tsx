import React, { useEffect, useState } from 'react';
import { View, Alert, Image, TouchableOpacity, Pressable } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import Animated, { FadeIn, SlideInDown, FadeInUp } from 'react-native-reanimated';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { Text } from '@/components/ui/text';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScreenWrapper } from '@/components/ui/screen-wrapper';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '@/components/ui/context-menu';
import { VerificationHeader } from '@/components/verification/VerificationHeader';
import { useProviderVerificationStore, useProviderVerificationHydration } from '@/stores/verification/provider-verification';
import { supabase } from '@/lib/core/supabase';
import { createStorageService } from '@/lib/storage/organized-storage';
import { normalizeImageUri } from '@/lib/utils';
import { useStripeVerificationIntegration } from '@/lib/payment/stripe-verification-integration';
import { useSaveVerificationStep } from '@/hooks/provider/useProviderVerificationQueries';
import { useVerificationNavigation } from '@/hooks/provider';
import { VerificationFlowManager } from '@/lib/verification/verification-flow-manager';

// Skeleton Loading Component
const SkeletonBox: React.FC<{ className?: string; children?: React.ReactNode }> = ({ className = '', children }) => (
  <View className={`bg-muted/30 rounded-lg animate-pulse ${className}`}>
    {children && <View className="opacity-0">{children}</View>}
  </View>
);

// Enhanced ActionButton with consistent styling
const ActionButton: React.FC<{
  onPress: () => void;
  title: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'destructive';
  disabled?: boolean;
  loading?: boolean;
  icon?: string;
  fullWidth?: boolean;
  size?: 'sm' | 'md' | 'lg';
}> = ({ 
  onPress, 
  title, 
  variant = 'primary', 
  disabled = false, 
  loading = false, 
  icon, 
  fullWidth = false, 
  size = 'md' 
}) => {
  const [pressed, setPressed] = useState(false);
  
  const getSizeStyles = () => {
    switch (size) {
      case 'sm': return 'min-h-[40px] px-4 py-2';
      case 'lg': return 'min-h-[56px] px-8 py-4';
      default: return 'min-h-[48px] px-6 py-3';
    }
  };
  
  const getButtonStyles = () => {
    const baseStyles = `rounded-xl border-2 flex-row items-center justify-center ${getSizeStyles()}`;
    const widthStyles = fullWidth ? 'w-full' : 'flex-1';
    
    if (disabled || loading) {
      return `${baseStyles} ${widthStyles} bg-muted border-muted opacity-50`;
    }
    
    switch (variant) {
      case 'primary':
        return `${baseStyles} ${widthStyles} bg-primary border-primary ${pressed ? 'opacity-80' : ''}`;
      case 'secondary':
        return `${baseStyles} ${widthStyles} bg-secondary border-secondary ${pressed ? 'opacity-80' : ''}`;
      case 'outline':
        return `${baseStyles} ${widthStyles} bg-background border-border ${pressed ? 'bg-muted' : ''}`;
      case 'destructive':
        return `${baseStyles} ${widthStyles} bg-destructive border-destructive ${pressed ? 'opacity-80' : ''}`;
      default:
        return `${baseStyles} ${widthStyles} bg-primary border-primary ${pressed ? 'opacity-80' : ''}`;
    }
  };

  const getTextStyles = () => {
    if (disabled || loading) {
      return 'text-muted-foreground font-semibold';
    }
    
    switch (variant) {
      case 'outline':
        return 'text-foreground font-semibold';
      case 'destructive':
        return 'text-destructive-foreground font-semibold';
      default:
        return 'text-primary-foreground font-semibold';
    }
  };

  const handlePress = () => {
    if (disabled || loading) return;
    
    console.log(`🔥 [ActionButton] ${title} pressed!`);
    try {
      onPress();
    } catch (error) {
      console.error(`[ActionButton] Error in ${title}:`, error);
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={() => {
        console.log(`[ActionButton] ${title} pressed in`);
        setPressed(true);
      }}
      onPressOut={() => {
        console.log(`[ActionButton] ${title} pressed out`);
        setPressed(false);
      }}
      disabled={disabled || loading}
      className={`${getButtonStyles()} shadow-sm elevation-2`}
    >
      <View className="flex-row items-center justify-center gap-2">
        {icon && <Text className="text-lg">{icon}</Text>}
        <Text className={getTextStyles()}>
          {loading ? 'Processing...' : title}
        </Text>
      </View>
    </Pressable>
  );
};

// Helper functions
const getDocumentSignedUrl = async (providerId: string, filePath: string): Promise<string> => {
  if (!providerId) {
    throw new Error('Provider ID not found');
  }
  
  const storageService = createStorageService(providerId);
  
  // First try the provided path
  let result = await storageService.getSignedUrl(filePath);
  
  if (!result.success) {
    console.log('Document not found at provided path, trying to migrate from old path format');
    
    // Try to construct new organized path from old path
    const pathParts = filePath.split('/');
    const filename = pathParts[pathParts.length - 1];
    
    if (filename && (filename.includes('passport') || filename.includes('driving_license') || filename.includes('id_card'))) {
      // This looks like a document filename, try new organized path
      const documentType = filename.includes('passport') ? 'passport' : 
                          filename.includes('driving_license') ? 'driving_license' : 'id_card';
      const newPath = `providers/${providerId}/document-verification/${filename}`;
      console.log('Trying new organized path for document:', newPath);
      
      result = await storageService.getSignedUrl(newPath);
      
      if (result.success) {
        console.log('Found document with new organized path');
        return result.signedUrl!;
      }
    }
  }
  
  if (!result.success || !result.signedUrl) {
    throw new Error(result.error || 'Failed to generate signed URL');
  }
  
  return result.signedUrl;
};

const checkDocumentFileExists = async (providerId: string, filePath: string): Promise<boolean> => {
  try {
    await getDocumentSignedUrl(providerId, filePath);
    return true;
  } catch (error) {
    console.error('Error checking file existence:', error);
    return false;
  }
};

// Interface
interface DocumentForm {
  documentType: 'passport' | 'driving_license' | 'id_card';
}

// Main Component
export default function DocumentVerificationScreen() {
  const [selectedImage, setSelectedImage] = useState<any | null>(null);
  const [imageLoadError, setImageLoadError] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  
  const queryClient = useQueryClient();
  
  const { 
    documentData, 
    updateDocumentData, 
    validateAndResetState,
    completeStepSimple,
    providerId,
    currentStep
  } = useProviderVerificationStore();

  const isHydrated = useProviderVerificationHydration();
  const { handleProviderVerificationComplete } = useStripeVerificationIntegration();
  const { completeCurrentStepAndNavigate } = useVerificationNavigation();
  
  // ✅ REACT QUERY: Use centralized mutation for saving document data
  const saveDocumentMutation = useSaveVerificationStep();

  // ✅ VALIDATE STATE: Ensure consistency on component mount
  useEffect(() => {
    if (isHydrated) {
      validateAndResetState();
    }
  }, [isHydrated, validateAndResetState]);

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

  // ✅ REACT QUERY: Fetch existing verification documents
  const { data: existingDocument, isLoading: fetchingExisting, error: documentError } = useQuery({
    queryKey: ['existingDocument', providerId],
    queryFn: async () => {
      if (!providerId) throw new Error('Provider ID required');

      console.log('[Documents] Fetching existing document for provider:', providerId);

      const { data, error } = await supabase
        .from('provider_verification_documents')
        .select('document_type, document_url, verification_status, created_at')
        .eq('provider_id', providerId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('[Documents] Error fetching existing document:', error);
        throw error;
      }

      if (!data) {
        console.log('[Documents] No existing document found');
        return null;
      }

      // Check if the file actually exists in storage
      const fileExists = await checkDocumentFileExists(providerId, data.document_url);
      
      if (!fileExists) {
        console.log('[Documents] Document file not found in storage, cleaning up database record');
        const { error: deleteError } = await supabase
          .from('provider_verification_documents')
          .delete()
          .eq('provider_id', providerId)
          .eq('document_url', data.document_url);

        if (deleteError) {
          console.error('[Documents] Error cleaning up orphaned document record:', deleteError);
        }
        return null;
      }

      try {
        // Get a signed URL for the document
        const signedUrl = await getDocumentSignedUrl(providerId, data.document_url);
        const documentWithSignedUrl = {
          ...data,
          document_url: signedUrl
        };
        
        // Update store with existing data
        updateDocumentData({
          documentType: data.document_type as any,
          documentUrl: signedUrl,
          verificationStatus: data.verification_status as any,
        });
        
        console.log('[Documents] Found existing document with signed URL');
        return documentWithSignedUrl;
      } catch (signedUrlError) {
        console.error('[Documents] Failed to get signed URL for document:', signedUrlError);
        updateDocumentData({
          documentType: data.document_type as any,
          documentUrl: data.document_url,
          verificationStatus: data.verification_status as any,
        });
        return data;
      }
    },
    enabled: !!providerId && isHydrated,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Mutations
  const uploadDocumentMutation = useMutation({
    mutationFn: async ({ image, documentType }: { image: any; documentType: string }) => {
      console.log('[DocumentUpload] Starting document upload for provider:', providerId);
      
      if (!providerId) {
        throw new Error('Provider ID is required for document upload');
      }

      const storage = createStorageService(providerId);
      const timestamp = new Date().getTime();
      
      const uploadResult = await storage.uploadIdentityDocument(
        image.uri, 
        documentType.toLowerCase() as any,
        timestamp
      );
      
      if (!uploadResult.success) {
        throw new Error(uploadResult.error || 'Failed to upload document to storage');
      }

      const actualStoragePath = uploadResult.filePath || `${providerId}/documents/${documentType.toLowerCase()}_${timestamp}.jpg`;

      // Handle existing document cleanup and database operations
      const { data: existingDoc } = await supabase
        .from('provider_verification_documents')
        .select('id, document_url')
        .eq('provider_id', providerId)
        .eq('document_type', documentType)
        .single();

      let data, error;

      if (existingDoc) {
        if (existingDoc.document_url) {
          const { error: deleteError } = await supabase.storage
            .from('verification-images')
            .remove([existingDoc.document_url]);
          
          if (deleteError) {
            console.warn('[DocumentUpload] Warning: Could not delete old file:', deleteError);
          }
        }

        const updateResult = await supabase
          .from('provider_verification_documents')
          .update({
            document_url: actualStoragePath,
            verification_status: 'pending',
            updated_at: new Date().toISOString()
          })
          .eq('id', existingDoc.id)
          .select()
          .single();
        
        data = updateResult.data;
        error = updateResult.error;
      } else {
        const insertResult = await supabase
          .from('provider_verification_documents')
          .insert({
            provider_id: providerId,
            document_type: documentType,
            document_url: actualStoragePath,
            verification_status: 'pending',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();
        
        data = insertResult.data;
        error = insertResult.error;
      }

      if (error) {
        console.error('[DocumentUpload] Database save error:', error);
        throw error;
      }

      updateDocumentData({
        documentType: documentType as any,
        documentUrl: actualStoragePath,
        verificationStatus: 'pending',
      });

      return { ...data, document_url: actualStoragePath };
    },
    onSuccess: (data) => {
      console.log('[DocumentUpload] Upload successful:', data);
      queryClient.invalidateQueries({ queryKey: ['existingDocument', providerId] });
    },
    onError: (error) => {
      console.error('[DocumentUpload] Upload failed:', error);
    },
  });

  const submitDocumentMutation = useMutation({
    mutationFn: async (formData: any) => {
      console.log('[DocumentSubmission] Starting document submission for provider:', providerId);
      
      if (!providerId) {
        throw new Error('Provider ID is required for document submission');
      }

      const documentType = formData.documentType;
      const selectedImage = formData.selectedImage;

      let documentData = existingDocument;
      
      if (selectedImage) {
        documentData = await uploadDocumentMutation.mutateAsync({
          image: selectedImage,
          documentType
        });
      }

      if (!documentData) {
        throw new Error('No document available for submission');
      }

      // Note: Profile verification_status should NOT be set here
      // It should only be set by the verification flow manager when the entire process is complete
      // Document verification status is handled in the provider_verification_documents table

      updateDocumentData({
        documentType: documentType as any,
        documentUrl: documentData.document_url,
        verificationStatus: 'pending',
      });
      
      return {
        document: documentData,
        profile: { updated: true } // Always true since we don't update profile anymore
      };
    },
    onSuccess: async (data) => {
      console.log('[DocumentSubmission] Submission successful:', data);
      
      queryClient.invalidateQueries({ queryKey: ['existingDocument', providerId] });
      
      try {
        console.log('🔗 [Stripe Integration] Uploading provider document to Stripe for payment compliance...');
        const stripeResult = await handleProviderVerificationComplete(providerId, {
          documentType: data.document.document_type,
          documentUrl: data.document.document_url
        });
        
        if (stripeResult.success) {
          console.log('✅ [Stripe Integration] Provider document uploaded to Stripe successfully');
        } else {
          console.log('⚠️ [Stripe Integration] Failed to upload to Stripe:', stripeResult.error);
        }
      } catch (stripeError) {
        console.log('⚠️ [Stripe Integration] Exception during Stripe upload:', stripeError);
      }
      
      // ✅ SAVE PROGRESS: Use centralized mutation to save progress
      try {
        await saveDocumentMutation.mutateAsync({
          providerId,
          step: 'document',
          data: {
            documentType: data.document.document_type,
            documentUrl: data.document.document_url,
            verificationStatus: 'pending',
          },
        });
      } catch (progressError) {
        console.error('[DocumentSubmission] Failed to save progress:', progressError);
        // Don't block the flow if progress saving fails
      }
      
      Alert.alert(
        'Document Uploaded',
        'Your document has been uploaded successfully and is pending verification.',
        [
          {
            text: 'Continue',
            onPress: () => {
              console.log('[DocumentSubmission] User acknowledged success, completing step with centralized navigation');
              
              // ✅ EXPLICIT: Always complete step 1 for document verification
              const result = VerificationFlowManager.completeStepAndNavigate(
                1, // Always step 1 for document verification
                { 
                  documentType: data.document.document_type, 
                  documentUrl: data.document.document_url 
                },
                (step, data) => {
                  // Update Zustand store
                  completeStepSimple(step, data);
                }
              );
              
              console.log('[DocumentSubmission] Navigation result:', result);
            },
          },
        ]
      );
    },
    onError: (error) => {
      console.error('[DocumentSubmission] Submission failed:', error);
      Alert.alert('Upload Failed', 'Failed to upload document. Please try again.');
    },
  });

  const deleteDocumentMutation = useMutation({
    mutationFn: async (documentUrl: string) => {
      console.log('[DocumentDelete] Deleting document:', documentUrl);
      
      if (!providerId) {
        throw new Error('Provider ID is required');
      }

      let filePath = documentUrl;
      if (documentUrl.includes('/storage/v1/object/')) {
        const urlParts = documentUrl.split('/storage/v1/object/');
        if (urlParts.length > 1) {
          filePath = urlParts[1].split('?')[0];
          if (filePath.startsWith('sign/')) {
            filePath = filePath.replace('sign/', '');
          }
          if (filePath.startsWith('verification-images/')) {
            filePath = filePath.replace('verification-images/', '');
          }
        }
      }

      const { error: storageError } = await supabase.storage
        .from('verification-images')
        .remove([filePath]);

      if (storageError) {
        console.warn('[DocumentDelete] Storage delete warning:', storageError);
      }

      const { error, data } = await supabase
        .from('provider_verification_documents')
        .delete()
        .eq('provider_id', providerId)
        .select('*');

      if (error) {
        console.error('[DocumentDelete] Database delete error:', error);
        throw error;
      }

      return true;
    },
    onSuccess: () => {
      console.log('[DocumentDelete] Delete successful');
      queryClient.invalidateQueries({ queryKey: ['existingDocument', providerId] });
      
      updateDocumentData({
        documentType: undefined,
        documentUrl: undefined,
        verificationStatus: undefined,
      });
    },
    onError: (error) => {
      console.error('[DocumentDelete] Delete failed:', error);
    },
  });

  // Image picker functions
  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'We need camera roll permissions to upload your document.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [16, 10],
        quality: 0.8,
        base64: false,
      });

      if (!result.canceled && result.assets[0]) {
        console.log('Image selected from gallery:', result.assets[0]);
        
        // Normalize the URI for React Native Image component compatibility
        const normalizedUri = await normalizeImageUri(result.assets[0].uri);
        const normalizedAsset = { ...result.assets[0], uri: normalizedUri };
        
        setSelectedImage(normalizedAsset);
        setImageLoadError(false);
        setRetryCount(0);
        setIsRetrying(false);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'We need camera permissions to take a photo.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [16, 10],
        quality: 0.8,
        base64: false,
      });

      if (!result.canceled && result.assets[0]) {
        console.log('Photo taken:', result.assets[0]);
        
        // Normalize the URI for React Native Image component compatibility
        const normalizedUri = await normalizeImageUri(result.assets[0].uri);
        const normalizedAsset = { ...result.assets[0], uri: normalizedUri };
        
        setSelectedImage(normalizedAsset);
        setImageLoadError(false);
        setRetryCount(0);
        setIsRetrying(false);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  // Form submission handler
  const onSubmit = (data: DocumentForm) => {
    console.log('[DocumentSubmission] onSubmit called with data:', data);
    
    if (!selectedImage && !existingDocument) {
      Alert.alert('Document Required', 'Please upload your document before continuing.');
      return;
    }

    if (existingDocument && !selectedImage) {
      Alert.alert(
        'Using Existing Document',
        'Proceeding with your uploaded document.',
        [
          {
            text: 'Continue',
            onPress: () => {
              console.log('[DocumentSubmission] User confirmed using existing document');
              
              // ✅ EXPLICIT: Always complete step 1 for document verification
              const result = VerificationFlowManager.completeStepAndNavigate(
                1, // Always step 1 for document verification
                { 
                  documentType: existingDocument.document_type, 
                  documentUrl: existingDocument.document_url 
                },
                (step, data) => {
                  // Update Zustand store
                  completeStepSimple(step, data);
                }
              );
              
              console.log('[DocumentSubmission] Navigation result:', result);
            },
          },
        ]
      );
      return;
    }

    submitDocumentMutation.mutate({
      ...data,
      selectedImage
    });
  };

  // Derived state
  const loading = uploadDocumentMutation.isPending || submitDocumentMutation.isPending || deleteDocumentMutation.isPending;
  const canGoBack = false; // Step 1 is the first step, no going back

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

  const currentDocumentInfo = getDocumentTypeInfo(documentType);

  // Calculate continue button state
  const continueDisabled = !isValid || (!selectedImage && !existingDocument) || loading || fetchingExisting;
  const continueText = existingDocument && !selectedImage ? 'Use Existing' : 'Continue to Identity';

  // Temporarily disabled verbose logging to reduce console noise during form input
  // console.log('🔍 [DocumentVerificationScreen] render:', {
  //   currentStep,
  //   expectedStep: 1,
  //   stepMismatch: currentStep !== 1,
  //   screenType: 'Document Verification (Step 1)',
  //   existingDocument: !!existingDocument,
  //   selectedImage: !!selectedImage,
  //   isValid,
  //   loading,
  //   fetchingExisting,
  //   continueDisabled
  // });

  // console.log('🔍 [DocumentVerificationScreen] Rendering document verification screen');

  return (
    <View className="flex-1 bg-background">
      {/* ✅ Screen-owned header - always accurate */}
      <VerificationHeader
        step={1}
        title="Document Verification"
      />

      <ScreenWrapper contentContainerClassName="px-6 py-4" className="flex-1">
        {/* Header - Always rendered with fixed space */}
        <Animated.View
          entering={FadeIn.delay(200).springify()}
          className="items-center mb-12 min-h-[120px]"
        >
          <View className="w-16 h-16 bg-primary rounded-2xl justify-center items-center mb-4">
            <Text className="text-2xl">{currentDocumentInfo?.icon}</Text>
          </View>
          <Text className="text-2xl font-bold text-foreground mb-2">
            Document Verification
          </Text>
        <Text className="text-base text-muted-foreground text-center mb-2">
          Upload a valid ID document to verify your identity
        </Text>
      </Animated.View>

      {/* Document Type Selection - Fixed space with skeleton */}
      <Animated.View entering={SlideInDown.delay(600).springify()} className="mb-8 min-h-[80px]">
        <Text className="text-sm font-medium text-foreground mb-3">
          Document Type
        </Text>
        {fetchingExisting ? (
          <SkeletonBox className="h-12">
            <Select value={{ value: documentType, label: documentType }} onValueChange={() => {}}>
              <SelectTrigger>
                <SelectValue placeholder="Select document type" />
              </SelectTrigger>
            </Select>
          </SkeletonBox>
        ) : (
          <Controller
            control={control}
            name="documentType"
            rules={{ required: 'Please select a document type' }}
            render={({ field: { onChange, value } }) => (
              <Select 
                value={value ? { value, label: value } : undefined} 
                onValueChange={(option) => onChange(option?.value)}
              >
                <SelectTrigger className={errors.documentType ? 'border-destructive' : ''}>
                  <SelectValue placeholder="Select document type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="passport" label="Passport">
                    Passport
                  </SelectItem>
                  <SelectItem value="driving_license" label="Driving License">
                    Driving License
                  </SelectItem>
                  <SelectItem value="id_card" label="ID Card">
                    ID Card
                  </SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        )}
        {errors.documentType && (
          <Text className="text-sm text-destructive mt-1">
            {errors.documentType.message}
          </Text>
        )}
      </Animated.View>

      {/* Document Info - Fixed space */}
      <Animated.View entering={SlideInDown.delay(800).springify()} className="mb-8 min-h-[80px]">
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

      {/* Document Upload Area - Fixed space with skeleton */}
      <Animated.View entering={SlideInDown.delay(1000).springify()} className="mb-8">
        <Text className="text-sm font-medium text-foreground mb-3">
          Document Image
        </Text>

        {/* Fixed container to prevent layout shifts */}
        <View className="min-h-[400px]">
          {fetchingExisting ? (
            // Skeleton while fetching
            <View className="min-h-[400px]">
              <SkeletonBox className="h-48 mb-4" />
              <View className="flex-row gap-2">
                <SkeletonBox className="flex-1 h-12" />
                <SkeletonBox className="flex-1 h-12" />
              </View>
            </View>
          ) : existingDocument ? (
            // Existing document view
            <View className="min-h-[400px]">
              <View className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800 mb-4">
                <View className="flex-row items-center mb-2">
                  <Text className="text-green-600 dark:text-green-400 text-sm font-medium">
                    ✓ Document Already Uploaded
                  </Text>
                </View>
                <Text className="text-green-700 dark:text-green-300 text-sm">
                  Your {existingDocument.document_type.replace('_', ' ').toUpperCase()} is {existingDocument.verification_status}
                </Text>
              </View>

              <View className="w-full h-48 rounded-lg bg-muted mb-4 overflow-hidden border-2 border-border">
                {!imageLoadError ? (
                  <ContextMenu>
                    <ContextMenuTrigger>
                      <Image
                        source={{ uri: existingDocument.document_url }}
                        className="w-full h-full"
                        resizeMode="cover"
                        onError={async () => {
                          console.log('[ExistingDocument] Image failed to load, attempting to refresh signed URL');
                          try {
                            // Extract the file path from the signed URL (remove query parameters)
                            const urlParts = existingDocument.document_url.split('?');
                            const filePath = urlParts[0].replace('https://wezgwqqdlwybadtvripr.supabase.co/storage/v1/object/sign/', '');
                            
                            // Try to get a fresh signed URL
                            const freshSignedUrl = await getDocumentSignedUrl(providerId, filePath);
                            
                            // Update the document in the query cache with fresh URL
                            queryClient.setQueryData(['existingDocument', providerId], (oldData: any) => {
                              if (oldData) {
                                return {
                                  ...oldData,
                                  document_url: freshSignedUrl
                                };
                              }
                              return oldData;
                            });
                            
                            // Also update the store
                            updateDocumentData({
                              documentType: existingDocument.document_type as any,
                              documentUrl: freshSignedUrl,
                              verificationStatus: existingDocument.verification_status as any,
                            });
                            
                            console.log('[ExistingDocument] Refreshed signed URL successfully');
                          } catch (error) {
                            console.error('[ExistingDocument] Failed to refresh signed URL:', error);
                            setImageLoadError(true);
                          }
                        }}
                        onLoad={() => setImageLoadError(false)}
                      />
                    </ContextMenuTrigger>
                    <ContextMenuContent>
                      <ContextMenuItem
                        onPress={() => {
                          Alert.alert(
                            'Document Details',
                            `Type: ${existingDocument.document_type.replace('_', ' ').toUpperCase()}\nStatus: ${existingDocument.verification_status}\nUploaded: ${new Date(existingDocument.created_at).toLocaleDateString()}`
                          );
                        }}
                      >
                        <Text>View Details</Text>
                      </ContextMenuItem>
                      <ContextMenuItem
                        onPress={() => {
                          Alert.alert(
                            'Replace Document',
                            'Are you sure you want to upload a new document? This will replace your existing one.',
                            [
                              { text: 'Cancel', style: 'cancel' },
                              {
                                text: 'Replace',
                                style: 'destructive',
                                onPress: () => {
                                  if (existingDocument) {
                                    deleteDocumentMutation.mutate(existingDocument.document_url);
                                  }
                                  setSelectedImage(null);
                                },
                              },
                            ]
                          );
                        }}
                      >
                        <Text>Replace Document</Text>
                      </ContextMenuItem>
                      {existingDocument.verification_status === 'pending' && (
                        <ContextMenuItem
                          onPress={() => {
                            Alert.alert(
                              'Document Status',
                              'Your document is currently under review by our admin team. You will be notified once the verification is complete.'
                            );
                          }}
                        >
                          <Text>Check Status</Text>
                        </ContextMenuItem>
                      )}
                    </ContextMenuContent>
                  </ContextMenu>
                ) : (
                  <View className="w-full h-full items-center justify-center bg-muted">
                    <Text className="text-4xl mb-2">📄</Text>
                    <Text className="text-muted-foreground text-center px-4">
                      Document uploaded but preview unavailable
                    </Text>
                  </View>
                )}
              </View>

              <View className="flex-row gap-2 mb-4">
                <ActionButton
                  variant="outline"
                  size="sm"
                  onPress={() => {
                    Alert.alert(
                      'Replace Document',
                      'Are you sure you want to upload a new document? This will replace your existing one.',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Replace',
                          style: 'destructive',
                          onPress: () => {
                            if (existingDocument) {
                              deleteDocumentMutation.mutate(existingDocument.document_url);
                            }
                            setSelectedImage(null);
                          },
                        },
                      ]
                    );
                  }}
                  title="Replace"
                  disabled={false}
                />

                {existingDocument.verification_status === 'pending' && (
                  <ActionButton
                    variant="outline"
                    size="sm"
                    onPress={() => {
                      Alert.alert(
                        'Document Status',
                        'Your document is currently under review by our admin team. You will be notified once the verification is complete.'
                      );
                    }}
                    title="Check Status"
                    disabled={false}
                  />
                )}
              </View>
            </View>
          ) : selectedImage && selectedImage.uri ? (
            // Selected image view
            <View className="min-h-[400px]">
              <View className="w-full h-48 rounded-lg bg-muted mb-4 overflow-hidden border-2 border-border">
                {!imageLoadError ? (
                  <ContextMenu>
                    <ContextMenuTrigger>
                      <Image
                        source={{ uri: selectedImage.uri }}
                        className="w-full h-full"
                        resizeMode="cover"
                        onError={async () => {
                          console.log('[ImagePreview] Selected image failed to load, attempting to re-normalize URI');
                          try {
                            // Try to re-normalize the URI
                            const originalUri = selectedImage.uri;
                            const reNormalizedUri = await normalizeImageUri(originalUri);
                            
                            if (reNormalizedUri !== originalUri) {
                              console.log('[ImagePreview] Re-normalized URI, updating selectedImage');
                              setSelectedImage({
                                ...selectedImage,
                                uri: reNormalizedUri
                              });
                              setImageLoadError(false);
                            } else {
                              console.log('[ImagePreview] URI already normalized, setting error state');
                              setImageLoadError(true);
                            }
                          } catch (error) {
                            console.error('[ImagePreview] Failed to re-normalize URI:', error);
                            setImageLoadError(true);
                          }
                        }}
                        onLoadStart={() => {
                          console.log('[ImagePreview] Starting to load selected image');
                          setImageLoadError(false);
                        }}
                        onLoad={() => {
                          console.log('[ImagePreview] Selected image loaded successfully');
                          setImageLoadError(false);
                        }}
                      />
                    </ContextMenuTrigger>
                    <ContextMenuContent>
                      <ContextMenuItem
                        onPress={() => {
                          Alert.alert(
                            'Image Details',
                            `Size: ${selectedImage.width || 'Unknown'}x${selectedImage.height || 'Unknown'}\nType: ${selectedImage.type || 'image'}\nFile: ${selectedImage.fileName || 'camera_photo.jpg'}`
                          );
                        }}
                      >
                        <Text>View Details</Text>
                      </ContextMenuItem>
                      <ContextMenuItem
                        onPress={() => {
                          Alert.alert(
                            'Remove Image',
                            'Are you sure you want to remove this image?',
                            [
                              { text: 'Cancel', style: 'cancel' },
                              {
                                text: 'Remove',
                                onPress: () => setSelectedImage(null),
                              },
                            ]
                          );
                        }}
                      >
                        <Text>Remove Image</Text>
                      </ContextMenuItem>
                      <ContextMenuItem
                        onPress={() => takePhoto()}
                      >
                        <Text>Take New Photo</Text>
                      </ContextMenuItem>
                      <ContextMenuItem
                        onPress={() => pickImage()}
                      >
                        <Text>Choose from Gallery</Text>
                      </ContextMenuItem>
                    </ContextMenuContent>
                  </ContextMenu>
                ) : (
                  <View className="w-full h-full items-center justify-center bg-muted">
                    <Text className="text-4xl mb-2">⚠️</Text>
                    <Text className="text-muted-foreground text-center px-4 mb-3">
                      Failed to load image preview
                    </Text>
                    {!isRetrying && retryCount < 3 && (
                      <ActionButton
                        variant="outline"
                        size="sm"
                        onPress={() => {
                          setIsRetrying(true);
                          setRetryCount(prev => prev + 1);
                          setImageLoadError(false);
                          console.log(`[ImagePreview] Retrying image load (attempt ${retryCount + 1})`);
                          
                          // Reset retry state after a delay
                          setTimeout(() => {
                            setIsRetrying(false);
                          }, 2000);
                        }}
                        title={`Retry (${retryCount}/3)`}
                        disabled={isRetrying}
                      />
                    )}
                    {isRetrying && (
                      <View className="items-center">
                        <Text className="text-sm text-muted-foreground mb-2">Retrying...</Text>
                        <View className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      </View>
                    )}
                  </View>
                )}
              </View>

              <View className="flex-row gap-2 mb-4">
                <ActionButton
                  variant="outline"
                  size="sm"
                  onPress={() => {
                    Alert.alert(
                      'Remove Image',
                      'Are you sure you want to remove this image?',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Remove',
                          onPress: () => {
                            setSelectedImage(null);
                            setImageLoadError(false);
                            setRetryCount(0);
                            setIsRetrying(false);
                          },
                        },
                      ]
                    );
                  }}
                  title="Remove Image"
                />
                {imageLoadError && (
                  <ActionButton
                    variant="outline"
                    size="sm"
                    onPress={() => {
                      setImageLoadError(false);
                      setRetryCount(0);
                      setIsRetrying(false);
                      // Force re-render by briefly setting selectedImage to null then back
                      const tempImage = selectedImage;
                      setSelectedImage(null);
                      setTimeout(() => setSelectedImage(tempImage), 100);
                    }}
                    title="Reload Preview"
                  />
                )}
              </View>
            </View>
          ) : (
            // Upload area
            <View className="min-h-[400px]">
              <View className="border-2 border-dashed border-border rounded-lg p-8 items-center bg-muted/20 min-h-[200px] mb-4">
                <Text className="text-4xl mb-2">📄</Text>
                <Text className="text-foreground font-medium mb-2">
                  Upload Your Document
                </Text>
                <Text className="text-muted-foreground text-center mb-4">
                  Take a clear photo or select from gallery
                </Text>

                <View className="flex-row gap-2">
                  <ActionButton
                    variant="outline"
                    size="sm"
                    onPress={takePhoto}
                    title="Take Photo"
                  />
                  <ActionButton
                    variant="outline"
                    size="sm"
                    onPress={pickImage}
                    title="Gallery"
                  />
                </View>
              </View>
            </View>
          )}
        </View>
      </Animated.View>

      {/* Continue Button - Fixed position with skeleton */}
      <Animated.View entering={SlideInDown.delay(1200).springify()} className="mb-6">
        {fetchingExisting ? (
          <SkeletonBox className="h-12 w-full" />
        ) : (
          <ActionButton
            onPress={() => {
              if (existingDocument && !selectedImage) {
                onSubmit({ documentType: existingDocument.document_type as any });
              } else {
                handleSubmit(onSubmit)();
              }
            }}
            title={loading ? 'Processing...' : continueText}
            disabled={continueDisabled}
            loading={loading}
            variant="primary"
            fullWidth={true}
            size="lg"
          />
        )}
      </Animated.View>
      </ScreenWrapper>
    </View>
  );
}
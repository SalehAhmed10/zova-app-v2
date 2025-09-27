import React, { useState } from 'react';
import { View, Alert, Image } from 'react-native';
import { router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import * as ImagePicker from 'expo-image-picker';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { ScreenWrapper } from '@/components/ui/screen-wrapper';
import { useProviderVerificationStore, useProviderVerificationHydration } from '@/stores/verification/provider-verification';
import { supabase } from '@/lib/core/supabase';
import { createStorageService } from '@/lib/storage/organized-storage';
import { useStripeVerificationIntegration } from '@/lib/payment/stripe-verification-integration';

// Helper function to get signed URL using organized storage service
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

// Helper function to check if file exists in storage
const checkDocumentFileExists = async (providerId: string, filePath: string): Promise<boolean> => {
  try {
    // Use the same logic as getDocumentSignedUrl to try both old and new paths
    await getDocumentSignedUrl(providerId, filePath);
    return true;
  } catch (error) {
    console.error('Error checking file existence:', error);
    return false;
  }
};

interface DocumentForm {
  documentType: 'passport' | 'driving_license' | 'id_card';
}

interface DocumentUploadContentProps {
  providerId: string;
  fetchingExisting: boolean;
  existingDocument: {
    document_type: string;
    document_url: string;
    verification_status: string;
    created_at: string;
  } | null;
  selectedImage: string | null;
  onReplaceDocument: () => void;
  onRemoveImage: () => void;
  onTakePhoto: () => void;
  onPickImage: () => void;
  onContinue: () => void;
  continueDisabled: boolean;
  continueLoading: boolean;
  continueText: string;
  onUpdateExistingDocument?: (document: {
    document_type: string;
    document_url: string;
    verification_status: string;
    created_at: string;
  }) => void;
  handleSubmit?: (onSubmit: (data: any) => void) => () => void;
  onSubmit?: (data: any) => void;
}

const DocumentUploadContent: React.FC<DocumentUploadContentProps> = ({
  providerId,
  fetchingExisting,
  existingDocument,
  selectedImage,
  onReplaceDocument,
  onRemoveImage,
  onTakePhoto,
  onPickImage,
  onContinue,
  continueDisabled,
  continueLoading,
  continueText,
  onUpdateExistingDocument,
  handleSubmit,
  onSubmit,
}) => {
  console.log('DocumentUploadContent render:', {
    fetchingExisting,
    hasExistingDocument: !!existingDocument,
    verificationStatus: existingDocument?.verification_status,
    selectedImage: !!selectedImage,
    continueDisabled,
    continueText
  });
  const [imageLoadError, setImageLoadError] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const containerHeight = 200;
  const handleImageError = (error: any) => {
    console.error('Existing document image load error:', error);
    console.error('Failed URL:', existingDocument?.document_url);
    setImageLoadError(true);
  };

  const { handleProviderVerificationComplete } = useStripeVerificationIntegration();

  const handleRetryImage = async () => {
    if (!existingDocument || retryCount >= 2) return;

    setIsRetrying(true);
    setRetryCount(prev => prev + 1);

    try {
      // Try to get a fresh signed URL
      const freshSignedUrl = await getDocumentSignedUrl(providerId, existingDocument.document_url);
      
      // Update the document with fresh URL
      if (onUpdateExistingDocument) {
        onUpdateExistingDocument({
          ...existingDocument,
          document_url: freshSignedUrl
        });
      }
      
      // Reset error state to trigger reload
      setImageLoadError(false);
    } catch (error) {
      console.error('Failed to retry image load:', error);
    } finally {
      setIsRetrying(false);
    }
  };
  
  if (fetchingExisting) {
    return (
      <View className="border-2 border-dashed border-border rounded-lg p-8 items-center bg-muted/20" style={{ minHeight: containerHeight }}>
        <Text className="text-muted-foreground">Loading existing documents...</Text>
      </View>
    );
  }

  if (existingDocument) {
    return (
      <View style={{ minHeight: containerHeight }}>
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
            <Image
              source={{ uri: existingDocument.document_url }}
              className="w-full h-full"
              resizeMode="cover"
              onError={(error) => {
                console.error('Existing document image load error:', error);
                console.error('Failed URL:', existingDocument.document_url);
                setImageLoadError(true);
              }}
              onLoad={() => {
                console.log('Existing document image loaded successfully:', existingDocument.document_url);
                setImageLoadError(false);
              }}
              onLoadStart={() => {
                console.log('Existing document image load started:', existingDocument.document_url);
              }}
            />
          ) : (
            <View className="w-full h-full items-center justify-center bg-muted">
              <Text className="text-4xl mb-2">📄</Text>
              <Text className="text-muted-foreground text-center px-4">
                Document uploaded but preview unavailable
              </Text>
              <Text className="text-xs text-muted-foreground mt-2">
                {existingDocument.document_type.replace('_', ' ').toUpperCase()}
              </Text>
            </View>
          )}
        </View>

        <View className="flex-row gap-2 mb-4">
          <Button
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
                    onPress: onReplaceDocument,
                  },
                ]
              );
            }}
            className="flex-1"
          >
            <Text className="text-sm font-medium">Replace</Text>
          </Button>

          {existingDocument.verification_status === 'pending' && (
            <Button
              variant="default"
              size="sm"
              onPress={() => {
                Alert.alert(
                  'Document Status',
                  'Your document is currently under review by our admin team. You will be notified once the verification is complete.'
                );
              }}
              className="flex-1"
            >
              <Text className="text-sm font-medium">Check Status</Text>
            </Button>
          )}
        </View>

        {/* Continue Button */}
        <Button
          size="lg"
          onPress={() => {
            console.log('Continue button pressed in DocumentUploadContent');
            console.log('existingDocument:', !!existingDocument);
            console.log('selectedImage:', !!selectedImage);
            
            // If we have an existing document and no new selection, call onContinue directly
            if (existingDocument && !selectedImage) {
              console.log('Calling onContinue directly for existing document');
              onContinue();
            } else if (handleSubmit && onSubmit) {
              console.log('Calling handleSubmit(onSubmit) for new upload');
              handleSubmit(onSubmit)();
            } else {
              console.log('Fallback: calling onContinue');
              onContinue();
            }
          }}
          disabled={continueDisabled}
          className="w-full"
        >
          <Text className="font-semibold">
            {continueLoading ? 'Processing...' : continueText}
          </Text>
        </Button>
      </View>
    );
  }

  if (selectedImage) {
    console.log('Rendering selected image:', selectedImage);
    return (
      <View style={{ minHeight: containerHeight }}>
        <View className="w-full h-48 rounded-lg bg-muted mb-4 overflow-hidden border-2 border-border">
          <Image
            source={{ uri: selectedImage }}
            className="w-full h-full"
            resizeMode="cover"
            onError={(error) => {
              console.error('Image load error:', error);
              console.error('Failed URI:', selectedImage);
            }}
            onLoad={() => {
              console.log('Image loaded successfully:', selectedImage);
            }}
            onLoadStart={() => {
              console.log('Image load started:', selectedImage);
            }}
          />
        </View>
   
        <View className="flex-row gap-2">
          <Button
            variant="outline"
            size="sm"
            onPress={onRemoveImage}
            className="flex-1"
          >
            <Text>Remove Image</Text>
          </Button>
          <Button
            variant="default"
            size="sm"
            onPress={onContinue}
            disabled={continueDisabled || continueLoading}
            className="flex-1"
          >
            <Text className="text-sm font-medium">
              {continueLoading ? 'Uploading...' : continueText}
            </Text>
          </Button>
        </View>
      </View>
    );
  }

  return (
    <View className="border-2 border-dashed border-border rounded-lg p-8 items-center bg-muted/20" style={{ minHeight: containerHeight }}>
      <Text className="text-4xl mb-2">📄</Text>
      <Text className="text-foreground font-medium mb-2">
        Upload Your Document
      </Text>
      <Text className="text-muted-foreground text-center mb-4">
        Take a clear photo or select from gallery
      </Text>

      <View className="flex-row">
        <Button
          variant="outline"
          size="sm"
          onPress={onTakePhoto}
          className="flex-1 mr-2"
        >
          <Text>Take Photo</Text>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onPress={onPickImage}
          className="flex-1"
        >
          <Text>Gallery</Text>
        </Button>
      </View>
    </View>
  );
};export default function DocumentVerificationScreen() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const queryClient = useQueryClient();
  
  const { 
    documentData, 
    updateDocumentData, 
    completeStep, 
    completeStepAndNext,
    nextStep,
    providerId,
    currentStep
  } = useProviderVerificationStore();

  const isHydrated = useProviderVerificationHydration();
  const { handleProviderVerificationComplete } = useStripeVerificationIntegration();

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

      if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
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
        // File doesn't exist in storage, clean up the database record
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
        // Still return the document but with original URL as fallback
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

  // ✅ REACT QUERY: Document upload mutation
  const uploadDocumentMutation = useMutation({
    mutationFn: async ({ image, documentType }: { image: any; documentType: string }) => {
      console.log('[DocumentUpload] Starting document upload for provider:', providerId);
      console.log('[DocumentUpload] Document type:', documentType);
      console.log('[DocumentUpload] Image details:', {
        uri: image.uri,
        type: image.type,
        fileName: image.fileName
      });

      if (!providerId) {
        throw new Error('Provider ID is required for document upload');
      }

      const storage = createStorageService(providerId);
      
      // Create a consistent filename
      const timestamp = new Date().getTime();
      const fileName = `${documentType.toLowerCase()}_${timestamp}.jpg`;
      const storagePath = `${providerId}/documents/${fileName}`;
      
      console.log('[DocumentUpload] Storage path:', storagePath);
      
      // Upload to storage
      const uploadResult = await storage.uploadIdentityDocument(
        image.uri, 
        documentType.toLowerCase() as any,
        timestamp
      );
      console.log('[DocumentUpload] Storage upload result:', uploadResult);
      
      if (!uploadResult.success) {
        throw new Error(uploadResult.error || 'Failed to upload document to storage');
      }

      const actualStoragePath = uploadResult.filePath || `${providerId}/documents/${documentType.toLowerCase()}_${timestamp}.jpg`;

      // Save to database
      const { data, error } = await supabase
        .from('provider_verification_documents')
        .upsert(
          {
            provider_id: providerId,
            document_type: documentType,
            document_url: actualStoragePath,
            verification_status: 'pending',
            uploaded_at: new Date().toISOString()
          },
          { onConflict: 'provider_id' }
        )
        .select()
        .single();

      if (error) {
        console.error('[DocumentUpload] Database save error:', error);
        throw error;
      }

      console.log('[DocumentUpload] Document uploaded successfully:', data);
      
      // Update store
      updateDocumentData({
        documentType: documentType as any,
        documentUrl: actualStoragePath,
        verificationStatus: 'pending',
      });

      return {
        ...data,
        document_url: actualStoragePath
      };
    },
    onSuccess: (data) => {
      console.log('[DocumentUpload] Upload successful:', data);
      // Invalidate queries to refetch data
      queryClient.invalidateQueries({ queryKey: ['existingDocument', providerId] });
    },
    onError: (error) => {
      console.error('[DocumentUpload] Upload failed:', error);
    },
  });

  // ✅ REACT QUERY: Document submission mutation
  const submitDocumentMutation = useMutation({
    mutationFn: async (formData: any) => {
      console.log('[DocumentSubmission] Starting document submission for provider:', providerId);
      
      if (!providerId) {
        throw new Error('Provider ID is required for document submission');
      }

      const documentType = formData.documentType;
      const selectedImage = formData.selectedImage;
      
      console.log('[DocumentSubmission] Document type:', documentType);
      console.log('[DocumentSubmission] Selected image:', selectedImage ? 'Yes' : 'No');
      console.log('[DocumentSubmission] Existing document:', existingDocument ? 'Yes' : 'No');

      let documentData = existingDocument;
      
      // Upload new document if image is selected
      if (selectedImage) {
        console.log('[DocumentSubmission] Uploading new document...');
        documentData = await uploadDocumentMutation.mutateAsync({
          image: selectedImage,
          documentType
        });
      }

      if (!documentData) {
        throw new Error('No document available for submission');
      }

      // Update profile verification status
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          verification_status: 'pending',
          is_verified: false,
        })
        .eq('id', providerId);

      if (profileError) {
        console.error('[DocumentSubmission] Profile update error:', profileError);
        // Don't throw here as document was saved successfully
      }

      // Complete verification step
      const { data: verificationData, error: verificationError } = await supabase
        .from('provider_verification_status')
        .upsert(
          {
            provider_id: providerId,
            documents_verified: true,
            updated_at: new Date().toISOString()
          },
          { onConflict: 'provider_id' }
        )
        .select()
        .single();

      if (verificationError) {
        console.error('[DocumentSubmission] Verification update error:', verificationError);
        throw verificationError;
      }

      console.log('[DocumentSubmission] Verification updated successfully:', verificationData);
      
      // Update store with completion
      updateDocumentData({
        documentType: documentType as any,
        documentUrl: documentData.document_url,
        verificationStatus: 'pending',
      });
      
      return {
        document: documentData,
        verification: verificationData,
        profile: { updated: !profileError }
      };
    },
    onSuccess: async (data) => {
      console.log('[DocumentSubmission] Submission successful:', data);
      
      // Complete step and move to next
      completeStepAndNext(1, { 
        documentType: data.document.document_type, 
        documentUrl: data.document.document_url 
      });
      
      // 🔗 Integrate with Stripe verification (PROVIDERS ONLY - NOT FOR CUSTOMERS)
      // This automatically uploads provider documents to Stripe for payment compliance
      // Customers have a simple booking experience without complex verification
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
          // Don't fail the verification - this is additional integration
        }
      } catch (stripeError) {
        console.log('⚠️ [Stripe Integration] Exception during Stripe upload:', stripeError);
        // Don't fail the verification - this is additional integration
      }
      
      // Show success alert
      Alert.alert(
        'Document Uploaded',
        'Your document has been uploaded successfully and is pending verification.',
        [
          {
            text: 'Continue',
            onPress: () => {
              // Navigation already handled by completeStepAndNext above
              console.log('[DocumentSubmission] Document upload confirmation acknowledged');
            },
          },
        ]
      );
      
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['existingDocument', providerId] });
      queryClient.invalidateQueries({ queryKey: ['providerVerificationStatus', providerId] });
    },
    onError: (error) => {
      console.error('[DocumentSubmission] Submission failed:', error);
      Alert.alert('Upload Failed', 'Failed to upload document. Please try again.');
    },
  });

  // ✅ REACT QUERY: Delete existing document mutation
  const deleteDocumentMutation = useMutation({
    mutationFn: async (documentUrl: string) => {
      console.log('[DocumentDelete] Deleting document:', documentUrl);
      
      if (!providerId) {
        throw new Error('Provider ID is required');
      }

      // Delete from storage - for identity documents, we need to manually delete using file path
      const { error: storageError } = await supabase.storage
        .from('verification-documents')
        .remove([documentUrl]);

      if (storageError) {
        console.warn('[DocumentDelete] Storage delete warning:', storageError);
        // Don't throw here as the file might already be deleted
      }

      // Delete from database
      const { error } = await supabase
        .from('provider_verification_documents')
        .delete()
        .eq('provider_id', providerId)
        .eq('document_url', documentUrl);

      if (error) {
        console.error('[DocumentDelete] Database delete error:', error);
        throw error;
      }

      console.log('[DocumentDelete] Document deleted successfully');
      return true;
    },
    onSuccess: () => {
      console.log('[DocumentDelete] Delete successful');
      // Invalidate queries to refetch data
      queryClient.invalidateQueries({ queryKey: ['existingDocument', providerId] });
      
      // Clear store data
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

  // Derived loading state
  const loading = uploadDocumentMutation.isPending || submitDocumentMutation.isPending || deleteDocumentMutation.isPending;

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

  console.log('DocumentVerificationScreen render:', {
    currentStep,
    existingDocument: !!existingDocument,
    selectedImage: !!selectedImage,
    isValid,
    loading,
    fetchingExisting
  });

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
        allowsEditing: true,
        aspect: [16, 10],
        quality: 0.8,
        base64: false,
      });

      if (!result.canceled && result.assets[0]) {
        console.log('Image selected from gallery:', result.assets[0]);
        console.log('Image URI:', result.assets[0].uri);
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
        console.log('Photo taken:', result.assets[0]);
        console.log('Photo URI:', result.assets[0].uri);
        setSelectedImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  const uploadDocument = async (uri: string, documentType: string) => {
    if (!providerId) {
      throw new Error('Provider ID not found. Please try logging in again.');
    }

    // Create organized storage service
    const storageService = createStorageService(providerId);

    // Validate file type by extension
    const fileExtension = uri.split('.').pop()?.toLowerCase() || '';
    const validExtensions = ['jpg', 'jpeg', 'png', 'pdf'];
    if (!validExtensions.includes(fileExtension)) {
      throw new Error('Invalid file type. Please upload a JPG, PNG, or PDF file.');
    }

    // Upload using organized storage service
    const result = await storageService.uploadIdentityDocument(
      uri,
      documentType as 'passport' | 'driving_license' | 'id_card',
      Date.now()
    );

    if (!result.success) {
      throw new Error(result.error || 'Failed to upload document');
    }

    return result.filePath || result.url!; // Return file path for signed URL generation
  };

  const onSubmit = (data: DocumentForm) => {
    console.log('[DocumentSubmission] onSubmit called with data:', data);
    console.log('[DocumentSubmission] existingDocument:', existingDocument);
    console.log('[DocumentSubmission] selectedImage:', selectedImage);
    
    // Check if we have an image to upload (either new selection or existing)
    if (!selectedImage && !existingDocument) {
      console.log('[DocumentSubmission] No document available, showing alert');
      Alert.alert('Document Required', 'Please upload your document before continuing.');
      return;
    }

    // If we have an existing document and no new selection, just proceed
    if (existingDocument && !selectedImage) {
      console.log('[DocumentSubmission] Using existing document, completing step');
      completeStepAndNext(1, { 
        documentType: existingDocument.document_type, 
        documentUrl: existingDocument.document_url 
      });
      return;
    }

    // Submit with React Query mutation
    submitDocumentMutation.mutate({
      ...data,
      selectedImage
    });
  };

  // Navigation state
  const canGoBack = currentStep > 1;
  const previousStep = () => {
    console.log('[Navigation] Going back to previous step');
    router.back();
  };

  const currentDocumentInfo = getDocumentTypeInfo(documentType);

  return (
    <ScreenWrapper scrollable={true} contentContainerClassName="px-6 py-4">
      {/* Header */}
      <Animated.View
        entering={FadeIn.delay(200).springify()}
        className="items-center mb-12"
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
      <Animated.View entering={SlideInDown.delay(600).springify()} className="mb-8">
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
      <Animated.View entering={SlideInDown.delay(800).springify()} className="mb-8">
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
      <Animated.View entering={SlideInDown.delay(1000).springify()}>
        <Text className="text-sm font-medium text-foreground mb-3">
          Document Image
        </Text>

        <DocumentUploadContent
          providerId={providerId}
          fetchingExisting={fetchingExisting}
          existingDocument={existingDocument}
          selectedImage={selectedImage}
          onReplaceDocument={() => {
            console.log('[DocumentReplace] Replacing document');
            if (existingDocument) {
              deleteDocumentMutation.mutate(existingDocument.document_url);
            }
            setSelectedImage(null);
          }}
          onRemoveImage={() => {
            console.log('Removing selected image');
            setSelectedImage(null);
          }}
          onTakePhoto={takePhoto}
          onPickImage={pickImage}
          onContinue={() => {
            console.log('Continue button pressed, checking conditions');
            console.log('existingDocument:', !!existingDocument);
            console.log('selectedImage:', !!selectedImage);
            console.log('isValid:', isValid);
            
            // If we have an existing document and no new selection, skip form validation
            if (existingDocument && !selectedImage) {
              console.log('Using existing document, calling onSubmit directly');
              onSubmit({ documentType: existingDocument.document_type as any });
            } else {
              console.log('Using form validation, calling handleSubmit');
              handleSubmit(onSubmit)();
            }
          }}
          continueDisabled={(() => {
            const disabled = (!isValid || (!selectedImage && !existingDocument) || loading || fetchingExisting);
            console.log('Continue button state:', {
              isValid,
              selectedImage: !!selectedImage,
              existingDocument: !!existingDocument,
              loading,
              fetchingExisting,
              disabled
            });
            return disabled;
          })()}
          continueLoading={loading}
          continueText={existingDocument && !selectedImage ? 'Use Existing' : 'Continue to Identity'}
          handleSubmit={handleSubmit}
          onSubmit={onSubmit}
        />
      </Animated.View>

      {/* Back Button - only show if not first step */}
      {canGoBack && (
        <Animated.View entering={SlideInDown.delay(1400).springify()} className="mt-6">
          <Button
            variant="outline"
            size="lg"
            onPress={previousStep}
            className="w-full"
          >
            <Text>Go Back</Text>
          </Button>
        </Animated.View>
      )}
    </ScreenWrapper>
  );
}
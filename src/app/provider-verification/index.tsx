import React, { useState, useEffect } from 'react';
import { View, Alert, Image } from 'react-native';
import { router } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import * as ImagePicker from 'expo-image-picker';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { ScreenWrapper } from '@/components/ui/screen-wrapper';
import { useProviderVerificationStore, useProviderVerificationSelectors, useProviderVerificationHydration } from '@/stores/verification/provider-verification';
import { supabase } from '@/lib/core/supabase';
import { createStorageService } from '@/lib/storage/organized-storage';
import { testStorageBuckets } from '@/utils/storage-test';
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
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [existingDocument, setExistingDocument] = useState<{
    document_type: string;
    document_url: string;
    verification_status: string;
    created_at: string;
  } | null>(null);
  const [fetchingExisting, setFetchingExisting] = useState(true);
  
  const { 
    documentData, 
    updateDocumentData, 
    completeStep, 
    completeStepAndNext,
    nextStep,
    providerId,
    currentStep
  } = useProviderVerificationStore();

  const { canGoBack, previousStep } = useProviderVerificationSelectors();
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

  // Fetch existing verification documents
  useEffect(() => {
    const fetchExistingDocument = async () => {
      if (!providerId || !isHydrated) return;

      try {
        setFetchingExisting(true);
        const { data, error } = await supabase
          .from('provider_verification_documents')
          .select('document_type, document_url, verification_status, created_at')
          .eq('provider_id', providerId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
          console.error('Error fetching existing document:', error);
          return;
        }

        if (data) {
          // Check if the file actually exists in storage
          const fileExists = await checkDocumentFileExists(providerId, data.document_url);
          
          if (fileExists) {
            try {
              // Get a signed URL for the document
              const signedUrl = await getDocumentSignedUrl(providerId, data.document_url);
              setExistingDocument({
                ...data,
                document_url: signedUrl
              });
              // Update store with existing data
              updateDocumentData({
                documentType: data.document_type as any,
                documentUrl: signedUrl,
                verificationStatus: data.verification_status as any,
              });
            } catch (signedUrlError) {
              console.error('Failed to get signed URL for document:', signedUrlError);
              // Still set the document but with original URL as fallback
              setExistingDocument(data);
              updateDocumentData({
                documentType: data.document_type as any,
                documentUrl: data.document_url,
                verificationStatus: data.verification_status as any,
              });
            }
          } else {
            // File doesn't exist in storage, clean up the database record
            console.log('Document file not found in storage, cleaning up database record');
            const { error: deleteError } = await supabase
              .from('provider_verification_documents')
              .delete()
              .eq('provider_id', providerId)
              .eq('document_url', data.document_url);

            if (deleteError) {
              console.error('Error cleaning up orphaned document record:', deleteError);
            }
            // Don't set existingDocument, so it shows upload interface
          }
        }
      } catch (error) {
        console.error('Error fetching existing document:', error);
      } finally {
        setFetchingExisting(false);
      }
    };

    fetchExistingDocument();
  }, [providerId, isHydrated, updateDocumentData]);

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

  const onSubmit = async (data: DocumentForm) => {
    console.log('onSubmit called with data:', data);
    console.log('existingDocument:', existingDocument);
    console.log('selectedImage:', selectedImage);
    
    // Check if we have an image to upload (either new selection or existing)
    if (!selectedImage && !existingDocument) {
      console.log('No document available, showing alert');
      Alert.alert('Document Required', 'Please upload your document before continuing.');
      return;
    }

    // If we have an existing document and no new selection, just proceed
    if (existingDocument && !selectedImage) {
      console.log('Using existing document, updating profile and completing step');
      
      // Update profile verification status if needed
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          verification_status: 'pending',
          is_verified: false,
        })
        .eq('id', providerId);

      if (profileError) {
        console.error('Profile update error:', profileError);
      }

      // Mark step as completed and move to next in one atomic operation
      console.log('Step 1 completed with existing document, proceeding to next step');
      completeStepAndNext(1, { 
        documentType: existingDocument.document_type, 
        documentUrl: existingDocument.document_url 
      });
      return;
    }

    setLoading(true);
    try {
      // Upload document to storage
      const documentUrl = await uploadDocument(selectedImage!, data.documentType);
      
      // Update verification store
      updateDocumentData({
        documentType: data.documentType,
        documentUrl,
        verificationStatus: 'pending',
      });

      // Save to database (delete existing, then insert new)
      // First delete any existing document for this provider
      const { error: deleteError } = await supabase
        .from('provider_verification_documents')
        .delete()
        .eq('provider_id', providerId);

      if (deleteError) {
        console.error('Delete existing document error:', deleteError);
        // Continue with insert even if delete fails
      }

      // Then insert the new document
      const { error: dbError } = await supabase
        .from('provider_verification_documents')
        .insert({
          provider_id: providerId,
          document_type: data.documentType,
          document_url: documentUrl,
          verification_status: 'pending',
        });

      if (dbError) {
        console.error('Database error:', dbError);
        throw new Error('Failed to save document information');
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
        console.error('Profile update error:', profileError);
        // Don't throw here as document was saved successfully
      }

      // Mark step as completed and move to next in one atomic operation
      completeStepAndNext(1, { documentType: data.documentType, documentUrl });
      
      // 🔗 Integrate with Stripe verification (PROVIDERS ONLY - NOT FOR CUSTOMERS)
      // This automatically uploads provider documents to Stripe for payment compliance
      // Customers have a simple booking experience without complex verification
      try {
        console.log('🔗 [Stripe Integration] Uploading provider document to Stripe for payment compliance...');
        const stripeResult = await handleProviderVerificationComplete(providerId, {
          documentType: data.documentType,
          documentUrl
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
      
      // Refetch existing document to update UI
      const { data: refetchData, error: refetchError } = await supabase
        .from('provider_verification_documents')
        .select('document_type, document_url, verification_status, created_at')
        .eq('provider_id', providerId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!refetchError && refetchData) {
        // Get a signed URL for the newly uploaded document
        const signedUrl = await getDocumentSignedUrl(providerId, refetchData.document_url);
        setExistingDocument({
          ...refetchData,
          document_url: signedUrl
        });
        updateDocumentData({
          documentType: refetchData.document_type as any,
          documentUrl: signedUrl,
          verificationStatus: refetchData.verification_status as any,
        });
      }
      
      Alert.alert(
        'Document Uploaded',
        'Your document has been uploaded successfully and is pending verification.',
        [
          {
            text: 'Continue',
            onPress: () => {
              // Navigation already handled by completeStepAndNext above
              console.log('Document upload confirmation acknowledged');
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
            console.log('Replacing document');
            setExistingDocument(null);
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
          onUpdateExistingDocument={setExistingDocument}
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
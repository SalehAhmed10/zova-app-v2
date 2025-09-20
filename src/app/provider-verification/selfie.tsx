import React, { useState } from 'react';
import { View, Alert, Image } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import * as ImagePicker from 'expo-image-picker';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { ScreenWrapper } from '@/components/ui/screen-wrapper';
import { useProviderVerificationStore } from '@/stores/provider-verification';

export default function SelfieVerificationScreen() {
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  const { 
    selfieData, 
    updateSelfieData, 
    completeStep, 
    nextStep,
    previousStep 
  } = useProviderVerificationStore();

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
        setSelectedImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error taking selfie:', error);
      Alert.alert('Error', 'Failed to take selfie. Please try again.');
    }
  };

  const uploadSelfie = async (uri: string) => {
    // TODO: Implement Supabase storage upload
    // For now, return the local URI
    return uri;
  };

  const handleSubmit = async () => {
    if (!selectedImage) {
      Alert.alert('Selfie Required', 'Please take a selfie before continuing.');
      return;
    }

    setLoading(true);
    try {
      // Upload selfie to storage
      const selfieUrl = await uploadSelfie(selectedImage);
      
      // Update verification store
      updateSelfieData({
        selfieUrl,
        verificationStatus: 'pending',
      });

      // TODO: Save to database
      // await saveSelfieToDatabase(providerId, selfieUrl);

      // Mark step as completed and move to next
      completeStep(2, { selfieUrl });
      
      Alert.alert(
        'Selfie Uploaded',
        'Your selfie has been uploaded successfully and is pending verification.',
        [
          {
            text: 'Continue',
            onPress: () => {
              nextStep();
              router.push('/provider-verification/business-info' as any);
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
    <ScreenWrapper scrollable={true} contentContainerClassName="px-6 py-4">
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
        
        {selectedImage ? (
          <View className="items-center mb-4">
            <Image 
              source={{ uri: selectedImage }} 
              className="w-64 h-64 rounded-full bg-muted border-4 border-primary"
              resizeMode="cover"
            />
            <Button
              variant="outline"
              size="sm"
              onPress={() => setSelectedImage(null)}
              className="mt-4"
            >
              <Text>Retake Selfie</Text>
            </Button>
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
          disabled={!selectedImage || loading}
          className="w-full"
        >
          <Text className="font-semibold text-primary-foreground">
            {loading ? 'Uploading...' : 'Continue to Business Information'}
          </Text>
        </Button>
      </Animated.View>

      {/* Back Button */}
      <Animated.View entering={SlideInDown.delay(1200).springify()}>
        <Button
          variant="outline"
          size="lg"
          onPress={() => {
            previousStep();
            router.back();
          }}
          className="w-full"
        >
          <Text>Back to Document Upload</Text>
        </Button>
      </Animated.View>
    </ScreenWrapper>
  );
}
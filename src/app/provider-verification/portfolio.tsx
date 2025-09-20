import React, { useState } from 'react';
import { View, Alert, Image, Pressable } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import * as ImagePicker from 'expo-image-picker';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { ScreenWrapper } from '@/components/ui/screen-wrapper';
import { useProviderVerificationStore } from '@/stores/provider-verification';

export default function PortfolioUploadScreen() {
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  
  const { 
    portfolioData, 
    updatePortfolioData, 
    completeStep, 
    nextStep,
    previousStep 
  } = useProviderVerificationStore();

  const pickImages = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'We need access to your photos to upload portfolio images.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 10],
        quality: 0.8,
        allowsMultipleSelection: true,
      });

      if (!result.canceled && result.assets) {
        const newImages = result.assets.map(asset => asset.uri);
        const totalImages = selectedImages.length + newImages.length;
        
        if (totalImages > portfolioData.maxImages) {
          Alert.alert('Too many images', `You can only upload up to ${portfolioData.maxImages} images.`);
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
    if (selectedImages.length === 0) {
      Alert.alert('Portfolio Required', 'Please upload at least one portfolio image.');
      return;
    }

    setLoading(true);
    try {
      // Update verification store
      const portfolioImages = selectedImages.map((url, index) => ({
        id: `temp_${index}`,
        url,
        sortOrder: index,
      }));

      updatePortfolioData({ images: portfolioImages });
      completeStep(6, { images: portfolioImages });
      
      nextStep();
      router.push('/provider-verification/bio' as any);
    } catch (error) {
      console.error('Error saving portfolio:', error);
      Alert.alert('Save Failed', 'Failed to save portfolio. Please try again.');
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

      {/* Image Selection */}
      <Animated.View entering={SlideInDown.delay(400).springify()} className="mb-6">
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-sm font-medium text-foreground">
            Portfolio Images ({selectedImages.length}/{portfolioData.maxImages})
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
          disabled={selectedImages.length === 0 || loading}
          className="w-full"
        >
          <Text className="font-semibold text-primary-foreground">
            {loading ? 'Saving...' : 'Continue to Business Bio'}
          </Text>
        </Button>
      </Animated.View>

      {/* Back Button */}
      <Animated.View entering={SlideInDown.delay(1000).springify()}>
        <Button
          variant="outline"
          size="lg"
          onPress={() => {
            previousStep();
            router.back();
          }}
          className="w-full"
        >
          <Text>Back to Services</Text>
        </Button>
      </Animated.View>
    </ScreenWrapper>
  );
}
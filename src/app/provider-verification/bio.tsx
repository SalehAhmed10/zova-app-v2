import React, { useState } from 'react';
import { View, Alert } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScreenWrapper } from '@/components/ui/screen-wrapper';
import { useProviderVerificationStore } from '@/stores/provider-verification';

export default function BusinessBioScreen() {
  const [formData, setFormData] = useState({
    businessDescription: '',
    yearsOfExperience: '',
  });
  const [loading, setLoading] = useState(false);
  
  const { 
    bioData,
    updateBioData,
    completeStep,
    nextStep,
    previousStep 
  } = useProviderVerificationStore();

  // Initialize form with existing data
  React.useEffect(() => {
    if (bioData) {
      setFormData({
        businessDescription: bioData.businessDescription || '',
        yearsOfExperience: bioData.yearsOfExperience?.toString() || '',
      });
    }
  }, [bioData]);

  const validateForm = () => {
    if (!formData.businessDescription.trim()) {
      Alert.alert('Description Required', 'Please write a brief description about your business.');
      return false;
    }
    if (formData.businessDescription.length < 50) {
      Alert.alert('Description Too Short', 'Your business description should be at least 50 characters long.');
      return false;
    }
    if (formData.businessDescription.length > bioData.maxDescriptionLength) {
      Alert.alert('Description Too Long', `Your description should be no more than ${bioData.maxDescriptionLength} characters.`);
      return false;
    }
    if (!formData.yearsOfExperience.trim()) {
      Alert.alert('Experience Required', 'Please enter your years of experience.');
      return false;
    }
    const years = parseInt(formData.yearsOfExperience);
    if (isNaN(years) || years < 0 || years > 50) {
      Alert.alert('Invalid Experience', 'Please enter a valid number of years (0-50).');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      // Update verification store
      const data = {
        businessDescription: formData.businessDescription.trim(),
        yearsOfExperience: parseInt(formData.yearsOfExperience),
      };
      
      updateBioData(data);
      completeStep(7, data);
      
      nextStep();
      router.push('/provider-verification/terms' as any);
    } catch (error) {
      console.error('Error saving bio:', error);
      Alert.alert('Save Failed', 'Failed to save your information. Please try again.');
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
          <Text className="text-2xl">✍️</Text>
        </View>
        <Text className="text-2xl font-bold text-foreground mb-2">
          Tell Your Story
        </Text>
        <Text className="text-base text-muted-foreground text-center">
          Help customers understand your business and experience
        </Text>
      </Animated.View>

      {/* Form */}
      <Animated.View entering={SlideInDown.delay(400).springify()} className="space-y-6">
        {/* Business Description */}
        <View>
          <Text className="text-sm font-medium text-foreground mb-2">
            Business Description *
          </Text>
          <Input
            placeholder="Tell customers about your business, your approach to service, and what makes you unique..."
            value={formData.businessDescription}
            onChangeText={(text) => setFormData(prev => ({ ...prev, businessDescription: text }))}
            multiline
            numberOfLines={6}
            maxLength={bioData.maxDescriptionLength}
            className="min-h-[120px] text-top"
          />
          <Text className="text-xs text-muted-foreground mt-1">
            {formData.businessDescription.length}/{bioData.maxDescriptionLength} characters (minimum 50)
          </Text>
        </View>

        {/* Years of Experience */}
        <View>
          <Text className="text-sm font-medium text-foreground mb-2">
            Years of Experience *
          </Text>
          <Input
            placeholder="Enter your years of professional experience"
            value={formData.yearsOfExperience}
            onChangeText={(text) => {
              // Only allow numbers
              const numericText = text.replace(/[^0-9]/g, '');
              setFormData(prev => ({ ...prev, yearsOfExperience: numericText }));
            }}
            keyboardType="numeric"
            maxLength={2}
          />
          <Text className="text-xs text-muted-foreground mt-1">
            Enter a number from 0 to 50
          </Text>
        </View>
      </Animated.View>

      {/* Tips */}
      <Animated.View entering={SlideInDown.delay(600).springify()} className="my-6">
        <View className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <Text className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
            💡 Writing Tips
          </Text>
          <View className="space-y-1">
            <Text className="text-blue-800 dark:text-blue-200 text-sm">
              • Be authentic and professional - customers want to trust you
            </Text>
            <Text className="text-blue-800 dark:text-blue-200 text-sm">
              • Highlight what makes your business unique
            </Text>
            <Text className="text-blue-800 dark:text-blue-200 text-sm">
              • Mention any certifications or special training
            </Text>
            <Text className="text-blue-800 dark:text-blue-200 text-sm">
              • Focus on customer benefits and quality service
            </Text>
          </View>
        </View>
      </Animated.View>

      {/* Continue Button */}
      <Animated.View entering={SlideInDown.delay(800).springify()} className="mb-4">
        <Button
          size="lg"
          onPress={handleSubmit}
          disabled={loading || !formData.businessDescription.trim() || !formData.yearsOfExperience.trim()}
          className="w-full"
        >
          <Text className="font-semibold text-primary-foreground">
            {loading ? 'Saving...' : 'Continue to Terms'}
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
          <Text>Back to Portfolio</Text>
        </Button>
      </Animated.View>
    </ScreenWrapper>
  );
}
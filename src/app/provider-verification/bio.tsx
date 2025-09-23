import React, { useState } from 'react';
import { View, Alert } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScreenWrapper } from '@/components/ui/screen-wrapper';
import { useProviderVerificationStore } from '@/stores/provider-verification';
import { supabase } from '@/lib/supabase';

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
        yearsOfExperience: bioData.yearsOfExperience !== null ? bioData.yearsOfExperience.toString() : '',
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
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      // Prepare data for database
      const data = {
        businessDescription: formData.businessDescription.trim(),
        yearsOfExperience: parseInt(formData.yearsOfExperience),
      };

      // Save to database
      const { error: dbError } = await supabase
        .from('profiles')
        .update({
          business_description: data.businessDescription,
          years_of_experience: data.yearsOfExperience,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (dbError) {
        console.error('Database error:', dbError);
        throw new Error('Failed to save to database');
      }

      // Update verification store
      updateBioData(data);
      completeStep(7, data);
      
      nextStep();
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
      <Animated.View entering={SlideInDown.delay(400).springify()}>
        {/* Business Description */}
        <View className="mb-6">
          <Text className="text-sm font-medium text-foreground mb-2">
            Business Description *
          </Text>
          <Textarea
            placeholder="Tell customers about your business, your approach to service, and what makes you unique..."
            value={formData.businessDescription}
            onChangeText={(text) => setFormData(prev => ({ ...prev, businessDescription: text }))}
            numberOfLines={6}
            maxLength={bioData.maxDescriptionLength}
            className="min-h-[120px] placeholder:text-muted-foreground"
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
            placeholder="Years of experience"
            value={formData.yearsOfExperience}
            onChangeText={(text) => {
              // Only allow numbers
              const numericText = text.replace(/[^0-9]/g, '');
              setFormData(prev => ({ ...prev, yearsOfExperience: numericText }));
            }}
            keyboardType="numeric"
            maxLength={2}
            className="placeholder:text-muted-foreground"
          />
          <Text className="text-xs text-muted-foreground mt-1">
            Enter a number from 0 to 50
          </Text>
        </View>
      </Animated.View>

      {/* Tips */}
      <Animated.View entering={SlideInDown.delay(600).springify()} className="my-6">
        <View className="p-4 bg-accent/50 rounded-lg border border-accent">
          <Text className="font-semibold text-accent-foreground mb-2">
            💡 Writing Tips
          </Text>
          <View>
            <Text className="text-accent-foreground text-sm mb-1">
              • Be authentic and professional - customers want to trust you
            </Text>
            <Text className="text-accent-foreground text-sm mb-1">
              • Highlight what makes your business unique
            </Text>
            <Text className="text-accent-foreground text-sm mb-1">
              • Mention any certifications or special training
            </Text>
            <Text className="text-accent-foreground text-sm">
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
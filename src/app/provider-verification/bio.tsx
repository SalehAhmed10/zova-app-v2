import React from 'react';
import { View, Alert } from 'react-native';
import { router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScreenWrapper } from '@/components/ui/screen-wrapper';
import { VerificationHeader } from '@/components/verification/VerificationHeader';
import { useProviderVerificationStore } from '@/stores/verification/provider-verification';
import { supabase } from '@/lib/supabase';
import { useVerificationNavigation } from '@/hooks/provider';
import { VerificationFlowManager } from '@/lib/verification/verification-flow-manager';

export default function BusinessBioScreen() {
  const queryClient = useQueryClient();
  
  const { 
    bioData,
    updateBioData,
    completeStep,
    completeStepSimple,
    previousStep,
    providerId 
  } = useProviderVerificationStore();

  // ✅ CENTRALIZED NAVIGATION: Replace manual routing
  const { navigateBack } = useVerificationNavigation();

  // ✅ REACT QUERY: Fetch existing bio data from database
  const { data: existingBioData } = useQuery({
    queryKey: ['providerBio', providerId],
    queryFn: async () => {
      if (!providerId) return null;
      
      console.log('[Bio] Fetching existing bio data from database...');
      const { data, error } = await supabase
        .from('profiles')
        .select('business_description, years_of_experience')
        .eq('id', providerId)
        .maybeSingle();
      
      if (error && error.code !== 'PGRST116') {
        console.error('[Bio] Error fetching bio data:', error);
        return null;
      }
      
      console.log('[Bio] Existing bio from database:', {
        description: data?.business_description?.substring(0, 50),
        experience: data?.years_of_experience
      });
      return data;
    },
    enabled: !!providerId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // ✅ NO useEffect! Pure computation with useMemo for data sync: Database → Store
  React.useMemo(() => {
    // Sync database → store (pure side effect during render, NOT in useEffect!)
    if (existingBioData?.business_description && !bioData.businessDescription) {
      console.log('[Bio] Syncing from database to store');
      updateBioData({
        businessDescription: existingBioData.business_description,
        yearsOfExperience: existingBioData.years_of_experience,
      });
    }
  }, [existingBioData, bioData.businessDescription, updateBioData]);

  // ✅ REACT QUERY: Bio submission mutation
  const submitBioMutation = useMutation({
    mutationFn: async (data: { businessDescription: string; yearsOfExperience: number }) => {
      console.log('[Bio] Starting bio submission for provider:', providerId);
      
      if (!providerId) {
        throw new Error('Provider ID is required');
      }

      // Save to database
      const { error: dbError } = await supabase
        .from('profiles')
        .update({
          business_description: data.businessDescription,
          years_of_experience: data.yearsOfExperience,
          updated_at: new Date().toISOString(),
        })
        .eq('id', providerId);

      if (dbError) {
        console.error('[Bio] Database error:', dbError);
        throw new Error('Failed to save to database');
      }

      // ✅ SAVE PROGRESS: Update provider_onboarding_progress table
      const { error: progressError } = await supabase
        .from('provider_onboarding_progress')
        .upsert({
          provider_id: providerId,
          current_step: 7, // Bio is step 7
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'provider_id'
        });

      if (progressError) {
        console.error('[Bio] Error saving progress:', progressError);
        // Don't throw here - progress saving failure shouldn't block the main operation
      }

      console.log('[Bio] Bio saved successfully');
      return data;
    },
    onSuccess: (data) => {
      console.log('[Bio] Submission successful:', data);
      // Update store
      updateBioData(data);
      // ✅ EXPLICIT: Complete step 7 and navigate using flow manager
      const result = VerificationFlowManager.completeStepAndNavigate(
        7, // Always step 7 for bio
        data,
        (step, stepData) => {
          // Update Zustand store
          completeStepSimple(step, stepData);
        }
      );
      
      console.log('[Bio] Navigation result:', result);
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['providerProfile', providerId] });
    },
    onError: (error) => {
      console.error('[Bio] Submission failed:', error);
      Alert.alert('Save Failed', 'Failed to save your information. Please try again.');
    },
  });

  // ✅ REACT QUERY: Form state managed by Zustand store (no local useState needed)
  const businessDescription = bioData?.businessDescription || '';
  const yearsOfExperience = bioData?.yearsOfExperience !== null ? bioData?.yearsOfExperience?.toString() || '' : '';

  // ✅ Store update handlers (replacing local setState)
  const handleBusinessDescriptionChange = (text: string) => {
    updateBioData({ businessDescription: text });
  };

  const handleYearsOfExperienceChange = (text: string) => {
    const years = parseInt(text) || null;
    updateBioData({ yearsOfExperience: years });
  };

  const validateForm = () => {
    if (!businessDescription.trim()) {
      Alert.alert('Description Required', 'Please write a brief description about your business.');
      return false;
    }
    if (businessDescription.length < 50) {
      Alert.alert('Description Too Short', 'Your business description should be at least 50 characters long.');
      return false;
    }
    if (businessDescription.length > (bioData?.maxDescriptionLength || 500)) {
      Alert.alert('Description Too Long', `Your description should be no more than ${bioData?.maxDescriptionLength || 500} characters.`);
      return false;
    }
    if (!yearsOfExperience.trim()) {
      Alert.alert('Experience Required', 'Please enter your years of experience.');
      return false;
    }
    const years = parseInt(yearsOfExperience);
    if (isNaN(years) || years < 0 || years > 50) {
      Alert.alert('Invalid Experience', 'Please enter a valid number of years (0-50).');
      return false;
    }
    return true;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;

    submitBioMutation.mutate({
      businessDescription: businessDescription.trim(),
      yearsOfExperience: parseInt(yearsOfExperience),
    });
  };

  return (
    <View className="flex-1 bg-background">
      <VerificationHeader 
        step={7} 
        title="Business Bio" 
      />
      <ScreenWrapper scrollable={true} contentContainerClassName="px-6 py-4">
      {/* Form */}
      <Animated.View entering={SlideInDown.delay(400).springify()}>
        {/* Business Description */}
        <View className="mb-6">
          <Text className="text-sm font-medium text-foreground mb-2">
            Business Description *
          </Text>
          <Textarea
            placeholder="Tell customers about your business, your approach to service, and what makes you unique..."
            value={businessDescription}
            onChangeText={handleBusinessDescriptionChange}
            numberOfLines={6}
            maxLength={bioData?.maxDescriptionLength || 500}
            className="min-h-[120px] placeholder:text-muted-foreground"
          />
          <Text className="text-xs text-muted-foreground mt-1">
            {businessDescription.length}/{bioData?.maxDescriptionLength || 500} characters (minimum 50)
          </Text>
        </View>

        {/* Years of Experience */}
        <View>
          <Text className="text-sm font-medium text-foreground mb-2">
            Years of Experience *
          </Text>
          <Input
            placeholder="Years of experience"
            value={yearsOfExperience}
            onChangeText={(text) => {
              // Only allow numbers
              const numericText = text.replace(/[^0-9]/g, '');
              handleYearsOfExperienceChange(numericText);
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
          disabled={submitBioMutation.isPending || !businessDescription.trim() || !yearsOfExperience.trim()}
          className="w-full"
        >
          <Text className="font-semibold text-primary-foreground">
            {submitBioMutation.isPending ? 'Saving...' : 'Continue to Terms'}
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
          <Text>Back to Portfolio</Text>
        </Button>
      </Animated.View>
    </ScreenWrapper>
    </View>
  );
}
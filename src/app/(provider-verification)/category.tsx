import React, { useMemo, useCallback, useState } from 'react';
import { View, Pressable, ScrollView } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { ScreenWrapper } from '@/components/ui/screen-wrapper';
import { VerificationHeader } from '@/components/verification/VerificationHeader';
import { useUpdateStepCompletion, useVerificationRealtime } from '@/hooks/provider/useVerificationSingleSource';
import { supabase } from '@/lib/supabase';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '@/stores/auth';

interface ServiceCategory {
  id: string;
  name: string;
  description: string;
  icon_url?: string;
}

// ✅ SIMPLE CATEGORY ITEM COMPONENT
const CategoryCard = React.memo(({
  category,
  isSelected,
  onPress
}: {
  category: ServiceCategory;
  isSelected: boolean;
  onPress: () => void;
}) => {
  const icon = category.icon_url || '📋';
  
  return (
    <Pressable
      onPress={onPress}
      className={`rounded-2xl p-5 mb-4 border-2 ${
        isSelected 
          ? 'border-primary bg-primary/5' 
          : 'border-border bg-card'
      }`}
    >
      <View className="flex-row items-center gap-4">
        <View className={`w-16 h-16 rounded-xl items-center justify-center ${
          isSelected ? 'bg-primary/10' : 'bg-muted/50'
        }`}>
          <Text className="text-4xl">{icon}</Text>
        </View>
        
        <View className="flex-1">
          <Text className={`text-lg font-bold mb-1 ${
            isSelected ? 'text-primary' : 'text-foreground'
          }`}>
            {category.name}
          </Text>
          <Text className="text-sm text-muted-foreground">
            {category.description}
          </Text>
        </View>

        <View className={`w-6 h-6 rounded-full border-2 ${
          isSelected 
            ? 'border-primary bg-primary' 
            : 'border-border'
        }`}>
          {isSelected && (
            <Text className="text-white text-xs text-center leading-6">✓</Text>
          )}
        </View>
      </View>
    </Pressable>
  );
});

CategoryCard.displayName = 'CategoryCard';

export default function CategorySelectionScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const providerId = user?.id;
  const queryClient = useQueryClient();
  
  // ✅ LOCAL STATE: Use simple local state, NOT Zustand store
  // This prevents persistence issues and UI overlapping bugs
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateStepMutation = useUpdateStepCompletion();

  // Real-time subscription
  useVerificationRealtime(providerId);

  // ✅ REACT QUERY: Fetch existing category from database
  const { data: existingCategory, isLoading: categoryLoading } = useQuery({
    queryKey: ['providerSelectedCategory', providerId],
    queryFn: async () => {
      if (!providerId) return null;

      console.log('[Categories] Fetching existing category...');
      const { data, error } = await supabase
        .from('provider_selected_categories')
        .select('category_id')
        .eq('provider_id', providerId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('[Categories] Error fetching category:', error);
        return null;
      }

      const categoryId = data?.category_id || null;
      console.log('[Categories] Existing category from database:', categoryId);
      return categoryId;
    },
    enabled: !!providerId,
    staleTime: 5 * 60 * 1000,
  });

  // ✅ REACT QUERY: Fetch service categories
  const { data: categories = [], isLoading: loading } = useQuery({
    queryKey: ['serviceCategories'],
    queryFn: async () => {
      console.log('[Categories] Fetching service categories...');

      const { data, error } = await supabase
        .from('service_categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) {
        console.error('[Categories] Error fetching categories:', error);
        throw error;
      }

      console.log('[Categories] Fetched', data?.length || 0, 'categories');
      return data || [];
    },
    staleTime: 10 * 60 * 1000,
  });

  // ✅ FOCUS: Re-sync when user navigates back to this screen
  // This fires every time the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (existingCategory) {
        console.log('[Categories] Screen focused - re-syncing category from database:', existingCategory);
        setSelectedCategoryId(existingCategory);
      } else {
        console.log('[Categories] Screen focused - no existing category found');
        setSelectedCategoryId(null);
      }
      
      // Reset submission state when returning
      setIsSubmitting(false);
    }, [existingCategory])
  );

  // ✅ HANDLE CATEGORY SELECTION: Simple, direct state update
  const handleSelectCategory = useCallback((categoryId: string) => {
    console.log('[Categories] Selected category:', categoryId);
    setSelectedCategoryId(categoryId);
  }, []);

  // ✅ HANDLE SUBMISSION
  const handleSubmit = useCallback(async () => {
    if (!selectedCategoryId || !providerId) {
      console.log('[Categories] Cannot submit - missing categoryId or providerId');
      return;
    }

    const selectedCategory = categories.find(cat => cat.id === selectedCategoryId);
    if (!selectedCategory) {
      console.log('[Categories] Cannot submit - category not found');
      return;
    }

    setIsSubmitting(true);
    console.log('[Categories] Submitting category:', selectedCategory.name);

    try {
      await updateStepMutation.mutateAsync({
        providerId,
        stepNumber: 4,
        completed: true,
        data: {
          categoryId: selectedCategoryId,
          categoryName: selectedCategory.name,
        },
      });

      console.log('[Categories] Category saved successfully, invalidating cache...');
      
      // ✅ Force immediate refetch to ensure UI sees new value
      await queryClient.invalidateQueries({ queryKey: ['providerSelectedCategory', providerId] });
      await queryClient.refetchQueries({ queryKey: ['providerSelectedCategory', providerId] });
      
      console.log('[Categories] Cache invalidated, navigating to portfolio (step 5)...');
      router.push('/(provider-verification)/portfolio');
    } catch (error) {
      console.error('[Categories] Error submitting category:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedCategoryId, providerId, categories, updateStepMutation, queryClient]);

  // ✅ LOADING STATE
  if (loading || categoryLoading) {
    return (
      <View className="flex-1 bg-background">
        <VerificationHeader step={4} title="Select Category" />
        <ScreenWrapper>
          <View className="flex-1 justify-center items-center">
            <Text className="text-muted-foreground">Loading categories...</Text>
          </View>
        </ScreenWrapper>
      </View>
    );
  }

  // ✅ EMPTY STATE
  if (categories.length === 0) {
    return (
      <View className="flex-1 bg-background">
        <VerificationHeader step={4} title="Select Category" />
        <ScreenWrapper>
          <View className="flex-1 justify-center items-center">
            <View className="w-20 h-20 bg-muted/30 rounded-2xl items-center justify-center mb-4">
              <Text className="text-4xl">📋</Text>
            </View>
            <Text className="text-lg font-semibold text-foreground mb-2">No Categories Available</Text>
            <Text className="text-sm text-muted-foreground text-center">
              Please try again later or contact support
            </Text>
          </View>
        </ScreenWrapper>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <VerificationHeader step={4} title="Select Category" />
      
      <ScreenWrapper scrollable contentContainerClassName="px-5 py-6">
        {/* Header Text */}
        <Animated.View entering={SlideInDown.delay(100).springify()} className="mb-6">
          <Text className="text-2xl font-bold text-foreground mb-2">
            What's Your Primary Service?
          </Text>
          <Text className="text-sm text-muted-foreground">
            Choose the category that best describes your main service. You can add more later.
          </Text>
        </Animated.View>

        {/* Categories Grid */}
        <Animated.View entering={SlideInDown.delay(200).springify()}>
          {categories.map((category, index) => (
            <CategoryCard
              key={category.id}
              category={category}
              isSelected={selectedCategoryId === category.id}
              onPress={() => handleSelectCategory(category.id)}
            />
          ))}
        </Animated.View>
      </ScreenWrapper>

      {/* Fixed Bottom Action Buttons */}
      <View
        className="px-5 bg-background border-t border-border"
        style={{
          paddingBottom: Math.max(insets.bottom + 20, 32),
          paddingTop: 16,
        }}
      >
        <Animated.View entering={SlideInDown.delay(300).springify()} className="mb-3">
          <Button
            size="lg"
            onPress={handleSubmit}
            disabled={!selectedCategoryId || isSubmitting || updateStepMutation.isPending}
            className="w-full"
          >
            <Text className="font-semibold text-primary-foreground">
              {isSubmitting || updateStepMutation.isPending ? 'Saving...' : 'Continue to Portfolio'}
            </Text>
          </Button>
        </Animated.View>

        <Animated.View entering={SlideInDown.delay(400).springify()}>
          <Button
            variant="outline"
            size="lg"
            onPress={() => {
              // Go to business-info (step 3) - previous step before category (step 4)
              router.push('/(provider-verification)/business-info');
            }}
            disabled={isSubmitting || updateStepMutation.isPending}
            className="w-full"
          >
            <Text>Back to Business Info</Text>
          </Button>
        </Animated.View>
      </View>
    </View>
  );
}
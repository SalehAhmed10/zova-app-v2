import React, { useState, useEffect } from 'react';
import { View, FlatList, Pressable } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { ScreenWrapper } from '@/components/ui/screen-wrapper';
import { useProviderVerificationStore } from '@/stores/provider-verification';
import { supabase } from '@/lib/supabase';

interface ServiceCategory {
  id: string;
  name: string;
  description: string;
  icon_url?: string;
}

export default function CategorySelectionScreen() {
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  const { 
    categoryData, 
    updateCategoryData, 
    completeStep, 
    nextStep,
    previousStep 
  } = useProviderVerificationStore();

  useEffect(() => {
    fetchCategories();
    // Set previously selected category
    if (categoryData.selectedCategoryId) {
      setSelectedCategory(categoryData.selectedCategoryId);
    }
  }, []);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('service_categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCategorySelect = (category: ServiceCategory) => {
    setSelectedCategory(category.id);
    updateCategoryData({
      selectedCategoryId: category.id,
      categoryName: category.name,
    });
  };

  const handleSubmit = async () => {
    if (!selectedCategory) return;

    try {
      // TODO: Save to database
      // await saveCategoryToDatabase(providerId, selectedCategory);

      // Mark step as completed and move to next
      const selectedCategoryData = categories.find(cat => cat.id === selectedCategory);
      completeStep(4, {
        categoryId: selectedCategory,
        categoryName: selectedCategoryData?.name,
      });
      
      nextStep();
      router.push('/provider-verification/services' as any);
    } catch (error) {
      console.error('Error saving category:', error);
    }
  };

  const getCategoryIcon = (categoryName: string) => {
    const icons: Record<string, string> = {
      'Beauty & Grooming': '💅',
      'Health & Wellness': '🏃',
      'Home & Lifestyle Services': '🏠',
      'Events & Entertainment': '🎉',
      'Professional Services': '💼',
      'Transport & Errands': '🚗',
      'Home Health & Personal': '👨‍👩‍👧‍👦',
      'SOS & Emergency Services': '🚨',
    };
    return icons[categoryName] || '📋';
  };

  const renderCategoryItem = ({ item }: { item: ServiceCategory }) => (
    <Pressable
      onPress={() => handleCategorySelect(item)}
      className={`p-4 rounded-lg border-2 mb-3 ${
        selectedCategory === item.id
          ? 'border-primary bg-primary/10'
          : 'border-border bg-card'
      }`}
    >
      <View className="flex-row items-center">
        <Text className="text-2xl mr-3">{getCategoryIcon(item.name)}</Text>
        <View className="flex-1">
          <Text className={`font-semibold ${
            selectedCategory === item.id ? 'text-primary' : 'text-foreground'
          }`}>
            {item.name}
          </Text>
          {item.description && (
            <Text className="text-sm text-muted-foreground mt-1">
              {item.description}
            </Text>
          )}
        </View>
        {selectedCategory === item.id && (
          <Text className="text-primary text-lg">✓</Text>
        )}
      </View>
    </Pressable>
  );

  return (
    <ScreenWrapper scrollable={false} contentContainerClassName="px-6 py-4">
      {/* Header */}
      <Animated.View 
        entering={FadeIn.delay(200).springify()}
        className="items-center mb-8"
      >
        <View className="w-16 h-16 bg-primary rounded-2xl justify-center items-center mb-4">
          <Text className="text-2xl">📋</Text>
        </View>
        <Text className="text-2xl font-bold text-foreground mb-2">
          Service Category
        </Text>
        <Text className="text-base text-muted-foreground text-center">
          Choose your main service category
        </Text>
      </Animated.View>

      {/* Categories List */}
      <Animated.View entering={SlideInDown.delay(400).springify()} className="flex-1">
        {loading ? (
          <View className="flex-1 justify-center items-center">
            <Text className="text-muted-foreground">Loading categories...</Text>
          </View>
        ) : (
          <FlatList
            data={categories}
            renderItem={renderCategoryItem}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20 }}
          />
        )}
      </Animated.View>

      {/* Info Note */}
      <Animated.View entering={SlideInDown.delay(600).springify()} className="mb-6">
        <View className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <Text className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
            💡 Category Selection
          </Text>
          <Text className="text-blue-800 dark:text-blue-200 text-sm">
            Choose the category that best represents your main service offering. 
            You can add multiple services within your chosen category in the next step.
          </Text>
        </View>
      </Animated.View>

      {/* Continue Button */}
      <Animated.View entering={SlideInDown.delay(800).springify()} className="mb-4">
        <Button
          size="lg"
          onPress={handleSubmit}
          disabled={!selectedCategory}
          className="w-full"
        >
          <Text className="font-semibold text-primary-foreground">
            Continue to Service Selection
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
          <Text>Back to Business Information</Text>
        </Button>
      </Animated.View>
    </ScreenWrapper>
  );
}
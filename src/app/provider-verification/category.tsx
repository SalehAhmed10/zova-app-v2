import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Pressable } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { FlashList } from '@shopify/flash-list';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScreenWrapper } from '@/components/ui/screen-wrapper';
import { useProviderVerificationStore, useProviderVerificationSelectors } from '@/stores/provider-verification';
import { supabase } from '@/lib/supabase';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ServiceCategory {
  id: string;
  name: string;
  description: string;
  icon_url?: string;
}

// Skeleton loading component
const CategorySkeleton = React.memo(() => (
  <View className="p-5 rounded-2xl mb-3 border border-border bg-card">
    <View className="flex-row items-center">
      <View className="w-14 h-14 bg-muted rounded-xl mr-4 animate-pulse" />
      <View className="flex-1">
        <View className="h-5 bg-muted rounded mb-2 animate-pulse" />
        <View className="h-4 bg-muted rounded w-3/4 animate-pulse" />
      </View>
    </View>
  </View>
));

CategorySkeleton.displayName = 'CategorySkeleton';
const CategoryItem = React.memo(({
  item,
  isSelected,
  onSelect,
  index
}: {
  item: ServiceCategory;
  isSelected: boolean;
  onSelect: (category: ServiceCategory) => void;
  index: number;
}) => {
  const getCategoryIcon = useMemo(() => {
    // Use icon from database if available, otherwise fallback to generic icon
    return item.icon_url || '📋';
  }, [item.icon_url]);

  const handlePress = useCallback(() => {
    onSelect(item);
  }, [item, onSelect]);

  return (
    <View className={`p-5 rounded-2xl mb-3 shadow-sm bg-card border ${isSelected ? 'border-2 border-primary' : 'border-border'}`}>
      <Pressable
        onPress={handlePress}
        style={{
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05,
          shadowRadius: 4,
          elevation: 2,
        }}
      >
        <View className="flex-row items-center">
          <View className="w-14 h-14 rounded-xl justify-center items-center mr-4 bg-primary/10">
            <Text className="text-3xl">{getCategoryIcon}</Text>
          </View>
          <View className="flex-1">
            <Text className="text-lg font-semibold mb-1 text-foreground">
              {item.name}
            </Text>
            {item.description && (
              <Text className="text-sm text-muted-foreground leading-5">
                {item.description}
              </Text>
            )}
          </View>
        </View>
      </Pressable>
    </View>
  );
});

CategoryItem.displayName = 'CategoryItem';

export default function CategorySelectionScreen() {
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

  // Debounce search query to improve performance
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const insets = useSafeAreaInsets();

  const {
    categoryData,
    updateCategoryData,
    completeStep,
    nextStep,
    previousStep
  } = useProviderVerificationStore();

  const { canGoBack } = useProviderVerificationSelectors();

  // Filter categories based on search query - optimized with early returns
  const filteredCategories = useMemo(() => {
    const query = debouncedSearchQuery.trim().toLowerCase();
    if (!query) return categories;
    
    return categories.filter(category => {
      const name = category.name.toLowerCase();
      const description = category.description?.toLowerCase() || '';
      return name.includes(query) || description.includes(query);
    });
  }, [categories, debouncedSearchQuery]);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    // Set previously selected category
    if (categoryData.selectedCategoryId) {
      setSelectedCategory(categoryData.selectedCategoryId);
    }
  }, [categoryData.selectedCategoryId]);

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

  const handleCategorySelect = useCallback((category: ServiceCategory) => {
    setSelectedCategory(category.id);
    updateCategoryData({
      selectedCategoryId: category.id,
      categoryName: category.name,
    });
  }, [updateCategoryData]);

  const handleSubmit = useCallback(async () => {
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
  }, [selectedCategory, categories, completeStep, nextStep]);

  const renderCategoryItem = useCallback(({ item, index }: { item: ServiceCategory; index: number }) => (
    <CategoryItem
      key={item.id}
      item={item}
      isSelected={selectedCategory === item.id}
      onSelect={handleCategorySelect}
      index={index}
    />
  ), [selectedCategory, handleCategorySelect]);

  return (
    <View className="flex-1">
      <ScreenWrapper contentContainerClassName="px-5 pb-4" className="flex-1">
        {/* Header */}
        <Animated.View
          entering={FadeIn.delay(200).springify()}
          className="items-center mb-1"
        >
          <View className="w-10 h-10 bg-primary/10 rounded-xl justify-center items-center mb-1">
            <Text className="text-lg">📋</Text>
          </View>
          <Text className="text-base font-bold text-foreground mb-0.5">
            Service Category
          </Text>
          <Text className="text-xs text-muted-foreground text-center leading-4 px-4">
            Choose your main service category to get started
          </Text>
        </Animated.View>

        {/* Info Note */}
        <Animated.View entering={SlideInDown.delay(250).springify()} className="mb-2">
          <View className="p-2 bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg border border-primary/20">
            <Text className="text-xs text-muted-foreground leading-4">
              💡 Choose wisely - your category determines client visibility. You can change this later in settings.
            </Text>
          </View>
        </Animated.View>

        {/* Search Input */}
        <Animated.View entering={SlideInDown.delay(350).springify()} className="mb-3">
          <View className="relative">
            <Input
              placeholder="Search categories..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              className="pl-10"
            />
            <View className="absolute left-3 top-1/2 -translate-y-1/2">
              <Text className="text-muted-foreground">🔍</Text>
            </View>
          </View>
          {searchQuery && (
            <Text className="text-xs text-muted-foreground mt-1">
              {searchQuery !== debouncedSearchQuery ? (
                'Searching...'
              ) : (
                `${filteredCategories.length} of ${categories.length} categories`
              )}
            </Text>
          )}
        </Animated.View>

        {/* Categories List */}
        <Animated.View entering={SlideInDown.delay(450).springify()} className="flex-1">
          {loading ? (
            <View className="py-2">
              {Array.from({ length: 6 }).map((_, index) => (
                <CategorySkeleton key={index} />
              ))}
            </View>
          ) : categories.length === 0 ? (
            <View className="flex-1 justify-center items-center py-8">
              <View className="w-16 h-16 bg-muted/50 rounded-2xl justify-center items-center mb-4">
                <Text className="text-2xl">📋</Text>
              </View>
              <Text className="text-muted-foreground font-medium mb-1">No categories available</Text>
              <Text className="text-muted-foreground text-sm text-center">
                Please try again later or contact support
              </Text>
            </View>
          ) : filteredCategories.length === 0 ? (
            <View className="flex-1 justify-center items-center py-8">
              <View className="w-16 h-16 bg-muted/50 rounded-2xl justify-center items-center mb-4">
                <Text className="text-2xl">🔍</Text>
              </View>
              <Text className="text-muted-foreground font-medium mb-1">No categories found</Text>
              <Text className="text-muted-foreground text-sm text-center mb-3">
                Try adjusting your search terms
              </Text>
              <Button
                variant="outline"
                size="sm"
                onPress={() => setSearchQuery('')}
                className="px-4"
              >
                <Text>Clear search</Text>
              </Button>
            </View>
          ) : (
            <FlashList
              data={filteredCategories}
              renderItem={renderCategoryItem}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 16 }}
            />
          )}
        </Animated.View>
      </ScreenWrapper>

      {/* Fixed Bottom Buttons */}
      <View
        className="px-5 bg-background border-t border-border"
        style={{ paddingBottom: Math.max(insets.bottom, 16) }}
      >
        {/* Continue Button */}
        <Animated.View entering={SlideInDown.delay(550).springify()} className="mb-2">
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

        {/* Back Button - only show if not first step */}
        {canGoBack && (
          <Animated.View entering={SlideInDown.delay(650).springify()}>
            <Button
              variant="outline"
              size="lg"
              onPress={previousStep}
              className="w-full"
            >
              <Text>Back to Business Information</Text>
            </Button>
          </Animated.View>
        )}
      </View>
    </View>
  );
}
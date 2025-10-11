import React, { useMemo, useCallback } from 'react';
import { View, Pressable } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { FlashList } from '@shopify/flash-list';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScreenWrapper } from '@/components/ui/screen-wrapper';
import { VerificationHeader } from '@/components/verification/VerificationHeader';
import { useProviderVerificationStore, useProviderVerificationHydration } from '@/stores/verification/provider-verification';
import { useCategorySearchStore, useCategorySearchResults } from '@/stores/ui';
import { supabase } from '@/lib/supabase';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSaveVerificationStep } from '@/hooks/provider/useProviderVerificationQueries';
import { useVerificationNavigation } from '@/hooks/provider';
import { VerificationFlowManager } from '@/lib/verification/verification-flow-manager';

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
    <View className={`p-5 rounded-2xl mb-3  bg-card border ${isSelected ? 'border-2 border-primary' : 'border-border'}`}>
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
  const insets = useSafeAreaInsets();

  const { 
    categoryData,
    updateCategoryData,
    completeStep,
    completeStepSimple,
    providerId 
  } = useProviderVerificationStore();
  
  const { navigateNext, navigateBack } = useVerificationNavigation();
  const isHydrated = useProviderVerificationHydration();

  // ✅ ZUSTAND: Search state management (replaces useState + useEffect)
  const { 
    searchQuery, 
    selectedCategoryId, 
    setSearchQuery, 
    setSelectedCategoryId,
    clearSearch 
  } = useCategorySearchStore();
  
  // ✅ REACT QUERY: Fetch existing category from database (provider_selected_categories table)
  const { data: existingProgress } = useQuery({
    queryKey: ['providerSelectedCategory', providerId],
    queryFn: async () => {
      if (!providerId) return null;
      
      console.log('[Categories] Fetching existing category selection from database...');
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
    enabled: !!providerId && isHydrated,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // ✅ REACT QUERY: Fetch service categories
  const { data: categories = [], isLoading: loading, error: categoriesError } = useQuery({
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
    enabled: isHydrated,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  // ✅ NO useEffect! Pure computation with useMemo for data flow: Database → Verification Store → UI Store
  React.useMemo(() => {
    // Priority: Database → Store → Empty
    const computedCategoryId = existingProgress || categoryData.selectedCategoryId || null;
    
    // Sync database → verification store (pure side effect during render, NOT in useEffect!)
    if (existingProgress && existingProgress !== categoryData.selectedCategoryId) {
      const categoryName = categories.find(c => c.id === existingProgress)?.name || '';
      console.log('[Categories] Syncing from database to store:', { existingProgress, categoryName });
      updateCategoryData({
        selectedCategoryId: existingProgress,
        categoryName,
      });
    }
    
    // Sync verification store → UI store (pure side effect during render, NOT in useEffect!)
    if (categoryData.selectedCategoryId && categoryData.selectedCategoryId !== selectedCategoryId) {
      console.log('[Categories] Syncing from verification store to UI store:', categoryData.selectedCategoryId);
      setSelectedCategoryId(categoryData.selectedCategoryId);
    }
    
    return computedCategoryId;
  }, [existingProgress, categoryData.selectedCategoryId, selectedCategoryId, categories, updateCategoryData, setSelectedCategoryId]);

  // ✅ REACT QUERY: Use centralized mutation for saving category selection
  const saveCategoryMutation = useSaveVerificationStep();

  // ✅ COMPUTED CATEGORIES: Using Zustand selector (replaces useMemo + useState)
  const filteredCategories = useCategorySearchResults(categories);

  const handleCategorySelect = useCallback((category: ServiceCategory) => {
    setSelectedCategoryId(category.id);
    updateCategoryData({
      selectedCategoryId: category.id,
      categoryName: category.name,
    });
  }, [updateCategoryData]);

  // ✅ OPTIMIZED: Handle form submission with React Query mutation
  const handleSubmit = useCallback(async () => {
    if (!selectedCategoryId || !providerId) return;
    
    const selectedCategoryData = categories.find(cat => cat.id === selectedCategoryId);
    if (!selectedCategoryData) return;
    
    // ✅ REACT QUERY: Use mutation to save data and progress
    await saveCategoryMutation.mutateAsync({
      providerId,
      step: 'category',
      data: {
        categoryId: selectedCategoryId,
        categoryName: selectedCategoryData.name,
      },
    });

    // ✅ EXPLICIT: Complete step 4 and navigate using flow manager
    const result = VerificationFlowManager.completeStepAndNavigate(
      4, // Always step 4 for category selection
      {
        categoryId: selectedCategoryId,
        categoryName: selectedCategoryData.name,
      },
      (step, stepData) => {
        // Update Zustand store
        completeStepSimple(step, stepData);
      }
    );
    
    console.log('[Category] Navigation result:', result);
  }, [selectedCategoryId, providerId, categories, saveCategoryMutation]);

  const renderCategoryItem = useCallback(({ item, index }: { item: ServiceCategory; index: number }) => (
    <CategoryItem
      key={item.id}
      item={item}
      isSelected={selectedCategoryId === item.id}
      onSelect={handleCategorySelect}
      index={index}
    />
  ), [selectedCategoryId, handleCategorySelect]);

  return (
    <View className="flex-1 bg-background">
      <VerificationHeader 
        step={4} 
        title="Select Category" 
      />
      <ScreenWrapper contentContainerClassName="px-5 pb-4" className="flex-1">
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
              {`${filteredCategories.length} of ${categories.length} categories`}
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
        style={{
          paddingBottom: Math.max(insets.bottom + 30, 36), // Add extra padding for navigation bar
          paddingTop: 16
        }}
      >
        {/* Continue Button */}
        <Animated.View entering={SlideInDown.delay(550).springify()} className="mb-3">
          <Button
            size="lg"
            onPress={handleSubmit}
            disabled={!selectedCategoryId || saveCategoryMutation.isPending}
            className="w-full"
          >
            <Text className="font-semibold text-primary-foreground">
              {saveCategoryMutation.isPending ? 'Saving...' : 'Continue to Service Selection'}
            </Text>
          </Button>
        </Animated.View>

        {/* Back Button - always show since this is not the first step */}
        <Animated.View entering={SlideInDown.delay(650).springify()}>
          <Button
            variant="outline"
            size="lg"
            onPress={navigateBack}
            className="w-full"
          >
            <Text>Back to Business Information</Text>
          </Button>
        </Animated.View>
      </View>
    </View>
  );
}
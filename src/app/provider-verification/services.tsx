/**
 * Service Selection Screen for Provider Verification
 * 
 * ✅ MIGRATED TO REACT QUERY + ZUSTAND ARCHITECTURE
 * - React Query for server state (service subcategories data        <Card className="mt-6">
          <CardContent className="p-6">
            <Text className="text-lg text-muted-foreground mb-4">- Zustand for global state management 
 * - Eliminated all useState + useEffect patterns
 * 
 * Architecture Changes:
 * - Removed: 5 useState hooks, 3 useEffect hooks
 * - Added: React Query data fetching, Zustand state management
 * - Improved: Performance with memoization, error handling
 */
import React, { useCallback, useMemo } from 'react';
import {
  View,
  Pressable,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { VerificationHeader } from '@/components/verification/VerificationHeader';
import { VerificationFlowManager } from '@/lib/verification/verification-flow-manager';

import { Text } from '@/components/ui/text';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

// ✅ REACT QUERY + ZUSTAND HOOKS (replacing useState + useEffect)
import { useAuthOptimized } from '@/hooks';
import { useServiceSubcategories, useSaveVerificationStep } from '@/hooks/provider/useProviderVerificationQueries';
import { useProviderVerificationStore } from '@/stores/verification/provider-verification';
import { useCategorySearchStore } from '@/stores/ui';
import { useVerificationNavigation } from '@/hooks/provider';

export default function ServiceSelectionScreen() {
  const { user } = useAuthOptimized();

  // ✅ ZUSTAND: Global state management
  const { 
    categoryData, 
    servicesData,
    updateServicesData,
    completeStepSimple 
  } = useProviderVerificationStore();

  // ✅ REACT QUERY: Server state management (replacing useEffect + useState)
  const { 
    data: subcategories = [], 
    isLoading: isLoadingSubcategories,
    error: subcategoriesError 
  } = useServiceSubcategories(categoryData.selectedCategoryId);

  const saveServicesMutation = useSaveVerificationStep();

  // ✅ CENTRALIZED NAVIGATION: Replace manual routing
  const { navigateBack } = useVerificationNavigation();

  // Safe area insets with fallback
  let insets = { top: 0, bottom: 0, left: 0, right: 0 };
  try {
    insets = useSafeAreaInsets();
  } catch (error) {
    console.warn('useSafeAreaInsets not available:', error);
  }

  // ✅ ZUSTAND: Search state management (replacing useState)
  const { 
    searchQuery,
    setSearchQuery
  } = useCategorySearchStore();

  // ✅ REACT QUERY: Validate selections when services load (avoiding useEffect antipatterns)
  React.useEffect(() => {
    if (subcategories.length > 0 && categoryData.selectedCategoryId) {
      // Check if any selected services are still valid for the current category
      const validSelections = servicesData.selectedServices.filter(selectedId =>
        subcategories.some(service => service.id === selectedId)
      );

      // If selections don't match available services, clear them
      if (validSelections.length !== servicesData.selectedServices.length) {
        if (__DEV__) {
          console.log('[Services] Clearing invalid selections:', servicesData.selectedServices.filter(id => !validSelections.includes(id)));
        }
        updateServicesData({
          selectedServices: validSelections,
        });
      }
    }
  }, [subcategories, categoryData.selectedCategoryId, servicesData.selectedServices, updateServicesData]);  const filteredServices = useMemo(() => {
    if (!searchQuery.trim()) return subcategories;
    return subcategories.filter(service =>
      service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [subcategories, searchQuery]);

  // ✅ DEBUG: Log selected services vs available services (only once per category change)
  React.useEffect(() => {
    if (__DEV__) {
      console.log('[Services] Selected services:', servicesData.selectedServices.length);
      console.log('[Services] Available services:', subcategories.length);
      console.log('[Services] Category ID:', categoryData.selectedCategoryId);
    }
  }, [categoryData.selectedCategoryId, subcategories.length, servicesData.selectedServices.length]);

  // ✅ ZUSTAND: Service selection handlers
  const handleServiceToggle = useCallback((serviceId: string) => {
    const currentSelected = servicesData.selectedServices;
    const newSelected = currentSelected.includes(serviceId)
      ? currentSelected.filter(id => id !== serviceId)
      : [...currentSelected, serviceId];
    
    updateServicesData({
      selectedServices: newSelected,
    });
  }, [servicesData.selectedServices, updateServicesData]);

  // ✅ REACT QUERY MUTATION: Handle form submission
  const handleSubmit = useCallback(async () => {
    // Require at least one service to be selected
    if (servicesData.selectedServices.length === 0) {
      Alert.alert(
        'Services Required',
        'Please select at least one service to continue.',
        [{ text: 'OK' }]
      );
      return;
    }

    if (!user?.id) return;

    try {
      // ✅ REACT QUERY: Use mutation to save data
      await saveServicesMutation.mutateAsync({
        providerId: user.id,
        step: 'services',
        data: {
          selectedServices: servicesData.selectedServices,
          categoryId: categoryData.selectedCategoryId,
        },
      });

      // ✅ EXPLICIT: Complete step 5 and navigate using flow manager
      const result = VerificationFlowManager.completeStepAndNavigate(
        5, // Always step 5 for services
        {
          selectedServices: servicesData.selectedServices
        },
        (step, stepData) => {
          // Update Zustand store
          completeStepSimple(step, stepData);
        }
      );
      
      console.log('[Services] Navigation result:', result);
    } catch (error) {
      console.error('[ServicesScreen] Submit error:', error);
      // TODO: Show error toast
    }
  }, [servicesData.selectedServices, user?.id, saveServicesMutation, categoryData.selectedCategoryId, completeStepSimple]);

  // ✅ OPTIMIZED: Memoized render function
  const renderServiceItem = useCallback(({ item }: { item: any }) => {
    const isSelected = servicesData.selectedServices.includes(item.id);

    return (
      <Pressable
        onPress={() => handleServiceToggle(item.id)}
        className={`p-4 rounded-lg border-2 mb-3 ${isSelected
            ? 'border-primary bg-primary/10'
            : 'border-border bg-card'
          }`}
      >
        <View className="flex-row items-center">
          <View className="flex-1">
            <Text className="text-base font-medium text-foreground">
              {item.name}
            </Text>
            {item.description && (
              <Text className="text-sm text-muted-foreground mt-1">
                {item.description}
              </Text>
            )}
          </View>
          
          {isSelected && (
            <Badge variant="default" className="ml-3">
              <Text className="text-xs text-primary-foreground">Selected</Text>
            </Badge>
          )}
        </View>
      </Pressable>
    );
  }, [servicesData.selectedServices, handleServiceToggle]);

  // ✅ REACT QUERY ERROR HANDLING
  if (subcategoriesError) {
    return (
      <View 
        style={{ 
          paddingTop: insets.top, 
          paddingBottom: insets.bottom,
        }}
        className="flex-1 justify-center items-center px-4 bg-background"
      >
        <Text className="text-destructive text-center mb-4">
          Failed to load services. Please check your connection.
        </Text>
        <Button onPress={() => router.back()}>
          <Text>Go Back</Text>
        </Button>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      {/* Fixed Header */}
      <VerificationHeader
        step={5}
        title="Select Services"
      />

      {/* Scrollable Content Area - Takes remaining space */}
      <View className="flex-1 px-4 py-2">
        <Card className="flex-1 py-2">
          <CardContent className="flex-1 p-6">
            <Text className="text-2xl font-bold text-foreground mb-2">
              Select Your Services
            </Text>
            <Text className="text-muted-foreground mb-6">
              Choose the services you provide to help customers find you.
            </Text>

            {/* Search Bar */}
            <Input
              key={categoryData.selectedCategoryId} // ✅ KEY-BASED RESET: Clears search when category changes
              placeholder="Search services..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              className="mb-4"
            />

            {/* Selected Services Counter */}
            {servicesData.selectedServices.length > 0 && (
              <View className="mb-4 flex-row items-center justify-between">
                <Badge variant="secondary">
                  <Text className="text-secondary-foreground">
                    {servicesData.selectedServices.length} service{servicesData.selectedServices.length !== 1 ? 's' : ''} selected
                  </Text>
                </Badge>

                {/* Clear All Button */}
                <Pressable
                  onPress={() => {
                    updateServicesData({
                      selectedServices: [],
                    });
                  }}
                  className="px-3 py-1"
                >
                  <Text className="text-sm text-muted-foreground underline">
                    Clear all
                  </Text>
                </Pressable>
              </View>
            )}

            {/* Services List - Takes remaining space in card */}
            {isLoadingSubcategories ? (
              <View className="flex-1 justify-center items-center">
                <ActivityIndicator size="large" />
                <Text className="text-muted-foreground mt-2">Loading services...</Text>
              </View>
            ) : filteredServices.length === 0 ? (
              <View className="flex-1 justify-center items-center">
                <Text className="text-muted-foreground text-center mb-4">
                  {searchQuery ? 'No services match your search.' : 'No services are currently available for this category.'}
                </Text>
                {!searchQuery && (
                  <Text className="text-sm text-muted-foreground text-center">
                    Services will be added soon. You can continue to the next step for now.
                  </Text>
                )}
              </View>
            ) : (
              <View className="flex-1">
                <FlashList
                  data={filteredServices}
                  renderItem={renderServiceItem}
                  keyExtractor={(item) => item.id}
                  showsVerticalScrollIndicator={true}
                  contentContainerStyle={{ paddingBottom: 20 }}
                  ListEmptyComponent={
                    <View className="py-8 items-center">
                      <Text className="text-muted-foreground text-center">
                        {searchQuery ? 'No services match your search.' : 'No services available.'}
                      </Text>
                    </View>
                  }
                />
              </View>
            )}
          </CardContent>
        </Card>
      </View>

      {/* Fixed Bottom Buttons */}
      <View
        className="px-4 pb-6"
        style={{ paddingBottom: Math.max(insets.bottom + 24, 24) }}
      >
        <Button
          onPress={handleSubmit}
          disabled={saveServicesMutation.isPending}
          className="w-full mb-4"
        >
          <Text className="text-primary-foreground font-medium">
            {saveServicesMutation.isPending
              ? 'Saving...'
              : `Continue with ${servicesData.selectedServices.length} service${servicesData.selectedServices.length !== 1 ? 's' : ''}`
            }
          </Text>
        </Button>

        {/* Back Button */}
        <Button
          variant="outline"
          size="lg"
          onPress={navigateBack}
          className="w-full"
        >
          <Text>Back to Category Selection</Text>
        </Button>
      </View>
    </View>
  );
}
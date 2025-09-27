/**
 * Service Selection Screen for Provider Verification
 * 
 * ✅ MIGRATED TO REACT QUERY + ZUSTAND ARCHITECTURE
 * - React Query for server state (service subcategories data)
 * - Zustand for global state management 
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
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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

export default function ServiceSelectionScreen() {
  const { user } = useAuthOptimized();

  // ✅ ZUSTAND: Global state management
  const { 
    categoryData, 
    servicesData,
    updateServicesData,
    completeStepAndNext 
  } = useProviderVerificationStore();

  // ✅ REACT QUERY: Server state management (replacing useEffect + useState)
  const { 
    data: subcategories = [], 
    isLoading: isLoadingSubcategories,
    error: subcategoriesError 
  } = useServiceSubcategories(categoryData.selectedCategoryId);

  const saveServicesMutation = useSaveVerificationStep();

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
    setSearchQuery,
    clearSearch
  } = useCategorySearchStore();

  const filteredServices = useMemo(() => {
    if (!searchQuery.trim()) return subcategories;
    return subcategories.filter(service =>
      service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [subcategories, searchQuery]);

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
    if (servicesData.selectedServices.length === 0 || !user?.id) return;

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

      // ✅ ZUSTAND: Mark step as completed and move to next
      completeStepAndNext(5, { 
        selectedServices: servicesData.selectedServices 
      });
    } catch (error) {
      console.error('[ServicesScreen] Submit error:', error);
      // TODO: Show error toast
    }
  }, [servicesData.selectedServices, user?.id, saveServicesMutation, categoryData.selectedCategoryId, completeStepAndNext]);

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
    <View 
      style={{ 
        paddingTop: insets.top, 
        paddingBottom: insets.bottom,
      }}
      className="flex-1 bg-background"
    >
      <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>
        <Card className="mt-6">
          <CardContent className="p-6">
            <Text className="text-2xl font-bold text-foreground mb-2">
              Select Your Services
            </Text>
            <Text className="text-muted-foreground mb-6">
              Choose the services you provide to help customers find you.
            </Text>

            {/* Search Bar */}
            <Input
              placeholder="Search services..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              className="mb-4"
            />

            {/* Selected Services Counter */}
            {servicesData.selectedServices.length > 0 && (
              <View className="mb-4">
                <Badge variant="secondary">
                  <Text className="text-secondary-foreground">
                    {servicesData.selectedServices.length} service{servicesData.selectedServices.length !== 1 ? 's' : ''} selected
                  </Text>
                </Badge>
              </View>
            )}

            {/* Services List */}
            {isLoadingSubcategories ? (
              <View className="py-8 items-center">
                <ActivityIndicator size="large" color="#007AFF" />
                <Text className="text-muted-foreground mt-2">Loading services...</Text>
              </View>
            ) : (
              <View style={{ height: 400 }}>
                <FlashList
                  data={filteredServices}
                  renderItem={renderServiceItem}
                  keyExtractor={(item) => item.id}
                  showsVerticalScrollIndicator={false}
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

        <View className="mt-6 pb-6">
          <Button 
            onPress={handleSubmit}
            disabled={servicesData.selectedServices.length === 0 || saveServicesMutation.isPending}
            className="w-full"
          >
            <Text className="text-primary-foreground font-medium">
              {saveServicesMutation.isPending 
                ? 'Saving...' 
                : `Continue with ${servicesData.selectedServices.length} service${servicesData.selectedServices.length !== 1 ? 's' : ''}`
              }
            </Text>
          </Button>
        </View>
      </ScrollView>
    </View>
  );
}
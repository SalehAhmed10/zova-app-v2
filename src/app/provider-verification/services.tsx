import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, FlatList, Pressable, TextInput } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { ScreenWrapper } from '@/components/ui/screen-wrapper';
import { useProviderVerificationStore } from '@/stores/verification/provider-verification';
import { supabase } from '@/lib/core/supabase';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from '@/lib/core/useColorScheme';
import { useAuth } from '@/hooks';

interface ServiceSubcategory {
  id: string;
  name: string;
  description: string;
  requires_certification: boolean;
}

// Skeleton loading component
const ServiceSkeleton = React.memo(() => (
  <View className="p-4 rounded-lg mb-3 border border-border bg-card">
    <View className="flex-row items-center">
      <View className="flex-1">
        <View className="h-5 bg-muted rounded mb-2 animate-pulse" />
        <View className="h-4 bg-muted rounded w-3/4 animate-pulse" />
        <View className="h-3 bg-muted rounded w-1/2 mt-1 animate-pulse" />
      </View>
      <View className="w-6 h-6 bg-muted rounded-full animate-pulse" />
    </View>
  </View>
));

ServiceSkeleton.displayName = 'ServiceSkeleton';

export default function ServicesSelectionScreen() {
  const [services, setServices] = useState<ServiceSubcategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

  // Debounce search query to improve performance
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Safe area insets with fallback
  let insets = { top: 0, bottom: 0, left: 0, right: 0 };
  try {
    insets = useSafeAreaInsets();
  } catch (error) {
    console.warn('useSafeAreaInsets not available:', error);
  }

  const { isDarkColorScheme } = useColorScheme();
  const { user } = useAuth();

  // Theme-aware colors
  const mutedForegroundColor = isDarkColorScheme ? 'hsl(0, 0%, 53.3333%)' : 'hsl(220, 8.9362%, 46.0784%)';

  const {
    categoryData,
    servicesData,
    updateServicesData,
    completeStep,
    completeStepAndNext,
    nextStep,
    previousStep
  } = useProviderVerificationStore();

  // Filter services based on search query - optimized with early returns
  const filteredServices = useMemo(() => {
    const query = debouncedSearchQuery.trim().toLowerCase();
    if (!query) return services;

    return services.filter(service => {
      const name = service.name.toLowerCase();
      const description = service.description?.toLowerCase() || '';
      return name.includes(query) || description.includes(query);
    });
  }, [services, debouncedSearchQuery]);

  useEffect(() => {
    if (categoryData.selectedCategoryId) {
      fetchServices();
    }
  }, [categoryData.selectedCategoryId]);

  useEffect(() => {
    // Set previously selected services
    if (servicesData.selectedServices.length > 0) {
      setSelectedServices(servicesData.selectedServices);
    }
  }, [servicesData.selectedServices]);

  const fetchServices = async () => {
    try {
      const { data, error } = await supabase
        .from('service_subcategories')
        .select('*')
        .eq('category_id', categoryData.selectedCategoryId)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setServices(data || []);
    } catch (error) {
      console.error('Error fetching services:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleServiceToggle = (serviceId: string) => {
    setSelectedServices(prev => {
      if (prev.includes(serviceId)) {
        return prev.filter(id => id !== serviceId);
      } else {
        return [...prev, serviceId];
      }
    });
  };

  const saveServicesToDatabase = async (providerId: string, selectedServiceIds: string[]) => {
    if (!providerId || selectedServiceIds.length === 0) return;

    try {
      // First, delete any existing services for this provider
      await supabase
        .from('provider_services')
        .delete()
        .eq('provider_id', providerId);

      // Get the service subcategory details for the selected services
      const { data: subcategories, error: fetchError } = await supabase
        .from('service_subcategories')
        .select('id, name, description')
        .in('id', selectedServiceIds);

      if (fetchError) throw fetchError;

      // Create provider services with default values
      const servicesToInsert = subcategories?.map(subcategory => ({
        provider_id: providerId,
        subcategory_id: subcategory.id,
        title: subcategory.name,
        description: subcategory.description || `${subcategory.name} service`,
        base_price: 15.00, // Minimum price as per database constraint
        duration_minutes: 60, // Default 1 hour
        is_home_service: false,
        is_remote_service: false,
        is_active: true,
        price_type: 'fixed' as const,
        deposit_percentage: 20,
        cancellation_fee_percentage: 0,
        requires_deposit: true,
        allows_sos_booking: false,
        custom_deposit_percentage: 20,
        custom_cancellation_fee_percentage: 0,
        house_call_available: false,
        house_call_extra_fee: 0,
      })) || [];

      if (servicesToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('provider_services')
          .insert(servicesToInsert);

        if (insertError) throw insertError;
      }

      console.log(`Successfully saved ${servicesToInsert.length} services for provider ${providerId}`);
    } catch (error) {
      console.error('Error saving services to database:', error);
      throw error;
    }
  };

  const handleSubmit = async () => {
    if (selectedServices.length === 0 || !user) return;

    try {
      updateServicesData({
        selectedServices,
        serviceDetails: {},
      });

      // Save to database
      await saveServicesToDatabase(user.id, selectedServices);

      // Mark step as completed and move to next
      completeStepAndNext(5, { selectedServices });
    } catch (error) {
      console.error('Error saving services:', error);
    }
  };

  const renderServiceItem = useCallback(({ item }: { item: ServiceSubcategory }) => {
    const isSelected = selectedServices.includes(item.id);

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
            <Text className={`font-semibold ${isSelected ? 'text-primary' : 'text-foreground'
              }`}>
              {item.name}
            </Text>
            {item.description && (
              <Text className="text-sm text-muted-foreground mt-1">
                {item.description}
              </Text>
            )}
            {item.requires_certification && (
              <Text className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                📜 Certification required
              </Text>
            )}
          </View>
          <View className={`w-6 h-6 rounded-full border-2 items-center justify-center ${isSelected
              ? 'border-primary bg-primary'
              : 'border-border'
            }`}>
            {isSelected && (
              <Text className="text-white text-xs font-bold">✓</Text>
            )}
          </View>
        </View>
      </Pressable>
    );
  }, [selectedServices]);

  if (loading) {
    return (
      <ScreenWrapper scrollable={false}>
        <View className="flex-1 px-4 py-6">
          <View className="mb-6">
            <Text className="text-2xl font-bold text-foreground mb-2">
              Select Your Services
            </Text>
            <Text className="text-muted-foreground">
              Choose the services you provide within {categoryData.categoryName}
            </Text>
          </View>

          <View className="flex-1">
            {Array.from({ length: 6 }).map((_, index) => (
              <ServiceSkeleton key={index} />
            ))}
          </View>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper scrollable={false}>
      <View className="flex-1">
        <View className="mb-6">
          <Text className="text-2xl font-bold text-foreground mb-2">
            Select Your Services
          </Text>
          <Text className="text-muted-foreground">
            Choose the services you provide within {categoryData.categoryName}
          </Text>

          {/* Search Bar */}
          <View className="mt-4">
            <View className="flex-row items-center bg-muted rounded-lg px-4 py-3">
              <Ionicons name="search" size={20} color={mutedForegroundColor} />
              <TextInput
                placeholder="Search services..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                className="flex-1 ml-3 text-foreground"
                placeholderTextColor={mutedForegroundColor}
              />
            </View>
          </View>
        </View>

        <View className="flex-1">
          {services.length === 0 ? (
            <View className="flex-1 items-center justify-center">
              <Ionicons name="construct-outline" size={64} color={mutedForegroundColor} />
              <Text className="text-lg text-muted-foreground mt-4 text-center">
                No services available for this category yet.
              </Text>
              <Text className="text-sm text-muted-foreground mt-2 text-center">
                Please contact support if you believe this is an error.
              </Text>
            </View>
          ) : filteredServices.length === 0 ? (
            <View className="flex-1 items-center justify-center">
              <Ionicons name="search-outline" size={64} color={mutedForegroundColor} />
              <Text className="text-lg text-muted-foreground mt-4 text-center">
                No services match your search.
              </Text>
              <Text className="text-sm text-muted-foreground mt-2 text-center">
                Try a different search term.
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredServices}
              renderItem={renderServiceItem}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 60, 80) }}
              ListHeaderComponent={
                <Text className="text-sm text-muted-foreground mb-4">
                  {filteredServices.length} of {services.length} services
                </Text>
              }
            />
          )}
        </View>
      </View>

      {/* Fixed Bottom Buttons */}

      <View className="flex-row gap-3 items-center pt-5 ">
        <Button
          variant="outline"
          onPress={previousStep}
          className="flex-1"
        >
          <Text className="font-semibold">Back to Category</Text>
        </Button>
        <Button
          onPress={handleSubmit}
          disabled={selectedServices.length === 0}
          className="flex-1"
        >
          <Text className="font-semibold text-primary-foreground">
            Continue ({selectedServices.length})
          </Text>
        </Button>
      </View>

    </ScreenWrapper>
  );
}
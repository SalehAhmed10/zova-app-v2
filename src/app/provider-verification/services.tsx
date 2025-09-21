import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, FlatList, Pressable } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScreenWrapper } from '@/components/ui/screen-wrapper';
import { useProviderVerificationStore } from '@/stores/provider-verification';
import { supabase } from '@/lib/supabase';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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

  const insets = useSafeAreaInsets();
  
  const { 
    categoryData,
    servicesData,
    updateServicesData, 
    completeStep, 
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

  const handleSubmit = async () => {
    if (selectedServices.length === 0) return;

    try {
      updateServicesData({
        selectedServices,
        serviceDetails: {},
      });

      // TODO: Save to database
      // await saveServicesToDatabase(providerId, selectedServices);

      // Mark step as completed and move to next
      completeStep(5, { selectedServices });
      
      nextStep();
      // For now, skip to complete screen (we'll add other steps later)
      router.push('/provider-verification/complete' as any);
    } catch (error) {
      console.error('Error saving services:', error);
    }
  };

  const renderServiceItem = useCallback(({ item }: { item: ServiceSubcategory }) => {
    const isSelected = selectedServices.includes(item.id);
    
    return (
      <Pressable
        onPress={() => handleServiceToggle(item.id)}
        className={`p-4 rounded-lg border-2 mb-3 ${
          isSelected
            ? 'border-primary bg-primary/10'
            : 'border-border bg-card'
        }`}
      >
        <View className="flex-row items-center">
          <View className="flex-1">
            <Text className={`font-semibold ${
              isSelected ? 'text-primary' : 'text-foreground'
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
          <View className={`w-6 h-6 rounded-full border-2 items-center justify-center ${
            isSelected 
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

  return (
    <View className="flex-1">
      <ScreenWrapper contentContainerClassName="px-5 pb-4" className="flex-1">
        {/* Header */}
        <Animated.View
          entering={FadeIn.delay(200).springify()}
          className="items-center mb-1"
        >
          <View className="w-10 h-10 bg-primary/10 rounded-xl justify-center items-center mb-1">
            <Text className="text-lg">⚡</Text>
          </View>
          <Text className="text-base font-bold text-foreground mb-0.5">
            Service Selection
          </Text>
          <Text className="text-xs text-muted-foreground text-center leading-4 px-4">
            Choose the specific services you offer in{' '}
            <Text className="font-semibold">{categoryData.categoryName}</Text>
          </Text>
        </Animated.View>

        {/* Info Note */}
        <Animated.View entering={SlideInDown.delay(250).springify()} className="mb-2">
          <View className="p-2 bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg border border-primary/20">
            <Text className="text-xs text-muted-foreground leading-4">
              💡 Select all services you provide. You can add pricing and availability after verification.
            </Text>
          </View>
        </Animated.View>

        {/* Search Input */}
        <Animated.View entering={SlideInDown.delay(350).springify()} className="mb-3">
          <View className="relative">
            <Input
              placeholder="Search services..."
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
                `${filteredServices.length} of ${services.length} services`
              )}
            </Text>
          )}
        </Animated.View>

        {/* Services List */}
        <Animated.View entering={SlideInDown.delay(450).springify()} className="flex-1">
          {loading ? (
            <View className="py-2">
              {Array.from({ length: 6 }).map((_, index) => (
                <ServiceSkeleton key={index} />
              ))}
            </View>
          ) : services.length === 0 ? (
            <View className="flex-1 justify-center items-center py-8">
              <View className="w-16 h-16 bg-muted/50 rounded-2xl justify-center items-center mb-4">
                <Text className="text-2xl">⚡</Text>
              </View>
              <Text className="text-muted-foreground font-medium mb-1">No services available</Text>
              <Text className="text-muted-foreground text-sm text-center">
                No services found for this category
              </Text>
            </View>
          ) : filteredServices.length === 0 ? (
            <View className="flex-1 justify-center items-center py-8">
              <View className="w-16 h-16 bg-muted/50 rounded-2xl justify-center items-center mb-4">
                <Text className="text-2xl">🔍</Text>
              </View>
              <Text className="text-muted-foreground font-medium mb-1">No services found</Text>
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
            <FlatList
              data={filteredServices}
              renderItem={renderServiceItem}
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
        {/* Selection Summary */}
        <Animated.View entering={SlideInDown.delay(550).springify()} className="mb-3">
          <View className="p-3 bg-muted/50 rounded-lg border border-border">
            <Text className="font-semibold text-foreground mb-1">
              Selected Services: {selectedServices.length}
            </Text>
            <Text className="text-muted-foreground text-xs">
              {selectedServices.length > 0 
                ? `You can add more services and set pricing after your account is approved.`
                : 'Select at least one service to continue.'
              }
            </Text>
          </View>
        </Animated.View>

        {/* Continue Button */}
        <Animated.View entering={SlideInDown.delay(650).springify()} className="mb-2">
          <Button
            size="lg"
            onPress={handleSubmit}
            disabled={selectedServices.length === 0}
            className="w-full"
          >
            <Text className="font-semibold text-primary-foreground">
              Complete Verification
            </Text>
          </Button>
        </Animated.View>

        {/* Back Button */}
        <Animated.View entering={SlideInDown.delay(750).springify()}>
          <Button
            variant="outline"
            size="lg"
            onPress={() => {
              previousStep();
              router.back();
            }}
            className="w-full"
          >
            <Text>Back to Category Selection</Text>
          </Button>
        </Animated.View>
      </View>
    </View>
  );
}
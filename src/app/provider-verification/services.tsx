import React, { useState, useEffect } from 'react';
import { View, FlatList, Pressable } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { ScreenWrapper } from '@/components/ui/screen-wrapper';
import { useProviderVerificationStore } from '@/stores/provider-verification';
import { supabase } from '@/lib/supabase';

interface ServiceSubcategory {
  id: string;
  name: string;
  description: string;
  requires_certification: boolean;
}

export default function ServicesSelectionScreen() {
  const [services, setServices] = useState<ServiceSubcategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  
  const { 
    categoryData,
    servicesData,
    updateServicesData, 
    completeStep, 
    nextStep,
    previousStep 
  } = useProviderVerificationStore();

  useEffect(() => {
    if (categoryData.selectedCategoryId) {
      fetchServices();
    }
    // Set previously selected services
    if (servicesData.selectedServices.length > 0) {
      setSelectedServices(servicesData.selectedServices);
    }
  }, []);

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

  const renderServiceItem = ({ item }: { item: ServiceSubcategory }) => {
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
  };

  return (
    <ScreenWrapper scrollable={false} contentContainerClassName="px-6 py-4">
      {/* Header */}
      <Animated.View 
        entering={FadeIn.delay(200).springify()}
        className="items-center mb-8"
      >
        <View className="w-16 h-16 bg-primary rounded-2xl justify-center items-center mb-4">
          <Text className="text-2xl">⚡</Text>
        </View>
        <Text className="text-2xl font-bold text-foreground mb-2">
          Service Selection
        </Text>
        <Text className="text-base text-muted-foreground text-center">
          Choose the specific services you offer in{'\n'}
          <Text className="font-semibold">{categoryData.categoryName}</Text>
        </Text>
      </Animated.View>

      {/* Services List */}
      <Animated.View entering={SlideInDown.delay(400).springify()} className="flex-1">
        {loading ? (
          <View className="flex-1 justify-center items-center">
            <Text className="text-muted-foreground">Loading services...</Text>
          </View>
        ) : services.length === 0 ? (
          <View className="flex-1 justify-center items-center">
            <Text className="text-muted-foreground text-center">
              No services found for this category
            </Text>
          </View>
        ) : (
          <FlatList
            data={services}
            renderItem={renderServiceItem}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20 }}
          />
        )}
      </Animated.View>

      {/* Selection Summary */}
      <Animated.View entering={SlideInDown.delay(600).springify()} className="mb-6">
        <View className="p-4 bg-muted/50 rounded-lg border border-border">
          <Text className="font-semibold text-foreground mb-2">
            Selected Services: {selectedServices.length}
          </Text>
          <Text className="text-muted-foreground text-sm">
            {selectedServices.length > 0 
              ? `You can add more services and set pricing after your account is approved.`
              : 'Select at least one service to continue.'
            }
          </Text>
        </View>
      </Animated.View>

      {/* Continue Button */}
      <Animated.View entering={SlideInDown.delay(800).springify()} className="mb-4">
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
          <Text>Back to Category Selection</Text>
        </Button>
      </Animated.View>
    </ScreenWrapper>
  );
}
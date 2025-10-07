import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { SliderComponent as Slider } from '@/components/ui/slider';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheetModal, BottomSheetBackdrop, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useSearchStore } from '@/stores/customer/search-store';
import { SearchFilters } from '@/stores/customer/search-store';
import { useColorScheme } from '@/lib/core/useColorScheme';


interface SearchFiltersSheetProps {
  isVisible: boolean;
  onClose: () => void;
  onApplyFilters: (filters: SearchFilters) => void;
}

const SORT_OPTIONS = [
  { value: 'rating', label: 'Rating' },
  { value: 'price', label: 'Price' },
  { value: 'popularity', label: 'Popularity' },
] as const;

export default function SearchFiltersSheet({
  isVisible,
  onClose,
  onApplyFilters,
}: SearchFiltersSheetProps) {
  const bottomSheetModalRef = useRef<BottomSheetModal>(null);
  const { filters, handleFiltersChange, clearFilters } = useSearchStore();
  const { colorScheme } = useColorScheme();
  // Handle modal visibility
  useEffect(() => {
    if (isVisible) {
      bottomSheetModalRef.current?.present();
    } else {
      bottomSheetModalRef.current?.dismiss();
    }
  }, [isVisible]);

  const updateFilters = useCallback((updates: Partial<SearchFilters>) => {
    handleFiltersChange(updates);
  }, [handleFiltersChange]);

  const handleApplyFilters = useCallback(() => {
    onApplyFilters(filters);
    bottomSheetModalRef.current?.dismiss();
  }, [filters, onApplyFilters]);

  const handleResetFilters = useCallback(() => {
    clearFilters();
  }, [clearFilters]);

  const handleSheetChanges = useCallback((index: number) => {
    if (index === -1) {
      onClose();
    }
  }, [onClose]);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
      />
    ),
    []
  );

  return (
    <BottomSheetModal
      ref={bottomSheetModalRef}
      index={0}
      snapPoints={['85%']}
      onChange={handleSheetChanges}
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: colorScheme === 'dark' ? 'hsl(270 5.5556% 7.0588%)' : 'hsl(0 0% 100%)' }}
      handleIndicatorStyle={{ backgroundColor: '#6B7280' }}
    >
      <BottomSheetScrollView className="flex-1 bg-background">
        <View className="px-4 py-4 border-b border-border bg-card">
          <Text className="text-xl font-bold text-foreground">Filters</Text>
        </View>

        <View className="px-4 pb-8">
          {/* Price Range */}
          <Card className="mb-4">
            <CardHeader>
              <CardTitle className="text-lg">Price Range</CardTitle>
            </CardHeader>
            <CardContent>
              <View className="gap-4">
                <View className="flex-row items-center justify-between">
                  <Text className="text-sm text-muted-foreground">
                    Min: £{filters.minPrice || 0}
                  </Text>
                  <Text className="text-sm text-muted-foreground">
                    Max: £{filters.maxPrice || 500}
                  </Text>
                </View>
                <View className="gap-4">
                  <View>
                    <Text className="text-sm text-muted-foreground mb-2">Minimum Price</Text>
                    <Slider
                      value={[filters.minPrice || 0]}
                      onValueChange={(value) => updateFilters({ minPrice: value[0] })}
                      minimumValue={0}
                      maximumValue={500}
                      step={10}
                    />
                  </View>
                  <View>
                    <Text className="text-sm text-muted-foreground mb-2">Maximum Price</Text>
                    <Slider
                      value={[filters.maxPrice || 500]}
                      onValueChange={(value) => updateFilters({ maxPrice: value[0] })}
                      minimumValue={0}
                      maximumValue={500}
                      step={10}
                    />
                  </View>
                </View>
              </View>
            </CardContent>
          </Card>

          {/* Rating Filter */}
          <Card className="mb-4">
            <CardHeader>
              <CardTitle className="text-lg">Rating</CardTitle>
            </CardHeader>
            <CardContent>
              <View className="flex-row items-center justify-between">
                <Text className="text-sm text-foreground">5-Star Only</Text>
                <Switch
                  checked={filters.fiveStarOnly || false}
                  onCheckedChange={(checked) => updateFilters({ fiveStarOnly: checked })}
                />
              </View>
            </CardContent>
          </Card>

          {/* Service Type Filters */}
          <Card className="mb-4">
            <CardHeader>
              <CardTitle className="text-lg">Service Types</CardTitle>
            </CardHeader>
            <CardContent className="gap-4">
              <View className="flex-row items-center justify-between">
                <Text className="text-sm text-foreground">House Call Only</Text>
                <Switch
                  checked={filters.houseCallOnly || false}
                  onCheckedChange={(checked) => updateFilters({ houseCallOnly: checked })}
                />
              </View>
              <View className="flex-row items-center justify-between">
                <Text className="text-sm text-foreground">Remote Service Only</Text>
                <Switch
                  checked={filters.remoteServiceOnly || false}
                  onCheckedChange={(checked) => updateFilters({ remoteServiceOnly: checked })}
                />
              </View>
            </CardContent>
          </Card>

          {/* Location & Distance */}
          <Card className="mb-4">
            <CardHeader>
              <CardTitle className="text-lg">Location</CardTitle>
            </CardHeader>
            <CardContent className="gap-4">
              <Input
                placeholder="Search location..."
                value={filters.query || ''}
                onChangeText={(text) => updateFilters({ query: text })}
              />
              <View className="gap-2">
                <Text className="text-sm text-muted-foreground">
                  Search radius: {filters.locationRadius || 10} km
                </Text>
                <Slider
                  value={[filters.locationRadius || 10]}
                  onValueChange={(value) => updateFilters({ locationRadius: value[0] })}
                  minimumValue={1}
                  maximumValue={50}
                  step={1}
                />
              </View>
            </CardContent>
          </Card>

          {/* Sort Options */}
          <Card className="mb-4">
            <CardHeader>
              <CardTitle className="text-lg">Sort By</CardTitle>
            </CardHeader>
            <CardContent>
              <View className="gap-2">
                {SORT_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    onPress={() => updateFilters({ sortBy: option.value })}
                    className={`p-3 rounded-lg border ${
                      filters.sortBy === option.value
                        ? 'border-primary bg-primary/10'
                        : 'border-border'
                    }`}
                  >
                    <Text className={`text-sm ${
                      filters.sortBy === option.value ? 'text-primary font-medium' : 'text-foreground'
                    }`}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <View className="gap-3 mb-8">
            <Button onPress={handleApplyFilters} className="w-full">
              <Text className="text-primary-foreground font-medium">Apply Filters</Text>
            </Button>

            <Button variant="outline" onPress={handleResetFilters} className="w-full">
              <Text className="text-foreground">Reset All</Text>
            </Button>
          </View>
        </View>
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
}
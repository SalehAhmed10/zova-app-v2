import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import { Filter, X } from 'lucide-react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils';

export interface SearchFilters {
  category?: string | null;
  subcategory?: string | null;
  minPrice?: number | null;
  maxPrice?: number | null;
  sortBy?: 'relevance' | 'price_asc' | 'price_desc' | 'rating';
}

export interface SearchFiltersProps {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  categories?: Array<{ id: string; name: string }>;
  isVisible: boolean;
  onClose: () => void;
}

/**
 * Search filters bottom sheet
 * 
 * Features:
 * - Category/subcategory filtering
 * - Price range filtering
 * - Sort options (relevance, price, rating)
 * - Clear all filters
 * - Bottom sheet UI
 * 
 * @example
 * ```tsx
 * <SearchFilters
 *   filters={filters}
 *   onFiltersChange={setFilters}
 *   categories={categoryData}
 *   isVisible={showFilters}
 *   onClose={() => setShowFilters(false)}
 * />
 * ```
 */
export function SearchFilters({
  filters,
  onFiltersChange,
  categories = [],
  isVisible,
  onClose,
}: SearchFiltersProps) {
  const [localFilters, setLocalFilters] = useState<SearchFilters>(filters);

  const handleApplyFilters = () => {
    onFiltersChange(localFilters);
    onClose();
  };

  const handleClearFilters = () => {
    const clearedFilters: SearchFilters = {
      category: null,
      subcategory: null,
      minPrice: null,
      maxPrice: null,
      sortBy: 'relevance',
    };
    setLocalFilters(clearedFilters);
    onFiltersChange(clearedFilters);
  };

  const sortOptions = [
    { id: 'relevance', label: 'Most Relevant' },
    { id: 'price_asc', label: 'Price: Low to High' },
    { id: 'price_desc', label: 'Price: High to Low' },
    { id: 'rating', label: 'Highest Rated' },
  ] as const;

  if (!isVisible) return null;

  return (
    <View className="absolute inset-0 bg-black/50 z-50">
      <TouchableOpacity
        className="flex-1"
        onPress={onClose}
        activeOpacity={1}
      />
      
      <View className="bg-card rounded-t-3xl p-6 pb-8">
        {/* Header */}
        <View className="flex-row items-center justify-between mb-6">
          <View className="flex-row items-center gap-2">
            <Icon as={Filter} size={20} className="text-foreground" />
            <Text className="text-xl font-semibold text-foreground">
              Filters
            </Text>
          </View>

          <TouchableOpacity onPress={onClose}>
            <Icon as={X} size={24} className="text-muted-foreground" />
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          className="max-h-96"
        >
          {/* Sort By */}
          <View className="mb-6">
            <Text className="text-sm font-semibold text-foreground mb-3">
              Sort By
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {sortOptions.map((option) => (
                <TouchableOpacity
                  key={option.id}
                  onPress={() =>
                    setLocalFilters({ ...localFilters, sortBy: option.id })
                  }
                  className={cn(
                    'px-4 py-2 rounded-xl border',
                    localFilters.sortBy === option.id
                      ? 'bg-primary border-primary'
                      : 'bg-card border-border'
                  )}
                >
                  <Text
                    className={cn(
                      'text-sm',
                      localFilters.sortBy === option.id
                        ? 'text-primary-foreground font-semibold'
                        : 'text-foreground'
                    )}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Categories */}
          {categories.length > 0 && (
            <View className="mb-6">
              <Text className="text-sm font-semibold text-foreground mb-3">
                Categories
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {categories.map((category) => (
                  <TouchableOpacity
                    key={category.id}
                    onPress={() =>
                      setLocalFilters({
                        ...localFilters,
                        category: category.id === localFilters.category ? null : category.id,
                      })
                    }
                    className={cn(
                      'px-4 py-2 rounded-xl border',
                      localFilters.category === category.id
                        ? 'bg-primary border-primary'
                        : 'bg-card border-border'
                    )}
                  >
                    <Text
                      className={cn(
                        'text-sm',
                        localFilters.category === category.id
                          ? 'text-primary-foreground font-semibold'
                          : 'text-foreground'
                      )}
                    >
                      {category.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Price Range (placeholder for future implementation) */}
          <View className="mb-6">
            <Text className="text-sm font-semibold text-foreground mb-3">
              Price Range
            </Text>
            <Text className="text-sm text-muted-foreground">
              Coming soon: Set minimum and maximum price
            </Text>
          </View>
        </ScrollView>

        {/* Action Buttons */}
        <View className="flex-row gap-3 mt-4">
          <Button
            variant="outline"
            onPress={handleClearFilters}
            className="flex-1"
          >
            <Text>Clear All</Text>
          </Button>

          <Button
            onPress={handleApplyFilters}
            className="flex-1"
          >
            <Text>Apply Filters</Text>
          </Button>
        </View>
      </View>
    </View>
  );
}

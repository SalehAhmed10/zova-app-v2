import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import { Feather } from '@expo/vector-icons';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/core/utils';
import {
  useAuth,
  useProviderSearch,
  useServiceCategories,
  useServiceSearch,
  useIsFavorited,
  useToggleFavorite
} from '@/hooks';
import type { SearchFilters, ProviderSearchResult, ServiceSearchResult } from '@/hooks';

// Search Bar Component
const SearchBar = ({
  value,
  onChangeText,
  onSubmit,
  searchMode
}: {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
  searchMode: 'services' | 'providers';
}) => {
  const placeholder = searchMode === 'services'
    ? "Search services..."
    : "Search providers...";

  return (
    <View className="px-4 mb-4">
      <View className="flex-row items-center bg-background rounded-2xl px-4 py-3 border border-border/50 shadow-lg elevation-3">
        <Feather name="search" size={20} className="text-muted-foreground mr-3" />
        <Input
          placeholder={placeholder}
          value={value}
          onChangeText={onChangeText}
          onSubmitEditing={onSubmit}
          className="flex-1 border-0 p-0 text-base bg-transparent dark:bg-transparent text-foreground"
          placeholderTextColor="hsl(var(--muted-foreground))"
          returnKeyType="search"
        />
        {value.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onPress={() => onChangeText('')}
            className="w-8 h-8 p-0 ml-2 hover:bg-muted/50"
          >
            <Feather name="x" size={18} className="text-muted-foreground" />
          </Button>
        )}
      </View>
    </View>
  );
};

// Filter Bar Component
const FilterBar = ({
  filters,
  onFiltersChange,
  categories,
  isCollapsed,
  onToggleCollapse,
  priceSortDirection,
  onPriceSortToggle
}: {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  categories: any[];
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  priceSortDirection: 'asc' | 'desc';
  onPriceSortToggle: () => void;
}) => {
  return (
    <View className="px-4 mb-4">
      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-lg font-semibold text-foreground">Filters</Text>
        <Button
          variant="ghost"
          size="sm"
          onPress={onToggleCollapse}
          className="flex-row items-center gap-1"
        >
          <Feather
            name={isCollapsed ? "chevron-down" : "chevron-up"}
            size={16}
            className="text-primary"
          />
          <Text className="text-primary font-medium">
            {isCollapsed ? 'Show' : 'Hide'} Filters
          </Text>
        </Button>
      </View>

      {!isCollapsed && (
        <>
          {/* Category Pills */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
            <View className="flex-row gap-2">
              <Button
                variant={!filters.category ? "default" : "outline"}
                size="sm"
                onPress={() => onFiltersChange({ ...filters, category: undefined })}
                className="rounded-full px-4 py-2 bg-primary hover:bg-primary/90"
              >
                <Text className={!filters.category ? "text-primary-foreground font-medium" : "text-primary font-medium"}>All</Text>
              </Button>
              {categories?.slice(0, 6).map((category, index) => {
                const colors = [
                  "bg-blue-500 hover:bg-blue-600",
                  "bg-green-500 hover:bg-green-600",
                  "bg-purple-500 hover:bg-purple-600",
                  "bg-orange-500 hover:bg-orange-600",
                  "bg-pink-500 hover:bg-pink-600",
                  "bg-indigo-500 hover:bg-indigo-600"
                ];
                const isSelected = filters.category === category.name;
                return (
                  <Button
                    key={category.id}
                    variant={isSelected ? "default" : "outline"}
                    size="sm"
                    onPress={() => onFiltersChange({ ...filters, category: category.name })}
                    className={`rounded-full px-4 py-2 ${
                      isSelected
                        ? "bg-primary hover:bg-primary/90"
                        : `${colors[index % colors.length]} border-0`
                    }`}
                  >
                    <Text className={isSelected ? "text-primary-foreground font-medium" : "text-white font-medium"}>
                      {category.name}
                    </Text>
                  </Button>
                );
              })}
            </View>
          </ScrollView>

          {/* Sort Options */}
          <View className="flex-row gap-2">
            {[
              { key: 'rating', label: 'Top Rated' },
              { key: 'distance', label: 'Nearby' },
              { key: 'price', label: priceSortDirection === 'asc' ? 'Low to High' : 'High to Low' },
            ].map((option) => (
              <Button
                key={option.key}
                variant={filters.sortBy === option.key ? "default" : "outline"}
                size="sm"
                onPress={() => {
                  if (option.key === 'price') {
                    onPriceSortToggle();
                    onFiltersChange({
                      ...filters,
                      sortBy: option.key as any,
                      sortOrder: priceSortDirection === 'asc' ? 'desc' : 'asc'
                    });
                  } else {
                    onFiltersChange({
                      ...filters,
                      sortBy: option.key as any,
                      sortOrder: option.key === 'price' ? 'asc' : 'desc'
                    });
                  }
                }}
              >
                <Text className="text-foreground font-medium">{option.label}</Text>
              </Button>
            ))}
          </View>
        </>
      )}
    </View>
  );
};

// Provider Card Component
const ProviderCard = React.memo(({ provider }: { provider: ProviderSearchResult }) => {
  const { user } = useAuth();
  const { data: isFavorited } = useIsFavorited(user?.id, 'provider', provider.id);
  const toggleFavorite = useToggleFavorite();

  const handleToggleFavorite = () => {
    if (!user?.id) return;
    toggleFavorite.mutate({
      userId: user.id,
      type: 'provider',
      itemId: provider.id,
      isFavorited: !!isFavorited
    });
  };

  return (
    <Card className="bg-card border border-border/50 mb-3 shadow-lg elevation-2">
      <CardContent className="p-3">
        {/* Top Section - Avatar and Basic Info */}
        <View className="flex-row items-start gap-3 mb-3">
          <Avatar className="w-12 h-12" alt={`${provider.first_name} ${provider.last_name}`}>
            {provider.avatar_url ? (
              <AvatarImage source={{ uri: provider.avatar_url }} />
            ) : null}
            <AvatarFallback className="bg-primary/10">
              <Text className="text-sm font-bold text-primary">
                {provider.first_name[0]}{provider.last_name[0]}
              </Text>
            </AvatarFallback>
          </Avatar>

          <View className="flex-1">
            <Text className="text-lg font-bold text-foreground mb-1">
              {provider.first_name} {provider.last_name}
            </Text>
            {provider.business_name && (
              <Text className="text-sm text-muted-foreground mb-1">
                {provider.business_name}
              </Text>
            )}

            {/* Rating and Services in one line */}
            <View className="flex-row items-center gap-3">
              <View className="flex-row items-center gap-1">
                <Feather name="star" size={14} className="text-yellow-500" />
                <Text className="text-sm font-medium text-foreground">
                  {provider.rating?.toFixed(1) || 'New'}
                </Text>
                <Text className="text-xs text-muted-foreground">
                  ({provider.review_count || 0})
                </Text>
              </View>
              <Text className="text-xs text-muted-foreground">•</Text>
              <Text className="text-sm text-muted-foreground">
                {provider.services?.length || 0} service{provider.services?.length === 1 ? '' : 's'}
              </Text>
            </View>
          </View>

          {/* Favorite Button */}
          <TouchableOpacity
            onPress={handleToggleFavorite}
            className="w-8 h-8 items-center justify-center"
            disabled={toggleFavorite.isPending}
          >
            <Feather
              name="heart"
              size={20}
              className={isFavorited ? "text-red-500" : "text-muted-foreground"}
              style={isFavorited ? { color: '#ef4444' } : undefined}
            />
          </TouchableOpacity>
        </View>

        {/* CTA Button */}
        <Button
          onPress={() => router.push(`/profiles/provider?providerId=${provider.id}`)}
          className="w-full bg-primary hover:bg-primary/90 mt-2"
        >
          <Text className="text-primary-foreground font-semibold">View Profile</Text>
          <Feather name="arrow-right" size={16} className="text-primary-foreground ml-2" />
        </Button>
      </CardContent>
    </Card>
  );
});



// Service Card Component
const ServiceCard = React.memo(({ service }: { service: ServiceSearchResult }) => {
  const { user } = useAuth();
  const { data: isFavorited } = useIsFavorited(user?.id, 'service', service.id);
  const toggleFavorite = useToggleFavorite();

  const handleToggleFavorite = () => {
    if (!user?.id) return;
    toggleFavorite.mutate({
      userId: user.id,
      type: 'service',
      itemId: service.id,
      isFavorited: !!isFavorited
    });
  };

  return (
    <Card className="bg-card border border-border/50 mb-3 shadow-lg elevation-2">
      <CardContent className="p-3">
        {/* Top Section - Service Title and Price */}
        <View className="mb-2">
          <View className="flex-row items-start justify-between mb-1">
            <Text className="text-lg font-bold text-foreground flex-1 mr-3" numberOfLines={2}>
              {service.title}
            </Text>
            <View className="items-end">
              <Text className="text-lg font-bold text-primary">
                {service.price_type === 'hourly' ? `£${service.base_price}/hr` : `£${service.base_price}`}
              </Text>
              <Text className="text-xs text-muted-foreground">
                {service.price_type === 'hourly' ? 'per hour' : 'fixed'}
              </Text>
            </View>
          </View>

          {/* Service Description */}
          <Text className="text-sm text-muted-foreground mb-2 leading-5" numberOfLines={2} ellipsizeMode="tail">
            {service.description || 'No description available'}
          </Text>
        </View>

        {/* Provider Info Section */}
        <View className="flex-row items-center gap-3 mb-2">
          <Avatar className="w-10 h-10" alt={`${service.provider.first_name} ${service.provider.last_name}`}>
            {service.provider.avatar_url ? (
              <AvatarImage source={{ uri: service.provider.avatar_url }} />
            ) : null}
            <AvatarFallback className="bg-primary/10">
              <Text className="text-xs font-bold text-primary">
                {service.provider.first_name[0]}{service.provider.last_name[0]}
              </Text>
            </AvatarFallback>
          </Avatar>

          <View className="flex-1">
            <Text className="text-sm font-medium text-foreground">
              {service.provider.first_name} {service.provider.last_name}
            </Text>
            {service.provider.business_name && (
              <Text className="text-xs text-muted-foreground">
                {service.provider.business_name}
              </Text>
            )}
          </View>

          {/* Rating and Favorite Button */}
          <View className="flex-row items-center gap-2">
            <View className="flex-row items-center gap-1">
              <Feather name="star" size={12} className="text-yellow-500" />
              <Text className="text-sm font-medium text-foreground">
                {service.provider.rating?.toFixed(1) || 'New'}
              </Text>
            </View>

            <TouchableOpacity
              onPress={handleToggleFavorite}
              className="w-6 h-6 items-center justify-center"
              disabled={toggleFavorite.isPending}
            >
              <Feather
                name="heart"
                size={16}
                className={isFavorited ? "text-red-500" : "text-muted-foreground"}
                style={isFavorited ? { color: '#ef4444' } : undefined}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Category Badges */}
        <View className="flex-row gap-1 mb-2">
          <Badge className="text-xs px-2 py-1 bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900 dark:text-blue-100 dark:border-blue-800">
            <Text numberOfLines={1} ellipsizeMode="tail" className="text-blue-800 dark:text-blue-100">{service.category_name}</Text>
          </Badge>
          <Badge className="text-xs px-2 py-1 bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-100 dark:border-green-800">
            <Text numberOfLines={1} ellipsizeMode="tail" className="text-green-800 dark:text-green-100">{service.subcategory_name}</Text>
          </Badge>
        </View>

        {/* Full Width CTA Button */}
        <Button
          onPress={() => router.push('/customer/bookings')}
          className="w-full bg-primary hover:bg-primary/90"
        >
          <Text className="text-primary-foreground font-semibold">Book Now</Text>
        </Button>
      </CardContent>
    </Card>
  );
});


// Loading Skeleton
const ServiceCardSkeleton = () => (
  <View className="mb-3">
    <Card className="bg-card border border-border/50 shadow-lg elevation-2">
      <CardContent className="p-3">
        {/* Top Section - Title and Price */}
        <View className="mb-2">
          <View className="flex-row items-start justify-between mb-1">
            <Skeleton className="w-32 h-5 flex-1 mr-3" />
            <View className="items-end">
              <Skeleton className="w-16 h-5" />
              <Skeleton className="w-12 h-3 mt-1" />
            </View>
          </View>
          <Skeleton className="w-full h-4 mb-1" />
          <Skeleton className="w-3/4 h-4 mb-2" />
        </View>

        {/* Provider Info Section */}
        <View className="flex-row items-center gap-3 mb-2">
          <Skeleton className="w-10 h-10 rounded-full" />
          <View className="flex-1">
            <Skeleton className="w-24 h-4 mb-1" />
            <Skeleton className="w-20 h-3" />
          </View>
          <Skeleton className="w-12 h-4" />
        </View>

        {/* Bottom Section */}
        <View className="flex-row items-center justify-between">
          <View className="flex-row gap-2">
            <Skeleton className="w-16 h-6 rounded-full" />
            <Skeleton className="w-20 h-6 rounded-full" />
          </View>
          <Skeleton className="w-20 h-8 rounded-lg" />
        </View>
      </CardContent>
    </Card>
  </View>
);

// Provider Card Skeleton
const ProviderCardSkeleton = () => (
  <View className="mb-3">
    <Card className="bg-card border border-border/50 shadow-lg elevation-2">
      <CardContent className="p-3">
        {/* Top Section - Avatar and Basic Info */}
        <View className="flex-row items-start gap-3 mb-2">
          <Skeleton className="w-12 h-12 rounded-full" />
          <View className="flex-1">
            <Skeleton className="w-32 h-5 mb-1" />
            <Skeleton className="w-24 h-4 mb-1" />
            <Skeleton className="w-20 h-3" />
          </View>
        </View>

        {/* CTA Button Skeleton */}
        <Skeleton className="w-full h-10 rounded-lg mt-1" />
      </CardContent>
    </Card>
  </View>
);

export default function SearchScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilters>({
    sortBy: 'rating',
    sortOrder: 'desc'
  });
  const [isFiltersCollapsed, setIsFiltersCollapsed] = useState(true);
  const [priceSortDirection, setPriceSortDirection] = useState<'asc' | 'desc'>('asc');
  const [searchMode, setSearchMode] = useState<'services' | 'providers'>('services');

  const { data: categories, isLoading: categoriesLoading } = useServiceCategories();
  const { data: services, isLoading: servicesLoading, refetch: refetchServices } = useServiceSearch(filters);
  const { data: providers, isLoading: providersLoading, refetch: refetchProviders } = useProviderSearch(filters);

  const handleSearch = useCallback(() => {
    setFilters(prev => ({ ...prev, query: searchQuery }));
  }, [searchQuery]);

  const handlePriceSortToggle = useCallback(() => {
    setPriceSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
  }, []);

  const handleFiltersChange = useCallback((newFilters: SearchFilters) => {
    setFilters(newFilters);
  }, []);

  const handleModeSwitch = useCallback((mode: 'services' | 'providers') => {
    setSearchMode(mode);
  }, []);

  const handleRefresh = useCallback(() => {
    if (searchMode === 'services') {
      refetchServices();
    } else {
      refetchProviders();
    }
  }, [searchMode, refetchServices, refetchProviders]);

  // Memoized values to prevent unnecessary re-renders
  const resultsCount = useMemo(() => {
    if (searchMode === 'services') {
      return servicesLoading ? null : (services?.length || 0);
    } else {
      return providersLoading ? null : (providers?.length || 0);
    }
  }, [searchMode, services?.length, providers?.length, servicesLoading, providersLoading]);

  const hasResults = useMemo(() => {
    return resultsCount !== null && resultsCount > 0;
  }, [resultsCount]);

  const isLoadingResults = useMemo(() => {
    return searchMode === 'services' ? servicesLoading : providersLoading;
  }, [searchMode, servicesLoading, providersLoading]);

  useEffect(() => {
    // Debounce search
    const timer = setTimeout(() => {
      if (searchQuery !== filters.query) {
        setFilters(prev => ({ ...prev, query: searchQuery }));
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1">
        {/* Header */}
        <View className="px-4 py-4 border-b border-border">
          <View className="flex-row items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onPress={() => router.back()}
              className="w-8 h-8 p-0"
            >
              <Feather name="chevron-left" size={24} className="text-primary" />
            </Button>
            <Text className="text-xl font-bold text-foreground">
              {searchMode === 'services' ? 'Find Services' : 'Find Providers'}
            </Text>
            <View className="w-6" />
          </View>
        </View>

        {/* Search Mode Tabs */}
        <View className="px-4 mb-2">
          <View className="flex-row bg-muted rounded-lg p-1">
            <Button
              variant={searchMode === 'services' ? 'default' : 'ghost'}
              size="sm"
              onPress={() => handleModeSwitch('services')}
              className="flex-1"
            >
              <Text className={searchMode === 'services' ? 'text-primary-foreground' : 'text-muted-foreground'}>
                Services
              </Text>
            </Button>
            <Button
              variant={searchMode === 'providers' ? 'default' : 'ghost'}
              size="sm"
              onPress={() => handleModeSwitch('providers')}
              className="flex-1"
            >
              <Text className={searchMode === 'providers' ? 'text-primary-foreground' : 'text-muted-foreground'}>
                Providers
              </Text>
            </Button>
          </View>
        </View>

        {/* Search Bar */}
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmit={handleSearch}
          searchMode={searchMode}
        />

        {/* Filters */}
        {!categoriesLoading && categories && (
          <FilterBar
            filters={filters}
            onFiltersChange={handleFiltersChange}
            categories={categories}
            isCollapsed={isFiltersCollapsed}
            onToggleCollapse={() => setIsFiltersCollapsed(!isFiltersCollapsed)}
            priceSortDirection={priceSortDirection}
            onPriceSortToggle={handlePriceSortToggle}
          />
        )}

        {/* Results */}
        <View className="flex-1 px-4">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-lg font-semibold text-foreground">
              {isLoadingResults
                ? 'Loading...'
                : searchMode === 'services'
                ? `${resultsCount} Service${resultsCount === 1 ? '' : 's'} Found`
                : `${resultsCount} Provider${resultsCount === 1 ? '' : 's'} Found`
              }
            </Text>
            {hasResults && (
              <Button
                variant="ghost"
                size="sm"
                onPress={handleRefresh}
              >
                <Text className="text-primary text-sm font-medium">Refresh</Text>
              </Button>
            )}
          </View>

          {searchMode === 'services' ? (
            servicesLoading ? (
              <View>
                {[...Array(5)].map((_, i) => (
                  <ServiceCardSkeleton key={i} />
                ))}
              </View>
            ) : services && services.length > 0 ? (
              <FlashList
                data={services}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => <ServiceCard service={item} />}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 100 }}
              />
            ) : (
              <View className="flex-1 justify-center items-center py-12">
                <Feather name="search" size={48} className="text-primary mb-4" />
                <Text className="text-xl font-semibold text-foreground mb-2">
                  No services found
                </Text>
                <Text className="text-muted-foreground text-center mb-6">
                  Try adjusting your search criteria or filters
                </Text>
                <Button onPress={() => setFilters({ sortBy: 'rating', sortOrder: 'desc' })}>
                  <Text className="text-primary-foreground font-medium">Clear Filters</Text>
                </Button>
              </View>
            )
          ) : (
            providersLoading ? (
              <View>
                {[...Array(5)].map((_, i) => (
                  <ProviderCardSkeleton key={i} />
                ))}
              </View>
            ) : providers && providers.length > 0 ? (
              <FlashList
                data={providers}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => <ProviderCard provider={item} />}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 100 }}
              />
            ) : (
              <View className="flex-1 justify-center items-center py-12">
                <Feather name="users" size={48} className="text-primary mb-4" />
                <Text className="text-xl font-semibold text-foreground mb-2">
                  No providers found
                </Text>
                <Text className="text-muted-foreground text-center mb-6">
                  Try adjusting your search criteria or filters
                </Text>
                <Button onPress={() => setFilters({ sortBy: 'rating', sortOrder: 'desc' })}>
                  <Text className="text-primary-foreground font-medium">Clear Filters</Text>
                </Button>
              </View>
            )
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}
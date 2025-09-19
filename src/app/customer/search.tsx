import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useProviderSearch, useServiceCategories, SearchFilters, ProviderSearchResult, useServiceSearch, ServiceSearchResult } from '@/hooks/useSearch';
import { Feather } from '@expo/vector-icons';

// Search Bar Component
const SearchBar = ({
  value,
  onChangeText,
  onSubmit
}: {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
}) => (
  <View className="px-4 mb-4">
    <View className="flex-row items-center bg-card rounded-2xl px-4 py-3 border border-border">
      <Feather name="search" size={20} className="text-primary mr-3" />
      <Input
        placeholder="Search services or providers..."
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmit}
        className="flex-1 border-0 p-0 text-base"
        returnKeyType="search"
      />
      {value.length > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onPress={() => onChangeText('')}
          className="w-8 h-8 p-0"
        >
          <Feather name="x" size={18} className="text-primary" />
        </Button>
      )}
    </View>
  </View>
);

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
                className="rounded-full px-4 py-2"
              >
                <Text>All</Text>
              </Button>
              {categories?.slice(0, 6).map((category) => (
                <Button
                  key={category.id}
                  variant={filters.category === category.name ? "default" : "outline"}
                  size="sm"
                  onPress={() => onFiltersChange({ ...filters, category: category.name })}
                  className="rounded-full px-4 py-2"
                >
                  <Text>{category.name}</Text>
                </Button>
              ))}
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
                <Text>{option.label}</Text>
              </Button>
            ))}
          </View>
        </>
      )}
    </View>
  );
};

// Provider Card Component
const ProviderCard = React.memo(({ provider }: { provider: ProviderSearchResult }) => (
  <Card className="bg-card border border-border/50 mb-4">
    <CardContent className="p-4">
      <View className="flex-row gap-3">
        {/* Provider Avatar */}
        <Avatar className="w-14 h-14" alt={`${provider.first_name} ${provider.last_name}`}>
          {provider.avatar_url ? (
            <AvatarImage source={{ uri: provider.avatar_url }} />
          ) : null}
          <AvatarFallback className="bg-primary/10">
            <Text className="text-sm font-bold text-primary">
              {provider.first_name[0]}{provider.last_name[0]}
            </Text>
          </AvatarFallback>
        </Avatar>

        {/* Provider Details */}
        <View className="flex-1">
          {/* Provider Name - Clickable */}
          <Button
            variant="ghost"
            size="sm"
            onPress={() => router.push(`/profiles/provider?providerId=${provider.id}`)}
            className="p-0 h-auto justify-start mb-1"
          >
            <Text className="text-lg font-bold text-foreground">
              {provider.first_name} {provider.last_name}
            </Text>
          </Button>

          {provider.business_name && (
            <Text className="text-sm text-muted-foreground mb-1">
              {provider.business_name}
            </Text>
          )}

          {/* Rating and Review Count */}
          <View className="flex-row items-center gap-2 mb-2">
            <Feather name="star" size={12} className="text-yellow-500" />
            <Text className="text-xs text-muted-foreground">
              {provider.rating?.toFixed(1) || 'New'} ({provider.review_count || 0} reviews)
            </Text>
          </View>

          {/* Services Count */}
          <Text className="text-xs text-muted-foreground">
            {provider.services?.length || 0} service{provider.services?.length === 1 ? '' : 's'} available
          </Text>
        </View>

        {/* Arrow */}
        <View className="justify-center">
          <Feather name="chevron-right" size={20} className="text-primary" />
        </View>
      </View>
    </CardContent>
  </Card>
));



// Service Card Component
const ServiceCard = React.memo(({ service }: { service: ServiceSearchResult }) => (
  <Card className="bg-card border border-border/50 mb-4">
    <CardContent className="p-4">
      <View className="flex-row gap-3">
        {/* Provider Avatar */}
        <View className="items-center">
          <Avatar className="w-14 h-14" alt={`${service.provider.first_name} ${service.provider.last_name}`}>
            {service.provider.avatar_url ? (
              <AvatarImage source={{ uri: service.provider.avatar_url }} />
            ) : null}
            <AvatarFallback className="bg-primary/10">
              <Text className="text-sm font-bold text-primary">
                {service.provider.first_name[0]}{service.provider.last_name[0]}
              </Text>
            </AvatarFallback>
          </Avatar>
          {/* Rating below avatar */}
          <View className="flex-row items-center mt-1">
            <Feather name="star" size={10} className="text-yellow-500" />
            <Text className="text-xs text-muted-foreground ml-1">
              {service.provider.rating?.toFixed(1) || 'New'}
            </Text>
          </View>
        </View>

        {/* Service Details */}
        <View className="flex-1">
          {/* Service Title - Clickable */}
          <Button
            variant="ghost"
            size="sm"
            onPress={() => router.push('/customer/bookings')}
            className="p-0 h-auto justify-start"
          >
            <Text className="text-lg font-bold text-foreground" numberOfLines={2}>
              {service.title}
            </Text>
          </Button>

          {/* Provider Name and Price Row */}
          <View className="flex-row items-center justify-between mb-2">
            <Button
              variant="ghost"
              size="sm"
              onPress={() => router.push(`/profiles/provider?providerId=${service.provider.id}`)}
              className="flex-1 mr-2 p-0 h-auto justify-start"
            >
              <Text className="text-sm font-medium text-muted-foreground text-left">
                by {service.provider.first_name} {service.provider.last_name}
                {service.provider.business_name && ` • ${service.provider.business_name}`}
              </Text>
            </Button>
            <View className="flex-row items-baseline">
              <Text className="text-sm font-bold text-primary">
                {service.price_type === 'hourly' ? `£${service.base_price}/hr` : `£${service.base_price}`}
              </Text>
              <Text className="text-xs text-muted-foreground ml-1">
                {service.price_type === 'hourly' ? 'per hour' : 'fixed'}
              </Text>
            </View>
          </View>

          {/* Service Description - Smaller text */}
          <Text className="text-xs text-muted-foreground mb-2 leading-4" numberOfLines={2} ellipsizeMode="tail">
            {service.description || 'No description available'}
          </Text>

          {/* Category Badges */}
          <View className="flex-row gap-1">
            <Badge variant="secondary" className="text-xs px-2 py-0.5">
              <Text numberOfLines={1} ellipsizeMode="tail">{service.category_name}</Text>
            </Badge>
            <Badge variant="outline" className="text-xs px-2 py-0.5">
              <Text numberOfLines={1} ellipsizeMode="tail">{service.subcategory_name}</Text>
            </Badge>
          </View>
        </View>
      </View>
    </CardContent>
  </Card>
));


// Loading Skeleton
const ServiceCardSkeleton = () => (
  <View className="mb-4">
    <Card className="bg-card border border-border/50 shadow-sm">
      <CardContent className="p-4">
        <View className="flex-row gap-3">
          {/* Avatar Skeleton */}
          <View className="items-center">
            <Skeleton className="w-14 h-14 rounded-full" />
            <Skeleton className="w-8 h-3 mt-1" />
          </View>

          {/* Content Skeleton */}
          <View className="flex-1">
            {/* Title and Price Row */}
            <View className="flex-row items-start justify-between mb-2">
              <Skeleton className="w-32 h-5 flex-1 mr-2" />
              <View className="items-end">
                <Skeleton className="w-16 h-5" />
                <Skeleton className="w-12 h-3 mt-1" />
              </View>
            </View>

            {/* Provider Name */}
            <Skeleton className="w-24 h-4 mb-2" />

            {/* Description */}
            <Skeleton className="w-full h-4 mb-1" />
            <Skeleton className="w-3/4 h-4 mb-3" />

            {/* Badges */}
            <View className="flex-row gap-1">
              <Skeleton className="w-16 h-6 rounded-full" />
              <Skeleton className="w-20 h-6 rounded-full" />
            </View>
          </View>
        </View>
      </CardContent>
    </Card>
  </View>
);

// Provider Card Skeleton
const ProviderCardSkeleton = () => (
  <View className="mb-4">
    <Card className="bg-card border border-border/50 shadow-sm">
      <CardContent className="p-4">
        <View className="flex-row gap-3">
          {/* Avatar Skeleton */}
          <Skeleton className="w-14 h-14 rounded-full" />

          {/* Content Skeleton */}
          <View className="flex-1">
            {/* Provider Name */}
            <Skeleton className="w-32 h-5 mb-2" />

            {/* Business Name */}
            <Skeleton className="w-24 h-4 mb-3" />

            {/* Rating and Services */}
            <View className="flex-row items-center justify-between">
              <Skeleton className="w-20 h-3" />
              <Skeleton className="w-16 h-3" />
            </View>
          </View>

          {/* Arrow Skeleton */}
          <View className="justify-center">
            <Skeleton className="w-5 h-5" />
          </View>
        </View>
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

        {/* Search Bar */}
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmit={handleSearch}
        />

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
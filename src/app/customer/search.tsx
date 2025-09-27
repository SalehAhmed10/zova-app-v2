/**
 * Customer Search Screen - OPTIMIZED VERSION
 * ✅ Follows copilot-rules.md - React Query + Zustand architecture
 * ✅ NO useEffect patterns
 * ✅ NO useState for server data
 * ✅ Proper separation of concerns
 */

import React, { useMemo, useCallback } from 'react';
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

// ✅ NEW: Optimized hooks following copilot-rules.md
import { useSearchStore } from '@/stores/customer/search-store';
import { 
  useSearchResults, 
  useSearchActions,
  useServiceCategories,
  useIsFavorited,
  useToggleFavorite,
  useAuthOptimized
} from '@/hooks';

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
          returnKeyType="search"
        />
      </View>
    </View>
  );
};

// Service Card Component
const ServiceCard = ({ service }: { service: any }) => {
  const { user } = useAuthOptimized();
  const { data: isFavorited } = useIsFavorited('service', service.id);
  const toggleFavorite = useToggleFavorite();

  const handleToggleFavorite = useCallback(() => {
    if (!user?.id) return;
    
    toggleFavorite.mutate({
      userId: user.id,
      type: 'service',
      itemId: service.id,
      isFavorited: isFavorited || false,
    });
  }, [service, toggleFavorite, user?.id, isFavorited]);

  return (
    <Card className="mb-4 shadow-sm">
      <CardContent className="p-4">
        <View className="flex-row justify-between items-start mb-2">
          <Text className="text-lg font-semibold text-foreground flex-1 mr-2">
            {service.title}
          </Text>
          <TouchableOpacity onPress={handleToggleFavorite}>
            <Feather 
              name={isFavorited ? "heart" : "heart"} 
              size={20} 
              className={isFavorited ? "text-red-500" : "text-muted-foreground"} 
              fill={isFavorited ? "currentColor" : "none"}
            />
          </TouchableOpacity>
        </View>
        
        <Text className="text-muted-foreground mb-3" numberOfLines={2}>
          {service.description}
        </Text>
        
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <Avatar className="w-8 h-8 mr-2" alt={service.provider.name || 'Provider'}>
              <AvatarImage source={{ uri: service.provider.avatar }} />
              <AvatarFallback>
                <Text className="text-xs">{service.provider.name?.charAt(0) || '?'}</Text>
              </AvatarFallback>
            </Avatar>
            <Text className="text-sm text-muted-foreground">
              {service.provider.name}
            </Text>
          </View>
          
          <View className="flex-row items-center">
            <Text className="text-lg font-bold text-primary mr-2">
              ${service.price}
            </Text>
            <View className="flex-row items-center">
              <Feather name="star" size={14} className="text-yellow-500 mr-1" />
              <Text className="text-sm text-muted-foreground">
                {service.rating}
              </Text>
            </View>
          </View>
        </View>
      </CardContent>
    </Card>
  );
};

// Provider Card Component  
const ProviderCard = ({ provider }: { provider: any }) => {
  const { user } = useAuthOptimized();
  const { data: isFavorited } = useIsFavorited('provider', provider.id);
  const toggleFavorite = useToggleFavorite();

  const handleToggleFavorite = useCallback(() => {
    if (!user?.id) return;
    
    toggleFavorite.mutate({
      userId: user.id,
      type: 'provider',
      itemId: provider.id,
      isFavorited: isFavorited || false,
    });
  }, [provider, toggleFavorite, user?.id, isFavorited]);

  return (
    <Card className="mb-4 shadow-sm">
      <CardContent className="p-4">
        <View className="flex-row items-start justify-between mb-3">
          <View className="flex-row items-start flex-1">
            <Avatar className="w-12 h-12 mr-3" alt={provider.name || 'Provider'}>
              <AvatarImage source={{ uri: provider.avatar }} />
              <AvatarFallback>
                <Text className="text-base font-medium">
                  {provider.name?.charAt(0) || '?'}
                </Text>
              </AvatarFallback>
            </Avatar>
            
            <View className="flex-1">
              <Text className="text-lg font-semibold text-foreground mb-1">
                {provider.name}
              </Text>
              <Text className="text-muted-foreground text-sm mb-2" numberOfLines={2}>
                {provider.bio}
              </Text>
              <View className="flex-row items-center mb-2">
                <Feather name="star" size={14} className="text-yellow-500 mr-1" />
                <Text className="text-sm text-muted-foreground mr-2">
                  {provider.rating} ({provider.reviewCount} reviews)
                </Text>
                <Feather name="map-pin" size={14} className="text-muted-foreground mr-1" />
                <Text className="text-sm text-muted-foreground">
                  {provider.location}
                </Text>
              </View>
            </View>
          </View>
          
          <TouchableOpacity onPress={handleToggleFavorite} className="ml-2">
            <Feather 
              name="heart" 
              size={20} 
              className={isFavorited ? "text-red-500" : "text-muted-foreground"} 
              fill={isFavorited ? "currentColor" : "none"}
            />
          </TouchableOpacity>
        </View>
        
        <View className="flex-row items-center justify-between">
          <View className="flex-row flex-wrap flex-1">
            {provider.services?.slice(0, 2).map((service: string, index: number) => (
              <Badge key={index} variant="secondary" className="mr-2 mb-1">
                <Text className="text-xs">{service}</Text>
              </Badge>
            ))}
          </View>
          
          <Badge variant={provider.isAvailable ? "default" : "destructive"}>
            <Text className="text-xs">
              {provider.isAvailable ? 'Available' : 'Busy'}
            </Text>
          </Badge>
        </View>
      </CardContent>
    </Card>
  );
};

// Skeleton Components
const ServiceCardSkeleton = () => (
  <View className="mb-4">
    <Card>
      <CardContent className="p-4">
        <View className="flex-row justify-between items-start mb-2">
          <Skeleton className="w-2/3 h-6 rounded" />
          <Skeleton className="w-6 h-6 rounded-full" />
        </View>
        <Skeleton className="w-full h-4 rounded mb-1" />
        <Skeleton className="w-3/4 h-4 rounded mb-3" />
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <Skeleton className="w-8 h-8 rounded-full mr-2" />
            <Skeleton className="w-20 h-4 rounded" />
          </View>
          <View className="flex-row items-center">
            <Skeleton className="w-12 h-6 rounded mr-2" />
            <Skeleton className="w-8 h-4 rounded" />
          </View>
        </View>
      </CardContent>
    </Card>
  </View>
);

const ProviderCardSkeleton = () => (
  <View className="mb-4">
    <Card>
      <CardContent className="p-4">
        <View className="flex-row items-start justify-between mb-3">
          <View className="flex-row items-start flex-1">
            <Skeleton className="w-12 h-12 rounded-full mr-3" />
            <View className="flex-1">
              <Skeleton className="w-3/4 h-6 rounded mb-1" />
              <Skeleton className="w-full h-4 rounded mb-1" />
              <Skeleton className="w-5/6 h-4 rounded mb-2" />
              <View className="flex-row items-center">
                <Skeleton className="w-16 h-4 rounded mr-2" />
                <Skeleton className="w-20 h-4 rounded" />
              </View>
            </View>
          </View>
          <Skeleton className="w-6 h-6 rounded-full" />
        </View>
        <View className="flex-row items-center justify-between">
          <View className="flex-row">
            <Skeleton className="w-16 h-6 rounded-full mr-2" />
            <Skeleton className="w-20 h-6 rounded-full" />
          </View>
          <Skeleton className="w-16 h-6 rounded-full" />
        </View>
      </CardContent>
    </Card>
  </View>
);

export default function SearchScreenOptimized() {
  // ✅ NEW: Zustand store for global state
  const {
    searchQuery,
    searchMode,
    filters,
    isFiltersCollapsed,
    priceSortDirection
  } = useSearchStore();
  
  // ✅ NEW: Actions from Zustand store
  const {
    setSearchQuery,
    handleModeSwitch,
    handleFiltersChange,
    toggleFiltersCollapsed,
    togglePriceSortDirection,
    clearFilters
  } = useSearchActions();
  
  // ✅ NEW: React Query for server state
  const { data: categories, isLoading: categoriesLoading } = useServiceCategories();
  const { data, isLoading, error, refetch, resultsCount, hasResults } = useSearchResults();

  // ✅ NEW: Pure computation, no useEffect
  const handleSearch = useCallback(() => {
    // Search query is automatically debounced and triggers React Query
    // No manual triggering needed
  }, []);

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleClearFilters = useCallback(() => {
    clearFilters();
  }, [clearFilters]);

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

        {/* Results */}
        <View className="flex-1 px-4">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-lg font-semibold text-foreground">
              {isLoading
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
            isLoading ? (
              <View>
                {[...Array(5)].map((_, i) => (
                  <ServiceCardSkeleton key={i} />
                ))}
              </View>
            ) : data && data.length > 0 ? (
              <FlashList
                data={searchMode === 'services' ? (data as any[]) : []}
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
                <Button onPress={handleClearFilters}>
                  <Text className="text-primary-foreground font-medium">Clear Filters</Text>
                </Button>
              </View>
            )
          ) : (
            isLoading ? (
              <View>
                {[...Array(5)].map((_, i) => (
                  <ProviderCardSkeleton key={i} />
                ))}
              </View>
            ) : data && data.length > 0 ? (
              <FlashList
                data={searchMode === 'providers' ? (data as any[]) : []}
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
                <Button onPress={handleClearFilters}>
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
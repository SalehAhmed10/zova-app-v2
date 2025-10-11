import React, { useState } from 'react';
import { View, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Filter, MapPin, Locate } from 'lucide-react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import {
  SearchInput,
  SearchResults,
  SearchFilters,
  ProviderSearchCard,
  type SearchFilters as SearchFiltersType,
} from '@/components/customer/search';
import { useServiceSearch, useProviderSearch, useServiceCategories } from '@/hooks';
import { useSearchStore, useSearchHydration } from '@/stores/customer/search-store';
import { useLocationPermission } from '@/hooks/shared/useLocation';
import { FlashList } from '@shopify/flash-list';

/**
 * Modern Search Screen
 * 
 * Features:
 * - Keyword-based search with 108 keywords across 12 subcategories
 * - Service/Provider tabs
 * - Debounced input (300ms)
 * - Filter bottom sheet
 * - Location-based search (future)
 * - Pull-to-refresh
 * - Optimized FlashList rendering
 */
export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'services' | 'providers'>('services');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<SearchFiltersType>({
    sortBy: 'relevance',
  });

  const isHydrated = useSearchHydration();
  const params = useLocalSearchParams();
  const { hasPermission, requestPermission, getCurrentLocation } = useLocationPermission();
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  // Fetch service categories dynamically
  const { data: categories } = useServiceCategories();

  // Set initial tab from URL params
  React.useEffect(() => {
    if (params.mode === 'providers') {
      setActiveTab('providers');
    }
  }, [params.mode]);

  // Service search with keyword matching
  // BROWSE MODE: When query is empty, shows all services (newest first)
  // SEARCH MODE: When query has text, searches with relevance ranking
  const {
    data: serviceResults,
    isLoading: servicesLoading,
    refetch: refetchServices,
    isRefetching: isRefetchingServices,
  } = useServiceSearch({
    query,
    limit: 20,
    enabled: activeTab === 'services', // Always enabled for browse/search
  });

  // Provider search
  // BROWSE MODE: When query is empty, shows all providers (newest first)
  // SEARCH MODE: When query has text, searches with relevance ranking
  const {
    data: providerResults,
    isLoading: providersLoading,
    refetch: refetchProviders,
    isRefetching: isRefetchingProviders,
  } = useProviderSearch({
    query,
    limit: 15,
    enabled: activeTab === 'providers', // Always enabled for browse/search
  });

  // Location handling
  const handleRequestLocation = async () => {
    if (!hasPermission) {
      const granted = await requestPermission();
      if (!granted) return;
    }

    setIsGettingLocation(true);
    try {
      const location = await getCurrentLocation();
      if (location) {
        const { latitude, longitude } = location.coords;
        console.log('📍 User location:', { latitude, longitude });
        // TODO: Integrate location-based filtering
      }
    } catch (error) {
      console.error('Error getting location:', error);
    } finally {
      setIsGettingLocation(false);
    }
  };

  // Wait for hydration
  if (!isHydrated) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" className="text-primary" />
          <Text className="text-muted-foreground mt-4">Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isLoading = servicesLoading || providersLoading;
  const resultsCount = activeTab === 'services' 
    ? serviceResults?.length || 0 
    : providerResults?.length || 0;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      {/* Header */}
      <View className="px-4 py-3 border-b border-border bg-card">
        <View className="flex-row items-center gap-3 mb-3">
          <SearchInput
            value={query}
            onChangeText={setQuery}
            placeholder={`Search ${activeTab}...`}
            isLoading={isLoading}
            className="flex-1"
            autoFocus={false}
          />

          <Button
            variant="outline"
            size="icon"
            onPress={() => setShowFilters(true)}
            className="w-12 h-12"
          >
            <Icon as={Filter} size={20} />
          </Button>

          <Button
            variant="outline"
            size="icon"
            onPress={handleRequestLocation}
            disabled={isGettingLocation}
            className="w-12 h-12"
          >
            {isGettingLocation ? (
              <ActivityIndicator size="small" className="text-primary" />
            ) : (
              <Icon as={Locate} size={20} />
            )}
          </Button>
        </View>

        {/* Results Count */}
        {query.length > 0 && (
          <View className="flex-row items-center justify-between">
            <Text className="text-sm text-muted-foreground">
              {isLoading 
                ? 'Searching...' 
                : `${resultsCount} ${activeTab} found`}
            </Text>
            {filters.sortBy !== 'relevance' && (
              <Text className="text-xs text-muted-foreground">
                Sorted by: {filters.sortBy.replace('_', ' ')}
              </Text>
            )}
          </View>
        )}
      </View>

      {/* Custom Tabs */}
      <View className="px-4 pt-3 pb-2 bg-background border-b border-border">
        <View className="flex-row bg-muted rounded-lg p-1">
          <TouchableOpacity
            onPress={() => setActiveTab('services')}
            className={`flex-1 py-2 px-4 rounded-md ${
              activeTab === 'services' ? 'bg-background' : 'bg-transparent'
            }`}
          >
            <Text
              className={`text-sm font-semibold text-center ${
                activeTab === 'services' ? 'text-foreground' : 'text-muted-foreground'
              }`}
            >
              Services
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={() => setActiveTab('providers')}
            className={`flex-1 py-2 px-4 rounded-md ${
              activeTab === 'providers' ? 'bg-background' : 'bg-transparent'
            }`}
          >
            <Text
              className={`text-sm font-semibold text-center ${
                activeTab === 'providers' ? 'text-foreground' : 'text-muted-foreground'
              }`}
            >
              Providers
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tab Content */}
      <View className="flex-1">
        {activeTab === 'services' ? (
          // Services Tab: Show results (browse or search)
          <SearchResults
            data={serviceResults}
            isLoading={servicesLoading}
            onRefresh={refetchServices}
            isRefreshing={isRefetchingServices}
            emptyMessage={
              query.length === 0
                ? "No services available yet. Check back soon!"
                : "No services found. Try different keywords like 'nail tech', 'photographer', or 'makeup artist'."
            }
            headerComponent={
              query.length === 0 && !servicesLoading && serviceResults && serviceResults.length > 0 ? (
                <View className="px-4 py-3 bg-primary/5 border-b border-primary/20">
                  <Text className="text-sm font-semibold text-primary mb-1">
                    🌟 Browse Services
                  </Text>
                  <Text className="text-xs text-muted-foreground">
                    Showing all available services • Try searching to filter results
                  </Text>
                </View>
              ) : undefined
            }
          />
        ) : (
          // Providers Tab: Show results (browse or search)
          providersLoading && !providerResults ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator size="large" className="text-primary" />
              <Text className="text-muted-foreground mt-4">
                {query.length === 0 ? 'Loading providers...' : 'Searching providers...'}
              </Text>
            </View>
          ) : providerResults && providerResults.length > 0 ? (
            <FlashList
              data={providerResults}
              renderItem={({ item }) => <ProviderSearchCard provider={item} />}
              keyExtractor={(item) => item.provider_id}
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
              showsVerticalScrollIndicator={false}
              onRefresh={refetchProviders}
              refreshing={isRefetchingProviders}
              ListHeaderComponent={
                query.length === 0 ? (
                  <View className="py-3 mb-2 bg-primary/5 rounded-lg border border-primary/20 px-4">
                    <Text className="text-sm font-semibold text-primary mb-1">
                      🌟 Browse Providers
                    </Text>
                    <Text className="text-xs text-muted-foreground">
                      Showing all available providers • Try searching to filter results
                    </Text>
                  </View>
                ) : undefined
              }
            />
          ) : (
            <View className="flex-1 items-center justify-center px-6">
              <Icon as={MapPin} size={48} className="text-muted-foreground mb-4" />
              <Text className="text-center text-muted-foreground text-base">
                {query.length === 0
                  ? "No providers available yet. Check back soon!"
                  : "No providers found. Try searching by business name or service type."}
              </Text>
            </View>
          )
        )}
      </View>

      {/* Filters Bottom Sheet */}
      <SearchFilters
        filters={filters}
        onFiltersChange={setFilters}
        isVisible={showFilters}
        onClose={() => setShowFilters(false)}
        categories={categories || []} // Use dynamic categories from database
      />
    </SafeAreaView>
  );
}

import React, { useState } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Filter } from 'lucide-react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  SearchInput,
  SearchResults,
  SearchFilters,
  type SearchFiltersType,
} from '@/components/customer/search';
import { useServiceSearch, useProviderSearch } from '@/hooks';

/**
 * Modern Search Screen Implementation
 * 
 * Features:
 * - Debounced keyword search (300ms)
 * - Service/Provider tabs
 * - Filter bottom sheet
 * - Infinite scroll support
 * - Modern card-based UI
 * 
 * This is an EXAMPLE implementation showing how to use the new search components.
 * Integrate this into your existing search.tsx or use as reference.
 */
export default function ModernSearchScreen() {
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'services' | 'providers'>('services');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<SearchFiltersType>({
    sortBy: 'relevance',
  });

  // Service search with debounced query
  const {
    data: serviceResults,
    isLoading: servicesLoading,
    refetch: refetchServices,
  } = useServiceSearch({
    query,
    limit: 20,
    enabled: activeTab === 'services' && query.length > 0,
  });

  // Provider search with debounced query
  const {
    data: providerResults,
    isLoading: providersLoading,
    refetch: refetchProviders,
  } = useProviderSearch({
    query,
    limit: 15,
    enabled: activeTab === 'providers' && query.length > 0,
  });

  const handleDebouncedSearch = (debouncedQuery: string) => {
    // This is called after the 300ms debounce
    console.log('🔍 Searching for:', debouncedQuery);
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      {/* Header */}
      <View className="px-4 py-3 border-b border-border">
        <View className="flex-row items-center gap-3 mb-3">
          <SearchInput
            value={query}
            onChangeText={setQuery}
            onDebouncedChange={handleDebouncedSearch}
            placeholder={`Search ${activeTab}...`}
            isLoading={servicesLoading || providersLoading}
            className="flex-1"
          />

          <Button
            variant="outline"
            size="icon"
            onPress={() => setShowFilters(true)}
            className="w-12 h-12"
          >
            <Icon as={Filter} size={20} />
          </Button>
        </View>

        {/* Results Count */}
        {query.length > 0 && (
          <Text className="text-sm text-muted-foreground">
            {activeTab === 'services'
              ? `${serviceResults?.length || 0} services found`
              : `${providerResults?.length || 0} providers found`}
          </Text>
        )}
      </View>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as 'services' | 'providers')}
        className="flex-1"
      >
        <TabsList className="w-full px-4 py-2">
          <TabsTrigger value="services" className="flex-1">
            <Text>Services</Text>
          </TabsTrigger>
          <TabsTrigger value="providers" className="flex-1">
            <Text>Providers</Text>
          </TabsTrigger>
        </TabsList>

        {/* Services Tab */}
        <TabsContent value="services" className="flex-1">
          {query.length === 0 ? (
            <View className="flex-1 items-center justify-center px-6">
              <Text className="text-center text-muted-foreground text-base">
                Search for services using keywords like:{'\n\n'}
                "nail tech", "hair stylist", "photographer", "makeup artist"
              </Text>
            </View>
          ) : (
            <SearchResults
              data={serviceResults}
              isLoading={servicesLoading}
              onRefresh={refetchServices}
              emptyMessage="No services found. Try different keywords."
            />
          )}
        </TabsContent>

        {/* Providers Tab */}
        <TabsContent value="providers" className="flex-1">
          {query.length === 0 ? (
            <View className="flex-1 items-center justify-center px-6">
              <Text className="text-center text-muted-foreground text-base">
                Search for providers by business name or service type
              </Text>
            </View>
          ) : (
            <View className="flex-1 px-4">
              {providersLoading && !providerResults ? (
                <Text>Loading...</Text>
              ) : providerResults && providerResults.length > 0 ? (
                providerResults.map((provider) => (
                  <View key={provider.provider_id}>
                    {/* Use ProviderSearchCard component */}
                    <Text>{provider.business_name}</Text>
                  </View>
                ))
              ) : (
                <View className="flex-1 items-center justify-center">
                  <Text className="text-center text-muted-foreground">
                    No providers found
                  </Text>
                </View>
              )}
            </View>
          )}
        </TabsContent>
      </Tabs>

      {/* Filters Bottom Sheet */}
      <SearchFilters
        filters={filters}
        onFiltersChange={setFilters}
        isVisible={showFilters}
        onClose={() => setShowFilters(false)}
        categories={[
          { id: '1', name: 'Beauty & Grooming' },
          { id: '2', name: 'Events & Entertainment' },
        ]}
      />
    </SafeAreaView>
  );
}

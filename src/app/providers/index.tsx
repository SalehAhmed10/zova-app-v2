import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Ionicons } from '@expo/vector-icons';
import { useTrustedProviders } from '@/hooks/useProfileData';
import { ProviderCard } from '@/components/providers';

// Loading Skeleton
const ProviderCardSkeleton = () => (
  <Card className="bg-card border border-border/50 mb-4">
    <CardContent className="p-4">
      <View className="flex-row gap-3">
        <Skeleton className="w-16 h-16 rounded-full" />
        <View className="flex-1">
          <Skeleton className="w-32 h-5 mb-2" />
          <Skeleton className="w-24 h-4 mb-2" />
          <Skeleton className="w-20 h-4 mb-2" />
          <Skeleton className="w-16 h-6 rounded-full" />
        </View>
        <Skeleton className="w-5 h-5" />
      </View>
    </CardContent>
  </Card>
);

export default function ProvidersScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredProviders, setFilteredProviders] = useState<any[]>([]);

  const { data: providers, isLoading, error, refetch } = useTrustedProviders(50); // Get more providers

  // Filter providers based on search query
  React.useEffect(() => {
    if (!providers) return;

    if (!searchQuery.trim()) {
      setFilteredProviders(providers);
    } else {
      const filtered = providers.filter(provider =>
        `${provider.first_name} ${provider.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (provider.business_name && provider.business_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (provider.city && provider.city.toLowerCase().includes(searchQuery.toLowerCase()))
      );
      setFilteredProviders(filtered);
    }
  }, [providers, searchQuery]);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1">
        {/* Header */}
        <View className="px-4 py-4 border-b border-border">
          <View className="flex-row items-center justify-between">
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name="chevron-back" size={24} color="#000" />
            </TouchableOpacity>
            <Text className="text-xl font-bold text-foreground">Find Providers</Text>
            <View className="w-6" />
          </View>
        </View>

        {/* Search Bar */}
        <View className="px-4 py-4">
          <View className="flex-row items-center bg-card rounded-2xl px-4 py-3 border border-border">
            <Text className="text-xl mr-3">🔍</Text>
            <Input
              placeholder="Search providers by name, business, or city..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              className="flex-1 border-0 p-0 text-base"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} className="ml-2">
                <Text className="text-muted-foreground">✕</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Results Header */}
        <View className="px-4 pb-2">
          <View className="flex-row items-center justify-between">
            <Text className="text-lg font-semibold text-foreground">
              {isLoading ? 'Loading...' : `${filteredProviders?.length || 0} Provider${filteredProviders?.length === 1 ? '' : 's'}`}
            </Text>
            {providers && providers.length > 0 && (
              <TouchableOpacity onPress={() => refetch()}>
                <Text className="text-primary text-sm font-medium">Refresh</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Providers List */}
        <View className="flex-1 px-4">
          {isLoading ? (
            <View>
              {[...Array(5)].map((_, i) => (
                <ProviderCardSkeleton key={i} />
              ))}
            </View>
          ) : error ? (
            <View className="flex-1 justify-center items-center py-12">
              <Text className="text-4xl mb-4">⚠️</Text>
              <Text className="text-xl font-semibold text-foreground mb-2">
                Error Loading Providers
              </Text>
              <Text className="text-muted-foreground text-center mb-6">
                {error.message || 'Something went wrong'}
              </Text>
              <Button onPress={() => refetch()}>
                <Text className="text-primary-foreground font-medium">Try Again</Text>
              </Button>
            </View>
          ) : filteredProviders && filteredProviders.length > 0 ? (
            <FlashList
              data={filteredProviders}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => <ProviderCard provider={item} />}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 100 }}
            />
          ) : (
            <View className="flex-1 justify-center items-center py-12">
              <Text className="text-4xl mb-4">👥</Text>
              <Text className="text-xl font-semibold text-foreground mb-2">
                {searchQuery ? 'No providers found' : 'No providers available'}
              </Text>
              <Text className="text-muted-foreground text-center mb-6">
                {searchQuery
                  ? 'Try adjusting your search criteria'
                  : 'Check back later for available providers'
                }
              </Text>
              {searchQuery && (
                <Button onPress={() => setSearchQuery('')}>
                  <Text className="text-primary-foreground font-medium">Clear Search</Text>
                </Button>
              )}
            </View>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}
import React, { useState,  } from 'react';
import { View, ScrollView, TouchableOpacity, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Ionicons } from '@expo/vector-icons';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSearchResults, useServiceCategories } from '@/hooks/customer/useSearchOptimized';
import { useSearchStore, useSearchHydration } from '@/stores/customer/search-store';
import SearchFiltersSheet from '@/components/customer/SearchFiltersSheet';
import { useColorScheme } from '@/lib/core/useColorScheme';
import { THEME } from '@/lib/core/theme';
import { useRouter } from 'expo-router';
import { useAuthPure } from '@/hooks/shared/useAuthPure';
import { useIsFavorited, useToggleFavorite } from '@/hooks/customer/useFavorites';

export default function SearchScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isFiltersVisible, setIsFiltersVisible] = useState(false);
  const { searchMode, setSearchMode, setSearchQuery: setStoreQuery, handleFiltersChange } = useSearchStore();
  const isHydrated = useSearchHydration();
  const { isDarkColorScheme } = useColorScheme();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAuthPure();
  const toggleFavoriteMutation = useToggleFavorite();

  // Handle URL parameters to set initial search mode (acceptable useEffect for navigation)
  React.useEffect(() => {
    if (params.mode) {
      const urlMode = params.mode === 'providers' ? 'providers' : 'services';
      setSearchMode(urlMode);
    }
  }, [params.mode, setSearchMode]);

  // Wait for hydration before rendering search functionality
  if (!isHydrated) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 items-center justify-center">
          <Text className="text-muted-foreground">Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const { data: results, isLoading, error, refetch } = useSearchResults();
  const resultsCount = results?.length || 0;
  const hasResults = resultsCount > 0;
  const { data: categories, isLoading: categoriesLoading } = useServiceCategories();

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    setStoreQuery(text);
  };

  // Service Item Component with favorites functionality
  const ServiceItem = React.memo(({ item }: { item: any }) => {
    const { data: isFavorited } = useIsFavorited(user?.id, 'service', item.id);
    
    const handleToggleFavorite = (e: any) => {
      e.stopPropagation(); // Prevent navigation when tapping favorite
      if (!user?.id) return;
      toggleFavoriteMutation.mutate({
        userId: user.id,
        type: 'service',
        itemId: item.id,
        isFavorited: !!isFavorited
      });
    };

    return (
      <TouchableOpacity 
        activeOpacity={0.7} 
        className="mb-2"
        onPress={() => router.push(`/customer/service/${item.id}`)}
      >
        <Card className="shadow-sm border-border/50 bg-card">
          <CardContent className="p-3">
            <View className="flex-row items-start gap-2.5">
              {/* Service Avatar/Icon */}
              <View className="w-10 h-10 rounded-md bg-primary/10 items-center justify-center border border-primary/20">
                <Ionicons name="cut" size={18} color={isDarkColorScheme ? THEME.dark.primary : THEME.light.primary} />
              </View>

              <View className="flex-1">
                {/* Service Title & Provider */}
                <View className="flex-row items-start justify-between mb-1">
                  <View className="flex-1 mr-1.5">
                    <Text className="text-sm font-bold text-foreground mb-0.5" numberOfLines={1}>
                      {item.title}
                    </Text>
                    <View className="flex-row items-center gap-0.5">
                      <Ionicons name="person-outline" size={10} color={isDarkColorScheme ? THEME.dark.mutedForeground : THEME.light.mutedForeground} />
                      <Text className="text-xs text-muted-foreground" numberOfLines={1}>
                        {item.provider?.name || 'Provider'}
                      </Text>
                    </View>
                  </View>
                  <View className="items-end gap-1">
                    <TouchableOpacity
                      onPress={handleToggleFavorite}
                      className="p-1"
                      disabled={toggleFavoriteMutation.isPending}
                    >
                      <Ionicons 
                        name={isFavorited ? "heart" : "heart-outline"} 
                        size={16} 
                        color={isFavorited ? "#ef4444" : (isDarkColorScheme ? THEME.dark.mutedForeground : THEME.light.mutedForeground)} 
                      />
                    </TouchableOpacity>
                    <Text className="text-base font-bold text-primary">
                      ${item.price}
                    </Text>
                    <Text className="text-xs text-muted-foreground">
                      {item.price_type === 'hourly' ? '/hr' : 'fixed'}
                    </Text>
                  </View>
                </View>

                {/* Rating & Duration */}
                <View className="flex-row items-center gap-2 mb-1.5">
                  {item.rating > 0 ? (
                    <View className="flex-row items-center gap-0.5 bg-amber-50 dark:bg-amber-950/20 px-1 py-0.5 rounded-full border border-amber-200 dark:border-amber-800/30">
                      <Ionicons name="star" size={10} color="#F59E0B" />
                      <Text className="text-xs font-medium text-amber-700 dark:text-amber-400">
                        {item.rating.toFixed(1)}
                      </Text>
                    </View>
                  ) : (
                    <View className="bg-muted/50 px-1 py-0.5 rounded-full border border-border/50">
                      <Text className="text-xs font-medium text-muted-foreground">New</Text>
                    </View>
                  )}

                  <View className="flex-row items-center gap-0.5">
                    <Ionicons name="time-outline" size={10} color={isDarkColorScheme ? THEME.dark.mutedForeground : THEME.light.mutedForeground} />
                    <Text className="text-xs text-muted-foreground">
                      {item.duration || 60} min
                    </Text>
                  </View>
                </View>

                {/* Description */}
                {item.description && (
                  <Text className="text-xs text-muted-foreground mb-1.5 leading-3" numberOfLines={1}>
                    {item.description}
                  </Text>
                )}

                {/* Service Type Badges */}
                <View className="flex-row flex-wrap gap-1">
                  {item.isHomeService && (
                    <View className="flex-row items-center gap-0.5 bg-info/10 px-1.5 py-0.5 rounded-full border border-info/20">
                      <Ionicons name="home-outline" size={8} color={isDarkColorScheme ? THEME.dark.info : THEME.light.info} />
                      <Text className="text-xs font-medium" style={{ color: isDarkColorScheme ? THEME.dark.info : THEME.light.info }}>
                        Home
                      </Text>
                    </View>
                  )}
                  {item.isRemoteService && (
                    <View className="flex-row items-center gap-0.5 bg-success/10 px-1.5 py-0.5 rounded-full border border-success/20">
                      <Ionicons name="videocam-outline" size={8} color={isDarkColorScheme ? THEME.dark.success : THEME.light.success} />
                      <Text className="text-xs font-medium" style={{ color: isDarkColorScheme ? THEME.dark.success : THEME.light.success }}>
                        Virtual
                      </Text>
                    </View>
                  )}
                  {item.house_call_available && (
                    <View className="flex-row items-center gap-0.5 bg-purple/10 px-1.5 py-0.5 rounded-full border border-purple/20">
                      <Ionicons name="location-outline" size={8} color={isDarkColorScheme ? THEME.dark.purple : THEME.light.purple} />
                      <Text className="text-xs font-medium" style={{ color: isDarkColorScheme ? THEME.dark.purple : THEME.light.purple }}>
                        Mobile
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          </CardContent>
        </Card>
      </TouchableOpacity>
    );
  });

  const renderServiceItem = ({ item }: { item: any }) => <ServiceItem item={item} />;

  // Provider Item Component with favorites functionality
  const ProviderItem = React.memo(({ item }: { item: any }) => {
    const { data: isFavorited } = useIsFavorited(user?.id, 'provider', item.id);
    
    const handleToggleFavorite = (e: any) => {
      e.stopPropagation(); // Prevent navigation when tapping favorite
      if (!user?.id) return;
      toggleFavoriteMutation.mutate({
        userId: user.id,
        type: 'provider',
        itemId: item.id,
        isFavorited: !!isFavorited
      });
    };

    return (
      <TouchableOpacity activeOpacity={0.7} className="mb-2" onPress={() => router.push(`/customer/provider/${item.id}`)}>
        <Card className="shadow-sm border-border/50 bg-card">
          <CardContent className="p-3">
            <View className="flex-row items-start gap-2.5">
              {/* Provider Avatar */}
              <View className="relative">
                <Avatar className="w-10 h-10 border-2 border-primary/20" alt={item.name || 'Provider'}>
                  <AvatarImage source={{ uri: item.avatar }} />
                  <AvatarFallback className="bg-primary/10">
                    <Text className="text-sm font-bold text-primary">
                      {item.name?.charAt(0) || 'P'}
                    </Text>
                  </AvatarFallback>
                </Avatar>
                {item.isVerified && (
                  <View className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full items-center justify-center border-2 border-card" style={{ backgroundColor: isDarkColorScheme ? THEME.dark.success : THEME.light.success }}>
                    <Ionicons name="checkmark" size={8} color={isDarkColorScheme ? THEME.dark.card : THEME.light.card} />
                  </View>
                )}
              </View>

              <View className="flex-1">
                {/* Provider Name & Location */}
                <View className="flex-row items-start justify-between mb-1">
                  <View className="flex-1 mr-1.5">
                    <Text className="text-sm font-bold text-foreground mb-0.5" numberOfLines={1}>
                      {item.business_name || item.name || 'Provider'}
                    </Text>
                    <View className="flex-row items-center gap-0.5">
                      <Ionicons name="location-outline" size={10} color={isDarkColorScheme ? THEME.dark.mutedForeground : THEME.light.mutedForeground} />
                      <Text className="text-xs text-muted-foreground" numberOfLines={1}>
                        {item.city && item.country ? `${item.city}, ${item.country}` : 'Location not specified'}
                      </Text>
                    </View>
                  </View>
                  <View className="items-end gap-1">
                    <TouchableOpacity
                      onPress={handleToggleFavorite}
                      className="p-1"
                      disabled={toggleFavoriteMutation.isPending}
                    >
                      <Ionicons 
                        name={isFavorited ? "heart" : "heart-outline"} 
                        size={16} 
                        color={isFavorited ? "#ef4444" : (isDarkColorScheme ? THEME.dark.mutedForeground : THEME.light.mutedForeground)} 
                      />
                    </TouchableOpacity>
                    {item.avg_rating ? (
                      <View className="flex-row items-center gap-0.5 bg-amber-50 dark:bg-amber-950/20 px-1 py-0.5 rounded-full mb-0.5 border border-amber-200 dark:border-amber-800/30">
                        <Ionicons name="star" size={10} color="#F59E0B" />
                        <Text className="text-xs font-medium text-amber-700 dark:text-amber-400">
                          {item.avg_rating.toFixed(1)}
                        </Text>
                      </View>
                    ) : (
                      <View className="bg-muted/50 px-1 py-0.5 rounded-full mb-0.5 border border-border/50">
                        <Text className="text-xs font-medium text-muted-foreground">New</Text>
                      </View>
                    )}
                    <Text className="text-xs text-muted-foreground">
                      {item.total_reviews || 0} reviews
                    </Text>
                  </View>
                </View>

                {/* Stats Row */}
                <View className="flex-row items-center gap-2 mb-1.5">
                  <View className="flex-row items-center gap-0.5">
                    <Ionicons name="briefcase-outline" size={10} color={isDarkColorScheme ? THEME.dark.mutedForeground : THEME.light.mutedForeground} />
                    <Text className="text-xs text-muted-foreground">
                      {item.provider_services?.length || 0} services
                    </Text>
                  </View>

                  {item.distance && (
                    <View className="flex-row items-center gap-0.5">
                      <Ionicons name="navigate-outline" size={10} color={isDarkColorScheme ? THEME.dark.mutedForeground : THEME.light.mutedForeground} />
                      <Text className="text-xs text-muted-foreground">
                        {item.distance.toFixed(1)} km away
                      </Text>
                    </View>
                  )}
                </View>

                {/* Bio */}
                {item.bio && (
                  <Text className="text-xs text-muted-foreground mb-1.5 leading-3" numberOfLines={1}>
                    {item.bio}
                  </Text>
                )}

                {/* Service Tags */}
                {item.provider_services && item.provider_services.length > 0 && (
                  <View className="flex-row flex-wrap gap-1">
                    {item.provider_services.slice(0, 3).map((service: any, index: number) => (
                      <View key={index} className="flex-row items-center gap-0.5 bg-accent/50 px-1.5 py-0.5 rounded-full border border-border/50">
                        <Ionicons name="cut-outline" size={8} color={isDarkColorScheme ? THEME.dark.mutedForeground : THEME.light.mutedForeground} />
                        <Text className="text-xs font-medium text-accent-foreground" numberOfLines={1}>
                          {service.title}
                        </Text>
                      </View>
                    ))}
                    {item.provider_services.length > 3 && (
                      <View className="bg-accent/50 px-1.5 py-0.5 rounded-full border border-border/50">
                        <Text className="text-xs font-medium text-accent-foreground">
                          +{item.provider_services.length - 3} more
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            </View>
          </CardContent>
        </Card>
      </TouchableOpacity>
    );
  });

  const renderProviderItem = ({ item }: { item: any }) => <ProviderItem item={item} />;

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1">
        {/* Header */}
        <View className="px-4 py-4 border-b border-border/50 bg-card/50">
          <Text className="text-2xl font-bold text-foreground mb-4">
            Find Services
          </Text>

          {/* Search Input */}
          <View className="mb-3 relative">
            <View className={`absolute left-4 top-1/2 -translate-y-1/2 ${isFiltersVisible ? 'z-0' : 'z-10'}`}>
              <Ionicons name="search" size={18} color={isDarkColorScheme ? THEME.dark.mutedForeground : THEME.light.mutedForeground} />
            </View>
            <Input
              placeholder="Search services or providers..."
              value={searchQuery}
              onChangeText={handleSearchChange}
              className="pl-11 h-10 text-base border-border/50 bg-background shadow-sm"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => handleSearchChange('')}
                className="absolute right-4 top-1/2 -translate-y-1/2"
              >
                <Ionicons name="close-circle" size={18} color={isDarkColorScheme ? THEME.dark.mutedForeground : THEME.light.mutedForeground} />
              </TouchableOpacity>
            )}
          </View>

          {/* Mode Toggle */}
          <Tabs value={searchMode} onValueChange={setSearchMode} className="mb-3">
            <TabsList className="flex w-full h-9 bg-muted/50">
              <TabsTrigger value="services" className="flex-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <View className="flex-row items-center gap-1.5">
                  <Ionicons name="cut-outline" size={14} color={isDarkColorScheme ? THEME.dark.foreground : THEME.light.foreground} />
                  <Text className="text-sm font-medium">Services</Text>
                </View>
              </TabsTrigger>
              <TabsTrigger value="providers" className="flex-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <View className="flex-row items-center gap-1.5">
                  <Ionicons name="people-outline" size={14} color={isDarkColorScheme ? THEME.dark.foreground : THEME.light.foreground} />
                  <Text className="text-sm font-medium">Providers</Text>
                </View>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Results Count & Filters */}
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-1.5">
              <Ionicons name="list-outline" size={14} color={isDarkColorScheme ? THEME.dark.mutedForeground : THEME.light.mutedForeground} />
              <Text className="text-xs text-muted-foreground font-medium">
                {isLoading ? 'Searching...' : `${resultsCount} ${searchMode} found`}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setIsFiltersVisible(true)}
              className="flex-row items-center gap-1.5 bg-primary/10 px-3 py-1.5 rounded-full border border-primary/20"
            >
              <Ionicons name="filter" size={12} color={isDarkColorScheme ? THEME.dark.primary : THEME.light.primary} />
              <Text className="text-xs font-medium text-primary">Filters</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Popular Searches - Show when no search query */}
        {!searchQuery && !isLoading && hasResults && (
          <View className="px-4 py-3 border-b border-border/50">
            <Text className="text-sm font-bold text-foreground mb-3">Popular Searches</Text>
            <View className="flex-row flex-wrap gap-2">
              {['Nail', 'Hair', 'Music', 'Test'].map((term) => (
                <TouchableOpacity
                  key={term}
                  onPress={() => handleSearchChange(term)}
                  className="bg-muted/50 px-3 py-1.5 rounded-full border border-border/50"
                >
                  <Text className="text-xs font-medium text-muted-foreground">{term}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Content */}

        {/* Content */}
        <View className="flex-1">
          {isLoading ? (
            <ScrollView className="flex-1 px-4 py-3">
              {[...Array(4)].map((_, index) => (
                <Card key={index} className="mb-2 shadow-sm border-border/50">
                  <CardContent className="p-3">
                    <View className="flex-row items-start gap-2.5">
                      <Skeleton className="w-10 h-10 rounded-md" />
                      <View className="flex-1">
                        <Skeleton className="w-3/4 h-4 mb-1" />
                        <Skeleton className="w-1/2 h-3 mb-1.5" />
                        <View className="flex-row gap-1.5 mb-1.5">
                          <Skeleton className="w-10 h-3 rounded-full" />
                          <Skeleton className="w-10 h-3 rounded-full" />
                        </View>
                        <Skeleton className="w-full h-3 mb-1" />
                        <View className="flex-row gap-1">
                          <Skeleton className="w-12 h-3 rounded-full" />
                          <Skeleton className="w-10 h-3 rounded-full" />
                        </View>
                      </View>
                    </View>
                  </CardContent>
                </Card>
              ))}
            </ScrollView>
          ) : error ? (
            <View className="flex-1 items-center justify-center px-6 py-8">
              <View className="w-16 h-16 rounded-full items-center justify-center mb-4" style={{ backgroundColor: THEME[isDarkColorScheme ? 'dark' : 'light'].destructive.replace('hsl(', 'hsla(').replace(')', ', 0.1)') }}>
                <Ionicons name="alert-circle" size={24} color={THEME[isDarkColorScheme ? 'dark' : 'light'].destructive} />
              </View>
              <Text className="text-lg font-bold text-foreground mb-1 text-center">
                Something went wrong
              </Text>
              <Text className="text-xs text-muted-foreground text-center mb-4 max-w-xs">
                {error?.message || 'Failed to load search results. Please check your connection and try again.'}
              </Text>
              <Button onPress={() => refetch()} className="flex-row items-center gap-1.5 h-8 px-3">
                <Ionicons name="refresh" size={14} color="white" />
                <Text className="text-primary-foreground font-medium text-sm">Try Again</Text>
              </Button>
            </View>
          ) : !hasResults ? (
            <View className="flex-1 items-center justify-center px-6 py-8">
              <View className="w-16 h-16 rounded-full bg-muted items-center justify-center mb-4">
                <Ionicons name="search" size={24} color={isDarkColorScheme ? THEME.dark.mutedForeground : THEME.light.mutedForeground} />
              </View>
              <Text className="text-lg font-bold text-foreground mb-1 text-center">
                {searchQuery ? `No results for "${searchQuery}"` : 'No results found'}
              </Text>
              <Text className="text-xs text-muted-foreground text-center mb-4 max-w-xs">
                {searchQuery
                  ? 'Try searching for different keywords or check your spelling'
                  : 'Try adjusting your search terms, location, or filters to find more services and providers'
                }
              </Text>
              <View className="flex-row gap-2">
                {searchQuery ? (
                  <TouchableOpacity
                    onPress={() => handleSearchChange('')}
                    className="flex-row items-center gap-1.5 bg-primary px-3 py-1.5 rounded-full"
                  >
                    <Ionicons name="refresh" size={14} color="white" />
                    <Text className="text-primary-foreground font-medium text-sm">Clear search</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    onPress={() => setIsFiltersVisible(true)}
                    className="flex-row items-center gap-1.5 bg-primary px-3 py-1.5 rounded-full"
                  >
                    <Ionicons name="filter" size={14} color="white" />
                    <Text className="text-primary-foreground font-medium text-sm">Adjust filters</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={() => setSearchMode(searchMode === 'services' ? 'providers' : 'services')}
                  className="flex-row items-center gap-1.5 bg-muted px-3 py-1.5 rounded-full"
                >
                  <Ionicons name="swap-horizontal" size={14} color={isDarkColorScheme ? THEME.dark.foreground : THEME.light.foreground} />
                  <Text className="text-foreground font-medium text-sm">
                    Search {searchMode === 'services' ? 'providers' : 'services'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <FlatList
              data={results}
              keyExtractor={(item) => item.id}
              renderItem={searchMode === 'services' ? renderServiceItem : renderProviderItem}
              contentContainerStyle={{ padding: 12 }}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </View>

      <SearchFiltersSheet
        isVisible={isFiltersVisible}
        onClose={() => setIsFiltersVisible(false)}
        onApplyFilters={(filters) => {
          handleFiltersChange(filters);
          setIsFiltersVisible(false);
        }}
      />
    </SafeAreaView>
  );
}

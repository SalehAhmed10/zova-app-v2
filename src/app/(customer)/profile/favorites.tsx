import React from 'react';
import { View, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuthPure } from '@/hooks/shared/useAuthPure';
import { useUserFavorites, useToggleFavorite } from '@/hooks/customer/useFavorites';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChevronLeft } from 'lucide-react-native';
import { useColorScheme } from '@/lib/core/useColorScheme';
import { THEME } from '@/lib/theme';
import { ProviderCard, ServiceCard } from '@/components/customer';



const FavoritesSkeleton = () => (
  <View className="mb-3">
    <Card className="bg-card border border-border/50 ">
      <CardContent className="p-3">
        <View className="flex-row items-start gap-3 mb-3">
          <Skeleton className="w-12 h-12 rounded-full" />
          <View className="flex-1">
            <Skeleton className="w-32 h-5 mb-1" />
            <Skeleton className="w-24 h-4 mb-1" />
            <Skeleton className="w-20 h-3" />
          </View>
        </View>
        <Skeleton className="w-full h-10 rounded-lg" />
      </CardContent>
    </Card>
  </View>
);

export default function FavoritesScreen() {
  const [activeTab, setActiveTab] = React.useState('all');
  const [refreshing, setRefreshing] = React.useState(false);
  const { user } = useAuthPure();
  const { data: favorites, isLoading, error, refetch } = useUserFavorites(user?.id);
  const toggleFavoriteMutation = useToggleFavorite();
  const { isDarkColorScheme } = useColorScheme();

  const handleToggleFavorite = (serviceId: string) => {
    if (!user?.id) return;
    toggleFavoriteMutation.mutate({
      userId: user.id,
      type: 'service',
      itemId: serviceId,
      isFavorited: true // Since we're in favorites, these are currently favorited
    });
  };

  const handleToggleProviderFavorite = (providerId: string) => {
    if (!user?.id) return;
    toggleFavoriteMutation.mutate({
      userId: user.id,
      type: 'provider',
      itemId: providerId,
      isFavorited: true // Since we're in favorites, these are currently favorited
    });
  };

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  if (!user) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 items-center justify-center p-4">
          <Text className="text-center text-muted-foreground">
            Please log in to view your favorites
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const totalFavorites = (favorites?.providers?.length || 0) + (favorites?.services?.length || 0);

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 border-b border-border">
        <Button
          variant="ghost"
          size="sm"
          onPress={() => router.push('/(customer)/profile')}
          className="mr-2"
        >
          <ChevronLeft size={20} color={isDarkColorScheme ? THEME.dark.foreground : THEME.light.foreground} />
        </Button>
        <Text variant="h3" className="flex-1">My Favorites</Text>
      </View>

      {/* Content */}
      <View className="flex-1">
        {isLoading ? (
          <ScrollView className="flex-1 p-4" showsVerticalScrollIndicator={false}>
            <View className="py-2">
              {[...Array(3)].map((_, i) => (
                <FavoritesSkeleton key={i} />
              ))}
            </View>
          </ScrollView>
        ) : totalFavorites === 0 ? (
          <View className="flex-1 justify-center items-center p-4">
            <Feather name="heart" size={48} className="text-primary mb-4" />
            <Text className="text-xl font-semibold text-foreground mb-2">
              No favorites yet
            </Text>
            <Text className="text-muted-foreground text-center mb-6">
              Start exploring services and providers to add them to your favorites
            </Text>
            <Button onPress={() => router.push('/(customer)/search')}>
              <Text className="text-primary-foreground font-medium">Explore Services</Text>
            </Button>
          </View>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
            <View className="px-4 pt-2">
              <TabsList className="w-full">
                <TabsTrigger value="all" className="flex-1">
                  <Text className="text-sm font-medium">All ({totalFavorites})</Text>
                </TabsTrigger>
                <TabsTrigger value="providers" className="flex-1">
                  <Text className="text-sm font-medium">Providers ({favorites?.providers?.length || 0})</Text>
                </TabsTrigger>
                <TabsTrigger value="services" className="flex-1">
                  <Text className="text-sm font-medium">Services ({favorites?.services?.length || 0})</Text>
                </TabsTrigger>
              </TabsList>
            </View>

            <TabsContent value="all" className="flex-1">
              <ScrollView
                className="flex-1 p-4"
                showsVerticalScrollIndicator={false}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    tintColor={isDarkColorScheme ? THEME.dark.primary : THEME.light.primary}
                  />
                }
              >
                <View className="py-2">
                  {/* Providers Section */}
                  {favorites?.providers && favorites.providers.length > 0 && (
                    <View className="mb-6">
                      <Text className="text-lg font-semibold text-foreground mb-4">
                        Favorite Providers
                      </Text>
                      {favorites.providers.map((provider) => (
                        <ProviderCard 
                          key={provider.id} 
                          provider={provider}
                          isFavorited={true}
                          onToggleFavorite={() => handleToggleProviderFavorite(provider.id)}
                        />
                      ))}
                    </View>
                  )}

                  {/* Services Section */}
                  {favorites?.services && favorites.services.length > 0 && (
                    <View className="mb-6">
                      <Text className="text-lg font-semibold text-foreground mb-4">
                        Favorite Services
                      </Text>
                      {favorites.services.map((service) => (
                        <ServiceCard 
                          key={service.id} 
                          service={service}
                          isFavorited={true}
                          onToggleFavorite={() => handleToggleFavorite(service.id)}
                        />
                      ))}
                    </View>
                  )}
                </View>
              </ScrollView>
            </TabsContent>

            <TabsContent value="providers" className="flex-1">
              <ScrollView
                className="flex-1 p-4"
                showsVerticalScrollIndicator={false}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    tintColor={isDarkColorScheme ? THEME.dark.primary : THEME.light.primary}
                  />
                }
              >
                <View className="py-2">
                  {favorites?.providers && favorites.providers.length > 0 ? (
                    favorites.providers.map((provider) => (
                      <ProviderCard 
                        key={provider.id} 
                        provider={provider}
                        isFavorited={true}
                        onToggleFavorite={() => handleToggleProviderFavorite(provider.id)}
                      />
                    ))
                  ) : (
                    <View className="flex-1 justify-center items-center py-12">
                      <Feather name="users" size={48} className="text-primary mb-4" />
                      <Text className="text-xl font-semibold text-foreground mb-2">
                        No favorite providers
                      </Text>
                      <Text className="text-muted-foreground text-center mb-6">
                        Start exploring providers to add them to your favorites
                      </Text>
                      <Button onPress={() => router.push('/(customer)/search')}>
                        <Text className="text-primary-foreground font-medium">Explore Providers</Text>
                      </Button>
                    </View>
                  )}
                </View>
              </ScrollView>
            </TabsContent>

            <TabsContent value="services" className="flex-1">
              <ScrollView
                className="flex-1 p-4"
                showsVerticalScrollIndicator={false}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    tintColor={isDarkColorScheme ? THEME.dark.primary : THEME.light.primary}
                  />
                }
              >
                <View className="py-2">
                  {favorites?.services && favorites.services.length > 0 ? (
                    favorites.services.map((service) => (
                      <ServiceCard 
                        key={service.id} 
                        service={service}
                        isFavorited={true}
                        onToggleFavorite={() => handleToggleFavorite(service.id)}
                      />
                    ))
                  ) : (
                    <View className="flex-1 justify-center items-center py-12">
                      <Feather name="briefcase" size={48} className="text-primary mb-4" />
                      <Text className="text-xl font-semibold text-foreground mb-2">
                        No favorite services
                      </Text>
                      <Text className="text-muted-foreground text-center mb-6">
                        Start exploring services to add them to your favorites
                      </Text>
                      <Button onPress={() => router.push('/(customer)/search')}>
                        <Text className="text-primary-foreground font-medium">Explore Services</Text>
                      </Button>
                    </View>
                  )}
                </View>
              </ScrollView>
            </TabsContent>
          </Tabs>
        )}
      </View>
    </SafeAreaView>
  );
}
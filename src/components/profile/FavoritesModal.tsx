import React from 'react';
import { View, Modal, ScrollView, Pressable } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useUserFavorites } from '@/hooks';
import type { FavoriteProvider, FavoriteService } from '@/hooks';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface FavoritesModalProps {
  visible: boolean;
  onClose: () => void;
  userId: string;
}

const FavoriteProviderCard = ({ provider }: { provider: FavoriteProvider }) => (
  <Card className="bg-card border border-border/50 mb-3 shadow-sm">
    <CardContent className="p-3">
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
              {provider.services_count || 0} service{(provider.services_count || 0) === 1 ? '' : 's'}
            </Text>
          </View>
        </View>
      </View>

      <Button
        onPress={() => {
          router.push(`/profiles/provider?providerId=${provider.id}`);
        }}
        className="w-full bg-primary hover:bg-primary/90"
      >
        <Text className="text-primary-foreground font-semibold">View Profile</Text>
        <Feather name="arrow-right" size={16} className="text-primary-foreground ml-2" />
      </Button>
    </CardContent>
  </Card>
);

const FavoriteServiceCard = ({ service }: { service: FavoriteService }) => (
  <Card className="bg-card border border-border/50 mb-3 shadow-sm">
    <CardContent className="p-3">
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

        <Text className="text-sm text-muted-foreground mb-2 leading-5" numberOfLines={2} ellipsizeMode="tail">
          {service.description || 'No description available'}
        </Text>
      </View>

      <View className="flex-row items-center gap-3 mb-2">
        <Avatar className="w-10 h-10" alt={service.provider ? `${service.provider.first_name} ${service.provider.last_name}` : 'Provider'}>
          {service.provider?.avatar_url ? (
            <AvatarImage source={{ uri: service.provider.avatar_url }} />
          ) : null}
          <AvatarFallback className="bg-primary/10">
            <Text className="text-xs font-bold text-primary">
              {service.provider ? `${service.provider.first_name[0]}${service.provider.last_name[0]}` : '?'}
            </Text>
          </AvatarFallback>
        </Avatar>

        <View className="flex-1">
          <Text className="text-sm font-medium text-foreground">
            {service.provider ? `${service.provider.first_name} ${service.provider.last_name}` : 'Provider not available'}
          </Text>
          {service.provider?.business_name && (
            <Text className="text-xs text-muted-foreground">
              {service.provider.business_name}
            </Text>
          )}
        </View>

        <View className="flex-row items-center gap-1">
          <Feather name="star" size={12} className="text-yellow-500" />
          <Text className="text-sm font-medium text-foreground">
            {service.provider?.rating?.toFixed(1) || 'New'}
          </Text>
        </View>
      </View>

      <View className="flex-row gap-1 mb-2">
        <Badge className="text-xs px-2 py-1 bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900 dark:text-blue-100 dark:border-blue-800 flex-shrink">
          <Text numberOfLines={1} ellipsizeMode="tail" className="text-blue-800 dark:text-blue-100 max-w-[80px]">
            {service.category_name}
          </Text>
        </Badge>
        <Badge className="text-xs px-2 py-1 bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-100 dark:border-green-800 flex-shrink">
          <Text numberOfLines={1} ellipsizeMode="tail" className="text-green-800 dark:text-green-100 max-w-[100px]">
            {service.subcategory_name}
          </Text>
        </Badge>
      </View>

      <Button
        onPress={() => router.push('/customer/bookings')}
        className="w-full bg-primary hover:bg-primary/90"
      >
        <Text className="text-primary-foreground font-semibold">Book Now</Text>
      </Button>
    </CardContent>
  </Card>
);

const FavoritesSkeleton = () => (
  <View className="mb-3">
    <Card className="bg-card border border-border/50 shadow-sm">
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

export const FavoritesModal: React.FC<FavoritesModalProps> = ({
  visible,
  onClose,
  userId
}) => {
  const { data: favorites, isLoading, error, refetch } = useUserFavorites(userId);
  const [activeTab, setActiveTab] = React.useState('all');

  // Debug logging
  React.useEffect(() => {
    console.log('FavoritesModal: userId prop:', userId);
    console.log('FavoritesModal: favorites data:', favorites);
    console.log('FavoritesModal: isLoading:', isLoading);
    console.log('FavoritesModal: error:', error);
  }, [userId, favorites, isLoading, error]);

  // Force refetch when modal becomes visible
  React.useEffect(() => {
    if (visible && userId) {
      console.log('FavoritesModal: Modal visible, refetching data');
      refetch();
    }
  }, [visible, userId, refetch]);

  const totalFavorites = (favorites?.providers?.length || 0) + (favorites?.services?.length || 0);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-background">
        {/* Header */}
        <View className="flex-row items-center justify-between p-4 border-b border-border">
          <Pressable onPress={onClose} className="p-2">
            <Text className="text-primary text-base">Cancel</Text>
          </Pressable>
          <Text variant="h4" className="text-foreground font-bold">
            My Favorites
          </Text>
          <View className="w-16" />
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
              <Button onPress={() => {
                onClose();
                router.push('/customer/search');
              }}>
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
                <ScrollView className="flex-1 p-4" showsVerticalScrollIndicator={false}>
                  <View className="py-2">
                    {/* Providers Section */}
                    {favorites?.providers && favorites.providers.length > 0 && (
                      <View className="mb-6">
                        <Text className="text-lg font-semibold text-foreground mb-4">
                          Favorite Providers
                        </Text>
                        {favorites.providers.map((provider) => (
                          <FavoriteProviderCard key={provider.id} provider={provider} />
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
                          <FavoriteServiceCard key={service.id} service={service} />
                        ))}
                      </View>
                    )}
                  </View>
                </ScrollView>
              </TabsContent>

              <TabsContent value="providers" className="flex-1">
                <ScrollView className="flex-1 p-4" showsVerticalScrollIndicator={false}>
                  <View className="py-2">
                    {favorites?.providers && favorites.providers.length > 0 ? (
                      favorites.providers.map((provider) => (
                        <FavoriteProviderCard key={provider.id} provider={provider} />
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
                        <Button onPress={() => {
                          onClose();
                          router.push('/customer/search');
                        }}>
                          <Text className="text-primary-foreground font-medium">Explore Providers</Text>
                        </Button>
                      </View>
                    )}
                  </View>
                </ScrollView>
              </TabsContent>

              <TabsContent value="services" className="flex-1">
                <ScrollView className="flex-1 p-4" showsVerticalScrollIndicator={false}>
                  <View className="py-2">
                    {favorites?.services && favorites.services.length > 0 ? (
                      favorites.services.map((service) => (
                        <FavoriteServiceCard key={service.id} service={service} />
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
                        <Button onPress={() => {
                          onClose();
                          router.push('/customer/search');
                        }}>
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
      </View>
    </Modal>
  );
};
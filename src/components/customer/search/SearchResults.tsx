import React from 'react';
import { View, TouchableOpacity, Pressable } from 'react-native';
import { router } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import { Scissors, MapPin, ChevronRight, Star, Heart, Clock } from 'lucide-react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, interpolate } from 'react-native-reanimated';
import { Card, CardContent } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth';
import { useToggleFavorite, useIsFavorited } from '@/hooks';
import type { ServiceSearchResult } from '@/hooks/shared/use-service-search';

export interface SearchResultsProps {
  data: ServiceSearchResult[] | undefined;
  isLoading: boolean;
  onEndReached?: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  emptyMessage?: string;
  className?: string;
  headerComponent?: React.ReactElement | undefined;
}

/**
 * Search results list with FlashList for performance
 * 
 * Features:
 * - Optimized rendering with FlashList
 * - Pull-to-refresh support
 * - Infinite scroll support
 * - Loading skeletons
 * - Empty state
 * - Card-based modern UI
 * 
 * @example
 * ```tsx
 * <SearchResults
 *   data={searchData}
 *   isLoading={isLoading}
 *   onEndReached={fetchNextPage}
 *   onRefresh={refetch}
 * />
 * ```
 */
export function SearchResults({
  data,
  isLoading,
  onEndReached,
  onRefresh,
  isRefreshing = false,
  emptyMessage = 'No services found. Try different keywords.',
  className,
  headerComponent,
}: SearchResultsProps) {
  // Loading state with skeletons
  if (isLoading && !data) {
    return (
      <View className={cn('flex-1 px-4', className)}>
        {[1, 2, 3, 4].map((i) => (
          <ServiceSearchCardSkeleton key={i} />
        ))}
      </View>
    );
  }

  // Empty state
  if (!data || data.length === 0) {
    return (
      <View className="flex-1 items-center justify-center px-6">
        <Icon as={Scissors} size={48} className="text-muted-foreground mb-4" />
        <Text className="text-center text-muted-foreground text-base">
          {emptyMessage}
        </Text>
      </View>
    );
  }

  return (
    <FlashList
      data={data}
      renderItem={({ item }) => <ServiceSearchCard service={item} />}
      keyExtractor={(item) => item.service_id}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.5}
      onRefresh={onRefresh}
      refreshing={isRefreshing}
      ListHeaderComponent={headerComponent}
      contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
      showsVerticalScrollIndicator={false}
      className={className}
    />
  );
}

/**
 * Individual service search result card with enhanced features:
 * - Clean modern layout inspired by customer dashboard
 * - Favorite heart icon with animation
 * - Provider avatar and name (clickable)
 * - Service duration display
 * - Better price formatting with currency
 * - Category tag with icon
 * - Smooth press animations
 */
function ServiceSearchCard({ service }: { service: ServiceSearchResult }) {
  const user = useAuthStore((state) => state.user);
  const toggleFavorite = useToggleFavorite();
  const { data: isFavorited = false } = useIsFavorited(
    user?.id,
    'service',
    service.service_id
  );

  // Animation values
  const scale = useSharedValue(1);
  const heartScale = useSharedValue(isFavorited ? 1 : 0.8);

  const handlePress = () => {
    router.push(`/(customer)/service/${service.service_id}` as any);
  };

  const handleProviderPress = (e: any) => {
    e.stopPropagation();
    router.push(`/(customer)/provider/${service.provider_id}` as any);
  };

  const handleFavoritePress = (e: any) => {
    e.stopPropagation();
    
    if (!user?.id) {
      // Navigate to auth screen
      router.push('/(auth)');
      return;
    }

    // Animate heart
    heartScale.value = withSpring(isFavorited ? 0.8 : 1.2, {}, (finished) => {
      if (finished) {
        heartScale.value = withSpring(1);
      }
    });

    // Toggle favorite
    toggleFavorite.mutate({
      userId: user.id,
      type: 'service',
      itemId: service.service_id,
      isFavorited,
    });
  };

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const heartStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heartScale.value }],
  }));

  // Format price
  const formatPrice = (price: number) => {
    return `£${price.toFixed(2)}`;
  };

  // Format duration intelligently
  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (remainingMinutes === 0) {
      return `${hours} hr`;
    }
    
    return `${hours} hr ${remainingMinutes} min`;
  };

  // Get provider initials
  const getProviderInitials = () => {
    const name = service.provider_name || 'Provider';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return parts[0][0] + parts[parts.length - 1][0];
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={() => {
        scale.value = withSpring(0.98);
      }}
      onPressOut={() => {
        scale.value = withSpring(1);
      }}
      className="mb-4"
    >
      <Animated.View style={cardStyle}>
        <Card className="bg-card border border-border overflow-hidden py-0 shadow-sm">
          <CardContent className="p-0">
            {/* Header with gradient background */}
            <View className="bg-primary/5 px-4 py-3 flex-row items-center justify-between">
              <View className="flex-1">
                <Text className="font-bold text-foreground text-lg mb-0.5" numberOfLines={1}>
                  {service.service_title}
                </Text>
                {/* Category Tag */}
                <View className="flex-row items-center gap-1">
                  <Icon as={MapPin} size={12} className="text-muted-foreground" />
                  <Text className="text-xs text-muted-foreground">
                    {service.category_name}
                  </Text>
                </View>
              </View>

              {/* Favorite Heart */}
              <Pressable
                onPress={handleFavoritePress}
                className="p-2 -m-2"
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Animated.View style={heartStyle}>
                  <Icon
                    as={Heart}
                    size={22}
                    className={isFavorited ? 'text-red-500' : 'text-muted-foreground'}
                    fill={isFavorited ? 'currentColor' : 'none'}
                  />
                </Animated.View>
              </Pressable>
            </View>

            {/* Content Section */}
            <View className="px-4 py-3">
              {/* Description */}
              {service.service_description && (
                <Text className="text-sm text-muted-foreground mb-3 leading-relaxed" numberOfLines={2}>
                  {service.service_description}
                </Text>
              )}

              {/* Stats Row: Price + Duration */}
              <View className="flex-row items-center gap-4 mb-3">
                <View className="flex-row items-center gap-2">
                  <View className="w-8 h-8 bg-primary/10 rounded-lg items-center justify-center">
                    <Text className="text-primary font-bold text-xs">£</Text>
                  </View>
                  <View>
                    <Text className="text-xs text-muted-foreground">Price</Text>
                    <Text className="text-lg font-bold text-foreground">
                      {formatPrice(service.base_price)}
                    </Text>
                  </View>
                </View>

                {service.duration && (
                  <>
                    <View className="w-px h-8 bg-border" />
                    <View className="flex-row items-center gap-2">
                      <View className="w-8 h-8 bg-primary/10 rounded-lg items-center justify-center">
                        <Icon as={Clock} size={14} className="text-primary" />
                      </View>
                      <View>
                        <Text className="text-xs text-muted-foreground">Duration</Text>
                        <Text className="text-lg font-semibold text-foreground">
                          {formatDuration(service.duration)}
                        </Text>
                      </View>
                    </View>
                  </>
                )}
              </View>

              {/* Provider Info */}
              <Pressable
                onPress={handleProviderPress}
                className="flex-row items-center justify-between bg-muted/30 rounded-lg px-3 py-2.5 border border-border/50"
              >
                <View className="flex-row items-center gap-2 flex-1">
                  <Avatar alt={service.provider_name} className="w-8 h-8">
                    <AvatarImage source={{ uri: service.provider_avatar_url || undefined }} />
                    <AvatarFallback>
                      <Text className="text-xs font-semibold">{getProviderInitials()}</Text>
                    </AvatarFallback>
                  </Avatar>
                  <View className="flex-1">
                    <Text className="text-xs text-muted-foreground mb-0.5">Provided by</Text>
                    <Text className="text-sm font-medium text-foreground" numberOfLines={1}>
                      {service.provider_name}
                    </Text>
                  </View>
                </View>
                <Icon as={ChevronRight} size={16} className="text-muted-foreground" />
              </Pressable>
            </View>
          </CardContent>
        </Card>
      </Animated.View>
    </Pressable>
  );
}

/**
 * Loading skeleton for service cards
 */
function ServiceSearchCardSkeleton() {
  return (
    <Card className="bg-card border border-border mb-3">
      <CardContent className="p-4">
        <View className="flex-row items-start gap-4">
          <Skeleton className="w-16 h-16 rounded-xl" />
          <View className="flex-1 gap-2">
            <Skeleton className="w-3/4 h-5" />
            <Skeleton className="w-1/2 h-4" />
            <Skeleton className="w-2/3 h-3" />
          </View>
        </View>
      </CardContent>
    </Card>
  );
}

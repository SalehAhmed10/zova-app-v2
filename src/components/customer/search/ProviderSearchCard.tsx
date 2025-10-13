import React, { useState } from 'react';
import { View, TouchableOpacity, Pressable } from 'react-native';
import { router } from 'expo-router';
import { User, MapPin, ChevronRight, Star, CheckCircle, Heart, Briefcase } from 'lucide-react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { Card, CardContent } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useAuthOptimized, useToggleFavorite, useIsFavorited } from '@/hooks';
import type { ProviderSearchResult } from '@/hooks/shared/use-provider-search';

export interface ProviderSearchCardProps {
  provider: ProviderSearchResult;
  showRelevance?: boolean;
}

/**
 * Individual provider search result card with enhanced features:
 * - Favorite heart icon with animation
 * - Service count badge
 * - Star ratings display
 * - Location/distance info (if available)
 * - Enhanced verified badge styling
 * - Expandable business description
 * - Smooth press animations
 * 
 * @example
 * ```tsx
 * <ProviderSearchCard
 *   provider={providerData}
 *   showRelevance={false}
 * />
 * ```
 */
export function ProviderSearchCard({
  provider,
  showRelevance = false,
}: ProviderSearchCardProps) {
  const { user } = useAuthOptimized();
  const toggleFavorite = useToggleFavorite();
  const { data: isFavorited = false } = useIsFavorited(
    user?.id,
    'provider',
    provider.provider_id
  );
  
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

  // Animation values
  const scale = useSharedValue(1);
  const heartScale = useSharedValue(isFavorited ? 1 : 0.8);

  const handlePress = () => {
    router.push(`/(customer)/provider/${provider.provider_id}` as any);
  };

  const handleFavoritePress = () => {
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
      type: 'provider',
      itemId: provider.provider_id,
      isFavorited,
    });
  };

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const heartStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heartScale.value }],
  }));

  // Extract initials for avatar fallback
  const getInitials = (name: string | null) => {
    if (!name || name.trim() === '') {
      return 'PR'; // Default initials for "Provider"
    }
    return name
      .split(' ')
      .map((word) => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
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
      className="mb-3"
    >
      <Animated.View style={cardStyle}>
        <Card className="bg-card border border-border">
          <CardContent className="p-4">
            {/* Header: Avatar, Name, Favorite */}
            <View className="flex-row items-start gap-4 mb-3">
              {/* Provider Avatar */}
              <Avatar alt={provider.business_name || 'Service Provider'} className="w-16 h-16">
                <AvatarImage source={{ uri: provider.avatar_url || undefined }} />
                <AvatarFallback>
                  <Text className="text-primary font-semibold text-lg">
                    {getInitials(provider.business_name)}
                  </Text>
                </AvatarFallback>
              </Avatar>

              {/* Provider Details */}
              <View className="flex-1">
                <View className="flex-row items-center gap-2 mb-2">
                  <Text className="font-semibold text-foreground text-base flex-1">
                    {provider.business_name || 'Service Provider'}
                  </Text>
                </View>

                {/* Badges Row */}
                <View className="flex-row items-center gap-2 flex-wrap">
                  {/* Service Count */}
                  {provider.services_count !== undefined && provider.services_count > 0 && (
                    <Badge variant="secondary" className="flex-row items-center gap-1 px-2 py-0.5">
                      <Icon as={Briefcase} size={10} className="text-secondary-foreground" />
                      <Text className="text-xs text-secondary-foreground">
                        {provider.services_count} {provider.services_count === 1 ? 'service' : 'services'}
                      </Text>
                    </Badge>
                  )}

                  {/* Location (if available) */}
                  {provider.distance !== undefined && (
                    <Badge variant="outline" className="flex-row items-center gap-1 px-2 py-0.5">
                      <Icon as={MapPin} size={10} className="text-muted-foreground" />
                      <Text className="text-xs text-muted-foreground">
                        {provider.distance < 1 
                          ? `${(provider.distance * 1000).toFixed(0)}m`
                          : `${provider.distance.toFixed(1)}km`
                        }
                      </Text>
                    </Badge>
                  )}
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
                    size={20}
                    className={isFavorited ? 'text-red-500' : 'text-muted-foreground'}
                    fill={isFavorited ? 'currentColor' : 'none'}
                  />
                </Animated.View>
              </Pressable>
            </View>

            {/* Business Description */}
            {provider.business_description && (
              <View className="mb-2">
                <Text
                  className="text-muted-foreground text-sm"
                  numberOfLines={isDescriptionExpanded ? undefined : 2}
                >
                  {provider.business_description}
                </Text>
                {provider.business_description.length > 100 && (
                  <TouchableOpacity
                    onPress={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                  >
                    <Text className="text-primary text-xs font-medium mt-1">
                      {isDescriptionExpanded ? 'Show less' : 'Read more...'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Footer: Arrow */}
            <View className="flex-row items-center justify-end pt-2 border-t border-border/50">
              <Text className="text-xs text-muted-foreground mr-2">View Profile</Text>
              <Icon as={ChevronRight} size={18} className="text-muted-foreground" />
            </View>
          </CardContent>
        </Card>
      </Animated.View>
    </Pressable>
  );
}

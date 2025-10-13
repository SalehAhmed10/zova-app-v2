import React from 'react';
import { View, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Card, CardContent } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/lib/core/useColorScheme';
import { THEME } from '@/lib/theme';
import { useTrackView } from '@/hooks/shared/useTrackView';

interface FavoriteService {
  id: string;
  title: string;
  description?: string;
  base_price: number;
  price_type: 'fixed' | 'hourly';
  provider?: {
    id: string;
    first_name: string;
    last_name: string;
    business_name?: string;
    avatar_url?: string;
    rating?: number;
  } | null;
  category_name: string;
  subcategory_name: string;
}

interface ServiceCardProps {
  service: FavoriteService;
  showFavoriteButton?: boolean;
  onToggleFavorite?: () => void;
  isFavorited?: boolean;
  actionButtonText?: string;
  onActionPress?: () => void;
}

export const ServiceCard: React.FC<ServiceCardProps> = ({
  service,
  showFavoriteButton = true, // Default to true for customer-facing usage
  onToggleFavorite,
  isFavorited = false,
  actionButtonText = "Book Now",
  onActionPress
}) => {
  const router = useRouter();
  const { isDarkColorScheme } = useColorScheme();
  const trackView = useTrackView();

  const handleCardPress = () => {
    // Track service view
    trackView.mutate({
      type: 'service',
      targetId: service.id,
      providerId: service.provider?.id,
    });
    router.push(`/(customer)/service/${service.id}` as any);
  };

  const handleToggleFavorite = (e: any) => {
    e.stopPropagation();
    onToggleFavorite?.();
  };

  const handleActionPress = () => {
    if (onActionPress) {
      onActionPress();
    } else {
      router.push('/(customer)/bookings');
    }
  };

  const providerDisplayName = service.provider
    ? `${service.provider.first_name} ${service.provider.last_name}`
    : 'Provider not available';

  const providerInitials = service.provider
    ? `${service.provider.first_name[0]}${service.provider.last_name[0]}`
    : '?';

  return (
    <TouchableOpacity
      activeOpacity={0.95}
      onPress={handleCardPress}
      className="mb-4"
    >
      <Card className="bg-card border border-border/50  overflow-hidden">
        <CardContent className="p-4">
          {/* Service Title and Price */}
          <View className="mb-4">
            <View className="flex-row items-start justify-between mb-2">
              <Text className="text-lg font-bold text-foreground flex-1 mr-3" numberOfLines={2}>
                {service.title}
              </Text>
              <View className="items-end">
                <Text className="text-xl font-bold text-primary">
                  £{service.base_price}
                </Text>
                <Text className="text-xs text-muted-foreground">
                  {service.price_type === 'hourly' ? 'per hour' : 'fixed price'}
                </Text>
              </View>
            </View>

            {service.description && (
              <Text className="text-sm text-muted-foreground mb-3 leading-5" numberOfLines={2} ellipsizeMode="tail">
                {service.description}
              </Text>
            )}
          </View>

          {/* Provider Info */}
          <View className="flex-row items-center gap-3 mb-4">
            <View className="relative">
              <Avatar className="w-12 h-12 border-2 border-primary/20" alt={providerDisplayName}>
                {service.provider?.avatar_url ? (
                  <AvatarImage source={{ uri: service.provider.avatar_url }} />
                ) : null}
                <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10">
                  <Text className="text-sm font-bold text-primary">
                    {providerInitials}
                  </Text>
                </AvatarFallback>
              </Avatar>
              {showFavoriteButton && (
                <TouchableOpacity
                  onPress={handleToggleFavorite}
                  className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-card border border-border items-center justify-center "
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={isFavorited ? "heart" : "heart-outline"}
                    size={14}
                    color={isFavorited ? "#ef4444" : (isDarkColorScheme ? THEME.dark.mutedForeground : THEME.light.mutedForeground)}
                  />
                </TouchableOpacity>
              )}
            </View>

            <View className="flex-1">
              <Text className="text-sm font-semibold text-foreground mb-1" numberOfLines={1}>
                {providerDisplayName}
              </Text>
              {service.provider?.business_name && (
                <Text className="text-xs text-muted-foreground mb-1" numberOfLines={1}>
                  {service.provider.business_name}
                </Text>
              )}
              {service.provider?.rating && (
                <View className="flex-row items-center gap-1">
                  <Ionicons name="star" size={10} color="#F59E0B" />
                  <Text className="text-xs font-medium text-amber-700 dark:text-amber-400">
                    {service.provider.rating.toFixed(1)}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Category Badges */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="mb-4"
            contentContainerStyle={{ gap: 8 }}
          >
            <Badge className="bg-primary/80 text-primary border-primary/30 px-2 py-1 flex-shrink-0">
              <Text className="text-xs font-medium" numberOfLines={1}>
                {service.category_name}
              </Text>
            </Badge>
            <Badge className="bg-secondary/80 text-secondary-foreground border-secondary/50 px-2 py-1 flex-shrink-0">
              <Text className="text-xs font-medium" numberOfLines={1}>
                {service.subcategory_name}
              </Text>
            </Badge>
          </ScrollView>

          {/* Action Button */}
          <Button
            onPress={handleActionPress}
            className="w-full bg-primary hover:bg-primary/90 active:bg-primary/80"
          >
            <View className="flex-row items-center justify-center gap-2">
              <Text className="text-primary-foreground font-semibold">{actionButtonText}</Text>
              <Feather name="arrow-right" size={16} color={isDarkColorScheme ? THEME.dark.primaryForeground : THEME.light.primaryForeground} />
            </View>
          </Button>
        </CardContent>
      </Card>
    </TouchableOpacity>
  );
};
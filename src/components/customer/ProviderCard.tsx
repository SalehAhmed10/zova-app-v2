import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/lib/core/useColorScheme';
import { THEME } from '@/lib/theme';
import { useTrackView } from '@/hooks/shared/useTrackView';

interface FavoriteProvider {
  id: string;
  first_name: string;
  last_name: string;
  business_name?: string;
  avatar_url?: string;
  rating?: number;
  review_count?: number;
  services_count?: number;
}

interface ProviderCardProps {
  provider: FavoriteProvider;
  showFavoriteButton?: boolean;
  onToggleFavorite?: () => void;
  isFavorited?: boolean;
  variant?: 'default' | 'compact';
}

export const ProviderCard: React.FC<ProviderCardProps> = ({
  provider,
  showFavoriteButton = true, // Default to true for customer side
  onToggleFavorite,
  isFavorited = false,
  variant = 'default'
}) => {
  const router = useRouter();
  const { isDarkColorScheme } = useColorScheme();
  const trackView = useTrackView();

  const handlePress = () => {
    // Track profile view
    trackView.mutate({
      type: 'profile',
      targetId: provider.id,
    });
    router.push(`/customer/provider/${provider.id}`);
  };

  const handleToggleFavorite = (e: any) => {
    e.stopPropagation();
    onToggleFavorite?.();
  };

  const displayName = `${provider.first_name} ${provider.last_name}`;
  const initials = `${provider.first_name[0]}${provider.last_name[0]}`;

  const cardPadding = variant === 'compact' ? 'p-3' : 'p-4';
  const avatarSize = variant === 'compact' ? 'w-12 h-12' : 'w-14 h-14';

  return (
    <Card className={`bg-card border border-border/50 mb-3  overflow-hidden ${cardPadding}`}>
      <CardContent className="p-0">
        <View className="flex-row items-start gap-3">
          {/* Avatar Section */}
          <View className="relative">
            <Avatar className={`${avatarSize} border-2 border-primary/20`} alt={displayName}>
              {provider.avatar_url ? (
                <AvatarImage source={{ uri: provider.avatar_url }} />
              ) : null}
              <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10">
                <Text className={`font-bold text-primary ${variant === 'compact' ? 'text-sm' : 'text-base'}`}>
                  {initials}
                </Text>
              </AvatarFallback>
            </Avatar>
          </View>

          {/* Content Section */}
          <View className="flex-1">
            {/* Header with Name and Favorite Button */}
            <View className="flex-row items-start justify-between mb-2">
              <View className="flex-1 mr-2">
                <Text className={`${variant === 'compact' ? 'text-base' : 'text-lg'} font-bold text-foreground mb-1`} numberOfLines={1}>
                  {displayName}
                </Text>
                {provider.business_name && (
                  <Text className="text-sm text-muted-foreground" numberOfLines={1}>
                    {provider.business_name}
                  </Text>
                )}
              </View>

              {/* Favorite Button - More Prominent */}
              {showFavoriteButton && (
                <Button
                  variant="ghost"
                  size="sm"
                  onPress={handleToggleFavorite}
                  className={`p-2 rounded-full ${isFavorited ? 'bg-red-50 dark:bg-red-950/20' : 'bg-muted/30 hover:bg-muted/50'} active:scale-95`}
                >
                  <Ionicons
                    name={isFavorited ? "heart" : "heart-outline"}
                    size={20}
                    color={isFavorited ? THEME.light.destructive : (isDarkColorScheme ? THEME.dark.mutedForeground : THEME.light.mutedForeground)}
                  />
                </Button>
              )}
            </View>

            {/* Rating and Services Info */}
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                {provider.rating ? (
                  <View className="flex-row items-center gap-1 bg-amber-50 dark:bg-amber-950/20 px-2 py-1 rounded-full border border-amber-200 dark:border-amber-800/30">
                    <Ionicons name="star" size={12} color={isDarkColorScheme ? THEME.dark.warning : THEME.light.warning} />
                    <Text className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                      {provider.rating.toFixed(1)}
                    </Text>
                    <Text className="text-xs text-amber-600 dark:text-amber-500 ml-1">
                      ({provider.review_count || 0})
                    </Text>
                  </View>
                ) : (
                  <Badge className="bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/30">
                    <Text className="text-xs font-medium text-emerald-700 dark:text-emerald-400">New Provider</Text>
                  </Badge>
                )}
              </View>

              <View className="flex-row items-center gap-1">
                <Ionicons name="briefcase-outline" size={14} color={isDarkColorScheme ? THEME.dark.mutedForeground : THEME.light.mutedForeground} />
                <Text className="text-sm text-muted-foreground font-medium">
                  {provider.services_count || 0}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Action Button */}
        <View className="mt-4 pt-3 border-t border-border/30">
          <Button
            onPress={handlePress}
            className="w-full bg-primary hover:bg-primary/90 active:bg-primary/80"
          >
            <View className="flex-row items-center justify-center gap-2">
              <Text className="text-primary-foreground font-semibold">View Profile</Text>
              <Ionicons name="eye-outline" size={16} color={isDarkColorScheme ? THEME.dark.primaryForeground : THEME.light.primaryForeground} />
            </View>
          </Button>
        </View>
      </CardContent>
    </Card>
  );
};
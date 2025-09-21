import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Text } from '@/components/ui/text';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useStableCallback } from '@/lib/performance';

// Shared Provider Card Component
export const ProviderCard = React.memo(({
  provider,
  showServices = true,
  compact = false
}: {
  provider: any;
  showServices?: boolean;
  compact?: boolean;
}) => {
  const handlePress = useStableCallback(() => {
    router.push(`/profiles/provider?providerId=${provider.id}`);
  }, [provider.id]);

  return (
    <TouchableOpacity
      onPress={handlePress}
      className={`flex-row gap-3 p-4 bg-card border border-border/50 rounded-lg mb-3 ${compact ? 'py-3' : ''}`}
    >
    {/* Provider Avatar */}
    <Avatar className={compact ? "w-12 h-12" : "w-16 h-16"} alt='Provider Avatar'>
      {provider.avatar_url ? (
        <AvatarImage source={{ uri: provider.avatar_url }} />
      ) : null}
      <AvatarFallback className="bg-primary/10">
        <Text className={compact ? "text-sm font-bold text-primary" : "text-lg font-bold text-primary"}>
          {provider.first_name[0]}{provider.last_name[0]}
        </Text>
      </AvatarFallback>
    </Avatar>

    {/* Provider Details */}
    <View className="flex-1">
      <View className="flex-row items-center gap-2 mb-1">
        <Text className={compact ? "text-base font-bold text-foreground" : "text-lg font-bold text-foreground"}>
          {provider.first_name} {provider.last_name}
        </Text>
        {provider.is_verified && (
          <View className="flex-row items-center">
            <Ionicons name="checkmark-circle" size={compact ? 12 : 14} color="#10B981" />
          </View>
        )}
      </View>

      {provider.business_name && (
        <Text className="text-sm text-muted-foreground mb-1">
          {provider.business_name}
        </Text>
      )}

      <View className="flex-row items-center gap-2 mb-2">
        <Text className="text-sm">⭐</Text>
        <Text className="text-sm font-medium text-foreground">
          {provider.avg_rating?.toFixed(1) || 'New'}
        </Text>
        <Text className="text-xs text-muted-foreground">
          ({provider.total_reviews || 0} reviews)
        </Text>
      </View>

      {provider.city && (
        <View className="flex-row items-center gap-1 mb-2">
          <Ionicons name="location-outline" size={12} color="#6B7280" />
          <Text className="text-xs text-muted-foreground">{provider.city}</Text>
        </View>
      )}

      {/* Featured Service */}
      {showServices && provider.featured_service && (
        <View className="flex-row items-center justify-between">
          <View className="flex-1">
            <Text className="text-sm font-medium text-foreground">
              {provider.featured_service.title}
            </Text>
            <Text className="text-xs text-muted-foreground">
              {provider.featured_service.price_type === 'hourly'
                ? `£${provider.featured_service.base_price}/hr`
                : `£${provider.featured_service.base_price}`
              }
            </Text>
          </View>
          <Badge variant="secondary" className="text-xs">
            <Text>Service Provider</Text>
          </Badge>
        </View>
      )}

      {showServices && !provider.featured_service && (
        <View className="flex-row items-center justify-between">
          <View className="flex-1">
            <Text className="text-sm text-muted-foreground">
              No services listed yet
            </Text>
          </View>
          <Badge variant="outline" className="text-xs">
            <Text>Provider</Text>
          </Badge>
        </View>
      )}
    </View>

    {/* Arrow */}
    <View className="justify-center">
      <Ionicons name="chevron-forward" size={20} color="#6B7280" />
    </View>
  </TouchableOpacity>
  );
});

ProviderCard.displayName = 'ProviderCard';

// Provider Rating Display Component
export const ProviderRating = React.memo(({
  rating,
  reviewCount,
  size = 'sm'
}: {
  rating?: number;
  reviewCount?: number;
  size?: 'sm' | 'md' | 'lg';
}) => {
  const textSize = size === 'lg' ? 'text-lg' : size === 'md' ? 'text-base' : 'text-sm';
  const iconSize = size === 'lg' ? 20 : size === 'md' ? 16 : 14;

  return (
    <View className="flex-row items-center gap-1">
      <Ionicons name="star" size={iconSize} color="#F59E0B" />
      <Text className={`${textSize} font-medium text-foreground`}>
        {rating?.toFixed(1) || 'New'}
      </Text>
      {reviewCount !== undefined && (
        <Text className="text-xs text-muted-foreground">
          ({reviewCount} reviews)
        </Text>
      )}
    </View>
  );
});

ProviderRating.displayName = 'ProviderRating';

// Provider Verification Badge Component
export const ProviderVerificationBadge = React.memo(({ isVerified }: { isVerified: boolean }) => {
  if (!isVerified) return null;

  return (
    <View className="flex-row items-center gap-1">
      <Ionicons name="checkmark-circle" size={14} color="#10B981" />
      <Text className="text-xs text-green-600 font-medium">Verified</Text>
    </View>
  );
});

ProviderVerificationBadge.displayName = 'ProviderVerificationBadge';
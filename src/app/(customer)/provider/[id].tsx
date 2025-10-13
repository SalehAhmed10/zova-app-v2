import React from 'react';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeInUp, FadeInLeft } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useProviderDetails, ProviderDetails } from '@/hooks/customer/useProviderDetails';
import { useColorScheme } from '@/lib/core/useColorScheme';
import { ServiceCard } from '@/components/customer/ServiceCard';

export default function ProviderDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { isDarkColorScheme } = useColorScheme();
  const { data: provider, isLoading, error } = useProviderDetails(id as string);

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 items-center justify-center">
          <Animated.View
            entering={FadeInDown.duration(600)}
            className="items-center"
          >
            <View className="w-12 h-12 rounded-full bg-primary/20 items-center justify-center mb-4">
              <Ionicons name="refresh" size={24} className="text-primary" />
            </View>
            <Text className="text-muted-foreground text-lg">Loading provider details...</Text>
          </Animated.View>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !provider) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 items-center justify-center px-6">
          <Animated.View
            entering={FadeInDown.duration(600)}
            className="items-center"
          >
            <View className="w-20 h-20 rounded-full bg-destructive/10 items-center justify-center mb-6">
              <Ionicons name="alert-circle" size={40} className="text-destructive" />
            </View>
            <Text className="text-xl font-bold text-foreground mb-2">
              Provider not found
            </Text>
            <Text className="text-muted-foreground text-center mb-6 leading-6">
              The provider you're looking for doesn't exist or has been removed.
            </Text>
            <Button onPress={() => router.back()} className="px-8">
              <Text className="text-primary-foreground font-semibold">Go Back</Text>
            </Button>
          </Animated.View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Animated.View
          entering={FadeInDown.duration(600).delay(200)}
          className="relative"
        >
          <View className="h-32 relative">
            <LinearGradient
              colors={[
                isDarkColorScheme ? 'rgba(238, 68, 83, 0.15)' : 'rgba(238, 68, 83, 0.1)',
                isDarkColorScheme ? 'rgba(238, 68, 83, 0.05)' : 'rgba(238, 68, 83, 0.02)',
                'transparent'
              ]}
              className="absolute inset-0"
            />
            <View className="absolute top-4 left-4 z-10">
              <TouchableOpacity
                onPress={() => router.back()}
                className="w-10 h-10 rounded-full bg-background/80 items-center justify-center"
              >
                <Ionicons
                  name="arrow-back"
                  size={20}
                  className="text-foreground"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Provider Avatar */}
          <Animated.View
            entering={FadeInUp.duration(600).delay(400)}
            className="absolute -bottom-12 left-6"
          >
            <View className="w-24 h-24 rounded-full bg-card border-4 border-background  items-center justify-center">
              <Text className="text-3xl font-bold text-primary">
                {provider.first_name?.[0]}{provider.last_name?.[0]}
              </Text>
            </View>
          </Animated.View>
        </Animated.View>

        {/* Provider Info */}
        <Animated.View
          entering={FadeInUp.duration(600).delay(600)}
          className="px-6 pt-8 pb-6"
        >
          <View className="mb-6">
            <Text className="text-2xl font-bold text-foreground mb-1">
              {provider.first_name} {provider.last_name}
            </Text>
            {provider.business_name && (
              <Text className="text-lg font-semibold text-primary mb-1">
                {provider.business_name}
              </Text>
            )}
            <Text className="text-muted-foreground text-lg">
              {provider.city || 'Independent Provider'}
            </Text>
          </View>

          {/* Stats */}
          <Animated.View
            entering={FadeInUp.duration(600).delay(800)}
            className="flex-row justify-between mb-6"
          >
            <View className="items-center flex-1">
              <Text className="text-2xl font-bold text-primary">
                {(provider as any).provider_services?.length || 0}
              </Text>
              <Text className="text-sm text-muted-foreground">Services</Text>
            </View>
            <View className="items-center flex-1">
              <Text className="text-2xl font-bold text-primary">
                {provider.years_of_experience || 0}
              </Text>
              <Text className="text-sm text-muted-foreground">Years Exp.</Text>
            </View>
            <View className="items-center flex-1">
              <View className="flex-row items-center">
                <Ionicons name="star" size={16} className="text-primary" />
                <Text className="text-2xl font-bold text-primary ml-1">
                  {(provider as any).average_rating?.toFixed(1) || '0.0'}
                </Text>
              </View>
              <Text className="text-sm text-muted-foreground">
                {(provider as any).total_reviews || 0} reviews
              </Text>
            </View>
          </Animated.View>

          {/* Description */}
          {provider.bio && (
            <Animated.View
              entering={FadeInUp.duration(600).delay(1000)}
              className="mb-6"
            >
              <Text className="text-lg font-semibold text-foreground mb-2">About</Text>
              <Text className="text-muted-foreground leading-6">
                {provider.bio}
              </Text>
            </Animated.View>
          )}

          {/* Business Description */}
          {provider.business_description && (
            <Animated.View
              entering={FadeInUp.duration(600).delay(1100)}
              className="mb-6"
            >
              <Text className="text-lg font-semibold text-foreground mb-2">Business Description</Text>
              <Text className="text-muted-foreground leading-6">
                {provider.business_description}
              </Text>
            </Animated.View>
          )}

          {/* Contact Info */}
          <Animated.View
            entering={FadeInUp.duration(600).delay(1200)}
            className="mb-6"
          >
            <Text className="text-lg font-semibold text-foreground mb-3">Contact Information</Text>
            <View>
              {provider.phone_number && (
                <View className="flex-row items-center mb-3">
                  <View className="w-10 h-10 rounded-full bg-primary/10 items-center justify-center mr-3">
                    <Ionicons name="call" size={20} className="text-primary" />
                  </View>
                  <Text className="text-foreground">{provider.phone_number}</Text>
                </View>
              )}
              {provider.email && (
                <View className="flex-row items-center mb-3">
                  <View className="w-10 h-10 rounded-full bg-primary/10 items-center justify-center mr-3">
                    <Ionicons name="mail" size={20} className="text-primary" />
                  </View>
                  <Text className="text-foreground">{provider.email}</Text>
                </View>
              )}
              {provider.address && (
                <View className="flex-row items-center">
                  <View className="w-10 h-10 rounded-full bg-primary/10 items-center justify-center mr-3">
                    <Ionicons name="location" size={20} className="text-primary" />
                  </View>
                  <Text className="text-foreground">{provider.address}</Text>
                </View>
              )}
              {provider.website && (
                <View className="flex-row items-center">
                  <View className="w-10 h-10 rounded-full bg-primary/10 items-center justify-center mr-3">
                    <Ionicons name="globe" size={20} className="text-primary" />
                  </View>
                  <Text className="text-foreground">{provider.website}</Text>
                </View>
              )}
            </View>
          </Animated.View>

          {/* Reviews */}
          {(provider as any).recent_reviews && (provider as any).recent_reviews.length > 0 && (
            <Animated.View
              entering={FadeInUp.duration(600).delay(1400)}
              className="mb-6"
            >
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-lg font-semibold text-foreground">Recent Reviews</Text>
                {(provider as any).total_reviews > 2 && (
                  <TouchableOpacity className="flex-row items-center">
                    <Text className="text-primary font-medium mr-1">View all</Text>
                    <Ionicons name="chevron-forward" size={16} className="text-primary" />
                  </TouchableOpacity>
                )}
              </View>
              <View className="gap-4">
                {(provider as any).recent_reviews.map((review: any, index: number) => (
                  <Animated.View
                    key={review.id}
                    entering={FadeInLeft.duration(400).delay(1600 + index * 200)}
                    className="bg-card rounded-xl p-4 border border-border "
                  >
                    <View className="flex-row items-start justify-between mb-3">
                      <View className="flex-row items-center flex-1 mr-3">
                        <View className="w-10 h-10 rounded-full bg-primary/10 items-center justify-center mr-3">
                          <Text className="text-sm font-semibold text-primary">
                            {review.customer_first_name?.[0]?.toUpperCase() || '?'}{review.customer_last_name?.[0]?.toUpperCase() || ''}
                          </Text>
                        </View>
                        <View className="flex-1">
                          <Text className="font-medium text-foreground text-base">
                            {review.customer_first_name || 'Anonymous'} {review.customer_last_name || 'Customer'}
                          </Text>
                          <View className="flex-row items-center mt-1">
                            {[...Array(5)].map((_, starIndex) => (
                              <Ionicons
                                key={starIndex}
                                name={starIndex < (review.rating || 0) ? "star" : "star-outline"}
                                size={16}
                                className={starIndex < (review.rating || 0) ? "text-primary" : "text-muted-foreground"}
                                style={{ marginRight: starIndex < 4 ? 2 : 0 }}
                              />
                            ))}
                            <Text className="text-sm text-muted-foreground ml-2">
                              {review.rating || 0}/5
                            </Text>
                          </View>
                        </View>
                      </View>
                    </View>
                    {review.comment && (
                      <Text className="text-muted-foreground leading-6 mb-3 text-base">
                        "{review.comment}"
                      </Text>
                    )}
                    <Text className="text-xs text-muted-foreground">
                      {review.created_at ? new Date(review.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      }) : 'Date not available'}
                    </Text>
                  </Animated.View>
                ))}
              </View>
            </Animated.View>
          )}

          {/* Services */}
          {(provider as any).provider_services && (provider as any).provider_services.length > 0 && (
            <Animated.View
              entering={FadeInUp.duration(600).delay(1300)}
              className="mb-6"
            >
              <Text className="text-lg font-semibold text-foreground mb-3">Services Offered</Text>
              <View className="gap-4">
                {(provider as any).provider_services.map((service: any, index: number) => (
                  <Animated.View
                    key={service.id}
                    entering={FadeInUp.duration(400).delay(1400 + index * 100)}
                  >
                    <ServiceCard
                      service={{
                        id: service.id,
                        title: service.title,
                        description: service.description,
                        base_price: service.price || service.base_price || 0,
                        price_type: service.price_type || 'fixed',
                        provider: {
                          id: provider.id,
                          first_name: provider.first_name,
                          last_name: provider.last_name,
                          business_name: provider.business_name,
                          avatar_url: provider.avatar_url,
                          rating: (provider as any).average_rating
                        },
                        category_name: service.service_subcategories?.service_categories?.name || 'General',
                        subcategory_name: service.service_subcategories?.name || 'Service'
                      }}
                      showFavoriteButton={false}
                      actionButtonText="Book Service"
                      onActionPress={() => {
                        router.push(`/(customer)/service/${service.id}` as any);
                      }}
                    />
                  </Animated.View>
                ))}
              </View>
            </Animated.View>
          )}
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}
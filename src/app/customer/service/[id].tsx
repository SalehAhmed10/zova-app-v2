import React from 'react';
import { View, ScrollView, Dimensions, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeInUp, SlideInRight } from 'react-native-reanimated';
import { useServiceDetails } from '@/hooks/customer/useServiceDetails';
import { useColorScheme } from '@/lib/core/useColorScheme';
import { THEME } from '@/lib/core/theme';

const { width } = Dimensions.get('window');

export default function ServiceDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { isDarkColorScheme } = useColorScheme();
  const { data: service, isLoading, error } = useServiceDetails(id as string);

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 items-center justify-center">
          <Animated.View
            entering={FadeInDown.duration(600)}
            className="items-center"
          >
            <View className="w-12 h-12 rounded-full bg-primary/20 items-center justify-center mb-4">
              <Ionicons name="refresh" size={24} color={isDarkColorScheme ? THEME.dark.primary : THEME.light.primary} />
            </View>
            <Text className="text-muted-foreground text-lg">Loading service details...</Text>
          </Animated.View>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !service) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 items-center justify-center px-6">
          <Animated.View
            entering={FadeInDown.duration(600)}
            className="items-center"
          >
            <View className="w-20 h-20 rounded-full bg-destructive/10 items-center justify-center mb-6">
              <Ionicons name="alert-circle" size={40} color={isDarkColorScheme ? THEME.dark.destructive : THEME.light.destructive} />
            </View>
            <Text className="text-xl font-bold text-foreground mb-2">
              Service not found
            </Text>
            <Text className="text-muted-foreground text-center mb-6 leading-6">
              The service you're looking for doesn't exist or has been removed.
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
          entering={FadeInDown.duration(400)}
          className="px-4 py-4 border-b border-border"
        >
          <View className="flex-row items-center mb-4">
            <Button
              variant="ghost"
              size="sm"
              onPress={() => router.back()}
              className="mr-2 w-10 h-10 rounded-full"
            >
              <Ionicons name="arrow-back" size={20} color={isDarkColorScheme ? THEME.dark.mutedForeground : THEME.light.mutedForeground} />
            </Button>
            <Text className="text-xl font-bold text-foreground flex-1">
              Service Details
            </Text>
          </View>
        </Animated.View>

        {/* Service Hero */}
        <Animated.View
          entering={FadeInUp.duration(500).delay(100)}
          className="px-6 py-6 mx-4 mt-4 rounded-3xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20"
        >
          <View className="flex-row items-start">
            <Animated.View entering={SlideInRight.duration(600).delay(200)} className="mr-4">
              <Avatar className="w-16 h-16 border-3 border-background shadow-lg" alt={service.provider?.name || 'Provider'}>
                <AvatarImage source={{ uri: service.provider?.avatar }} />
                <AvatarFallback className="bg-primary">
                  <Text className="text-lg font-bold text-primary-foreground">
                    {service.provider?.name?.charAt(0) || 'P'}
                  </Text>
                </AvatarFallback>
              </Avatar>
            </Animated.View>

            <View className="flex-1">
              <Animated.Text
                entering={FadeInDown.duration(500).delay(300)}
                className="text-xl font-bold text-foreground mb-1 leading-tight"
              >
                {service.title}
              </Animated.Text>
              <Animated.Text
                entering={FadeInDown.duration(500).delay(400)}
                className="text-base text-muted-foreground mb-3"
              >
                by {service.provider?.name || 'Provider'}
              </Animated.Text>

              <Animated.View
                entering={FadeInDown.duration(500).delay(500)}
                className="flex-row items-center flex-wrap mb-3"
              >
                {service.provider?.rating && (
                  <View className="flex-row items-center mr-3 bg-warning/10 px-2 py-1 rounded-full mb-1">
                    <Ionicons name="star" size={14} color={isDarkColorScheme ? THEME.dark.warning : THEME.light.warning} />
                    <Text
                      className="text-sm font-semibold ml-1"
                      style={{ color: isDarkColorScheme ? THEME.dark.warning : THEME.light.warning }}
                    >
                      {service.provider.rating.toFixed(1)}
                    </Text>
                  </View>
                )}

                {service.duration && (
                  <View className="flex-row items-center mr-3 mb-1">
                    <Ionicons name="time-outline" size={14} color={isDarkColorScheme ? THEME.dark.mutedForeground : THEME.light.mutedForeground} />
                    <Text className="text-sm text-muted-foreground ml-1">
                      {service.duration} min
                    </Text>
                  </View>
                )}

                <View className="bg-gradient-to-r from-primary to-primary/90 px-4 py-2 rounded-2xl shadow-lg">
                  <Text className="text-lg font-bold text-primary-foreground">
                    ${service.price}
                  </Text>
                </View>
              </Animated.View>

              <Animated.View
                entering={FadeInUp.duration(500).delay(600)}
                className="flex-row flex-wrap"
              >
                {service.isHomeService && (
                  <Badge variant="secondary" className="bg-green-500/10 border-green-500/20 mr-2 mb-1">
                    <Ionicons name="home-outline" size={12} color="#22c55e" />
                    <Text className="ml-1 text-green-600 dark:text-green-400 text-sm">Home Service</Text>
                  </Badge>
                )}
                {service.isRemoteService && (
                  <Badge variant="secondary" className="bg-blue-500/10 border-blue-500/20 mb-1">
                    <Ionicons name="laptop-outline" size={12} color="#3b82f6" />
                    <Text className="ml-1 text-blue-600 dark:text-blue-400 text-sm">Remote</Text>
                  </Badge>
                )}
              </Animated.View>
            </View>
          </View>
        </Animated.View>

        {/* Service Description */}
        {service.description && (
          <Animated.View
            entering={FadeInUp.duration(500).delay(700)}
            className="mx-4"
          >
            <Card className="mt-6 shadow-sm border-border/50">
              <CardHeader className="pb-3">
                <View className="flex-row items-center">
                  <Ionicons name="document-text-outline" size={20} color={isDarkColorScheme ? THEME.dark.foreground : THEME.light.foreground} />
                  <CardTitle className="ml-2">Description</CardTitle>
                </View>
              </CardHeader>
              <CardContent>
                <Text className="text-muted-foreground leading-7 text-base">
                  {service.description}
                </Text>
              </CardContent>
            </Card>
          </Animated.View>
        )}

        {/* Provider Info */}
        <Animated.View
          entering={FadeInUp.duration(500).delay(800)}
          className="mx-4"
        >
          <Card className="mt-6 shadow-sm border-border/50 bg-gradient-to-br from-card to-card/50">
            <CardHeader className="pb-4">
              <View className="flex-row items-center">
                <Ionicons name="person-outline" size={20} color={isDarkColorScheme ? THEME.dark.foreground : THEME.light.foreground} />
                <CardTitle className="ml-2 text-lg">About the Provider</CardTitle>
              </View>
            </CardHeader>
            <CardContent className="pt-0">
              <View className="flex-row items-start mb-6">
                <Avatar className="w-16 h-16 border-3 border-background shadow-lg mr-4" alt={service.provider?.name}>
                  <AvatarImage source={{ uri: service.provider?.avatar }} />
                  <AvatarFallback className="bg-primary">
                    <Text className="text-lg font-bold text-primary-foreground">
                      {service.provider?.name?.charAt(0) || 'P'}
                    </Text>
                  </AvatarFallback>
                </Avatar>
                <View className="flex-1">
                  <Text className="font-bold text-foreground text-lg mb-1">
                    {service.provider?.name}
                  </Text>
                  {service.provider?.location && (
                    <View className="flex-row items-center mb-2">
                      <Ionicons name="location-outline" size={14} color={isDarkColorScheme ? THEME.dark.mutedForeground : THEME.light.mutedForeground} />
                      <Text className="text-sm text-muted-foreground ml-1">
                        {service.provider.location}
                      </Text>
                    </View>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onPress={() => router.push(`../provider/${service.provider?.id}`)}
                    className="border-primary/30 w-auto px-4 self-start"
                  >
                    <Text className="text-primary font-medium">View Profile</Text>
                  </Button>
                </View>
              </View>

              {service.provider?.bio && (
                <View className="mb-6">
                  <Text className="text-muted-foreground leading-7 text-base italic">
                    "{service.provider.bio}"
                  </Text>
                </View>
              )}

              <View className="flex-row items-center justify-between pt-4 border-t border-border/30">
                {service.provider?.rating && (
                  <View className="flex-row items-center bg-warning/10 px-3 py-2 rounded-xl">
                    <View className="w-6 h-6 rounded-full bg-warning/20 items-center justify-center mr-2">
                      <Ionicons name="star" size={12} color={isDarkColorScheme ? THEME.dark.warning : THEME.light.warning} />
                    </View>
                    <Text className="text-sm font-medium" style={{ color: isDarkColorScheme ? THEME.dark.warning : THEME.light.warning }}>
                      {service.provider.rating.toFixed(1)} rating
                    </Text>
                  </View>
                )}

                {(service.provider?.yearsOfExperience || service.provider?.years_of_experience) && (
                  <View className="flex-row items-center bg-primary/10 px-3 py-2 rounded-xl">
                    <View className="w-6 h-6 rounded-full bg-primary/20 items-center justify-center mr-2">
                      <Ionicons name="briefcase-outline" size={12} color={isDarkColorScheme ? THEME.dark.primary : THEME.light.primary} />
                    </View>
                    <Text className="text-sm font-medium" style={{ color: isDarkColorScheme ? THEME.dark.primary : THEME.light.primary }}>
                      {(service.provider.yearsOfExperience || service.provider.years_of_experience)} years
                    </Text>
                  </View>
                )}
              </View>
            </CardContent>
          </Card>
        </Animated.View>

        {/* Book Now Button */}
        <Animated.View
          entering={FadeInUp.duration(500).delay(900)}
          className="px-4 py-8"
        >
          <TouchableOpacity
            activeOpacity={0.9}
            className="w-full h-16 rounded-3xl shadow-2xl bg-gradient-to-r from-primary via-primary to-primary/90 items-center justify-center overflow-hidden"
            onPress={() => {
              if (service.provider?.id) {
                router.push({
                  pathname: '/customer/booking/book-service',
                  params: {
                    serviceId: service.id,
                    providerId: service.provider.id,
                    providerName: service.provider.name,
                    serviceTitle: service.title,
                    servicePrice: service.price.toString()
                  }
                });
              }
            }}
          >
            {/* Subtle overlay for depth */}
            <View className="absolute inset-0 bg-white/10 rounded-3xl" />

            {/* Animated background effect */}
            <View className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-pulse rounded-3xl" />

            <View className="flex-row items-center justify-center relative z-10">
              <Ionicons name="calendar-outline" size={22} color="white" />
              <Text className="text-primary-foreground text-base font-bold ml-3 tracking-wide">
                Book This Service
              </Text>
              <Ionicons name="chevron-forward" size={18} color="white" className="ml-2" />
            </View>
          </TouchableOpacity>

          {/* Additional info below button */}
          <View className="flex-row items-center justify-center mt-4">
            <Ionicons name="shield-checkmark-outline" size={16} color={isDarkColorScheme ? THEME.dark.mutedForeground : THEME.light.mutedForeground} />
            <Text className="text-muted-foreground text-sm ml-2">
              Secure booking • Instant confirmation
            </Text>
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}
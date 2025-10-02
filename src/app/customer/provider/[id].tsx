import React from 'react';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeInUp, FadeInLeft } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useProviderDetails } from '@/hooks/customer/useProviderDetails';
import { useColorScheme } from '@/lib/core/useColorScheme';
import { THEME } from '@/lib/core/theme';

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
              <Ionicons name="refresh" size={24} color={isDarkColorScheme ? THEME.dark.primary : THEME.light.primary} />
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
              <Ionicons name="alert-circle" size={40} color={isDarkColorScheme ? THEME.dark.destructive : THEME.light.destructive} />
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
                isDarkColorScheme ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.1)',
                isDarkColorScheme ? 'rgba(59, 130, 246, 0.05)' : 'rgba(59, 130, 246, 0.02)',
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
                  color={isDarkColorScheme ? THEME.dark.foreground : THEME.light.foreground}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Provider Avatar */}
          <Animated.View
            entering={FadeInUp.duration(600).delay(400)}
            className="absolute -bottom-12 left-6"
          >
            <View className="w-24 h-24 rounded-full bg-card border-4 border-background shadow-lg items-center justify-center">
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
                {provider.verification_status === 'approved' ? '5' : '0'}
              </Text>
              <Text className="text-sm text-muted-foreground">Years Exp.</Text>
            </View>
            <View className="items-center flex-1">
              <View className="flex-row items-center">
                <Ionicons name="star" size={16} color={isDarkColorScheme ? THEME.dark.primary : THEME.light.primary} />
                <Text className="text-2xl font-bold text-primary ml-1">
                  {provider.verification_status === 'approved' ? '4.5' : '0'}
                </Text>
              </View>
              <Text className="text-sm text-muted-foreground">Rating</Text>
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
                    <Ionicons name="call" size={20} color={isDarkColorScheme ? THEME.dark.primary : THEME.light.primary} />
                  </View>
                  <Text className="text-foreground">{provider.phone_number}</Text>
                </View>
              )}
              {provider.email && (
                <View className="flex-row items-center mb-3">
                  <View className="w-10 h-10 rounded-full bg-primary/10 items-center justify-center mr-3">
                    <Ionicons name="mail" size={20} color={isDarkColorScheme ? THEME.dark.primary : THEME.light.primary} />
                  </View>
                  <Text className="text-foreground">{provider.email}</Text>
                </View>
              )}
              {provider.address && (
                <View className="flex-row items-center">
                  <View className="w-10 h-10 rounded-full bg-primary/10 items-center justify-center mr-3">
                    <Ionicons name="location" size={20} color={isDarkColorScheme ? THEME.dark.primary : THEME.light.primary} />
                  </View>
                  <Text className="text-foreground">{provider.address}</Text>
                </View>
              )}
            </View>
          </Animated.View>

          {/* Services */}
          {(provider as any).provider_services && (provider as any).provider_services.length > 0 && (
            <Animated.View
              entering={FadeInUp.duration(600).delay(1400)}
              className="mb-6"
            >
              <Text className="text-lg font-semibold text-foreground mb-3">Services Offered</Text>
              <View>
                {(provider as any).provider_services.map((service: any, index: number) => (
                  <TouchableOpacity
                    key={service.id}
                    onPress={() => router.push(`/customer/service/${service.id}`)}
                    activeOpacity={0.7}
                  >
                    <Animated.View
                      entering={FadeInLeft.duration(400).delay(1600 + index * 100)}
                      className={`flex-row items-center justify-between p-3 bg-card rounded-lg border border-border ${index < (provider as any).provider_services.length - 1 ? 'mb-2' : ''}`}
                    >
                      <View className="flex-1">
                        <Text className="font-medium text-foreground">{service.title}</Text>
                        <Text className="text-sm text-muted-foreground">
                          {service.service_subcategories?.service_categories?.name || 'Service'}
                        </Text>
                      </View>
                      <View className="items-end">
                        <Text className="font-semibold text-primary">
                          ${service.base_price}
                        </Text>
                        <Text className="text-xs text-muted-foreground">
                          {service.duration_minutes} min
                        </Text>
                      </View>
                    </Animated.View>
                  </TouchableOpacity>
                ))}
              </View>
            </Animated.View>
          )}
        </Animated.View>

        {/* Book Button */}
        <Animated.View
          entering={FadeInUp.duration(600).delay(1800)}
          className="px-6 pb-6"
        >
          <TouchableOpacity
            className="bg-primary py-4 rounded-xl items-center shadow-lg"
            activeOpacity={0.8}
          >
            <Text className="text-primary-foreground font-semibold text-lg">
              Book Appointment
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}
import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/lib/core/useColorScheme';
import { useProviderProfile } from '@/hooks';
import type { ProviderProfileData } from '@/hooks';
import { ProviderProfileSkeleton } from '@/components/providers/ProviderProfileSkeleton';
import { DebugPanel } from '@/components/debug/DebugPanel';
import { useQueryClient } from '@tanstack/react-query';

export default function ProviderProfileScreen() {
  const { providerId } = useLocalSearchParams<{ providerId: string }>();
  const { colorScheme } = useColorScheme();
  const queryClient = useQueryClient();
  const { data: provider, isLoading, error, refetch } = useProviderProfile(providerId || '');

  console.log('ProviderProfileScreen: providerId from params:', providerId);
  const [showDebug, setShowDebug] = useState(false);

  // Show loading state with skeleton
  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <ScrollView className="flex-1">
          <ProviderProfileSkeleton />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Show error state with detailed information
  if (error || !provider) {
    console.error('Provider profile error:', error);
    console.log('Provider ID:', providerId);
    console.log('Provider data:', provider);

    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 items-center justify-center px-6">
          <View className="items-center mb-6">
            <Ionicons name="alert-circle" size={64} color="#EF4444" className="mb-4" />
            <Text className="text-xl font-semibold text-foreground mb-2">
              Unable to Load Provider Profile
            </Text>
            <Text className="text-muted-foreground text-center mb-4">
              {error?.message || 'We couldn\'t load the provider information at this time.'}
            </Text>
            {providerId && (
              <Text className="text-xs text-muted-foreground mb-4">
                Provider ID: {providerId}
              </Text>
            )}
          </View>

          <View className="w-full space-y-3">
            <Button
              onPress={() => router.back()}
              className="w-full"
              variant="outline"
            >
              <Ionicons name="arrow-back" size={18} color="#6B7280" />
              <Text className="text-foreground font-medium ml-2">Go Back</Text>
            </Button>

            <Button
              onPress={() => refetch()}
              className="w-full"
              variant="secondary"
            >
              <Ionicons name="refresh" size={18} color="#6B7280" />
              <Text className="text-secondary-foreground font-medium ml-2">Try Again</Text>
            </Button>

            <Button
              onPress={() => setShowDebug(true)}
              className="w-full"
              variant="outline"
            >
              <Ionicons name="bug" size={18} color="#6B7280" />
              <Text className="text-foreground font-medium ml-2">Debug Info</Text>
            </Button>
          </View>
        </View>

        {showDebug && (
          <DebugPanel
            providerId={providerId || ''}
            onClose={() => setShowDebug(false)}
          />
        )}
      </SafeAreaView>
    );
  }

  // Mock data - in real app, this would come from an API call


  // Use real data if available, otherwise fall back to mock data for development
  const displayProvider: ProviderProfileData = provider ? (provider as ProviderProfileData) : {
    id: '',
    first_name: '',
    last_name: '',
    services: []
  };

  const handleBookService = (serviceId: string) => {
    // Navigate to booking flow with selected service
    const service = displayProvider.services?.find(s => s.id === serviceId);
    router.push({
      pathname: '/customer/bookings',
      params: {
        serviceId,
        providerId: displayProvider.id,
        providerName: `${displayProvider.first_name} ${displayProvider.last_name}`,
        serviceTitle: service?.title || 'Service'
      }
    });
  };

  const handleContactProvider = () => {
    // Navigate to messages with this provider
    router.push(`/customer/messages?providerId=${displayProvider.id}`);
  };

  const getMessageIconColor = () => {
      return colorScheme === 'dark' ? '#FFFFFF' : '#FFFFFF'; // gray-700 for light mode
  };

  const getLocationIconColor = () => {
    return colorScheme === 'dark' ? '#9CA3AF' : '#6B7280'; // gray-400 for dark, gray-500 for light
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView className="flex-1">
        {/* Header */}
        <View className="px-4 py-4 border-b border-border">
          <View className="flex-row items-center justify-between">
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name="chevron-back" size={24} color={colorScheme === 'dark' ? '#FFFFFF' : '#000000'} />
            </TouchableOpacity>
            <Text className="text-xl font-bold text-foreground">Provider Profile</Text>
            <View className="w-6" />
          </View>
        </View>

        {/* Provider Info Card */}
        <View className="px-4 py-6">
          <Card className="bg-card border border-border/50">
            <CardContent className="p-6">
              <View className="items-center mb-6">
                <Avatar className="w-24 h-24 mb-4" alt={`${displayProvider.first_name} ${displayProvider.last_name}`}>
                  {displayProvider.avatar_url ? (
                    <AvatarImage source={{ uri: displayProvider.avatar_url }} />
                  ) : null}
                  <AvatarFallback className="bg-primary/10">
                    <Text className="text-2xl font-bold text-primary">
                      {displayProvider.first_name[0]}{displayProvider.last_name[0]}
                    </Text>
                  </AvatarFallback>
                </Avatar>

                <Text className="text-2xl font-bold text-foreground mb-1">
                  {displayProvider.first_name} {displayProvider.last_name}
                </Text>

                {displayProvider.business_name && (
                  <Text className="text-lg text-muted-foreground mb-2">
                    {displayProvider.business_name}
                  </Text>
                )}

                <View className="flex-row items-center mb-2">
                  <Text className="text-lg mr-1">⭐</Text>
                  <Text className="text-lg font-semibold text-foreground mr-2">
                    {displayProvider.rating?.toFixed(1) || 'New'}
                  </Text>
                  <Text className="text-sm text-muted-foreground">
                    ({displayProvider.review_count || 0} reviews)
                  </Text>
                  {displayProvider.is_verified && (
                    <View className="ml-2 flex-row items-center">
                      <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                      <Text className="text-xs text-green-600 ml-1 font-medium">Verified</Text>
                    </View>
                  )}
                </View>

                {displayProvider.location && (
                  <View className="flex-row items-center mb-2">
                    <Ionicons name="location-outline" size={16} color={getLocationIconColor()} />
                    <Text className="text-sm text-muted-foreground ml-1">
                      {displayProvider.location}
                    </Text>
                  </View>
                )}

                {displayProvider.years_experience && (
                  <View className="flex-row items-center mb-2">
                    <Ionicons name="briefcase-outline" size={16} color={getLocationIconColor()} />
                    <Text className="text-sm text-muted-foreground ml-1">
                      {displayProvider.years_experience} years experience
                    </Text>
                  </View>
                )}
              </View>

              {displayProvider.bio && (
                <View className="mb-6">
                  <Text className="text-base text-foreground leading-6">
                    {displayProvider.bio}
                  </Text>
                </View>
              )}

              {/* Action Buttons */}
              <View className="flex-row gap-3 mb-6">
                <Button
                  onPress={handleContactProvider}
                  className="flex-1 bg-secondary"
                  variant="secondary"
                >
                  <Ionicons name="chatbubble-outline" size={18} color={getMessageIconColor()} />
                  <Text className="text-secondary-foreground font-medium ml-2">
                    Message
                  </Text>
                </Button>
                <Button onPress={() => router.push('/customer/bookings')} className="flex-1">
                  <Text className="text-primary-foreground font-medium">Book Now</Text>
                </Button>
              </View>

              {/* Contact Information */}
              {(displayProvider.phone || displayProvider.email || displayProvider.website) && (
                <View className="border-t border-border pt-4">
                  <Text className="text-sm font-medium text-foreground mb-3">Contact Information</Text>
                  <View className="space-y-2">
                    {displayProvider.phone && (
                      <View className="flex-row items-center">
                        <Ionicons name="call-outline" size={16} color={getLocationIconColor()} />
                        <Text className="text-sm text-muted-foreground ml-2">{displayProvider.phone}</Text>
                      </View>
                    )}
                    {displayProvider.email && (
                      <View className="flex-row items-center">
                        <Ionicons name="mail-outline" size={16} color={getLocationIconColor()} />
                        <Text className="text-sm text-muted-foreground ml-2">{displayProvider.email}</Text>
                      </View>
                    )}
                    {displayProvider.website && (
                      <View className="flex-row items-center">
                        <Ionicons name="globe-outline" size={16} color={getLocationIconColor()} />
                        <Text className="text-sm text-muted-foreground ml-2">{displayProvider.website}</Text>
                      </View>
                    )}
                  </View>
                </View>
              )}
            </CardContent>
          </Card>
        </View>

        {/* Working Hours Section */}
        {displayProvider.working_hours && Object.keys(displayProvider.working_hours).length > 0 && (
          <View className="px-4 py-6">
            <Card className="bg-card border border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold text-foreground">
                  <View className="flex-row items-center">
                    <Ionicons name="time-outline" size={20} color={colorScheme === 'dark' ? '#FFFFFF' : '#000000'} />
                    <Text className="ml-3">Working Hours</Text>
                  </View>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <View className="space-y-2">
                  {Object.entries(displayProvider.working_hours).map(([day, hours]) => {
                    // Ensure hours is an object with the expected properties
                    const hoursData = hours as any;
                    const isOpen = hoursData?.is_open;
                    const openTime = hoursData?.open;
                    const closeTime = hoursData?.close;

                    return (
                      <View key={day} className="flex-row justify-between items-center py-1">
                        <Text className="text-sm font-medium text-foreground capitalize">
                          {day}
                        </Text>
                        <Text className="text-sm text-muted-foreground">
                          {isOpen && openTime && closeTime
                            ? `${openTime} - ${closeTime}`
                            : 'Closed'
                          }
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </CardContent>
            </Card>
          </View>
        )}

        {/* Services Section */}
        <View className="px-4 pb-6">
          <Text className="text-xl font-bold text-foreground mb-4">
            Services Offered
          </Text>

          {displayProvider.services && displayProvider.services.length > 0 ? displayProvider.services.map((service) => (
            <Card key={service.id} className="bg-card border border-border/50 mb-3">
              <CardContent className="p-4">
                <View className="flex-row justify-between items-start mb-2">
                  <View className="flex-1 mr-4">
                    <Text className="text-lg font-semibold text-foreground mb-1">
                      {service.title || 'Untitled Service'}
                    </Text>
                    <Text className="text-sm text-muted-foreground mb-2" numberOfLines={2}>
                      {service.description || 'No description available'}
                    </Text>
                    <View className="flex-row gap-1">
                      <Badge variant="secondary" className="text-xs">
                        <Text>{service.category_name || 'General'}</Text>
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        <Text>{service.subcategory_name || 'Services'}</Text>
                      </Badge>
                    </View>
                  </View>
                  <View className="items-end">
                    <Text className="text-lg font-bold text-primary">
                      {service.price_type === 'hourly' ? `£${service.base_price || 0}/hr` : `£${service.base_price || 0}`}
                    </Text>
                    <Text className="text-xs text-muted-foreground">
                      {service.price_type === 'hourly' ? 'per hour' : 'fixed price'}
                    </Text>
                  </View>
                </View>

                <Button
                  onPress={() => handleBookService(service.id)}
                  className="w-full mt-3"
                >
                  <Text className="text-primary-foreground font-medium">
                    Book This Service
                  </Text>
                </Button>
              </CardContent>
            </Card>
          )) : null}

          {(!displayProvider.services || displayProvider.services.length === 0) && (
            <View className="items-center py-12">
              <Text className="text-4xl mb-4">📋</Text>
              <Text className="text-lg font-semibold text-foreground mb-2">
                No Services Available
              </Text>
              <Text className="text-muted-foreground text-center">
                This provider hasn't listed any services yet.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
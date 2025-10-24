import React, { useState } from 'react';
import { View, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/text';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuthStore } from '@/stores/auth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useColorScheme } from '@/lib/core/useColorScheme';
import { cn } from '@/lib/utils';

interface CustomerReview {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  provider: {
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
  };
  booking: {
    service_title: string;
    booking_date: string;
  };
  provider_response: string | null;
  provider_response_at: string | null;
}

export default function CustomerReviewsScreen() {
  const user = useAuthStore((state) => state.user);
  const { colorScheme } = useColorScheme();
  const [refreshing, setRefreshing] = useState(false);

  // Fetch customer reviews with provider and booking details
  const {
    data: reviews,
    isLoading,
    refetch
  } = useQuery({
    queryKey: ['customerReviews', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('reviews')
        .select(`
          id,
          rating,
          comment,
          created_at,
          provider_response,
          provider_response_at,
          bookings (
            service_title,
            booking_date,
            providers (
              first_name,
              last_name,
              avatar_url
            )
          )
        `)
        .eq('customer_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform the data to match our interface
      return data.map((review: any) => ({
        id: review.id,
        rating: review.rating,
        comment: review.comment,
        created_at: review.created_at,
        provider_response: review.provider_response,
        provider_response_at: review.provider_response_at,
        booking: {
          service_title: review.bookings?.service_title || 'Service',
          booking_date: review.bookings?.booking_date || review.created_at,
        },
        provider: review.bookings?.providers || {
          first_name: null,
          last_name: null,
          avatar_url: null,
        },
      })) as CustomerReview[];
    },
    enabled: !!user?.id,
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const renderStars = (rating: number) => {
    return (
      <View className="flex-row">
        {[1, 2, 3, 4, 5].map((star) => (
          <Ionicons
            key={star}
            name={star <= rating ? 'star' : 'star-outline'}
            size={16}
            className={star <= rating ? 'text-yellow-500' : 'text-muted-foreground'}
          />
        ))}
      </View>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={['top']}>
        <View className="flex-row items-center px-6 py-4 border-b border-border">
          <TouchableOpacity
            onPress={() => router.back()}
            className="mr-4 p-2 rounded-full bg-secondary"
          >
            <Ionicons name="arrow-back" size={20} className="text-secondary-foreground" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-foreground">My Reviews</Text>
        </View>

        <ScrollView className="flex-1 px-6 py-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="mb-4">
              <CardContent className="p-4">
                <View className="flex-row items-start">
                  <Skeleton className="w-12 h-12 rounded-full mr-3" />
                  <View className="flex-1">
                    <Skeleton className="w-32 h-4 mb-2" />
                    <Skeleton className="w-24 h-3 mb-2" />
                    <Skeleton className="w-20 h-3" />
                  </View>
                </View>
                <Skeleton className="w-full h-16 mt-3" />
              </CardContent>
            </Card>
          ))}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center px-6 py-4 border-b border-border">
        <TouchableOpacity
          onPress={() => router.back()}
          className="mr-4 p-2 rounded-full bg-secondary"
        >
          <Ionicons name="arrow-back" size={20} className="text-secondary-foreground" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-foreground">My Reviews</Text>
      </View>

      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View className="px-6 py-6">
          {reviews && reviews.length > 0 ? (
            <>
              {/* Summary Stats */}
              <Card className="mb-6">
                <CardContent className="p-4">
                  <View className="flex-row justify-between items-center">
                    <View>
                      <Text className="text-2xl font-bold text-foreground">
                        {reviews.length}
                      </Text>
                      <Text className="text-muted-foreground">Total Reviews</Text>
                    </View>
                    <View>
                      <Text className="text-2xl font-bold text-foreground">
                        {(reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1)}
                      </Text>
                      <Text className="text-muted-foreground">Average Rating</Text>
                    </View>
                  </View>
                </CardContent>
              </Card>

              {/* Reviews List */}
              {reviews.map((review) => (
                <Card key={review.id} className="mb-4">
                  <CardContent className="p-4">
                    <View className="flex-row items-start mb-3">
                      <Avatar className="w-12 h-12 mr-3" alt="Provider avatar">
                        {review.provider.avatar_url ? (
                          <AvatarImage source={{ uri: review.provider.avatar_url }} />
                        ) : null}
                        <AvatarFallback className="bg-primary/10">
                          <Text className="text-primary font-semibold">
                            {review.provider.first_name?.[0] || review.provider.last_name?.[0] || 'P'}
                          </Text>
                        </AvatarFallback>
                      </Avatar>
                      <View className="flex-1">
                        <Text className="font-semibold text-foreground">
                          {review.provider.first_name && review.provider.last_name
                            ? `${review.provider.first_name} ${review.provider.last_name}`
                            : 'Service Provider'}
                        </Text>
                        <Text className="text-sm text-muted-foreground">
                          {review.booking.service_title} • {formatDate(review.booking.booking_date)}
                        </Text>
                      </View>
                    </View>

                    <View className="flex-row items-center mb-2">
                      {renderStars(review.rating)}
                      <Text className="ml-2 text-sm text-muted-foreground">
                        {formatDate(review.created_at)}
                      </Text>
                    </View>

                    {review.comment && (
                      <Text className="text-foreground mb-3 leading-5">
                        {review.comment}
                      </Text>
                    )}

                    {review.provider_response && (
                      <Card className="bg-muted/50 border-muted">
                        <CardContent className="p-3">
                          <View className="flex-row items-center mb-2">
                            <Ionicons name="return-down-forward" size={16} className="text-muted-foreground mr-2" />
                            <Text className="text-sm font-semibold text-muted-foreground">
                              Provider Response
                            </Text>
                            {review.provider_response_at && (
                              <Text className="text-xs text-muted-foreground ml-auto">
                                {formatDate(review.provider_response_at)}
                              </Text>
                            )}
                          </View>
                          <Text className="text-sm text-foreground">
                            {review.provider_response}
                          </Text>
                        </CardContent>
                      </Card>
                    )}
                  </CardContent>
                </Card>
              ))}
            </>
          ) : (
            <View className="items-center justify-center py-12">
              <View className="w-16 h-16 bg-muted rounded-full items-center justify-center mb-4">
                <Ionicons name="star-outline" size={32} className="text-muted-foreground" />
              </View>
              <Text className="text-xl font-bold text-foreground mb-2">No Reviews Yet</Text>
              <Text className="text-muted-foreground text-center mb-6">
                You haven't left any reviews yet. Reviews help other customers find great service providers.
              </Text>
              <Button onPress={() => router.push('/(customer)/search')}>
                <Text>Find Services</Text>
              </Button>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
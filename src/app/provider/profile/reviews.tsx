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
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuthOptimized } from '@/hooks';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useColorScheme } from '@/lib/core/useColorScheme';
import { THEME } from '@/lib/theme';
import { cn } from '@/lib/utils';

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  customer: {
    first_name: string | null;
    last_name: string | null;
  };
  booking: {
    service_title: string;
    booking_date: string;
  };
  provider_response: string | null;
  provider_response_at: string | null;
}

export default function ProviderReviewsScreen() {
  const { user } = useAuthOptimized();
  const { isDarkColorScheme } = useColorScheme();
  const colors = THEME[isDarkColorScheme ? 'dark' : 'light'];
  const [refreshing, setRefreshing] = useState(false);

  // Fetch provider reviews with customer and booking details
  const {
    data: reviews,
    isLoading,
    refetch
  } = useQuery({
    queryKey: ['providerReviews', user?.id],
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
          bookings!reviews_booking_id_fkey (
            booking_date,
            provider_services!bookings_service_id_fkey (
              title
            )
          ),
          profiles!reviews_customer_id_fkey (
            first_name,
            last_name
          )
        `)
        .eq('provider_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform the data to flatten nested objects
      return data?.map(review => ({
        id: review.id,
        rating: review.rating,
        comment: review.comment,
        created_at: review.created_at,
        provider_response: review.provider_response,
        provider_response_at: review.provider_response_at,
        customer: review.profiles,
        booking: {
          service_title: review.bookings?.[0]?.provider_services?.[0]?.title,
          booking_date: review.bookings?.[0]?.booking_date
        }
      })) || [];
    },
    enabled: !!user?.id,
  });

  // Calculate average rating and stats
  const reviewStats = React.useMemo(() => {
    if (!reviews) return { averageRating: 0, totalReviews: 0, ratingDistribution: {} };

    const totalReviews = reviews.length;
    const averageRating = totalReviews > 0
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews
      : 0;

    const ratingDistribution = reviews.reduce((acc, review) => {
      acc[review.rating] = (acc[review.rating] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    return { averageRating, totalReviews, ratingDistribution };
  }, [reviews]);

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
            color={star <= rating ? colors.warning : colors.muted}
          />
        ))}
      </View>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getCustomerName = (customer: any) => {
    if (!customer) return 'Anonymous';
    const firstName = customer.first_name || '';
    const lastName = customer.last_name || '';
    return `${firstName} ${lastName}`.trim() || 'Anonymous';
  };

  const getCustomerInitials = (customer: any) => {
    if (!customer) return 'A';
    const first = customer.first_name?.[0] || '';
    const last = customer.last_name?.[0] || '';
    return `${first}${last}`.toUpperCase() || 'A';
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View className="px-4 py-6">
          <View className="flex-row items-center justify-between mb-6">
            <Button
              variant="ghost"
              size="sm"
              onPress={() => router.back()}
              className="w-8 h-8 p-0"
            >
              <Ionicons name="chevron-back" size={24} color={colors.primary} />
            </Button>
            <Text className="text-xl font-bold text-foreground">Customer Reviews</Text>
            <View className="w-8" />
          </View>

          {/* Rating Overview */}
          <Card className="mb-6">
            <CardContent className="p-6">
              {isLoading ? (
                <View className="items-center">
                  <Skeleton className="w-20 h-8 mb-2" />
                  <Skeleton className="w-32 h-6 mb-4" />
                  <Skeleton className="w-24 h-4" />
                </View>
              ) : (
                <View className="items-center">
                  <Text className="text-4xl font-bold text-foreground mb-2">
                    {reviewStats.averageRating.toFixed(1)}
                  </Text>
                  <View className="flex-row items-center mb-2">
                    {renderStars(Math.round(reviewStats.averageRating))}
                  </View>
                  <Text className="text-muted-foreground">
                    Based on {reviewStats.totalReviews} review{reviewStats.totalReviews !== 1 ? 's' : ''}
                  </Text>
                </View>
              )}
            </CardContent>
          </Card>
        </View>

        {/* Reviews List */}
        <View className="px-4 pb-6">
          {isLoading ? (
            <View className="gap-4">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <View className="flex-row items-start gap-3">
                      <Skeleton className="w-12 h-12 rounded-full" />
                      <View className="flex-1">
                        <Skeleton className="w-32 h-4 mb-2" />
                        <Skeleton className="w-24 h-4 mb-2" />
                        <Skeleton className="w-full h-16" />
                      </View>
                    </View>
                  </CardContent>
                </Card>
              ))}
            </View>
          ) : reviews && reviews.length > 0 ? (
            <View className="gap-4">
              {reviews.map((review) => (
                <Card key={review.id}>
                  <CardContent className="p-4">
                    <View className="flex-row items-start gap-3">
                      <Avatar className="w-12 h-12" alt='Customer Avatar'>
                        <AvatarFallback className="bg-primary/10">
                          <Text className="text-primary font-bold">
                            {getCustomerInitials(review.customer)}
                          </Text>
                        </AvatarFallback>
                      </Avatar>

                      <View className="flex-1">
                        <View className="flex-row items-center justify-between mb-2">
                          <Text className="font-semibold text-foreground">
                            {getCustomerName(review.customer)}
                          </Text>
                          <Text className="text-sm text-muted-foreground">
                            {formatDate(review.created_at)}
                          </Text>
                        </View>

                        <View className="flex-row items-center gap-2 mb-2">
                          {renderStars(review.rating)}
                          <Text className="text-sm text-muted-foreground ml-2">
                            {review.booking.service_title || 'Service'}
                          </Text>
                        </View>

                        {review.comment && (
                          <Text className="text-foreground mb-3 leading-5">
                            "{review.comment}"
                          </Text>
                        )}

                        {review.provider_response && (
                          <View className="bg-secondary/10 rounded-lg p-3 mt-3">
                            <Text className="text-sm font-medium text-foreground mb-1">
                              Your Response:
                            </Text>
                            <Text className="text-sm text-muted-foreground">
                              {review.provider_response}
                            </Text>
                            {review.provider_response_at && (
                              <Text className="text-xs text-muted-foreground mt-1">
                                Responded {formatDate(review.provider_response_at)}
                              </Text>
                            )}
                          </View>
                        )}
                      </View>
                    </View>
                  </CardContent>
                </Card>
              ))}
            </View>
          ) : (
            <View className="items-center py-12">
              <Ionicons
                name="star-outline"
                size={64}
                color={isDarkColorScheme ? '#666' : '#ccc'}
                style={{ marginBottom: 16 }}
              />
              <Text className="text-xl font-semibold text-foreground mb-2">
                No reviews yet
              </Text>
              <Text className="text-muted-foreground text-center mb-6">
                Your customer reviews will appear here once you start completing services.
              </Text>
              <Button onPress={() => router.push('/provider/bookings')}>
                <Text>View Bookings</Text>
              </Button>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
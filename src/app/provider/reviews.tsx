import React, { useState } from 'react';
import { View, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/lib/core/useColorScheme';
import { useAuthOptimized } from '@/hooks';
import { useProviderReviews, useProviderReviewsNeedingResponse } from '@/hooks/provider/useProviderReviews';
import { ProviderResponseModal } from '@/components/provider/ProviderResponseModal';
import { ProviderReview } from '@/hooks/provider/useProviderReviews';

export default function ProviderReviewsScreen() {
  const { user } = useAuthOptimized();
  const { colorScheme } = useColorScheme();
  const [refreshing, setRefreshing] = useState(false);
  const [responseModalVisible, setResponseModalVisible] = useState(false);
  const [selectedReview, setSelectedReview] = useState<ProviderReview | null>(null);

  // Fetch all reviews for this provider
  const { data: allReviews, isLoading: allLoading, refetch: refetchAll } = useProviderReviews(user?.id);

  // Fetch reviews that need responses
  const { data: pendingReviews, isLoading: pendingLoading, refetch: refetchPending } = useProviderReviewsNeedingResponse(user?.id);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchAll(), refetchPending()]);
    setRefreshing(false);
  };

  const handleRespondPress = (review: ProviderReview) => {
    setSelectedReview(review);
    setResponseModalVisible(true);
  };

  const handleResponseSubmit = () => {
    setResponseModalVisible(false);
    setSelectedReview(null);
    // Refresh both queries to update the UI
    refetchAll();
    refetchPending();
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Unknown date';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const renderStars = (rating: number) => {
    return '⭐'.repeat(rating) + '☆'.repeat(5 - rating);
  };

  const ReviewCard = ({ review, showRespondButton }: { review: ProviderReview; showRespondButton: boolean }) => (
    <Card className="bg-card border-border mb-3">
      <CardContent className="p-4">
        {/* Header with rating and date */}
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-lg font-semibold text-foreground">
            {renderStars(review.rating)}
          </Text>
          <Text className="text-sm text-muted-foreground">
            {formatDate(review.created_at)}
          </Text>
        </View>

        {/* Customer Information */}
        <View className="mb-3">
          <Text className="text-sm font-medium text-foreground">
            From: {review.customer_name || 'Anonymous Customer'}
          </Text>
        </View>

        {/* Service Information */}
        {(review.service_title || review.booking_date) && (
          <View className="mb-3 p-3 bg-muted/30 rounded-lg">
            {review.service_title && (
              <Text className="text-sm font-medium text-foreground mb-1">
                Service: {review.service_title}
              </Text>
            )}
            {review.booking_date && (
              <Text className="text-sm text-muted-foreground">
                📅 {formatDate(review.booking_date)}
                {review.booking_start_time && ` at ${review.booking_start_time}`}
              </Text>
            )}
            {review.service_address && (
              <Text className="text-sm text-muted-foreground">
                📍 {review.service_address}
              </Text>
            )}
          </View>
        )}

        {/* Review Comment */}
        {review.comment && (
          <Text className="text-foreground mb-3 leading-5">
            "{review.comment}"
          </Text>
        )}

        {/* Provider Response */}
        {review.provider_response && (
          <View className="bg-primary/10 rounded-lg p-3 mt-3">
            <Text className="text-sm font-medium text-primary mb-1">
              Your Response:
            </Text>
            <Text className="text-foreground text-sm leading-5">
              {review.provider_response}
            </Text>
            {review.provider_response_at && (
              <Text className="text-xs text-muted-foreground mt-2">
                Responded {formatDate(review.provider_response_at)}
              </Text>
            )}
          </View>
        )}

        {/* Respond button for pending reviews */}
        {showRespondButton && (
          <View className="mt-4">
            <Button
              onPress={() => handleRespondPress(review)}
              className="w-full"
              variant="outline"
            >
              <Ionicons name="chatbubble-outline" size={16} color="#6B7280" />
              <Text className="text-foreground font-medium ml-2">Respond to Review</Text>
            </Button>
          </View>
        )}
      </CardContent>
    </Card>
  );

  if (!user?.id) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-destructive text-center">
            You must be logged in to view reviews.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Header */}
        <View className="px-6 py-4 border-b border-border">
          <View className="flex-row items-center justify-between">
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name="chevron-back" size={24} color={colorScheme === 'dark' ? '#FFFFFF' : '#000000'} />
            </TouchableOpacity>
            <Text className="text-xl font-bold text-foreground">My Reviews</Text>
            <View className="w-6" />
          </View>
        </View>

        {/* Stats Cards */}
        <View className="px-6 py-4">
          <View className="flex-row gap-3 mb-6">
            <Card className="flex-1 bg-card border-border">
              <CardContent className="p-4 items-center">
                <Text className="text-2xl font-bold text-foreground">
                  {allReviews?.length || 0}
                </Text>
                <Text className="text-sm text-muted-foreground">Total Reviews</Text>
              </CardContent>
            </Card>
            <Card className="flex-1 bg-card border-border">
              <CardContent className="p-4 items-center">
                <Text className="text-2xl font-bold text-primary">
                  {pendingReviews?.length || 0}
                </Text>
                <Text className="text-sm text-muted-foreground">Need Response</Text>
              </CardContent>
            </Card>
          </View>

          {/* Average Rating */}
          {allReviews && allReviews.length > 0 && (
            <Card className="bg-card border-border mb-6">
              <CardContent className="p-4 items-center">
                <Text className="text-2xl font-bold text-foreground mb-1">
                  {renderStars(Math.round(allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length))}
                </Text>
                <Text className="text-sm text-muted-foreground">
                  Average Rating ({(allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length).toFixed(1)})
                </Text>
              </CardContent>
            </Card>
          )}
        </View>

        {/* Pending Responses Section */}
        {pendingReviews && pendingReviews.length > 0 && (
          <View className="px-6 mb-6">
            <View className="flex-row items-center mb-4">
              <Ionicons name="chatbubble-outline" size={20} color="#F59E0B" />
              <Text className="text-lg font-semibold text-foreground ml-2">
                Reviews Needing Response ({pendingReviews.length})
              </Text>
            </View>
            {pendingReviews.map((review) => (
              <ReviewCard
                key={`pending-${review.id}`}
                review={review}
                showRespondButton={true}
              />
            ))}
          </View>
        )}

        {/* All Reviews Section */}
        <View className="px-6 pb-6">
          <Text className="text-lg font-semibold text-foreground mb-4">
            All Reviews ({allReviews?.length || 0})
          </Text>

          {allLoading ? (
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <Text className="text-muted-foreground text-center">
                  Loading reviews...
                </Text>
              </CardContent>
            </Card>
          ) : allReviews && allReviews.length > 0 ? (
            allReviews.map((review) => (
              <ReviewCard
                key={review.id}
                review={review}
                showRespondButton={!review.provider_response}
              />
            ))
          ) : (
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <Text className="text-muted-foreground text-center">
                  No reviews yet. Reviews will appear here once customers leave feedback for your services.
                </Text>
              </CardContent>
            </Card>
          )}
        </View>
      </ScrollView>

      {/* Provider Response Modal */}
      <ProviderResponseModal
        visible={responseModalVisible}
        onClose={() => setResponseModalVisible(false)}
        reviewId={selectedReview?.id || ''}
        customerName={selectedReview?.customer_name || 'Anonymous Customer'}
        reviewText={selectedReview?.comment || 'No comment provided'}
        onSubmitSuccess={handleResponseSubmit}
      />
    </SafeAreaView>
  );
}
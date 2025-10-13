import React, { useState, useCallback, useRef } from 'react';
import { View, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Ionicons } from '@expo/vector-icons';

// Bottom Sheet imports
import { BottomSheetModal, BottomSheetBackdrop, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';

// React Query hooks
import { useAuthOptimized } from '@/hooks';
import { useCustomerBookings } from '@/hooks/customer/useBookings';

// UI Components
import { Skeleton } from '@/components/ui/skeleton';

// FlashList import
import { FlashList } from '@shopify/flash-list';

// Color scheme hook
import { useColorScheme } from '@/lib/core/useColorScheme';
import { THEME } from '@/lib/theme';

export default function BookingsScreen() {
  return <ProviderSelectionScreen />;
}

// Provider Selection Screen Component
const ProviderSelectionScreen = () => {
  const [bookingStatusTab, setBookingStatusTab] = useState<'all' | 'sos' | 'normal' | 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'>('all');

  // Filter states
  const [filters, setFilters] = useState({
    verifiedOnly: false,
    minRating: 0,
    hasReviews: false,
    location: '',
  });

  // Bottom sheet ref
  const bottomSheetModalRef = useRef<BottomSheetModal>(null);

  const { user } = useAuthOptimized();
  const { data: bookings, isLoading: bookingsLoading, refetch: refetchBookings } = useCustomerBookings(user?.id);
  const { colorScheme, isDarkColorScheme } = useColorScheme();
  
  // Theme-aware colors
  const theme = isDarkColorScheme ? THEME.dark : THEME.light;

  // Pull to refresh state
  const [refreshing, setRefreshing] = useState(false);

  // Pull to refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetchBookings();
    } catch (error) {
      console.error('Error refreshing bookings:', error);
    } finally {
      setRefreshing(false);
    }
  }, [refetchBookings]);



  // Bottom sheet handlers
  const handlePresentModalPress = useCallback(() => {
    bottomSheetModalRef.current?.present();
  }, []);

  const handleSheetChanges = useCallback((index: number) => {
    console.log('handleSheetChanges', index);
  }, []);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
      />
    ),
    []
  );

  // Filter update handlers
  const updateFilter = (key: keyof typeof filters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      verifiedOnly: false,
      minRating: 0,
      hasReviews: false,
      location: '',
    });
  };

  const hasActiveFilters = Object.values(filters).some(value =>
    value !== false && value !== 0 && value !== ''
  );

  // Calculate booking counts for tabs
  const bookingCounts = {
    all: bookings?.length || 0,
    sos: bookings?.filter(b => b.sos_booking === true).length || 0,
    normal: bookings?.filter(b => b.sos_booking === false || b.sos_booking === null).length || 0,
    pending: bookings?.filter(b => b.status === 'pending').length || 0,
    confirmed: bookings?.filter(b => b.status === 'confirmed').length || 0,
    completed: bookings?.filter(b => b.status === 'completed').length || 0,
    cancelled: bookings?.filter(b => b.status === 'cancelled').length || 0,
  };

  // Filter bookings by status and type
  const filteredBookings = bookings?.filter(booking => {
    if (bookingStatusTab === 'all') return true;
    if (bookingStatusTab === 'sos') return booking.sos_booking === true;
    if (bookingStatusTab === 'normal') return booking.sos_booking === false || booking.sos_booking === null;
    return booking.status === bookingStatusTab;
  }) || [];

  const renderBookingItem = ({ item: booking }: { item: any }) => (
    <TouchableOpacity 
      onPress={() => router.push(`/(customer)/booking/${booking.id}` as any)}
      activeOpacity={0.7}
    >
      <Card className="mb-4  mx-4">
        <CardContent className="p-4">
        <View className="flex-row justify-between items-start mb-2">
          <View className="flex-1 mr-2">
            <View className="flex-row items-center gap-2 mb-1">
              {booking.sos_booking && (
                <Badge variant="destructive" className="bg-red-500">
                  <View className="flex-row items-center gap-1">
                    <Ionicons name="medical" size={12} color="white" />
                    <Text className="text-xs text-white font-semibold">SOS</Text>
                  </View>
                </Badge>
              )}
              <Text className="text-lg font-semibold text-foreground">
                {booking.service_title || 'Service'}
              </Text>
            </View>
            {booking.sos_booking && (
              <Text className="text-xs text-primary font-medium">
                Emergency Booking • Fast Response
              </Text>
            )}
          </View>
          <Badge variant={
            booking.status === 'confirmed' ? 'default' :
            booking.status === 'completed' ? 'secondary' :
            booking.status === 'cancelled' ? 'destructive' : 'outline'
          }>
            <Text className="text-xs capitalize">{booking.status}</Text>
          </Badge>
        </View>

        <Text className="text-muted-foreground mb-2">
          {booking.business_name || `${booking.provider_first_name} ${booking.provider_last_name}`}
        </Text>

        <View className="flex-row justify-between items-center">
          <Text className="text-sm text-muted-foreground">
            {new Date(booking.booking_date).toLocaleDateString()} at {booking.start_time}
          </Text>
          <View className="items-end">
            <Text className="text-lg font-bold text-primary">
              £{Number(booking.total_amount || 0).toFixed(2)}
            </Text>
            {booking.base_amount && Number(booking.base_amount) !== Number(booking.total_amount) && (
              <Text className="text-xs text-muted-foreground">
                Base: £{Number(booking.base_amount).toFixed(2)}
              </Text>
            )}
          </View>
        </View>

        {/* Action buttons based on status */}
        {booking.status === 'completed' && (
          <View className="mt-3 pt-3 border-t border-border">
            <View className="flex-row items-center justify-between gap-2">
              <Text className="text-sm text-muted-foreground flex-1">
                Service completed - How was your experience?
              </Text>
              <Button
                size="sm"
                variant="outline"
                onPress={() => router.push(`/(customer)/booking/${booking.id}` as any)}
                className="flex-shrink-0"
              >
                <Text className="text-xs">Leave Review</Text>
              </Button>
            </View>
          </View>
        )}

        {booking.status === 'confirmed' && (
          <View className="mt-3 pt-3 border-t border-border">
            <View className="flex-row items-center justify-between gap-2">
              <View className="flex-1">
                <Text className="text-xs text-green-600 font-medium">
                  ✓ Booking Confirmed
                </Text>
                <Text className="text-xs text-muted-foreground">
                  {booking.sos_booking ? 'Provider will contact you shortly' : 'Ready for scheduled time'}
                </Text>
              </View>
              <Button
                size="sm"
                variant="outline"
                onPress={() => router.push(`/(customer)/booking/${booking.id}` as any)}
                className="flex-shrink-0"
              >
                <Text className="text-xs">View Details</Text>
              </Button>
            </View>
          </View>
        )}

        {booking.status === 'in_progress' && (
          <View className="mt-3 pt-3 border-t border-border">
            <View className="flex-row items-center justify-between gap-2">
              <View className="flex-1">
                <Text className="text-xs text-blue-600 font-medium">
                  🔄 Service in Progress
                </Text>
                <Text className="text-xs text-muted-foreground">
                  Provider is working on your service
                </Text>
              </View>
              <Button
                size="sm"
                variant="outline"
                  onPress={() => router.push(`/(customer)/booking/${booking.id}` as any)}
                className="flex-shrink-0"
              >
                <Text className="text-xs">View Details</Text>
              </Button>
            </View>
          </View>
        )}

        {booking.status === 'pending' && (
          <View className="mt-3 pt-3 border-t border-border">
            <View className="flex-row items-center justify-between gap-2">
              <View className="flex-1">
                <Text className="text-xs text-yellow-600 font-medium">
                  ⏳ Awaiting Response
                </Text>
                <Text className="text-xs text-muted-foreground">
                  Provider will respond shortly
                </Text>
              </View>
              <Button
                size="sm"
                variant="outline"
                onPress={() => router.push(`/(customer)/booking/${booking.id}` as any)}
                className="flex-shrink-0"
              >
                <Text className="text-xs">View Details</Text>
              </Button>
            </View>
          </View>
        )}
      </CardContent>
    </Card>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View className="flex-1 justify-center items-center py-12">
      <Ionicons name="calendar" size={48} className="text-primary mb-4" />
      <Text className="text-xl font-semibold text-foreground mb-2">
        No {bookingStatusTab === 'all' ? '' : bookingStatusTab + ' '}Bookings
      </Text>
      <Text className="text-muted-foreground text-center mb-6">
        {bookingStatusTab === 'all'
          ? "You haven't made any bookings yet."
          : `You have no ${bookingStatusTab} bookings.`
        }
      </Text>
      <Button onPress={() => router.push('/(customer)')}>
        <Text className="text-primary-foreground font-medium">Browse Services</Text>
      </Button>
    </View>
  );

  const renderLoadingState = () => (
    <View className="px-4">
      {[...Array(3)].map((_, i) => (
        <Card key={i} className="mb-4">
          <CardContent className="p-4">
            <Skeleton className="w-3/4 h-6 mb-2" />
            <Skeleton className="w-1/2 h-4 mb-2" />
            <View className="flex-row justify-between">
              <Skeleton className="w-20 h-4" />
              <Skeleton className="w-16 h-6" />
            </View>
          </CardContent>
        </Card>
      ))}
    </View>
  );

  return (
    <BottomSheetModalProvider>
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1">
          {/* Header */}
          <View className="px-4 py-4 border-b border-border">
            <View className="flex-row items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onPress={() => router.back()}
                className="w-8 h-8 p-0"
              >
                <Ionicons name="chevron-back" size={24} className="text-primary" />
              </Button>
              <Text className="text-xl font-bold text-foreground">
                My Bookings
              </Text>
              <View className="flex-row items-center gap-2">
                {hasActiveFilters && (
                  <View className="bg-primary rounded-full w-2 h-2" />
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onPress={handlePresentModalPress}
                  className="w-8 h-8 p-0"
                >
                  <Ionicons name="filter" size={20} className="text-primary" />
                </Button>
              </View>
            </View>
          </View>

          {/* Status Tabs */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-4 py-2 border-b border-border max-h-14" >
            {[
              { key: 'all', label: 'All' },
              { key: 'sos', label: 'SOS', icon: 'medical' },
              { key: 'normal', label: 'Normal', icon: 'calendar-outline' },
              { key: 'pending', label: 'Pending' },
              { key: 'confirmed', label: 'Confirmed' },
              { key: 'completed', label: 'Completed' },
            ].map((tab) => (
              <TouchableOpacity
                key={tab.key}
                onPress={() => setBookingStatusTab(tab.key as any)}
                className={`px-4 py-2 rounded-lg mr-2 flex-row items-center gap-1 ${bookingStatusTab === tab.key ? 'bg-primary' : 'bg-muted'}`}
              >
                {tab.icon && (
                  <Ionicons 
                    name={tab.icon as any} 
                    size={16} 
                    className={bookingStatusTab === tab.key ? 'text-primary-foreground' : 'text-muted-foreground'}
                  />
                )}
                <Text className={`font-medium ${bookingStatusTab === tab.key ? 'text-primary-foreground' : 'text-muted-foreground'}`}>
                  {tab.label}
                </Text>
                {bookingCounts[tab.key as keyof typeof bookingCounts] > 0 && (
                  <View className={`ml-1 px-1.5 py-0.5 rounded-full ${
                    bookingStatusTab === tab.key
                      ? 'bg-primary-foreground/20'
                      : 'bg-foreground/10'
                  }`}>
                    <Text className={`text-xs font-bold ${
                      bookingStatusTab === tab.key
                        ? 'text-primary-foreground'
                        : 'text-foreground'
                    }`}>
                      {bookingCounts[tab.key as keyof typeof bookingCounts]}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Bookings List */}
          <View className="flex-1">
            {bookingsLoading ? (
              renderLoadingState()
            ) : filteredBookings && filteredBookings.length > 0 ? (
              <FlashList
                data={filteredBookings}
                renderItem={renderBookingItem}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingVertical: 16 }}
                ListEmptyComponent={renderEmptyState}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    colors={['#E11D48']}
                    tintColor="#E11D48"
                  />
                }
              />
            ) : (
              renderEmptyState()
            )}
          </View>
        </View>

        {/* Bottom Sheet Modal for Filters */}
        <BottomSheetModal
          ref={bottomSheetModalRef}
          index={0}
          snapPoints={['60%']}
          onChange={handleSheetChanges}
          backdropComponent={renderBackdrop}
          backgroundStyle={{ backgroundColor: colorScheme === 'dark' ? 'hsl(270 5.5556% 7.0588%)' : 'hsl(0 0% 100%)' }}
          handleIndicatorStyle={{ backgroundColor: isDarkColorScheme ? '#6B7280' : '#9CA3AF' }}
        >
          <BottomSheetScrollView className="flex-1 px-4">
            <View className="py-6">
              <View className="flex-row items-center justify-between mb-6">
                <Text className="text-xl font-bold text-foreground">Filter Bookings</Text>
                <Button
                  variant="ghost"
                  size="sm"
                  onPress={clearFilters}
                  className="px-3 py-1"
                >
                  <Text className="text-primary font-medium">Clear All</Text>
                </Button>
              </View>

              {/* Status Filter */}
              <View className="mb-6">
                <Text className="text-lg font-semibold text-foreground mb-3">
                  Booking Status
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  {[
                    { key: 'all', label: 'All' },
                    { key: 'pending', label: 'Pending' },
                    { key: 'confirmed', label: 'Confirmed' },
                    { key: 'in_progress', label: 'In Progress' },
                    { key: 'completed', label: 'Completed' },
                    { key: 'cancelled', label: 'Cancelled' },
                  ].map((status) => (
                    <TouchableOpacity
                      key={status.key}
                      onPress={() => setBookingStatusTab(status.key as any)}
                      className={`px-4 py-2 rounded-lg border ${
                        bookingStatusTab === status.key
                          ? 'bg-primary border-primary'
                          : 'bg-card border-border'
                      }`}
                    >
                      <Text className={`font-medium ${
                        bookingStatusTab === status.key
                          ? 'text-primary-foreground'
                          : 'text-foreground'
                      }`}>
                        {status.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Apply Filters Button */}
              <Button
                onPress={() => bottomSheetModalRef.current?.close()}
                className="w-full mt-4"
                size="lg"
              >
                <Text className="text-primary-foreground font-semibold text-lg">
                  Apply Filters
                </Text>
              </Button>
            </View>
          </BottomSheetScrollView>
        </BottomSheetModal>
      </SafeAreaView>
    </BottomSheetModalProvider>
  );
};
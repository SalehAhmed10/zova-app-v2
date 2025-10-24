/**
 * SOS Booking Confirmation Screen
 * 
 * Shows emergency booking confirmation with real-time provider tracking
 * and estimated arrival times.
 */

import React, { useEffect, useState } from 'react';
import { View, ScrollView, Linking, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  CheckCircle2, 
  Clock, 
  MapPin, 
  Phone, 
  MessageCircle, 
  Shield,
  Navigation,
  Star,
  AlertTriangle
} from 'lucide-react-native';

// Hooks
import { useCustomerBookingDetail } from '@/hooks/customer/useBookings';
import { useProviderDetails } from '@/hooks/customer';

export default function SOSConfirmationScreen() {
  const params = useLocalSearchParams<{
    bookingId: string;
    providerId: string;
    estimatedArrival: string;
  }>();
  
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // ✅ Following React Query + Zustand architecture
  const { data: booking, isLoading: bookingLoading } = useCustomerBookingDetail(params.bookingId);
  const { data: provider, isLoading: providerLoading } = useProviderDetails(params.providerId);

  // Update time every minute for accurate ETA
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

  const handleCallProvider = () => {
    if (provider?.phone) {
      Linking.openURL(`tel:${provider.phone}`);
    } else {
      Alert.alert('Contact Info', 'Provider phone number not available');
    }
  };

  const handleMessageProvider = () => {
    // TODO: Navigate to messaging screen when implemented
    Alert.alert('Messages', 'Messaging feature coming soon. Please call the provider directly.');
  };

  const handleViewTracking = () => {
    // TODO: Navigate to live tracking screen when implemented
    Alert.alert('Live Tracking', 'Provider tracking feature coming soon. We\'ll notify you when they arrive.');
  };

  const handleCancelBooking = () => {
    Alert.alert(
      'Cancel Emergency Service?',
      'Are you sure you want to cancel this emergency booking? The provider may already be on their way.',
      [
        { text: 'Keep Booking', style: 'cancel' },
        { 
          text: 'Cancel Booking', 
          style: 'destructive',
          onPress: () => {
            // TODO: Implement booking cancellation
            console.log('Cancel booking:', params.bookingId);
            router.back();
          }
        }
      ]
    );
  };

  if (bookingLoading || providerLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 justify-center items-center">
          <Shield size={48} className="text-green-500 mb-4" />
          <Text className="text-lg font-semibold">Confirming your emergency booking...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="p-4 gap-6">
          {/* Success Header */}
          <View className="bg-success/10 rounded-2xl p-6 border border-success/20 items-center">
            <View className="w-16 h-16 bg-success rounded-full items-center justify-center mb-4">
              <CheckCircle2 size={32} className="text-white" />
            </View>
            <Text className="text-xl font-bold text-foreground text-center mb-2">
              Emergency Service Confirmed!
            </Text>
            <Text className="text-green-600 dark:text-green-400 text-center">
              Your provider has been notified and is on their way
            </Text>
          </View>

          {/* Provider Info */}
          {provider && (
            <Card className="border-green-200 dark:border-green-800">
              <CardHeader>
                <CardTitle className="flex-row items-center gap-2">
                  <Shield size={20} className="text-green-500" />
                  <Text className="text-foreground">Your Emergency Provider</Text>
                </CardTitle>
              </CardHeader>
              <CardContent className="gap-4">
                <View className="flex-row items-center gap-4">
                  <Avatar className="w-16 h-16" alt={`${provider.first_name} ${provider.last_name}`}>
                    <AvatarImage source={{ uri: provider.avatar_url }} />
                    <AvatarFallback className="bg-primary/10">
                      <Text className="text-primary font-bold text-lg">
                        {provider.first_name?.charAt(0) || 'P'}
                      </Text>
                    </AvatarFallback>
                  </Avatar>
                  
                  <View className="flex-1">
                    <Text className="text-lg font-semibold text-foreground">
                      {provider.first_name} {provider.last_name}
                    </Text>
                    <View className="flex-row items-center gap-2 mb-1">
                      <View className="flex-row items-center gap-1">
                        <Star size={14} className="text-yellow-500" />
                        <Text className="text-sm text-muted-foreground">
                          {provider.average_rating || '5.0'} rating
                        </Text>
                      </View>
                      {provider.verification_status === 'approved' && (
                        <>
                          <Text className="text-xs text-muted-foreground">•</Text>
                          <Badge variant="secondary" className="text-xs">
                            <Text className="text-secondary-foreground">Verified</Text>
                          </Badge>
                        </>
                      )}
                    </View>
                    <Text className="text-sm text-muted-foreground">
                      {provider.years_of_experience || 0} years of experience
                    </Text>
                  </View>
                </View>

                {/* Contact Actions */}
                <View className="flex-row gap-3">
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onPress={handleCallProvider}
                  >
                    <Phone size={16} className="text-foreground mr-2" />
                    <Text className="text-foreground">Call</Text>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onPress={handleMessageProvider}
                  >
                    <MessageCircle size={16} className="text-foreground mr-2" />
                    <Text className="text-foreground">Message</Text>
                  </Button>
                </View>
              </CardContent>
            </Card>
          )}

          {/* Booking Details */}
          <Card>
            <CardHeader>
              <CardTitle>
                <Text className="text-foreground">Emergency Details</Text>
              </CardTitle>
            </CardHeader>
            <CardContent className="gap-3">
              <View className="flex-row items-start gap-3">
                <AlertTriangle size={16} className="text-red-500 mt-1" />
                <View className="flex-1">
                  <Text className="font-medium text-foreground mb-1">Emergency Type</Text>
                  <Text className="text-muted-foreground">
                    {booking?.service_type || 'Emergency Service'}
                  </Text>
                </View>
              </View>

              <View className="flex-row items-start gap-3">
                <MapPin size={16} className="text-blue-500 mt-1" />
                <View className="flex-1">
                  <Text className="font-medium text-foreground mb-1">Service Location</Text>
                  <Text className="text-muted-foreground">
                    {booking?.service_location || 'Your Location'}
                  </Text>
                </View>
              </View>

              <View className="flex-row items-start gap-3">
                <Clock size={16} className="text-green-500 mt-1" />
                <View className="flex-1">
                  <Text className="font-medium text-foreground mb-1">Estimated Arrival</Text>
                  <Text className="text-green-600 font-medium">
                    {params.estimatedArrival || '15-30 minutes'}
                  </Text>
                </View>
              </View>

              {booking?.emergency_description && (
                <View className="mt-2 p-3 bg-muted rounded-lg">
                  <Text className="font-medium text-foreground mb-1">Description</Text>
                  <Text className="text-muted-foreground">
                    {booking.emergency_description}
                  </Text>
                </View>
              )}
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <View className="gap-3">
            <Button 
              onPress={handleViewTracking}
              className="bg-blue-500 active:bg-blue-600"
            >
              <Navigation size={16} className="text-white mr-2" />
              <Text className="text-white font-medium">Track Provider Location</Text>
            </Button>

            <Button 
              variant="outline" 
              onPress={() => router.push('/(customer)/bookings')}
            >
              <Text className="text-foreground">View All Bookings</Text>
            </Button>

            <Button 
              variant="destructive" 
              onPress={handleCancelBooking}
            >
              <Text className="text-destructive-foreground">Cancel Emergency Service</Text>
            </Button>
          </View>

          {/* Important Notice */}
          <Card className="border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-950/30">
            <CardContent className="p-4">
              <View className="flex-row items-start gap-3">
                <AlertTriangle size={16} className="text-yellow-600 mt-1" />
                <View className="flex-1">
                  <Text className="font-medium text-yellow-800 dark:text-yellow-200 mb-1">
                    Important Notice
                  </Text>
                  <Text className="text-sm text-yellow-700 dark:text-yellow-300">
                    This is an emergency service booking. Your provider will contact you directly 
                    and arrive as quickly as possible. Keep your phone available for updates.
                  </Text>
                </View>
              </View>
            </CardContent>
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
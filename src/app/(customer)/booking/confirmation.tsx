import React from 'react';
import { View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/lib/core/useColorScheme';
import { THEME } from '@/lib/theme';

export default function BookingConfirmationScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { isDarkColorScheme } = useColorScheme();

  // Extract confirmation details from params
  const confirmationDetails = {
    bookingId: params.bookingId as string,
    serviceTitle: params.serviceTitle as string,
    providerName: params.providerName as string,
    date: new Date(params.date as string),
    time: params.time as string,
    amount: parseFloat(params.amount as string),
  };

  const handleViewBookings = () => {
    // Navigate directly to the specific booking detail page
    router.replace(`/(customer)/booking/${confirmationDetails.bookingId}` as any);
  };

  const handleBookAnother = () => {
    router.replace('/(customer)/search');
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Success Header */}
        <View className="items-center py-8 px-4">
          <View className="w-20 h-20 bg-success/10 rounded-full items-center justify-center mb-4">
            <Ionicons name="checkmark" size={40} className="text-success" />
          </View>
          <Text className="text-2xl font-bold text-foreground text-center mb-2">
            Booking Confirmed!
          </Text>
          <Text className="text-muted-foreground text-center">
            Your service has been successfully booked
          </Text>
        </View>

        {/* Booking Details */}
        <Card className="mx-4 mb-4">
          <CardHeader>
            <CardTitle>Booking Details</CardTitle>
          </CardHeader>
          <CardContent className="gap-3">
            <View className="flex-row justify-between">
              <Text className="text-muted-foreground">Booking ID</Text>
              <Text className="font-mono text-sm">{confirmationDetails.bookingId}</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-muted-foreground">Service</Text>
              <Text className="font-medium">{confirmationDetails.serviceTitle}</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-muted-foreground">Provider</Text>
              <Text className="font-medium">{confirmationDetails.providerName}</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-muted-foreground">Date</Text>
              <Text className="font-medium">{confirmationDetails.date.toLocaleDateString()}</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-muted-foreground">Time</Text>
              <Text className="font-medium">{confirmationDetails.time}</Text>
            </View>
            <View className="border-t border-border pt-3 mt-3">
              <View className="flex-row justify-between">
                <Text className="font-bold">Deposit Paid</Text>
                <Text className="font-bold text-primary">£{confirmationDetails.amount.toFixed(2)}</Text>
              </View>
            </View>
          </CardContent>
        </Card>

        {/* What's Next */}
        <Card className="mx-4 mb-4">
          <CardHeader>
            <CardTitle>What's Next?</CardTitle>
          </CardHeader>
          <CardContent className="gap-3">
            <View className="flex-row items-start">
              <View className="w-6 h-6 bg-primary rounded-full items-center justify-center mr-3 mt-0.5">
                <Text className="text-primary-foreground font-bold text-xs">1</Text>
              </View>
              <View className="flex-1">
                <Text className="font-medium">Provider Confirmation</Text>
                <Text className="text-sm text-muted-foreground">
                  Your provider will confirm the booking within 24 hours
                </Text>
              </View>
            </View>
            <View className="flex-row items-start">
              <View className="w-6 h-6 bg-primary rounded-full items-center justify-center mr-3 mt-0.5">
                <Text className="text-primary-foreground font-bold text-xs">2</Text>
              </View>
              <View className="flex-1">
                <Text className="font-medium">Service Reminder</Text>
                <Text className="text-sm text-muted-foreground">
                  You'll receive a reminder 24 hours before your service
                </Text>
              </View>
            </View>
            <View className="flex-row items-start">
              <View className="w-6 h-6 bg-primary rounded-full items-center justify-center mr-3 mt-0.5">
                <Text className="text-primary-foreground font-bold text-xs">3</Text>
              </View>
              <View className="flex-1">
                <Text className="font-medium">Payment Completion</Text>
                <Text className="text-sm text-muted-foreground">
                  Pay the remaining balance on the day of service
                </Text>
              </View>
            </View>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card className="mx-4 mb-4">
          <CardHeader>
            <CardTitle>Need Help?</CardTitle>
          </CardHeader>
          <CardContent>
            <Text className="text-sm text-muted-foreground mb-3">
              If you have any questions about your booking, contact us:
            </Text>
            <View className="gap-2">
              <View className="flex-row items-center">
                <Ionicons name="mail" size={16} color={isDarkColorScheme ? THEME.dark.mutedForeground : THEME.light.mutedForeground} />
                <Text className="text-sm ml-2">support@zova.app</Text>
              </View>
              <View className="flex-row items-center">
                <Ionicons name="call" size={16} color={isDarkColorScheme ? THEME.dark.mutedForeground : THEME.light.mutedForeground} />
                <Text className="text-sm ml-2">0800 123 4567</Text>
              </View>
            </View>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <View className="px-4 py-6 gap-3">
          <Button onPress={handleViewBookings} className="w-full" size="lg">
            <Text className="text-primary-foreground font-bold">View Booking Details</Text>
          </Button>

          <Button
            onPress={handleBookAnother}
            variant="outline"
            className="w-full"
            size="lg"
          >
            <Text className="text-foreground font-bold">Book Another Service</Text>
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
import React from 'react';
import { View, ScrollView, Pressable } from 'react-native';
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
    // ✨ CRITICAL FIX: Use passed parameters instead of reverse-calculating
    // This ensures we always show the correct amounts regardless of fee structure changes
    servicePrice: parseFloat(params.servicePrice as string),
    platformFee: parseFloat(params.platformFee as string),
  };

  // Round to 2 decimal places for display
  confirmationDetails.servicePrice = Math.round(confirmationDetails.servicePrice * 100) / 100;
  confirmationDetails.platformFee = Math.round(confirmationDetails.platformFee * 100) / 100;

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Success Header - Modern Design */}
        <View className="items-center pt-8 pb-6 px-4">
          <View className="w-24 h-24 bg-primary/10 rounded-full items-center justify-center mb-6 border-4 border-primary/20">
            <Ionicons name="checkmark-circle" size={56} color={isDarkColorScheme ? THEME.dark.primary : THEME.light.primary} />
          </View>
          <Text className="text-3xl font-bold text-foreground text-center mb-3">
            Booking Confirmed!
          </Text>
          <Text className="text-base text-muted-foreground text-center mb-2">
            Your service request has been received
          </Text>
          <Text className="text-sm text-muted-foreground text-center">
            Booking ID: <Text className="font-mono text-xs font-semibold text-primary">{confirmationDetails.bookingId}</Text>
          </Text>
        </View>

        {/* Service Summary Card - Prominent */}
        <Card className="mx-4 mb-4 bg-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <View className="flex-row items-start gap-4">
              <View className="w-16 h-16 bg-primary/10 rounded-lg items-center justify-center">
                <Ionicons name="sparkles" size={32} color={isDarkColorScheme ? THEME.dark.primary : THEME.light.primary} />
              </View>
              <View className="flex-1">
                <Text className="text-lg font-bold text-foreground mb-1">{confirmationDetails.serviceTitle}</Text>
                <Text className="text-sm text-muted-foreground mb-2">with {confirmationDetails.providerName}</Text>
                <View className="flex-row items-center gap-4 mt-2">
                  <View className="flex-row items-center gap-1">
                    <Ionicons name="calendar-outline" size={16} color={isDarkColorScheme ? THEME.dark.mutedForeground : THEME.light.mutedForeground} />
                    <Text className="text-sm font-semibold">{confirmationDetails.date.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })}</Text>
                  </View>
                  <View className="flex-row items-center gap-1">
                    <Ionicons name="time-outline" size={16} color={isDarkColorScheme ? THEME.dark.mutedForeground : THEME.light.mutedForeground} />
                    <Text className="text-sm font-semibold">{confirmationDetails.time}</Text>
                  </View>
                </View>
              </View>
            </View>
          </CardContent>
        </Card>

        {/* Payment Breakdown Card */}
        <Card className="mx-4 mb-4">
          <CardHeader>
            <CardTitle className="text-lg">Payment Summary</CardTitle>
          </CardHeader>
          <CardContent className="gap-3">
            {/* Service Price */}
            <View className="flex-row justify-between items-center">
              <View className="flex-row items-center gap-2">
                <Ionicons name="pricetag-outline" size={16} color={isDarkColorScheme ? THEME.dark.mutedForeground : THEME.light.mutedForeground} />
                <Text className="text-muted-foreground">Service Price</Text>
              </View>
              <Text className="font-semibold text-foreground">£{confirmationDetails.servicePrice.toFixed(2)}</Text>
            </View>

            {/* Platform Fee */}
            <View className="flex-row justify-between items-center">
              <View className="flex-row items-center gap-2">
                <Ionicons name="layers-outline" size={16} color={isDarkColorScheme ? THEME.dark.mutedForeground : THEME.light.mutedForeground} />
                <Text className="text-muted-foreground">Platform Fee (10%)</Text>
              </View>
              <Text className="font-semibold text-foreground">£{confirmationDetails.platformFee.toFixed(2)}</Text>
            </View>

            {/* Divider */}
            <View className="border-t border-border my-2" />

            {/* Total - Highlighted */}
            <View className="flex-row justify-between items-center bg-primary/5 p-3 rounded-lg">
              <Text className="text-lg font-bold text-foreground">Total Paid</Text>
              <Text className="text-xl font-bold text-primary">£{confirmationDetails.amount.toFixed(2)}</Text>
            </View>

            {/* Escrow Info */}
            <View className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mt-2">
              <View className="flex-row items-start gap-2">
                <Ionicons name="information-circle-outline" size={16} color={isDarkColorScheme ? '#60a5fa' : '#3b82f6'} className="mt-0.5" />
                <View className="flex-1">
                  <Text className="text-xs font-semibold text-blue-900 dark:text-blue-200 mb-1">Funds Held in Escrow</Text>
                  <Text className="text-xs text-blue-800 dark:text-blue-300">
                    Your payment is securely held and released to the provider only after service completion
                  </Text>
                </View>
              </View>
            </View>
          </CardContent>
        </Card>

        {/* Timeline - What's Next */}
        <Card className="mx-4 mb-4">
          <CardHeader>
            <CardTitle className="text-lg">What Happens Next</CardTitle>
          </CardHeader>
          <CardContent className="gap-4">
            {/* Step 1 */}
            <View className="flex-row gap-3">
              <View className="items-center">
                <View className="w-8 h-8 bg-primary rounded-full items-center justify-center">
                  <Text className="text-primary-foreground font-bold text-xs">1</Text>
                </View>
                <View className="w-0.5 h-12 bg-border my-1" />
              </View>
              <View className="flex-1 pb-2">
                <Text className="font-semibold text-foreground mb-1">Provider Review</Text>
                <Text className="text-sm text-muted-foreground">
                  {confirmationDetails.providerName} will review your booking request within 24 hours
                </Text>
              </View>
            </View>

            {/* Step 2 */}
            <View className="flex-row gap-3">
              <View className="items-center">
                <View className="w-8 h-8 bg-muted rounded-full items-center justify-center">
                  <Ionicons name="checkmark" size={16} color={isDarkColorScheme ? THEME.dark.mutedForeground : THEME.light.mutedForeground} />
                </View>
                <View className="w-0.5 h-12 bg-border my-1" />
              </View>
              <View className="flex-1 pb-2">
                <Text className="font-semibold text-foreground mb-1">Booking Confirmed</Text>
                <Text className="text-sm text-muted-foreground">
                  You'll receive a notification when {confirmationDetails.providerName} accepts your booking
                </Text>
              </View>
            </View>

            {/* Step 3 */}
            <View className="flex-row gap-3">
              <View className="items-center">
                <View className="w-8 h-8 bg-muted rounded-full items-center justify-center">
                  <Ionicons name="checkmark" size={16} color={isDarkColorScheme ? THEME.dark.mutedForeground : THEME.light.mutedForeground} />
                </View>
              </View>
              <View className="flex-1">
                <Text className="font-semibold text-foreground mb-1">Service Complete</Text>
                <Text className="text-sm text-muted-foreground">
                  Payment released to provider after service is marked complete
                </Text>
              </View>
            </View>
          </CardContent>
        </Card>

        {/* Support Card */}
        <Card className="mx-4 mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Questions?</CardTitle>
          </CardHeader>
          <CardContent>
            <View className="gap-3">
              <Pressable className="flex-row items-center gap-3 p-3 bg-muted/30 rounded-lg active:bg-muted/50">
                <Ionicons name="call-outline" size={20} color={isDarkColorScheme ? THEME.dark.primary : THEME.light.primary} />
                <View className="flex-1">
                  <Text className="font-medium text-foreground text-sm">+44 800 ZOVA HELP</Text>
                  <Text className="text-xs text-muted-foreground">Available 24/7</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={isDarkColorScheme ? THEME.dark.mutedForeground : THEME.light.mutedForeground} />
              </Pressable>
              
              <Pressable className="flex-row items-center gap-3 p-3 bg-muted/30 rounded-lg active:bg-muted/50">
                <Ionicons name="chatbubble-outline" size={20} color={isDarkColorScheme ? THEME.dark.primary : THEME.light.primary} />
                <View className="flex-1">
                  <Text className="font-medium text-foreground text-sm">Live Chat Support</Text>
                  <Text className="text-xs text-muted-foreground">Average response: 2 minutes</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={isDarkColorScheme ? THEME.dark.mutedForeground : THEME.light.mutedForeground} />
              </Pressable>
            </View>
          </CardContent>
        </Card>

        {/* Action Buttons - Modern Style */}
        <View className="px-4 py-6 gap-3 border-t border-border">
          <Button 
            onPress={() => router.replace(`/(customer)/booking/${confirmationDetails.bookingId}` as any)} 
            className="w-full" 
            size="lg"
          >
            <View className="flex-row items-center gap-2">
              <Ionicons name="eye-outline" size={18} color="white" />
              <Text className="text-primary-foreground font-bold">View Booking</Text>
            </View>
          </Button>

          <Button
            onPress={() => router.replace('/(customer)/search')}
            variant="outline"
            className="w-full"
            size="lg"
          >
            <View className="flex-row items-center gap-2">
              <Ionicons name="add-circle-outline" size={18} color={isDarkColorScheme ? THEME.dark.foreground : THEME.light.foreground} />
              <Text className="text-foreground font-bold">Book Another Service</Text>
            </View>
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
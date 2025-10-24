import React, { useState } from 'react';
import { View, ScrollView, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Ionicons } from '@expo/vector-icons';
import { useStripe } from '@stripe/stripe-react-native';
import { useColorScheme } from '@/lib/core/useColorScheme';
import { THEME } from '@/lib/theme';
import { supabase } from '@/lib/supabase';

import { useCreateBooking } from '@/hooks/shared';
import { useAuthStore } from '@/stores/auth';

export default function PaymentScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { isDarkColorScheme } = useColorScheme();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const user = useAuthStore((state) => state.user);

  // Form state - REMOVED: Payment Sheet handles card collection
  const [isProcessing, setIsProcessing] = useState(false);

  // Extract booking details from params
  const bookingDetails = {
    serviceId: params.serviceId as string,
    providerId: params.providerId as string,
    providerName: params.providerName as string,
    serviceTitle: params.serviceTitle as string,
    servicePrice: parseFloat(params.servicePrice as string),
    selectedDate: new Date(params.selectedDate as string),
    selectedTime: params.selectedTime as string,
    specialRequests: params.specialRequests as string,
    address: params.address as string,
  };

  console.log('[Payment] Booking details from params:', bookingDetails);

  // Calculate amounts for ESCROW SYSTEM
  const platformFee = bookingDetails.servicePrice * 0.10; // 10% platform fee (as per requirements)
  const totalCustomerPays = bookingDetails.servicePrice + platformFee; // Full amount customer pays
  const providerAmount = bookingDetails.servicePrice; // Provider receives full service price

  console.log('[Payment] Escrow Calculations:', {
    servicePrice: bookingDetails.servicePrice,
    platformFee: platformFee,
    totalCustomerPays: totalCustomerPays,
    providerAmount: providerAmount,
  });

  // Create booking mutation
  const createBookingMutation = useCreateBooking();

  const handlePayment = async () => {
    console.log('[Payment] Starting payment process...');
    setIsProcessing(true);

    try {
      // ✨ ESCROW SYSTEM: Authorize and capture FULL amount immediately
      // This implements true marketplace escrow - full payment held until service completion
      console.log('[Payment] Creating payment intent for FULL AMOUNT (escrow)...');
      console.log('[Payment] Total amount to authorize and capture:', totalCustomerPays);
      
      const { data: paymentData, error: paymentError } = await supabase.functions.invoke('create-payment-intent', {
        body: {
          amount: Math.round(totalCustomerPays * 100), // Full amount in pence
          depositAmount: Math.round(totalCustomerPays * 100), // Capture full amount (not deposit)
          currency: 'gbp',
          serviceId: bookingDetails.serviceId,
          providerId: bookingDetails.providerId,
        },
      });

      if (paymentError) {
        console.error('[Payment] Payment intent creation failed:', paymentError);
        Alert.alert('Error', `Payment setup failed: ${paymentError.message || 'Unknown error'}`);
        setIsProcessing(false);
        return;
      }

      console.log('[Payment] Payment intent created successfully:', paymentData);
      const { clientSecret, paymentIntentId } = paymentData;

      if (!clientSecret || !paymentIntentId) {
        console.error('[Payment] No client secret or payment intent ID received');
        Alert.alert('Error', 'Payment setup failed: Missing payment details');
        setIsProcessing(false);
        return;
      }

      // Step 2: Initialize Payment Sheet
      console.log('[Payment] Initializing payment sheet...');
      const { error: initError } = await initPaymentSheet({
        paymentIntentClientSecret: clientSecret,
        merchantDisplayName: 'ZOVA Services',
        returnURL: 'zova://payment-return',
      });

      if (initError) {
        console.error('[Payment] Payment sheet initialization failed:', initError);
        Alert.alert('Error', initError.message);
        setIsProcessing(false);
        return;
      }

      console.log('[Payment] Payment sheet initialized successfully');

      // Step 3: Present Payment Sheet (Stripe handles the secure payment form)
      console.log('[Payment] Presenting payment sheet...');
      const { error: sheetError } = await presentPaymentSheet();

      if (sheetError) {
        console.error('[Payment] Payment sheet presentation failed:', sheetError);
        Alert.alert('Payment Failed', sheetError.message);
        setIsProcessing(false);
        return;
      }

      console.log('[Payment] Payment sheet completed successfully');

      // Step 4: Capture FULL amount for escrow
      console.log('[Payment] Capturing full amount for escrow...');
      const { data: captureData, error: captureError } = await supabase.functions.invoke('capture-deposit', {
        body: {
          paymentIntentId: paymentIntentId,
          totalAmount: Math.round(totalCustomerPays * 100), // Full amount in pence
          providerAmount: Math.round(providerAmount * 100), // Provider's share in pence
          platformFee: Math.round(platformFee * 100), // Platform commission in pence
        },
      });

      if (captureError) {
        console.error('[Payment] Escrow capture failed:', captureError);
        Alert.alert('Payment Error', 'Payment authorized but escrow capture failed. Please contact support.');
        setIsProcessing(false);
        return;
      }

      console.log('[Payment] Full amount captured and held in escrow:', captureData);

      // Step 5: Create booking after successful payment and deposit capture
      if (!user) {
        console.error('[Payment] User not authenticated');
        throw new Error('User not authenticated');
      }

      console.log('[Payment] Creating booking...');
      console.log('[Payment] Booking params:', {
        serviceId: bookingDetails.serviceId,
        providerId: bookingDetails.providerId,
        bookingDate: bookingDetails.selectedDate.toISOString().split('T')[0],
        startTime: bookingDetails.selectedTime,
        specialRequests: bookingDetails.specialRequests,
        address: bookingDetails.address,
        totalAmount: bookingDetails.servicePrice,
        platformFee: platformFee,
        totalCustomerPays: totalCustomerPays,
        paymentIntentId: paymentIntentId,
      });
      
      let bookingResponse;
      try {
        bookingResponse = await createBookingMutation.mutateAsync({
          serviceId: bookingDetails.serviceId,
          providerId: bookingDetails.providerId,
          bookingDate: bookingDetails.selectedDate.toISOString().split('T')[0],
          startTime: bookingDetails.selectedTime,
          specialRequests: bookingDetails.specialRequests,
          address: bookingDetails.address,
          depositAmount: totalCustomerPays, // Now represents full captured amount
          totalAmount: bookingDetails.servicePrice,
          paymentIntentId: paymentIntentId,
          authorizationAmount: totalCustomerPays, // Full amount captured in escrow
          capturedDeposit: totalCustomerPays, // Full amount held in escrow (not partial)
        });
        console.log('[Payment] Booking response received:', bookingResponse);
      } catch (bookingError) {
        console.error('[Payment] Booking creation failed:', bookingError);
        console.error('[Payment] Error details:', JSON.stringify(bookingError, null, 2));
        
        // Extract error details for better user experience
        let errorMessage = 'Booking creation failed. Please try again.';
        if (bookingError && typeof bookingError === 'object') {
          const errorBody = (bookingError as any).message;
          if (errorBody && errorBody.includes('{"error":')) {
            try {
              const parsed = JSON.parse(errorBody.match(/\{"error"[^}]*\}/)[0]);
              errorMessage = parsed.error;
            } catch (e) {
              // Use default message
            }
          }
        }
        
        throw new Error(errorMessage);
      }

      console.log('[Payment] Booking created successfully:', bookingResponse);

      // Step 5: Navigate to confirmation
      router.replace({
        pathname: '/(customer)/booking/confirmation',
        params: {
          bookingId: bookingResponse?.booking?.id || 'temp-id', // Use real booking ID from response
          serviceTitle: bookingDetails.serviceTitle,
          providerName: bookingDetails.providerName,
          date: bookingDetails.selectedDate.toISOString(),
          time: bookingDetails.selectedTime,
          amount: totalCustomerPays.toString(), // Full amount charged
        }
      });

    } catch (error) {
      console.error('[Payment] Payment error:', error);

      // Try to get the specific error message from the Edge Function
      let errorMessage = 'Payment processing failed. Please try again.';
      if (error instanceof Error) {
        // Check if it's a Supabase Functions error with details
        const errorWithDetails = error as any;
        if (errorWithDetails.details) {
          errorMessage = String(errorWithDetails.details);
        } else if ('message' in error && error.message) {
          // Try to extract error from message
          try {
            const parsed = JSON.parse(error.message);
            if (parsed.error) {
              errorMessage = parsed.error;
            }
          } catch {
            // If not JSON, use the message directly
            errorMessage = error.message;
          }
        }
      }

      Alert.alert('Booking Failed', errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="px-4 py-4 border-b border-border">
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
              Payment
            </Text>
          </View>
        </View>

        {/* Booking Summary */}
        <Card className="mx-4 mt-4">
          <CardHeader>
            <CardTitle>Booking Summary</CardTitle>
          </CardHeader>
          <CardContent className="gap-2">
            <View className="flex-row justify-between">
              <Text className="text-muted-foreground">Service</Text>
              <Text className="font-medium">{bookingDetails.serviceTitle}</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-muted-foreground">Provider</Text>
              <Text className="font-medium">{bookingDetails.providerName}</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-muted-foreground">Date</Text>
              <Text className="font-medium">{bookingDetails.selectedDate.toLocaleDateString()}</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-muted-foreground">Time</Text>
              <Text className="font-medium">{bookingDetails.selectedTime}</Text>
            </View>
            <View className="border-t border-border pt-2 mt-2 gap-2">
              <View className="flex-row justify-between">
                <Text className="text-muted-foreground">Service Price</Text>
                <Text className="font-medium">£{bookingDetails.servicePrice.toFixed(2)}</Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-muted-foreground">Platform Fee (10%)</Text>
                <Text className="font-medium">£{platformFee.toFixed(2)}</Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="font-bold">Total Amount</Text>
                <Text className="font-bold">£{totalCustomerPays.toFixed(2)}</Text>
              </View>
              <View className="border-t border-border pt-2">
                <View className="flex-row justify-between">
                  <Text className="font-bold text-primary">Amount Charged Today</Text>
                  <Text className="font-bold text-primary">£{totalCustomerPays.toFixed(2)}</Text>
                </View>
                <Text className="text-xs text-muted-foreground mt-1">
                  Full amount charged immediately and held in escrow until service completion
                </Text>
                <View className="bg-primary/5 rounded-lg p-3 mt-2">
                  <View className="flex-row items-center mb-1">
                    <Ionicons name="shield-checkmark" size={16} className="text-primary" />
                    <Text className="text-xs font-medium text-primary ml-1">Escrow Protection</Text>
                  </View>
                  <Text className="text-xs text-muted-foreground">
                    Funds are held securely. Provider receives £{bookingDetails.servicePrice.toFixed(2)} automatically when service is marked complete.
                  </Text>
                </View>
              </View>
            </View>
          </CardContent>
        </Card>

        {/* Payment Information */}
        <Card className="mx-4 mt-4">
          <CardContent className="gap-3">
            <View className="flex-row items-center">
              <Ionicons name="information-circle" size={20} color={isDarkColorScheme ? THEME.dark.primary : THEME.light.primary} />
              <Text className="font-medium text-foreground ml-2">How Escrow Works</Text>
            </View>
            <Text className="text-sm text-muted-foreground">
              • Full amount (£{totalCustomerPays.toFixed(2)}) charged immediately to your card{'\n'}
              • Funds held securely in escrow until service completion{'\n'}
              • Provider receives £{bookingDetails.servicePrice.toFixed(2)} automatically when service is marked complete{'\n'}
              • Platform fee (£{platformFee.toFixed(2)}) covers secure payment processing & customer support{'\n'}
              • Your payment is protected throughout the service
            </Text>
          </CardContent>
        </Card>

        {/* Security Notice */}
        <Card className="mx-4 mt-4">
          <CardContent className="flex-row items-center">
            <Ionicons name="shield-checkmark" size={24} className="text-success" />
            <View className="ml-3 flex-1">
              <Text className="font-medium text-foreground">Secure Escrow Payment</Text>
              <Text className="text-sm text-muted-foreground">
                Full amount charged and held securely. Provider receives payment automatically after service completion.
              </Text>
            </View>
          </CardContent>
        </Card>

        {/* Pay Button */}
        <View className="px-4 py-8">
          <Button
            onPress={handlePayment}
            className="w-full h-14"
            size="lg"
            disabled={isProcessing}
          >
            <Text className="text-primary-foreground font-bold text-lg">
              {isProcessing ? 'Processing...' : `Pay £${totalCustomerPays.toFixed(2)} Securely`}
            </Text>
          </Button>

          <Text className="text-xs text-muted-foreground text-center mt-4">
            By completing this payment, you agree to our terms of service and cancellation policy.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
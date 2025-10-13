/**
 * SOS Emergency Booking Screen
 * 
 * Streamlined emergency booking flow for customers with active SOS subscriptions.
 * Features immediate provider matching, instant booking, and emergency context collection.
 */

import React, { useState, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Icon } from '@/components/ui/icon';
import { useStripe } from '@stripe/stripe-react-native';
import { supabase } from '@/lib/supabase';
import { 
  Shield, 
  Clock, 
  MapPin, 
  AlertTriangle, 
  Scissors,
  ChevronRight,
  Star,
  Camera,
  Calendar,
  Sparkles,
  Eye,
  Heart,
  Music,
  Users,
  Utensils,
  Flower
} from 'lucide-react-native';

// Hooks
import { useAuthOptimized } from '@/hooks';
import { useCustomerSOSStatus } from '@/hooks/shared/useSubscription';
import { useSOSProviders } from '@/hooks/customer/useSOSProviders';
import { useCreateSOSBooking } from '@/hooks/customer/useCreateSOSBooking';
import { useLocationPermission } from '@/hooks/shared/useLocation';
import { useSOSSubcategories } from '@/hooks/customer/useSOSCategories';

/**
 * Helper function to get appropriate icon for each service subcategory
 */
function getServiceIcon(subcategoryName: string) {
  const name = subcategoryName.toLowerCase();
  
  if (name.includes('hair') || name.includes('braids') || name.includes('cuts') || name.includes('barbering')) {
    return Scissors;
  }
  if (name.includes('nails') || name.includes('manicure') || name.includes('pedicure')) {
    return Sparkles;
  }
  if (name.includes('makeup') || name.includes('mua') || name.includes('bridal')) {
    return Heart;
  }
  if (name.includes('lashes') || name.includes('brows')) {
    return Eye;
  }
  if (name.includes('photographer') || name.includes('videographer')) {
    return Camera;
  }
  if (name.includes('event planner')) {
    return Calendar;
  }
  if (name.includes('dj') || name.includes('music')) {
    return Music;
  }
  if (name.includes('host') || name.includes('mc')) {
    return Users;
  }
  if (name.includes('caterer') || name.includes('chef')) {
    return Utensils;
  }
  if (name.includes('decorator') || name.includes('florist')) {
    return Flower;
  }
  
  return Star; // Default icon
}

/**
 * Helper function to get color based on urgency level
 * Uses theme colors that work properly in both light and dark modes
 */
function getUrgencyColor(urgency: 'low' | 'medium' | 'high') {
  switch (urgency) {
    case 'high':
      return 'bg-destructive';
    case 'medium':
      return 'bg-orange-500';
    case 'low':
      return 'bg-primary';
    default:
      return 'bg-muted';
  }
}

export default function SOSBookingScreen() {
  // ✅ Following React Query + Zustand architecture
  const { user } = useAuthOptimized();
  const { hasSubscription, isLoading: subscriptionLoading } = useCustomerSOSStatus();
  const { hasPermission, requestPermission } = useLocationPermission();
  
  // Stripe payment processing
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  
  // Fetch real SOS categories from database
  const { data: sosSubcategories, isLoading: categoriesLoading, error: categoriesError } = useSOSSubcategories();
  
  // Form state - minimal for emergency booking
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [emergencyDescription, setEmergencyDescription] = useState('');
  const [currentAddress, setCurrentAddress] = useState('');
  const [isAddressConfirmed, setIsAddressConfirmed] = useState(false);
  
  // SOS provider matching and booking
  const { 
    data: availableProviders, 
    isLoading: providersLoading,
    refetch: refetchProviders 
  } = useSOSProviders(selectedCategory, currentAddress);
  
  const createSOSBookingMutation = useCreateSOSBooking();

  // Check subscription access
  useEffect(() => {
    if (!subscriptionLoading && !hasSubscription) {
      Alert.alert(
        'SOS Access Required',
        'You need an active SOS subscription to access emergency booking. Would you like to subscribe?',
        [
          { text: 'Cancel', onPress: () => router.back() },
          { text: 'Subscribe', onPress: () => router.push('/(customer)/subscriptions') }
        ]
      );
    }
  }, [hasSubscription, subscriptionLoading]);

  // Request location permission on mount
  useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
  }, [hasPermission, requestPermission]);

  const handleCategorySelect = (categoryId: string) => {
    console.log('📋 [SOSBooking] handleCategorySelect called with:', categoryId);
    console.log('📋 [SOSBooking] Current selectedCategory:', selectedCategory);
    console.log('📋 [SOSBooking] Current address:', currentAddress);
    
    setSelectedCategory(categoryId);
    
    // Trigger provider search when category selected
    if (currentAddress) {
      console.log('📋 [SOSBooking] Refetching providers for category:', categoryId);
      refetchProviders();
    } else {
      console.log('📋 [SOSBooking] No address set, not fetching providers yet');
    }
  };

  const handleCreateSOSBooking = async (providerId: string) => {
    if (!selectedCategory || !emergencyDescription.trim() || !currentAddress.trim()) {
      Alert.alert('Missing Information', 'Please fill in all required fields');
      return;
    }

    setIsProcessingPayment(true);

    try {
      // Step 1: Get service price for payment calculation
      const selectedService = sosSubcategories?.find(c => c.id === selectedCategory);
      const baseAmount = 50.00; // Default emergency service price
      const depositAmount = baseAmount; // Full payment for SOS bookings

      console.log('[SOS Payment] Creating payment intent for emergency booking...');
      
      // Step 2: Create payment intent
      const { data: paymentData, error: paymentError } = await supabase.functions.invoke('create-payment-intent', {
        body: {
          amount: Math.round(depositAmount * 100), // Convert to cents
          currency: 'gbp',
          serviceId: selectedCategory, // Use category as service reference
          providerId: providerId,
        },
      });

      if (paymentError) {
        console.error('[SOS Payment] Payment intent creation failed:', paymentError);
        Alert.alert('Payment Error', `Payment setup failed: ${paymentError.message || 'Unknown error'}`);
        setIsProcessingPayment(false);
        return;
      }

      const { clientSecret, paymentIntentId } = paymentData;
      if (!clientSecret || !paymentIntentId) {
        Alert.alert('Payment Error', 'Payment setup failed: Missing payment details');
        setIsProcessingPayment(false);
        return;
      }

      console.log('[SOS Payment] Initializing payment sheet...');
      
      // Step 3: Initialize Payment Sheet
      const { error: initError } = await initPaymentSheet({
        paymentIntentClientSecret: clientSecret,
        merchantDisplayName: 'ZOVA Emergency Services',
        returnURL: 'zova://payment-return',
      });

      if (initError) {
        console.error('[SOS Payment] Payment sheet initialization failed:', initError);
        Alert.alert('Payment Error', initError.message);
        setIsProcessingPayment(false);
        return;
      }

      // Step 4: Present Payment Sheet
      console.log('[SOS Payment] Presenting payment sheet...');
      const { error: sheetError } = await presentPaymentSheet();

      if (sheetError) {
        console.error('[SOS Payment] Payment cancelled or failed:', sheetError);
        Alert.alert('Payment Cancelled', 'Emergency booking requires payment to proceed.');
        setIsProcessingPayment(false);
        return;
      }

      console.log('[SOS Payment] Payment successful, creating emergency booking...');

      // Step 5: Create SOS booking with payment confirmation
      const booking = await createSOSBookingMutation.mutateAsync({
        providerId,
        categoryId: selectedCategory,
        emergencyDescription: emergencyDescription.trim(),
        serviceLocation: currentAddress.trim(),
        urgencyLevel: (sosSubcategories?.find(c => c.id === selectedCategory)?.urgency || 'medium') as 'low' | 'medium' | 'high',
        paymentIntentId: paymentIntentId // Include payment confirmation
      });

      console.log('[SOS Payment] Emergency booking created successfully:', booking.id);

      // Navigate to emergency booking confirmation
      router.replace({
        pathname: '/(customer)/booking/sos-confirmation' as any,
        params: {
          bookingId: booking.id,
          providerId: booking.provider_id,
          estimatedArrival: booking.estimated_arrival || '15-30 minutes',
          totalAmount: depositAmount.toString(),
          paymentStatus: 'paid'
        }
      });
    } catch (error) {
      console.error('[SOS Payment] Emergency booking error:', error);
      Alert.alert('Booking Failed', 'Unable to create emergency booking. Please try again.');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Show loading while checking subscription or loading categories
  if (subscriptionLoading || categoriesLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 justify-center items-center">
          <Icon as={Shield} size={48} className="text-destructive mb-4" />
          <Text className="text-lg font-semibold">
            {subscriptionLoading ? 'Accessing SOS Mode...' : 'Loading emergency services...'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Don't render if no subscription (handled by useEffect)
  if (!hasSubscription) {
    return null;
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-3 py-6 gap-6">
          {/* Emergency Header */}
          <View className="bg-destructive/5 border border-destructive/30 rounded-2xl p-6">
            <View className="flex-row items-center gap-4">
              <View className="w-16 h-16 bg-destructive rounded-full items-center justify-center">
                <Icon as={Shield} size={28} className="text-destructive-foreground" />
              </View>
              <View className="flex-1">
                <Text className="text-xl font-bold text-foreground mb-2">SOS Emergency Booking</Text>
                <View className="flex-row items-center gap-2">
                  <View className="w-3 h-3 bg-destructive rounded-full" />
                  <Text className="text-sm text-destructive font-medium">Priority service matching active</Text>
                </View>
              </View>
            </View>
            <View className="mt-4 bg-card rounded-xl p-3">
              <View className="flex-row items-center justify-between">
                <Text className="text-sm text-muted-foreground font-medium">Expected Response Time</Text>
                <View className="flex-row items-center gap-1">
                  <Icon as={Clock} size={16} className="text-green-600 dark:text-green-400" />
                  <Text className="text-sm font-bold text-green-600 dark:text-green-400">5-15 minutes</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Emergency Service Categories */}
          <View>
            <View className="mb-4">
              <Text className="text-xl font-bold text-foreground mb-2">What do you need help with?</Text>
              <Text className="text-muted-foreground">
                {selectedCategory 
                  ? `Selected: ${sosSubcategories?.find(c => c.id === selectedCategory)?.name || 'Service'}`
                  : 'Select the service category for your emergency'
                }
              </Text>
              {selectedCategory && (
                <View className="mt-2 p-2 bg-success/10 rounded-lg border border-success/20">
                  <Text className="text-green-700 dark:text-green-300 text-sm font-medium">
                    ✓ Service selected - Please describe your emergency below
                  </Text>
                </View>
              )}
            </View>
              {categoriesLoading ? (
                <View className="flex-row flex-wrap gap-3">
                  {[1, 2, 3, 4, 5, 6].map(i => (
                    <View key={i} className="flex-1 min-w-[45%]">
                      <View className="border-2 border-border bg-card rounded-2xl p-4 min-h-[140px] justify-center">
                        <View className="items-center gap-3">
                          <Skeleton className="w-14 h-14 rounded-2xl" />
                          <View className="items-center gap-2">
                            <Skeleton className="w-24 h-4" />
                            <Skeleton className="w-16 h-3" />
                          </View>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              ) : categoriesError ? (
                <View className="border border-destructive/30 bg-destructive/5 rounded-2xl p-6">
                  <View className="items-center">
                    <View className="w-16 h-16 bg-destructive/10 rounded-2xl items-center justify-center mb-4">
                      <Icon as={AlertTriangle} size={28} className="text-destructive" />
                    </View>
                    <Text className="font-semibold text-foreground mb-2 text-lg text-center">Failed to load categories</Text>
                    <Text className="text-muted-foreground mb-4 text-center">Please check your connection and try again</Text>
                    <Button variant="outline" size="sm">
                      <Text className="text-foreground">Retry</Text>
                    </Button>
                  </View>
                </View>
              ) : (
                <View className="flex-row flex-wrap gap-3">
                  {sosSubcategories?.map((subcategory) => {
                    const IconComponent = getServiceIcon(subcategory.name);
                    const isSelected = selectedCategory === subcategory.id;
                    const urgencyColor = getUrgencyColor(subcategory.urgency);
                    
                    return (
                      <View key={subcategory.id} className="flex-1 min-w-[45%]">
                        <TouchableOpacity
                          onPress={() => {
                            console.log('🚨 [SOSBooking] Category selected:', subcategory.name, subcategory.id);
                            handleCategorySelect(subcategory.id);
                          }}
                          activeOpacity={0.7}
                          className="w-full"
                        >
                          <View className={`border-2 rounded-2xl p-4 ${
                            isSelected 
                              ? 'border-destructive bg-destructive/10 ' 
                              : 'border-border bg-card '
                          }`}>
                            <View className="items-center gap-3">
                              <View className={`w-14 h-14 ${urgencyColor} rounded-2xl items-center justify-center`}>
                                <Icon as={IconComponent} size={22} className="text-white" />
                              </View>
                              <View className="items-center gap-2">
                                <Text className={`text-sm font-semibold text-center ${
                                  isSelected ? 'text-destructive' : 'text-foreground'
                                }`} numberOfLines={2}>
                                  {subcategory.name}
                                </Text>
                                <Text className="text-xs text-muted-foreground text-center" numberOfLines={1}>
                                  {subcategory.category_name}
                                </Text>
                                {subcategory.urgency === 'high' && (
                                  <Badge variant="destructive" className="text-xs mt-1">
                                    <Icon as={AlertTriangle} size={10} className="text-destructive-foreground mr-1" />
                                    <Text className="text-destructive-foreground font-medium">High Priority</Text>
                                  </Badge>
                                )}
                              </View>
                            </View>
                          </View>
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              )}
          </View>

          {/* Emergency Description */}
          {selectedCategory && (
            <View className="bg-card border border-border rounded-2xl p-4">
              <View className="mb-4">
                <Text className="text-lg font-semibold text-foreground mb-1">Describe your emergency</Text>
                <Text className="text-muted-foreground text-sm">Help us understand what you need</Text>
              </View>
              <View className="gap-3">
                <Textarea
                  placeholder="Brief description of what you need (e.g., 'Hair styling for wedding tonight', 'Emergency makeup for event', 'Last-minute photographer needed', 'Nail repair before meeting')"
                  value={emergencyDescription}
                  onChangeText={setEmergencyDescription}
                  className="min-h-24 text-base"
                  maxLength={200}
                />
                <View className="flex-row justify-between items-center">
                  <Text className="text-xs text-muted-foreground">
                    Be specific to help us match you with the right provider
                  </Text>
                  <Text className={`text-xs font-medium ${
                    emergencyDescription.length > 180 ? 'text-orange-500' : 'text-muted-foreground'
                  }`}>
                    {emergencyDescription.length}/200
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Location Confirmation */}
          {selectedCategory && (
            <View className="bg-card border border-border rounded-2xl p-4">
              <View className="mb-4">
                <Text className="text-lg font-semibold text-foreground mb-1">Service Location</Text>
                <Text className="text-muted-foreground text-sm">Where do you need the service?</Text>
              </View>
              <View className="gap-4">
                <View className="flex-row items-center gap-3 p-3 border border-border rounded-xl bg-muted/30">
                  <Icon as={MapPin} size={18} className="text-muted-foreground" />
                  <Input
                    placeholder="Enter your full address"
                    value={currentAddress}
                    onChangeText={setCurrentAddress}
                    className="flex-1 border-0 bg-transparent p-0 text-base"
                  />
                </View>
                <Button
                  variant="outline"
                  size="sm"
                  onPress={() => {
                    // TODO: Implement current location detection
                    setCurrentAddress('123 Main St, London, UK');
                    setIsAddressConfirmed(true);
                  }}
                  className="self-start flex-row items-center gap-2"
                >
                  <Icon as={MapPin} size={14} className="text-foreground" />
                  <Text className="text-foreground font-medium">Use Current Location</Text>
                </Button>
                {currentAddress && (
                  <View className="bg-success/10 p-3 rounded-xl border border-success/20">
                    <Text className="text-green-700 dark:text-green-300 text-sm font-medium">
                      ✓ Location confirmed - Searching for nearby providers
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Available Providers */}
          {selectedCategory && currentAddress && (
            <View>
              <View className="flex-row items-center justify-between mb-4">
                <View>
                  <Text className="text-lg font-semibold text-foreground mb-1">Available Now</Text>
                  <Text className="text-muted-foreground text-sm">Emergency providers in your area</Text>
                </View>
                <Badge className="bg-success/10 border-success/20 px-3 py-2">
                  <Text className="text-green-700 dark:text-green-300 font-semibold">
                    {availableProviders?.length || 0} available
                  </Text>
                </Badge>
              </View>

                {providersLoading ? (
                  <View className="gap-4">
                    {[1, 2, 3].map(i => (
                      <View key={i} className="border border-border bg-card rounded-2xl p-5 ">
                          {/* Header Skeleton */}
                          <View className="flex-row items-start gap-4 mb-4">
                            <Skeleton className="w-16 h-16 rounded-full shrink-0" />
                            <View className="flex-1 gap-2">
                              <View className="flex-row items-center justify-between mb-1">
                                <Skeleton className="w-32 h-5" />
                                <Skeleton className="w-16 h-5 rounded-full" />
                              </View>
                              <Skeleton className="w-40 h-4" />
                              <View className="flex-row items-center gap-2 mt-1">
                                <Skeleton className="w-20 h-4" />
                                <Skeleton className="w-24 h-3" />
                              </View>
                            </View>
                          </View>
                          
                          {/* Stats Skeleton */}
                          <View className="bg-muted/30 rounded-xl p-3 mb-4">
                            <View className="flex-row justify-between items-center">
                              <View className="flex-1 items-center gap-1">
                                <Skeleton className="w-12 h-3" />
                                <Skeleton className="w-16 h-4" />
                              </View>
                              <View className="flex-1 items-center gap-1">
                                <Skeleton className="w-10 h-3" />
                                <Skeleton className="w-8 h-4" />
                              </View>
                              <View className="flex-1 items-center gap-1">
                                <Skeleton className="w-8 h-3" />
                                <Skeleton className="w-12 h-4" />
                              </View>
                            </View>
                          </View>
                          
                          {/* Status Skeleton */}
                          <View className="flex-row items-center justify-between mb-4">
                            <Skeleton className="w-24 h-4" />
                            <Skeleton className="w-20 h-3" />
                          </View>
                          
                          {/* Button Skeleton */}
                          <Skeleton className="w-full h-12 rounded" />
                      </View>
                    ))}
                  </View>
                ) : availableProviders && availableProviders.length > 0 ? (
                  <View className="gap-4">
                    {availableProviders.map((provider) => (
                      <View key={provider.id} className="border border-border bg-card rounded-2xl p-5 ">
                          {/* Header Section */}
                          <View className="flex-row items-start gap-4 mb-4">
                            <View className="relative shrink-0">
                              <Avatar alt={provider.name || 'Provider'} className="w-16 h-16">
                                <AvatarImage source={{ uri: provider.avatar_url }} />
                                <AvatarFallback className="bg-primary">
                                  <Text className="text-primary-foreground font-bold text-xl">
                                    {provider.name?.charAt(0) || 'P'}
                                  </Text>
                                </AvatarFallback>
                              </Avatar>
                              {provider.is_verified && (
                                <View className="absolute -top-1 -right-1 w-6 h-6 bg-success rounded-full items-center justify-center border-2 border-card">
                                  <Text className="text-white text-xs font-bold">✓</Text>
                                </View>
                              )}
                            </View>

                            <View className="flex-1 min-w-0">
                              <View className="flex-row items-center justify-between mb-1">
                                <Text className="font-bold text-foreground text-lg" numberOfLines={1}>
                                  {provider.name}
                                </Text>
                                <Badge variant="secondary" className="shrink-0">
                                  <Text className="text-xs font-medium">
                                    {provider.distance_km ? `${provider.distance_km}km` : '0.5km'} away
                                  </Text>
                                </Badge>
                              </View>

                              <Text className="text-muted-foreground text-sm mb-2" numberOfLines={1}>
                                Emergency Service Provider
                              </Text>

                              <View className="flex-row items-center gap-1 mb-2">
                                <Icon as={Star} size={14} className="text-yellow-500" />
                                <Text className="text-sm font-semibold text-foreground">
                                  {provider.rating || 'N/A'}
                                </Text>
                                <Text className="text-xs text-muted-foreground">
                                  {provider.review_count ? `(${provider.review_count} reviews)` : '(No reviews)'}
                                </Text>
                              </View>
                            </View>
                          </View>

                          {/* Stats Section */}
                          <View className="flex-row justify-between items-center mb-4 bg-muted/30 rounded-xl p-3">
                            <View className="flex-1 items-center">
                              <View className="flex-row items-center gap-1 mb-1">
                                <Icon as={Clock} size={14} className="text-green-600 dark:text-green-400" />
                                <Text className="text-xs font-medium text-muted-foreground">Arrival</Text>
                              </View>
                              <Text className="text-sm font-bold text-green-600 dark:text-green-400">
                                {provider.estimated_arrival || '10-15 min'}
                              </Text>
                            </View>
                            
                            <View className="w-px h-8 bg-border" />
                            
                            <View className="flex-1 items-center">
                              <View className="flex-row items-center gap-1 mb-1">
                                <Icon as={Shield} size={14} className="text-blue-600 dark:text-blue-400" />
                                <Text className="text-xs font-medium text-muted-foreground">Jobs</Text>
                              </View>
                              <Text className="text-sm font-bold text-foreground">
                                {provider.completed_jobs || 89}
                              </Text>
                            </View>
                            
                            <View className="w-px h-8 bg-border" />
                            
                            <View className="flex-1 items-center">
                              <View className="flex-row items-center gap-1 mb-1">
                                <Text className="text-xs font-medium text-muted-foreground">Price</Text>
                              </View>
                              <Text className="text-sm font-bold text-foreground">
                                £45/hr
                              </Text>
                            </View>
                          </View>

                          {/* Availability Status */}
                          <View className="flex-row items-center justify-between mb-4">
                            <View className="flex-row items-center gap-2">
                              <View className="w-2 h-2 bg-success rounded-full" />
                              <Text className="text-xs font-medium text-green-600 dark:text-green-400">
                                {provider.emergency_available ? 'Available Now' : 'Busy - Call for Emergency'}
                              </Text>
                            </View>
                            <Text className="text-xs text-muted-foreground">
                              {provider.is_verified ? 'Verified Provider' : 'Pending Verification'}
                            </Text>
                          </View>

                          {/* Action Button */}
                          <Button
                            onPress={() => handleCreateSOSBooking(provider.id)}
                            disabled={createSOSBookingMutation.isPending || isProcessingPayment}
                            className="bg-destructive hover:bg-destructive/90 w-full"
                            size="lg"
                          >
                            <View className="flex-row items-center justify-center gap-2">
                              <Icon as={Shield} size={18} className="text-destructive-foreground" />
                              <Text className="text-destructive-foreground font-bold text-base">
                                {isProcessingPayment 
                                  ? 'Processing Payment...'
                                  : createSOSBookingMutation.isPending 
                                  ? 'Creating Emergency Booking...' 
                                  : 'Book Emergency Service - £50'
                                }
                              </Text>
                            </View>
                          </Button>
                      </View>
                    ))}
                  </View>
                ) : (
                  <View className="border border-yellow-500/30 bg-yellow-50/30 dark:bg-yellow-950/20 rounded-2xl p-6">
                    <View className="items-center">
                      <View className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900/30 rounded-2xl items-center justify-center mb-4">
                        <Icon as={AlertTriangle} size={28} className="text-yellow-600 dark:text-yellow-400" />
                      </View>
                      <Text className="font-bold text-foreground mb-2 text-lg text-center">No providers available right now</Text>
                      <Text className="text-muted-foreground mb-4 text-center">
                        We're actively searching for emergency providers in your area. This usually takes just a few minutes.
                      </Text>
                      <Button variant="outline" onPress={() => refetchProviders()}>
                        <Text className="text-foreground font-medium">Refresh Search</Text>
                      </Button>
                      <Text className="text-xs text-muted-foreground mt-3 text-center">
                        💡 Tip: Try expanding your service area or check back in a few minutes
                      </Text>
                    </View>
                  </View>
                )}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
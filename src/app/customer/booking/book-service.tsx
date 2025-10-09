import React, { useState } from 'react';
import { View, TouchableOpacity, Alert, Modal, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { ScreenWrapper } from '@/components/ui/screen-wrapper';
import { Calendar } from '@/components/ui/calendar';
import { Ionicons } from '@expo/vector-icons';

import { supabase } from '@/lib/core/supabase';

// React Query hooks
import { useServiceDetails } from '@/hooks/customer/useServiceDetails';
import { useProviderAvailability, useProviderSchedule, useProviderBlackouts } from '@/hooks/customer/useProviderAvailability';

export default function BookServiceScreen() {
  const { serviceId, providerId, providerName, serviceTitle, servicePrice } = useLocalSearchParams();

  console.log('[book-service] Provider ID from params:', providerId);
  console.log('[book-service] Provider name from params:', providerName);
  const router = useRouter();

  // Helper function to format time
  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  // Form state
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0]; // YYYY-MM-DD format
  });
  const [selectedTime, setSelectedTime] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');
  const [address, setAddress] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [tempSelectedTime, setTempSelectedTime] = useState('');


  // Get service details
  const { data: service, isLoading } = useServiceDetails(serviceId as string);

  // Get provider schedule and availability
  const { data: providerSchedule } = useProviderSchedule(providerId as string);

  console.log('[book-service] Provider schedule hook result:', providerSchedule);
  console.log('[book-service] Provider schedule data:', providerSchedule?.schedule_data);
  
  // Get provider blackout dates
  const { data: blackoutDates = [] } = useProviderBlackouts(providerId as string);

  // Get provider availability for selected date
  const { data: availability, isLoading: availabilityLoading } = useProviderAvailability(
    providerId as string,
    selectedDate
  );

  // Generate available time slots
  const availableTimeSlots = React.useMemo(() => {
    if (!providerSchedule?.schedule_data || !selectedDate) return [];
    
    const dayOfWeek = new Date(selectedDate).toLocaleString('en-US', { weekday: 'long' }).toLowerCase();
    const daySchedule = providerSchedule.schedule_data[dayOfWeek as keyof typeof providerSchedule.schedule_data];
    
    if (!daySchedule?.enabled || !daySchedule.start || !daySchedule.end) return [];
    
    const slots = [];
    const startHour = parseInt(daySchedule.start.split(':')[0]);
    const startMinute = parseInt(daySchedule.start.split(':')[1]);
    const endHour = parseInt(daySchedule.end.split(':')[0]);
    const endMinute = parseInt(daySchedule.end.split(':')[1]);
    
    const startTimeMinutes = startHour * 60 + startMinute;
    const endTimeMinutes = endHour * 60 + endMinute;
    
    // Generate slots every 30 minutes
    for (let minutes = startTimeMinutes; minutes <= endTimeMinutes - 60; minutes += 30) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      const timeSlot = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
      
      // Check if this slot allows service to complete within working hours
      const serviceDuration = service?.duration || 60;
      const slotEndTime = minutes + serviceDuration;
      
      if (slotEndTime <= endTimeMinutes) {
        slots.push({
          time: timeSlot,
          displayTime: formatTime(timeSlot),
          available: true // We'll implement proper availability checking later
        });
      }
    }
    
    return slots;
  }, [providerSchedule, selectedDate, availability, service?.duration]);

  // Calculate disabled dates based on provider schedule AND blackout dates
  const disabledDates = React.useMemo(() => {
    const disabled: string[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    console.log('[disabledDates] Provider schedule exists:', !!providerSchedule);
    console.log('[disabledDates] Provider schedule data:', providerSchedule?.schedule_data);
    console.log('[disabledDates] Blackout dates:', blackoutDates);

    // If no schedule data, disable all dates
    if (!providerSchedule?.schedule_data) {
      console.log('[disabledDates] No schedule data found, disabling all dates');
      // Return all dates in the next 90 days as disabled
      for (let i = 0; i < 90; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        const dateString = date.toISOString().split('T')[0];
        disabled.push(dateString);
      }
      console.log('[disabledDates] Final disabled dates (no schedule):', disabled);
      return disabled;
    }

    // Check next 90 days for schedule-based disabled dates
    for (let i = 0; i < 90; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      // Use local date formatting to match Calendar component
      const year = date.getFullYear();
      const month = date.getMonth();
      const day = date.getDate();
      const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

      const dayOfWeek = date.toLocaleString('en-US', { weekday: 'long' }).toLowerCase();

      // Check if provider has schedule for this day
      const daySchedule = providerSchedule?.schedule_data?.[dayOfWeek];
      const hasSchedule = daySchedule?.enabled === true;

      if (!hasSchedule) {
        disabled.push(dateString);
      }
    }

    // Add blackout dates to disabled dates
    if (blackoutDates.length > 0) {
      disabled.push(...blackoutDates);
    }

    console.log('[disabledDates] Final disabled dates:', disabled);
    return disabled;
  }, [providerSchedule, blackoutDates]);

  // Helper function to get default time within working hours
  const getDefaultTime = React.useMemo(() => {
    if (!providerSchedule?.schedule_data) return '';

    const dayOfWeek = new Date(selectedDate).toLocaleString('en-US', { weekday: 'long' }).toLowerCase();
    const daySchedule = providerSchedule.schedule_data[dayOfWeek as keyof typeof providerSchedule.schedule_data];

    if (daySchedule?.enabled && daySchedule.start) {
      return daySchedule.start; // Return the start time as default
    }

    return '';
  }, [providerSchedule, selectedDate]);

  // Update selectedTime when date changes to ensure it's within working hours
  React.useEffect(() => {
    if (selectedTime && providerSchedule?.schedule_data) {
      const dayOfWeek = new Date(selectedDate).toLocaleString('en-US', { weekday: 'long' }).toLowerCase();
      const daySchedule = providerSchedule.schedule_data[dayOfWeek as keyof typeof providerSchedule.schedule_data];

      if (daySchedule?.enabled && daySchedule.start && daySchedule.end) {
        const selectedTimeMinutes = parseInt(selectedTime.split(':')[0]) * 60 + parseInt(selectedTime.split(':')[1]);
        const startTimeMinutes = parseInt(daySchedule.start.split(':')[0]) * 60 + parseInt(daySchedule.start.split(':')[1]);
        const endTimeMinutes = parseInt(daySchedule.end.split(':')[0]) * 60 + parseInt(daySchedule.end.split(':')[1]);

        // If current selected time is outside new day's working hours, reset to start time
        if (selectedTimeMinutes < startTimeMinutes || selectedTimeMinutes > endTimeMinutes) {
          setSelectedTime(daySchedule.start);
        }
      } else {
        // If day is not enabled, clear selected time
        setSelectedTime('');
      }
    }
  }, [selectedDate, providerSchedule]);

  const handleDateSelect = (dateString: string) => {
    setSelectedDate(dateString);
    setSelectedTime(''); // Reset time when date changes
    setShowDatePicker(false);
  };

  const handleTimeSelect = (time: string) => {
    setTempSelectedTime(time);
  };

  const handleTimeConfirm = () => {
    setSelectedTime(tempSelectedTime);
    setShowTimePicker(false);
    setTempSelectedTime('');
  };

  const handleTimeCancel = () => {
    setTempSelectedTime('');
    setShowTimePicker(false);
  };



  const handleProceedToPayment = async () => {
    // Basic validation
    if (!selectedTime) {
      Alert.alert('Error', 'Please select a time for your booking');
      return;
    }

    if (!address && service?.isHomeService) {
      Alert.alert('Error', 'Please enter your address for home service');
      return;
    }

    // Additional validation: Check if the selected time slot is actually available
    if (providerSchedule?.schedule_data && service?.duration) {
      try {
        // Check time slot availability by calling the edge function
        const { data: availabilityData, error } = await supabase.functions.invoke('get-provider-availability', {
          body: { providerId, date: selectedDate }
        });

        if (error) {
          console.error('Error checking availability:', error);
          Alert.alert('Error', 'Unable to verify availability. Please try again.');
          return;
        }

        // Check if selected time is in available slots
        const isSlotAvailable = availabilityData?.availableSlots?.some(
          (slot: any) => slot.time === selectedTime && slot.available
        );

        if (!isSlotAvailable) {
          Alert.alert(
            'Time Slot Unavailable',
            'The selected time slot is no longer available. Please choose a different time.',
            [{ text: 'OK' }]
          );
          return;
        }
      } catch (error) {
        console.error('Error validating time slot:', error);
        Alert.alert('Error', 'Unable to verify time slot availability. Please try again.');
        return;
      }
    }

    // Navigate to payment screen with booking details
    router.push({
      pathname: '/customer/booking/payment',
      params: {
        serviceId,
        providerId,
        providerName: service?.provider?.name || providerName || 'Provider',
        serviceTitle,
        servicePrice,
        selectedDate,
        selectedTime,
        specialRequests,
        address
      }
    });
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 items-center justify-center">
          <Text className="text-muted-foreground">Loading service details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <ScreenWrapper
      scrollable={true}
      keyboardShouldPersistTaps="handled"
      contentContainerClassName="px-4 py-4"
      className="flex-1 bg-background"
    >
      {/* Header */}
      <View className="flex-row items-center mb-6">
        <Button
          variant="ghost"
          size="sm"
          onPress={() => router.back()}
          className="mr-3 w-10 h-10 rounded-full"
        >
          <Ionicons name="arrow-back" size={20} className="text-muted-foreground" />
        </Button>
        <Text className="text-xl font-bold text-foreground flex-1">
          Book Service
        </Text>
      </View>

      {/* Service Summary */}
      <Card className="mb-6 border-l-4 border-l-primary">
        <CardHeader className="pb-4">
          <View className="flex-row items-center gap-3 mb-3">
            <View className="w-12 h-12 rounded-full bg-primary/10 items-center justify-center">
              <Ionicons name="calendar" size={24} className="text-primary" />
            </View>
            <View className="flex-1">
              <CardTitle className="text-xl text-foreground">Book Your Service</CardTitle>
              <Text className="text-sm text-muted-foreground">Complete your booking details below</Text>
            </View>
          </View>
          
          <View className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-xl p-4">
            <View className="flex-row justify-between items-start mb-3">
              <View className="flex-1 mr-4">
                <Text className="text-lg font-bold text-foreground mb-1">
                  {serviceTitle}
                </Text>
                <View className="flex-row items-center gap-2 mb-2">
                  <Ionicons name="person-circle-outline" size={18} className="text-muted-foreground" />
                  <Text className="text-muted-foreground font-medium">
                    {providerName}
                  </Text>
                  {service?.rating && service.rating > 0 && (
                    <View className="flex-row items-center ml-2">
                      <Ionicons name="star" size={14} className="text-yellow-600 dark:text-yellow-400" />
                      <Text className="text-sm font-semibold text-yellow-600 dark:text-yellow-400 ml-1">
                        {service.rating.toFixed(1)}
                      </Text>
                    </View>
                  )}
                </View>
                {service?.description && (
                  <Text className="text-sm text-muted-foreground leading-5 opacity-90">
                    {service.description.length > 100
                      ? `${service.description.substring(0, 100)}...`
                      : service.description
                    }
                  </Text>
                )}
              </View>
              <View className="items-end">
                <Text className="text-3xl font-bold text-primary">
                  £{servicePrice}
                </Text>
                <Text className="text-xs text-muted-foreground font-medium">
                  fixed price
                </Text>
              </View>
            </View>

            {/* Service Features */}
            <View className="flex-row flex-wrap gap-2">
              {service?.duration && (
                <View className="flex-row items-center gap-2 bg-background/50 border border-border/30 rounded-lg px-3 py-2">
                  <View className="w-6 h-6 rounded-full bg-primary/10 items-center justify-center">
                    <Ionicons name="time-outline" size={14} className="text-primary" />
                  </View>
                  <Text className="text-xs font-semibold text-foreground">
                    {service.duration} min
                  </Text>
                </View>
              )}
              
              {service?.isHomeService && (
                <View className="flex-row items-center gap-2 bg-background/50 border border-border/30 rounded-lg px-3 py-2">
                  <View className="w-6 h-6 rounded-full bg-emerald-500/10 items-center justify-center">
                    <Ionicons name="home-outline" size={14} className="text-emerald-600 dark:text-emerald-400" />
                  </View>
                  <Text className="text-xs font-semibold text-foreground">
                    Home Service
                  </Text>
                </View>
              )}
              
              {service?.category && (
                <View className="flex-row items-center gap-2 bg-background/50 border border-border/30 rounded-lg px-3 py-2">
                  <View className="w-6 h-6 rounded-full bg-violet-500/10 items-center justify-center">
                    <Ionicons name="pricetag-outline" size={14} className="text-violet-600 dark:text-violet-400" />
                  </View>
                  <Text className="text-xs font-semibold text-foreground">
                    {service.category}
                  </Text>
                </View>
              )}
              
              {service?.provider?.yearsOfExperience && (
                <View className="flex-row items-center gap-2 bg-background/50 border border-border/30 rounded-lg px-3 py-2">
                  <View className="w-6 h-6 rounded-full bg-amber-500/10 items-center justify-center">
                    <Ionicons name="medal-outline" size={14} className="text-amber-600 dark:text-amber-400" />
                  </View>
                  <Text className="text-xs font-semibold text-foreground">
                    {service.provider.yearsOfExperience} yrs exp
                  </Text>
                </View>
              )}
            </View>
          </View>
        </CardHeader>
      </Card>

      {/* Date Selection */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Select Date & Time</CardTitle>
        </CardHeader>
        <CardContent className="gap-4">
          <View>
            <Text className="text-sm font-medium mb-2">Date</Text>
            <TouchableOpacity
              onPress={() => setShowDatePicker(true)}
              className="flex-row items-center justify-between p-4 border border-border rounded-lg bg-card"
            >
              <Text className="text-foreground text-base">
                {new Date(selectedDate).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </Text>
              <Ionicons name="calendar-outline" size={20} className="text-muted-foreground" />
            </TouchableOpacity>
          </View>

          <View>
            <Text className="text-sm font-medium mb-2">Time</Text>
            <TouchableOpacity
              onPress={() => {
                if (availableTimeSlots.length > 0) {
                  setTempSelectedTime(selectedTime); // Pre-select current time if any
                  setShowTimePicker(true);
                }
              }}
              disabled={availableTimeSlots.length === 0}
              className={`flex-row items-center justify-between p-4 border border-border rounded-lg ${
                availableTimeSlots.length > 0 ? 'bg-card' : 'bg-muted opacity-50'
              }`}
            >
              <View className="flex-1">
                {selectedTime ? (
                  <Text className="text-foreground text-base font-medium">
                    {formatTime(selectedTime)}
                  </Text>
                ) : (
                  <Text className="text-muted-foreground text-base">
                    Select available time
                  </Text>
                )}
                {availableTimeSlots.length > 0 && (
                  <Text className="text-xs text-muted-foreground mt-1">
                    {availableTimeSlots.length} slots available
                  </Text>
                )}
              </View>
              <Ionicons name="time-outline" size={20} className="text-muted-foreground" />
            </TouchableOpacity>
            
            {availableTimeSlots.length === 0 && (
              <View className="mt-3 p-4 bg-muted/50 rounded-lg border border-dashed border-muted-foreground/30">
                <Text className="text-center text-muted-foreground mb-1">
                  No available time slots
                </Text>
                <Text className="text-center text-xs text-muted-foreground">
                  {providerSchedule?.schedule_data ? 
                    'Provider is not available on this date' : 
                    'Loading availability...'}
                </Text>
              </View>
            )}
            
            {/* Working hours display */}
            {(() => {
              if (providerSchedule?.schedule_data) {
                const dayOfWeek = new Date(selectedDate).toLocaleString('en-US', { weekday: 'long' }).toLowerCase();
                const daySchedule = providerSchedule.schedule_data[dayOfWeek as keyof typeof providerSchedule.schedule_data];
                
                if (daySchedule?.enabled && daySchedule.start && daySchedule.end) {
                  return (
                    <View className="mt-3 p-3 bg-primary/5 rounded-lg border border-primary/10">
                      <View className="flex-row items-center justify-center gap-2">
                        <Ionicons name="time-outline" size={16} className="text-primary" />
                        <Text className="text-sm font-medium text-primary">
                          Working hours: {formatTime(daySchedule.start)} - {formatTime(daySchedule.end)}
                        </Text>
                      </View>
                    </View>
                  );
                }
              }
              return null;
            })()}
          </View>
        </CardContent>
      </Card>

      {/* Address (if home service) */}
      {service?.isHomeService && (
        <Card className="mb-6">
          <CardHeader>
            <View className="flex-row items-center gap-3">
              <View className="w-10 h-10 rounded-full bg-emerald-500/10 items-center justify-center">
                <Ionicons name="location" size={20} className="text-emerald-600 dark:text-emerald-400" />
              </View>
              <View>
                <CardTitle>Service Address</CardTitle>
                <Text className="text-sm text-muted-foreground">Where should we provide the service?</Text>
              </View>
            </View>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Enter your complete address including street, city, and postal code..."
              value={address}
              onChangeText={setAddress}
              className="min-h-[100px] text-base border-2 focus:border-primary"
            />
            <View className="flex-row items-center gap-2 mt-3 p-3 bg-primary/5 rounded-lg border border-primary/10">
              <Ionicons name="information-circle" size={16} className="text-primary" />
              <Text className="text-xs text-primary/80 flex-1">
                Please provide a detailed address to ensure our provider can find you easily
              </Text>
            </View>
          </CardContent>
        </Card>
      )}

      {/* Special Requests */}
      <Card className="mb-6">
        <CardHeader>
          <View className="flex-row items-center gap-3">
            <View className="w-10 h-10 rounded-full bg-violet-500/10 items-center justify-center">
              <Ionicons name="chatbubble-outline" size={20} className="text-violet-600 dark:text-violet-400" />
            </View>
            <View>
              <CardTitle>Special Requests</CardTitle>
              <Text className="text-sm text-muted-foreground">Optional notes for your provider</Text>
            </View>
          </View>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Any special requirements, preferences, or additional information you'd like to share..."
            value={specialRequests}
            onChangeText={setSpecialRequests}
            className="min-h-[100px] text-base border-2 focus:border-primary"
          />
          <View className="flex-row items-center gap-2 mt-3">
            <Ionicons name="bulb-outline" size={16} className="text-muted-foreground" />
            <Text className="text-xs text-muted-foreground flex-1">
              Examples: "I prefer morning appointments", "Please bring extra equipment", etc.
            </Text>
          </View>
        </CardContent>
      </Card>

      {/* Booking Summary */}
      <Card className="mb-8 bg-gradient-to-br from-card to-card/70 border-2 border-primary/20">
        <CardHeader>
          <View className="flex-row items-center gap-3">
            <View className="w-10 h-10 rounded-full bg-primary/10 items-center justify-center">
              <Ionicons name="receipt-outline" size={20} className="text-primary" />
            </View>
            <View>
              <CardTitle className="text-xl">Booking Summary</CardTitle>
              <Text className="text-sm text-muted-foreground">Review your booking details</Text>
            </View>
          </View>
        </CardHeader>
        <CardContent className="gap-4">
          {/* Service Details */}
          <View className="bg-primary/5 rounded-lg p-4 border border-primary/10">
            <View className="flex-row justify-between items-start mb-3">
              <View className="flex-1 mr-3">
                <Text className="font-bold text-lg text-foreground">{serviceTitle}</Text>
                <Text className="text-muted-foreground text-sm">with {providerName}</Text>
              </View>
              <Text className="text-2xl font-bold text-primary">£{servicePrice}</Text>
            </View>
            
            <View className="gap-2">
              <View className="flex-row items-center gap-3">
                <View className="w-6 h-6 rounded-full bg-primary/10 items-center justify-center">
                  <Ionicons name="calendar-outline" size={14} className="text-primary" />
                </View>
                <Text className="text-foreground font-medium">
                  {new Date(selectedDate).toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </Text>
              </View>
              
              <View className="flex-row items-center gap-3">
                <View className="w-6 h-6 rounded-full bg-emerald-500/10 items-center justify-center">
                  <Ionicons name="time-outline" size={14} className="text-emerald-600 dark:text-emerald-400" />
                </View>
                <Text className={`font-medium ${selectedTime ? 'text-foreground' : 'text-destructive'}`}>
                  {selectedTime ? formatTime(selectedTime) : 'Please select a time'}
                </Text>
              </View>
              
              {service?.isHomeService && address && (
                <View className="flex-row items-center gap-3">
                  <View className="w-6 h-6 rounded-full bg-violet-500/10 items-center justify-center">
                    <Ionicons name="location-outline" size={14} className="text-violet-600 dark:text-violet-400" />
                  </View>
                  <Text className="text-foreground font-medium flex-1" numberOfLines={2}>
                    {address}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Payment Breakdown */}
          <View className="border border-border rounded-lg p-4">
            <Text className="font-semibold text-foreground mb-3">Payment Details</Text>
            <View className="gap-2">
              <View className="flex-row justify-between">
                <Text className="text-muted-foreground">Service fee</Text>
                <Text className="font-medium">£{servicePrice}</Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-muted-foreground">Platform fee (10%)</Text>
                <Text className="font-medium">£{(parseFloat(servicePrice as string) * 0.1).toFixed(2)}</Text>
              </View>
              <View className="flex-row justify-between border-t border-border pt-2 mt-1">
                <Text className="font-medium text-foreground">Total</Text>
                <Text className="font-medium text-foreground">£{(parseFloat(servicePrice as string) * 1.1).toFixed(2)}</Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-muted-foreground">Booking deposit (20% of service)</Text>
                <Text className="font-medium">£{(parseFloat(servicePrice as string) * 0.2).toFixed(2)}</Text>
              </View>
              <View className="flex-row justify-between text-sm">
                <Text className="text-muted-foreground">Remaining (pay after service)</Text>
                <Text className="font-medium text-muted-foreground">£{(parseFloat(servicePrice as string) * 0.9).toFixed(2)}</Text>
              </View>
            </View>

            <View className="border-t border-border pt-3 mt-3 bg-primary/5 rounded-lg p-3 -mx-1">
              <View className="flex-row justify-between items-center">
                <Text className="font-bold text-lg text-foreground">Pay Today</Text>
                <Text className="font-bold text-primary text-xl">£{(parseFloat(servicePrice as string) * 0.2).toFixed(2)}</Text>
              </View>
              <Text className="text-xs text-muted-foreground mt-1">
                This amount will appear on your bank statement immediately. Full amount temporarily held on card.
              </Text>
            </View>
          </View>
        </CardContent>
      </Card>

      {/* Proceed to Payment Button */}
      <View className="mb-6">
        <Button
          onPress={handleProceedToPayment}
          className={`w-full h-16 ${selectedTime ? 'bg-primary hover:bg-primary/90' : 'bg-muted opacity-50'}`}
          size="lg"
          disabled={!selectedTime}
        >
          <View className="flex-row items-center justify-center gap-3">
            <View className="w-8 h-8 rounded-full bg-primary-foreground/10 items-center justify-center">
              <Ionicons 
                name={selectedTime ? "card-outline" : "time-outline"} 
                size={18} 
                className="text-primary-foreground" 
              />
            </View>
            <View className="items-center">
              <Text className="text-primary-foreground font-bold text-lg">
                {selectedTime ? "Secure Your Booking" : "Select Time First"}
              </Text>
              {selectedTime && (
                <Text className="text-primary-foreground/80 text-sm">
                  Pay £{(parseFloat(servicePrice as string) * 0.2).toFixed(2)} to confirm
                </Text>
              )}
            </View>
            {selectedTime && (
              <Ionicons name="arrow-forward" size={20} className="text-primary-foreground" />
            )}
          </View>
        </Button>
        
        {/* Terms disclaimer */}
        <View className="flex-row items-start gap-2 mt-4 px-2">
          <Ionicons name="shield-checkmark-outline" size={16} className="text-muted-foreground mt-0.5" />
          <Text className="text-xs text-muted-foreground flex-1 leading-relaxed">
            By proceeding, you agree to our Terms of Service and Privacy Policy. 
            Your payment is secure and protected. You can cancel up to 24 hours before your appointment.
          </Text>
        </View>
      </View>



      {/* Time Picker Modal */}
      <Modal
        visible={showTimePicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleTimeCancel}
      >
        <SafeAreaView className="flex-1 bg-background">
          <View className="flex-1">
            {/* Header */}
            <View className="flex-row items-center justify-between p-4 border-b border-border">
              <View className="flex-1">
                <Text className="text-xl font-bold text-foreground">Select Time</Text>
                <Text className="text-sm text-muted-foreground">
                  Choose your preferred appointment time
                </Text>
              </View>
              <Button
                variant="ghost"
                size="sm"
                onPress={handleTimeCancel}
                className="w-10 h-10 rounded-full"
              >
                <Ionicons name="close" size={20} className="text-muted-foreground" />
              </Button>
            </View>

            {/* Working Hours Info */}
            {(() => {
              if (providerSchedule?.schedule_data) {
                const dayOfWeek = new Date(selectedDate).toLocaleString('en-US', { weekday: 'long' }).toLowerCase();
                const daySchedule = providerSchedule.schedule_data[dayOfWeek as keyof typeof providerSchedule.schedule_data];
                
                if (daySchedule?.enabled && daySchedule.start && daySchedule.end) {
                  return (
                    <View className="mx-4 mt-4 p-4 bg-primary/5 rounded-lg border border-primary/10">
                      <View className="flex-row items-center justify-center gap-2">
                        <Ionicons name="time-outline" size={16} className="text-primary" />
                        <Text className="text-sm font-medium text-primary">
                          Working hours: {formatTime(daySchedule.start)} - {formatTime(daySchedule.end)}
                        </Text>
                      </View>
                      <Text className="text-xs text-center text-muted-foreground mt-1">
                        {new Date(selectedDate).toLocaleDateString('en-US', {
                          weekday: 'long',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </Text>
                    </View>
                  );
                }
              }
              return null;
            })()}

            <ScrollView className="flex-1 px-4 py-4">
              {availableTimeSlots.length > 0 ? (
                <View className="gap-4 pb-6">
                  <Text className="font-medium text-foreground">Available Time Slots</Text>
                  <View className="flex-row flex-wrap gap-3">
                    {availableTimeSlots.map((slot) => (
                      <TouchableOpacity
                        key={slot.time}
                        onPress={() => handleTimeSelect(slot.time)}
                        disabled={!slot.available}
                        className={`px-6 py-4 rounded-xl border-2 min-w-[100px] items-center ${
                          tempSelectedTime === slot.time
                            ? 'bg-primary border-primary'
                            : slot.available
                            ? 'bg-card border-border'
                            : 'bg-muted border-muted opacity-50'
                        }`}
                      >
                        <Text className={`font-bold text-base ${
                          tempSelectedTime === slot.time
                            ? 'text-primary-foreground'
                            : slot.available
                            ? 'text-foreground'
                            : 'text-muted-foreground'
                        }`}>
                          {slot.displayTime}
                        </Text>
                        {slot.available && (
                          <Text className={`text-xs mt-1 ${
                            tempSelectedTime === slot.time
                              ? 'text-primary-foreground/80'
                              : 'text-muted-foreground'
                          }`}>
                            Available
                          </Text>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ) : (
                <View className="flex-1 items-center justify-center p-8">
                  <View className="w-20 h-20 rounded-full bg-muted/50 items-center justify-center mb-4">
                    <Ionicons name="time-outline" size={32} className="text-muted-foreground" />
                  </View>
                  <Text className="text-center text-muted-foreground font-medium mb-2">
                    No available time slots
                  </Text>
                  <Text className="text-center text-sm text-muted-foreground">
                    {providerSchedule?.schedule_data ? 
                      'The provider is not available on this date. Please select a different date.' : 
                      'Loading availability...'}
                  </Text>
                </View>
              )}
            </ScrollView>

            {/* Bottom Actions */}
            <View className="p-4 border-t border-border bg-background">
              <View className="flex-row gap-3">
                <Button
                  variant="outline"
                  onPress={handleTimeCancel}
                  className="flex-1"
                >
                  <Text>Cancel</Text>
                </Button>
                <Button
                  onPress={handleTimeConfirm}
                  disabled={!tempSelectedTime}
                  className={`flex-1 ${tempSelectedTime ? 'bg-primary' : 'bg-muted opacity-50'}`}
                >
                  <Text className={tempSelectedTime ? 'text-primary-foreground' : 'text-muted-foreground'}>
                    {tempSelectedTime ? `Confirm ${formatTime(tempSelectedTime)}` : 'Select Time'}
                  </Text>
                </Button>
              </View>
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Date Picker Modal */}
      <Modal
        visible={showDatePicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <SafeAreaView className="flex-1 bg-background">
          <Calendar
            key={JSON.stringify(disabledDates)} // Force re-mount when disabledDates changes
            selectedDate={selectedDate}
            onDateSelect={handleDateSelect}
            onClose={() => setShowDatePicker(false)}
            disabledDates={disabledDates}
          />
        </SafeAreaView>
      </Modal>
    </ScreenWrapper>
  );
}
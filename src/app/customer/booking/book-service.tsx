import React, { useState } from 'react';
import { View, TouchableOpacity, Alert, Modal, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScreenWrapper } from '@/components/ui/screen-wrapper';
import { Calendar } from '@/components/ui/calendar';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/lib/core/useColorScheme';
import DateTimePicker from '@react-native-community/datetimepicker';
import { supabase } from '@/lib/core/supabase';

// React Query hooks
import { useServiceDetails } from '@/hooks/customer/useServiceDetails';
import { useProviderAvailability, useProviderSchedule, useProviderBlackouts } from '@/hooks/customer/useProviderAvailability';

export default function BookServiceScreen() {
  const { serviceId, providerId, providerName, serviceTitle, servicePrice } = useLocalSearchParams();
  const router = useRouter();
  const { isDarkColorScheme } = useColorScheme();

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

  // Get service details
  const { data: service, isLoading } = useServiceDetails(serviceId as string);

  // Get provider schedule and availability
  const { data: providerSchedule } = useProviderSchedule(providerId as string);
  
  // Get provider blackout dates
  const { data: blackoutDates = [] } = useProviderBlackouts(providerId as string);

  // Get provider availability for selected date
  const { data: availability, isLoading: availabilityLoading } = useProviderAvailability(
    providerId as string,
    selectedDate
  );

  // Calculate disabled dates based on provider schedule AND blackout dates
  const disabledDates = React.useMemo(() => {
    const disabled: string[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check next 90 days for schedule-based disabled dates
    for (let i = 0; i < 90; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dateString = date.toISOString().split('T')[0];
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

    // Remove duplicates and return
    return [...new Set(disabled)];
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

  const handleTimeChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }
    if (selectedDate) {
      const timeString = selectedDate.toTimeString().slice(0, 5); // HH:MM format

      // Validate time is within provider's working hours, accounting for service duration
      if (providerSchedule?.schedule_data && service?.duration) {
        const dayOfWeek = new Date(selectedDate).toLocaleString('en-US', { weekday: 'long' }).toLowerCase();
        const daySchedule = providerSchedule.schedule_data[dayOfWeek as keyof typeof providerSchedule.schedule_data];

        if (daySchedule?.enabled && daySchedule.start && daySchedule.end) {
          const selectedTimeMinutes = parseInt(timeString.split(':')[0]) * 60 + parseInt(timeString.split(':')[1]);
          const startTimeMinutes = parseInt(daySchedule.start.split(':')[0]) * 60 + parseInt(daySchedule.start.split(':')[1]);
          const endTimeMinutes = parseInt(daySchedule.end.split(':')[0]) * 60 + parseInt(daySchedule.end.split(':')[1]);

          // Calculate end time of service (selected time + service duration)
          const serviceEndTimeMinutes = selectedTimeMinutes + service.duration;

          if (selectedTimeMinutes < startTimeMinutes || serviceEndTimeMinutes > endTimeMinutes) {
            Alert.alert(
              'Invalid Time',
              `Please select a time that allows the full ${service.duration}-minute service to complete within working hours (${daySchedule.start} - ${daySchedule.end})`,
              [{ text: 'OK' }]
            );
            return; // Don't update the selected time
          }

          // Additional validation: Check if selected time corresponds to an available slot
          // Generate available slots for this day (1-hour intervals)
          const availableSlots: string[] = [];
          let currentTime = daySchedule.start;
          while (currentTime < daySchedule.end) {
            availableSlots.push(currentTime);
            // Add 1 hour (60 minutes)
            const [hours, minutes] = currentTime.split(':').map(Number);
            const totalMinutes = hours * 60 + minutes + 60;
            const newHours = Math.floor(totalMinutes / 60);
            const newMinutes = totalMinutes % 60;
            currentTime = `${newHours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}`;
          }

          // Check if selected time matches an available slot
          if (!availableSlots.includes(timeString)) {
            Alert.alert(
              'Invalid Time Slot',
              'Please select a time that corresponds to an available booking slot (1-hour intervals)',
              [{ text: 'OK' }]
            );
            return; // Don't update the selected time
          }

          setSelectedTime(timeString);
        } else {
          Alert.alert(
            'Unavailable Day',
            'This provider is not available on the selected day',
            [{ text: 'OK' }]
          );
        }
      } else {
        setSelectedTime(timeString);
      }
    }
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
          <Ionicons name="arrow-back" size={20} color={isDarkColorScheme ? '#6b7280' : '#374151'} />
        </Button>
        <Text className="text-xl font-bold text-foreground flex-1">
          Book Service
        </Text>
      </View>

      {/* Service Summary */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <View className="flex-row items-start justify-between">
            <View className="flex-1 mr-4">
              <CardTitle className="text-lg mb-1">{serviceTitle}</CardTitle>
              {service?.description && (
                <Text className="text-sm text-muted-foreground leading-5">
                  {service.description.length > 120
                    ? `${service.description.substring(0, 120)}...`
                    : service.description
                  }
                </Text>
              )}
            </View>
            <Text className="text-2xl font-bold text-primary">£{servicePrice}</Text>
          </View>
        </CardHeader>
        <CardContent className="pt-0">
          <View className="gap-3">
            {/* Provider Info */}
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center flex-1">
                <Ionicons name="person-circle-outline" size={20} color={isDarkColorScheme ? '#6b7280' : '#374151'} />
                <Text className="text-muted-foreground ml-2 flex-1">
                  Provider: {providerName}
                </Text>
              </View>
              {service?.provider?.rating && (
                <View className="flex-row items-center">
                  <Ionicons name="star" size={16} color="#fbbf24" />
                  <Text className="text-sm font-medium ml-1">
                    {service.provider.rating.toFixed(1)}
                  </Text>
                </View>
              )}
            </View>

            {/* Service Details */}
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center flex-1">
                {service?.category && (
                  <View className="bg-primary/10 px-2 py-1 rounded-md mr-3">
                    <Text className="text-xs font-medium text-primary">
                      {service.category}
                    </Text>
                  </View>
                )}
                {service?.duration && (
                  <View className="flex-row items-center">
                    <Ionicons name="time-outline" size={16} color={isDarkColorScheme ? '#6b7280' : '#374151'} />
                    <Text className="text-sm text-muted-foreground ml-1">
                      {service.duration} min
                    </Text>
                  </View>
                )}
              </View>
              {service?.provider?.yearsOfExperience && (
                <Text className="text-sm text-muted-foreground">
                  {service.provider.yearsOfExperience} yrs exp
                </Text>
              )}
            </View>

            {/* Service Type Indicators */}
            {(service?.isHomeService || service?.isRemoteService) && (
              <View className="flex-row gap-2">
                {service.isHomeService && (
                  <View className="flex-row items-center bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-md">
                    <Ionicons name="home-outline" size={14} color="#22c55e" />
                    <Text className="text-xs font-medium text-green-700 dark:text-green-400 ml-1">
                      Home Service
                    </Text>
                  </View>
                )}
                {service.isRemoteService && (
                  <View className="flex-row items-center bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-md">
                    <Ionicons name="videocam-outline" size={14} color="#3b82f6" />
                    <Text className="text-xs font-medium text-blue-700 dark:text-blue-400 ml-1">
                      Remote Service
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
        </CardContent>
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
              <Ionicons name="calendar-outline" size={20} color={isDarkColorScheme ? '#6b7280' : '#374151'} />
            </TouchableOpacity>
          </View>

          <View>
            <Text className="text-sm font-medium mb-2">Time</Text>
            <TouchableOpacity
              onPress={() => setShowTimePicker(true)}
              className="flex-row items-center justify-between p-4 border border-border rounded-lg bg-card"
            >
              <Text className="text-foreground text-base">
                {selectedTime ? formatTime(selectedTime) : 'Select time'}
              </Text>
              <Ionicons name="time-outline" size={20} color={isDarkColorScheme ? '#6b7280' : '#374151'} />
            </TouchableOpacity>
          </View>
        </CardContent>
      </Card>

      {/* Address (if home service) */}
      {service?.isHomeService && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Service Address</CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              placeholder="Enter your full address"
              value={address}
              onChangeText={setAddress}
              multiline
              numberOfLines={3}
              className="min-h-[80px] text-base"
            />
          </CardContent>
        </Card>
      )}

      {/* Special Requests */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Special Requests (Optional)</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Any special requests or notes for the provider..."
            value={specialRequests}
            onChangeText={setSpecialRequests}
            className="min-h-[100px] text-base"
          />
        </CardContent>
      </Card>

      {/* Booking Summary */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Booking Summary</CardTitle>
        </CardHeader>
        <CardContent className="gap-3">
          <View className="flex-row justify-between">
            <Text className="text-muted-foreground">Service</Text>
            <Text className="font-medium">{serviceTitle}</Text>
          </View>
          <View className="flex-row justify-between">
            <Text className="text-muted-foreground">Date</Text>
            <Text className="font-medium">
              {new Date(selectedDate).toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric'
              })}
            </Text>
          </View>
          <View className="flex-row justify-between">
            <Text className="text-muted-foreground">Time</Text>
            <Text className="font-medium">
              {selectedTime ? formatTime(selectedTime) : 'Not selected'}
            </Text>
          </View>
          <View className="flex-row justify-between">
            <Text className="text-muted-foreground">Subtotal</Text>
            <Text className="font-medium">£{servicePrice}</Text>
          </View>
          <View className="flex-row justify-between">
            <Text className="text-muted-foreground">Deposit (20%)</Text>
            <Text className="font-medium">£{(parseFloat(servicePrice as string) * 0.2).toFixed(2)}</Text>
          </View>
          <View className="border-t border-border pt-3 mt-3">
            <View className="flex-row justify-between">
              <Text className="font-bold text-lg">Total Due Today</Text>
              <Text className="font-bold text-primary text-lg">£{(parseFloat(servicePrice as string) * 0.2).toFixed(2)}</Text>
            </View>
          </View>
        </CardContent>
      </Card>

      {/* Proceed to Payment Button */}
      <View className="mb-6">
        <Button
          onPress={handleProceedToPayment}
          className="w-full h-14"
          size="lg"
        >
          <Text className="text-primary-foreground font-bold text-lg">
            Proceed to Payment
          </Text>
        </Button>
      </View>

      {/* Time Picker Modal */}
      <Modal
        visible={showTimePicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowTimePicker(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-card rounded-t-3xl p-6">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-lg font-semibold text-foreground">Select Time</Text>
              <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                <Ionicons name="close" size={24} color={isDarkColorScheme ? '#6b7280' : '#374151'} />
              </TouchableOpacity>
            </View>

            {/* Working Hours Info */}
            {(() => {
              if (providerSchedule?.schedule_data) {
                const dayOfWeek = new Date(selectedDate).toLocaleString('en-US', { weekday: 'long' }).toLowerCase();
                const daySchedule = providerSchedule.schedule_data[dayOfWeek as keyof typeof providerSchedule.schedule_data];

                if (daySchedule?.enabled && daySchedule.start && daySchedule.end) {
                  return (
                    <View className="mb-4 p-3 bg-muted rounded-lg">
                      <Text className="text-sm text-muted-foreground text-center">
                        Working hours: {daySchedule.start} - {daySchedule.end}
                      </Text>
                    </View>
                  );
                }
              }
              return null;
            })()}

            <DateTimePicker
              value={selectedTime ? new Date(`1970-01-01T${selectedTime}`) : getDefaultTime ? new Date(`1970-01-01T${getDefaultTime}`) : new Date()}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleTimeChange}
              textColor={isDarkColorScheme ? '#ffffff' : '#000000'}
            />

            {Platform.OS === 'ios' && (
              <View className="flex-row justify-end gap-4 mt-6">
                <TouchableOpacity
                  onPress={() => setShowTimePicker(false)}
                  className="px-6 py-3"
                >
                  <Text className="text-muted-foreground font-medium">Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setShowTimePicker(false)}
                  className="px-6 py-3 bg-primary rounded-lg"
                >
                  <Text className="text-primary-foreground font-medium">Done</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
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
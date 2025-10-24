import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { View, ScrollView, Platform, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { FlashList } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { BottomSheetModal, BottomSheetModalProvider, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { cn } from '@/lib/utils';
import { useColorScheme } from '@/lib/core/useColorScheme';
import { THEME } from '@/lib/theme';
import { useCalendarStore } from '@/stores/ui/calendar';
import {
  useCalendarData,
  useCalendarTimeSlots,
  useCalendarWeekData
} from '@/hooks/provider/useCalendarData';
import { useAuthStore } from '@/stores/auth';
import { Skeleton } from '@/components/ui/skeleton';

// Icons - Using proper Ionicons for better consistency and contrast

// Calendar view types
type CalendarView = 'day' | 'week';

// Data types
interface WorkingHours {
  start: string;
  end: string;
  enabled: boolean;
}

interface WeeklySchedule {
  monday: WorkingHours;
  tuesday: WorkingHours;
  wednesday: WorkingHours;
  thursday: WorkingHours;
  friday: WorkingHours;
  saturday: WorkingHours;
  sunday: WorkingHours;
}

interface Booking {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  customerName: string;
  serviceTitle: string;
  status: string;
  amount: number;
}

// Generate time slots based on working hours
const generateTimeSlots = (startHour: number, endHour: number) => {
  const slots = [];
  for (let hour = startHour; hour < endHour; hour++) {
    slots.push({
      time: `${hour.toString().padStart(2, '0')}:00`,
      displayTime: hour > 12 ? `${hour - 12}:00 PM` : hour === 12 ? '12:00 PM' : `${hour}:00 AM`
    });
  }
  return slots;
};

// Helper function to get current date info
const getCurrentDateInfo = (selectedDate: Date) => {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  return {
    dayName: days[selectedDate.getDay()],
    monthName: months[selectedDate.getMonth()],
    date: selectedDate.getDate(),
    year: selectedDate.getFullYear(),
    fullDate: selectedDate.toISOString().split('T')[0]
  };
};

// Day View Component - Simplified
const DayView = ({
  timeSlots,
  bookings,
  selectedDate,
  onOpenSettings,
  colors
}: {
  timeSlots: { time: string; displayTime: string; }[];
  bookings: Booking[];
  selectedDate: Date;
  onOpenSettings: () => void;
  colors: any;
}) => {
  const todayString = selectedDate.toISOString().split('T')[0];

  const renderTimeSlot = ({ item: slot }: { item: { time: string; displayTime: string; } }) => {
    const booking = bookings.find((b) =>
      b.startTime === slot.time && b.date === todayString
    );

    return (
      <Card key={slot.time} className={cn(
        "mb-3 border-l-4 ",
        booking ? "border-l-primary bg-primary/5" : "border-l-muted bg-card"
      )}>
        <CardContent className="p-4">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center flex-1">
              <View className={cn(
                "w-3 h-3 rounded-full mr-3",
                booking ? "bg-primary" : "bg-muted-foreground/30"
              )} />
              <View className="flex-1">
                <Text className="font-semibold text-foreground text-base">{slot.displayTime}</Text>
                <Text className="text-sm text-muted-foreground">
                  {booking ? 'Booked' : 'Available'}
                </Text>
              </View>
            </View>

            {booking ? (
              <View className="flex-1 ml-4">
                <View className="flex-row items-center mb-1">
                  <Text className="font-medium text-foreground text-sm">{booking.customerName}</Text>
                  <Badge variant="secondary" className="ml-2 px-2 py-0.5">
                    <Text className="text-xs">{booking.status}</Text>
                  </Badge>
                </View>
                <Text className="text-sm text-muted-foreground mb-1">{booking.serviceTitle}</Text>
                <Text className="text-sm font-medium text-primary">${booking.amount}</Text>
              </View>
            ) : (
              <View className="flex-1 ml-4 items-end">
                <View className="bg-primary/10 px-3 py-1 rounded-full flex-row items-center">
                  <Ionicons name="checkmark-circle" size={12} color={colors.primary} />
                  <Text className="text-xs text-primary font-medium ml-1">Available</Text>
                </View>
              </View>
            )}
          </View>
        </CardContent>
      </Card>
    );
  };

  const renderEmptyState = () => (
    <View className="px-4 py-8">
      {timeSlots.length === 0 ? (
        <Card className="border-2 border-dashed border-muted/50 bg-gradient-to-br from-primary/5 to-secondary/5 mx-4">
          <CardContent className="p-8 items-center">
            <View className="w-20 h-20 rounded-full bg-primary/10 items-center justify-center mb-6 ">
              <Ionicons name="time-outline" size={32} color={colors.primary} />
            </View>
            <Text className="text-center font-bold text-foreground text-xl mb-3">
              Set Your Working Hours
            </Text>
            <Text className="text-center text-muted-foreground mb-6 leading-5 px-2">
              Configure your availability to start receiving booking requests from customers in your area.
            </Text>
            <TouchableOpacity
              onPress={onOpenSettings}
              className="bg-primary px-8 py-4 rounded-xl  active:bg-primary/90"
              accessibilityLabel="Set working hours"
              accessibilityRole="button"
            >
              <View className="flex-row items-center">
                <Ionicons name="settings-outline" size={18} color={colors.primaryForeground} />
                <Text className="text-primary-foreground font-semibold text-base ml-2">Configure Hours</Text>
              </View>
            </TouchableOpacity>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-2 border-dashed border-muted bg-gradient-to-br from-primary/5 to-accent/5 mx-4">
          <CardContent className="p-8 items-center">
            <View className="w-20 h-20 rounded-full bg-primary/10 items-center justify-center mb-6 ">
              <Ionicons name="checkmark-circle-outline" size={40} color={colors.primary} />
            </View>
            <Text className="text-center font-bold text-foreground text-xl mb-3">
              All Slots Available!
            </Text>
            <Text className="text-center text-muted-foreground mb-6 leading-5 px-2">
              Great! Your time slots are ready for customers to book. Check back later for new appointments.
            </Text>
            <View className="bg-primary/10 px-6 py-3 rounded-xl border border-primary/20">
              <Text className="text-sm text-primary font-semibold">
                {timeSlots.length} slots ready for booking
              </Text>
            </View>
          </CardContent>
        </Card>
      )}
    </View>
  );

  return {
    data: timeSlots,
    renderItem: renderTimeSlot,
    renderEmpty: renderEmptyState,
    header: (
      <View className="px-4">
        <Text className="text-lg font-semibold text-foreground mb-4">Today's Schedule</Text>
      </View>
    )
  };
};

// Week View Component - Simplified
const WeekView = ({
  selectedDate,
  bookings,
  weeklySchedule,
  colors
}: {
  selectedDate: Date;
  bookings: Booking[];
  weeklySchedule: WeeklySchedule | undefined;
  colors: any;
}) => {
  const getWeekDays = (date: Date) => {
    const week = [];
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - date.getDay());

    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      week.push(day);
    }
    return week;
  };

  const weekDays = getWeekDays(selectedDate);

  const weekData = weekDays.map((day, index) => {
    const dayBookings = bookings.filter((booking) => booking.date === day.toISOString().split('T')[0]);
    const dayName = day.toLocaleDateString('en', { weekday: 'long' }).toLowerCase() as keyof WeeklySchedule;
    const daySchedule = weeklySchedule?.[dayName];
    const isToday = day.toDateString() === new Date().toDateString();
    const isPastDay = day < new Date(new Date().setHours(0, 0, 0, 0));

    return {
      day,
      index,
      dayBookings,
      dayName,
      daySchedule,
      isToday,
      isPastDay
    };
  });

  const renderWeekDay = ({ item }: { item: typeof weekData[0] }) => {
    const { day, dayBookings, daySchedule, isToday, isPastDay } = item;

    return (
      <Card key={item.index} className={cn(
        "mb-3 ",
        isToday && "border-primary/50 bg-primary/5",
        isPastDay && "opacity-60"
      )}>
        <CardContent className="p-4">
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <View className="flex-row items-center mb-2">
                <Text className={cn(
                  "font-semibold text-base mr-2",
                  isToday ? "text-primary" : "text-foreground"
                )}>
                  {day.toLocaleDateString('en', { weekday: 'short' })} {day.getDate()}
                </Text>
                {isToday && (
                  <Badge variant="default" className="px-2 py-0.5">
                    <View className="flex-row items-center">
                      <Ionicons name="today-outline" size={12} color={colors.primaryForeground} />
                      <Text className="text-xs ml-1">Today</Text>
                    </View>
                  </Badge>
                )}
              </View>

              {daySchedule?.enabled ? (
                <View>
                  <View className="flex-row items-center mb-1">
                    <Text className="text-sm text-muted-foreground mr-2">
                      {daySchedule.start} - {daySchedule.end}
                    </Text>
                    <View className="w-2 h-2 rounded-full bg-primary" />
                  </View>
                  <View className="flex-row items-center justify-between">
                    <Text className="text-sm font-medium text-foreground">
                      {dayBookings.length} booking{dayBookings.length !== 1 ? 's' : ''}
                    </Text>
                    {!isPastDay && dayBookings.length === 0 && (
                      <View className="bg-primary/10 px-2 py-1 rounded-full flex-row items-center">
                        <Ionicons name="checkmark-circle-outline" size={12} color={colors.primary} />
                        <Text className="text-xs text-primary font-medium ml-1">Available</Text>
                      </View>
                    )}
                  </View>
                </View>
              ) : (
                <View className="flex-row items-center">
                  <Text className="text-sm text-muted-foreground mr-2">Closed</Text>
                  <View className="w-2 h-2 rounded-full bg-destructive" />
                </View>
              )}
            </View>

            {dayBookings.length > 0 && (
              <View className="ml-4">
                <View className="w-8 h-8 rounded-full bg-primary/10 items-center justify-center">
                  <Text className="text-sm font-bold text-primary">{dayBookings.length}</Text>
                </View>
              </View>
            )}
          </View>
        </CardContent>
      </Card>
    );
  };

  return {
    data: weekData,
    renderItem: renderWeekDay,
    header: (
      <View className="px-4">
        <Text className="text-lg font-semibold text-foreground mb-4">Week Overview</Text>
      </View>
    )
  };
};

// Helper functions
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
  return new Date(d.setDate(diff));
}

function getWeekEnd(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? 0 : 7); // Adjust for Sunday
  return new Date(d.setDate(diff));
}

function isValidWeeklySchedule(schedule: any): schedule is WeeklySchedule {
  if (!schedule || typeof schedule !== 'object') return false;

  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  return days.every(day => {
    const daySchedule = schedule[day];
    return daySchedule &&
           typeof daySchedule.start === 'string' &&
           typeof daySchedule.end === 'string' &&
           typeof daySchedule.enabled === 'boolean';
  });
}

export default function ProviderCalendar() {
  const { colorScheme } = useColorScheme();
  const colors = THEME[colorScheme];
  const user = useAuthStore((state) => state.user);

  // Bottom sheet ref
  const bottomSheetModalRef = useRef<BottomSheetModal>(null);

  // Zustand store for local state management
  const {
    currentView,
    selectedDate,
    showWeeklyDialog,
    editingDay,
    timePickerMode,
    showTimePicker,
    tempTime,
    setCurrentView,
    setSelectedDate,
    goToPreviousDay,
    goToNextDay,
    goToToday,
    setShowWeeklyDialog,
    setEditingDay,
    setTimePickerMode,
    setShowTimePicker,
    setTempTime,
  } = useCalendarStore();

  // Handle bottom sheet presentation
  useEffect(() => {
    if (showWeeklyDialog) {
      bottomSheetModalRef.current?.present();
    } else {
      bottomSheetModalRef.current?.dismiss();
    }
  }, [showWeeklyDialog]);

  // Optimized React Query hooks with better loading states and error handling
  const {
    weeklySchedule,
    bookings,
    stats, // Use server-calculated stats instead of local calculation
    isLoading,
    isRefetching, // Could show subtle loading indicator during background refetches
    hasError, // Could show error state in UI
    error, // Could display error messages
    updateScheduleMutation,
  } = useCalendarData();

  // Memoized time slots generation
  const timeSlots = useCalendarTimeSlots(selectedDate, weeklySchedule);

  // Memoized week data
  const weekData = useCalendarWeekData(selectedDate, bookings, weeklySchedule);

  // Date info calculations
  const dateInfo = getCurrentDateInfo(selectedDate);
  const isTodaySelected = selectedDate.toDateString() === new Date().toDateString();

  // Handle working hours update with optimistic updates
  const handleUpdateWorkingHours = useCallback(async (day: keyof WeeklySchedule, hours: WorkingHours) => {
    if (!weeklySchedule || !user?.id) return;

    const newSchedule = {
      ...weeklySchedule,
      [day]: hours
    };

    try {
      await updateScheduleMutation.mutateAsync({
        provider_id: user.id,
        schedule_data: newSchedule
      });
    } catch (error) {
      console.error('Error updating schedule:', error);
    }
  }, [weeklySchedule, user?.id, updateScheduleMutation]);

  // Time picker helper functions
  const timeStringToDate = useCallback((timeString: string) => {
    const [hours, minutes] = timeString.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  }, []);

  const dateToTimeString = useCallback((date: Date) => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }, []);

  const handleTimePickerPress = useCallback((day: keyof WeeklySchedule, mode: 'start' | 'end') => {
    if (!weeklySchedule) return;

    const daySchedule = weeklySchedule[day];
    const timeString = mode === 'start' ? daySchedule.start : daySchedule.end;
    const timeDate = timeStringToDate(timeString);

    setTempTime(timeDate);
    setEditingDay(day);
    setTimePickerMode(mode);
    setShowTimePicker(true);
  }, [weeklySchedule, timeStringToDate]);

  const handleTimePickerChange = useCallback((event: DateTimePickerEvent, selectedDate?: Date) => {
    if (event.type === 'set' && selectedDate && editingDay && weeklySchedule) {
      const timeString = dateToTimeString(selectedDate);
      const daySchedule = weeklySchedule[editingDay];

      handleUpdateWorkingHours(editingDay as keyof WeeklySchedule, {
        ...daySchedule,
        [timePickerMode]: timeString
      });
    }

    setShowTimePicker(false);
    setEditingDay(null);
  }, [editingDay, timePickerMode, weeklySchedule, dateToTimeString, handleUpdateWorkingHours]);

  // Use server-calculated stats instead of local calculation
  const bookingStats = stats;

  return (
    <BottomSheetModalProvider>
      <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      {/* Enhanced Header */}
      <LinearGradient
        colors={[THEME[colorScheme].gradientStart, THEME[colorScheme].gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 }}
      >
        <View className="flex-row items-center justify-between mb-4">
          <Button
            variant="ghost"
            size="sm"
            onPress={() => router.back()}
            className="w-8 h-8 p-0"
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <Ionicons name="chevron-back" size={24} color={colors.primaryForeground} />
          </Button>

          <View className="flex-1 mx-4">
            <View className="flex-row items-center justify-center mb-1">
              <Ionicons name="calendar" size={20} color={colors.primaryForeground} />
              <Text className="text-primary-foreground text-xl font-bold ml-2">
                My Schedule
              </Text>
            </View>
            <Text className="text-primary-foreground/80 text-sm text-center">
              Manage your availability
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => bottomSheetModalRef.current?.present()}
            className="w-10 h-10 rounded-full bg-primary-foreground/20 items-center justify-center active:bg-primary-foreground/30"
            accessibilityLabel="Manage working hours"
            accessibilityRole="button"
          >
            <Ionicons name="settings" size={20} color={colors.primaryForeground} />
          </TouchableOpacity>
        </View>

        {/* Enhanced Date Navigation */}
        <View className="bg-primary-foreground/15 backdrop-blur-sm rounded-xl p-4 mb-4 border border-primary-foreground/20">
          <View className="flex-row items-center justify-between">
            <TouchableOpacity
              onPress={goToPreviousDay}
              className="w-10 h-10 rounded-full bg-primary-foreground/20 items-center justify-center active:bg-primary-foreground/30"
              accessibilityLabel="Previous day"
              accessibilityRole="button"
            >
              <Ionicons name="chevron-back" size={20} color={colors.primaryForeground} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={goToToday}
              className="flex-1 mx-4 py-2"
              accessibilityLabel="Select date"
              accessibilityRole="button"
            >
              <Text className={cn(
                "text-center font-bold text-lg",
                isTodaySelected ? "text-accent-foreground" : "text-primary-foreground"
              )}>
                {dateInfo.dayName}, {dateInfo.monthName} {dateInfo.date}
              </Text>
              {isTodaySelected && (
                <View className="mt-1 px-3 py-1 bg-accent/20 rounded-full self-center border border-accent/30">
                  <View className="flex-row items-center">
                    <Ionicons name="today" size={12} color={colors.accentForeground} />
                    <Text className="text-xs text-accent-foreground font-semibold ml-1">Today</Text>
                  </View>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={goToNextDay}
              className="w-10 h-10 rounded-full bg-primary-foreground/20 items-center justify-center active:bg-primary-foreground/30"
              accessibilityLabel="Next day"
              accessibilityRole="button"
            >
              <Ionicons name="chevron-forward" size={20} color={colors.primaryForeground} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Enhanced View Toggle */}
        <Tabs
          value={currentView}
          onValueChange={(value) => setCurrentView(value as CalendarView)}
        >
          <TabsList className="bg-primary-foreground/20 h-11 backdrop-blur-sm border border-primary-foreground/20">
            <TabsTrigger value="day" className="flex-1 data-[state=active]:bg-background data-[state=active]:text-primary rounded-lg">
              <Text className="text-sm font-semibold">📅 Day</Text>
            </TabsTrigger>
            <TabsTrigger value="week" className="flex-1 data-[state=active]:bg-background data-[state=active]:text-primary rounded-lg">
              <Text className="text-sm font-semibold">📊 Week</Text>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </LinearGradient>

      {/* Enhanced Stats Overview */}
      <View className="px-6 -mt-3">
        <Card className="border-0  bg-card/80 backdrop-blur-sm">
          <CardContent className="px-6 py-2">
            <View className="flex-row justify-between items-center">
              <View className="items-center flex-1">
         
                <Text className="text-lg font-bold text-foreground mb-0.5 text-center">{bookingStats.today}</Text>
                <Text className="text-muted-foreground text-xs font-medium text-center">Today's Bookings</Text>
              </View>

              <View className="w-px h-6 bg-border/50 mx-3" />

              <View className="items-center flex-1">
         
                <Text className="text-lg font-bold text-foreground mb-0.5 text-center">{bookingStats.thisWeek}</Text>
                <Text className="text-muted-foreground text-xs font-medium text-center">This Week</Text>
              </View>

              <View className="w-px h-6 bg-border/50 mx-3" />

              <View className="items-center flex-1">
            
                <Text className="text-lg font-bold text-foreground mb-0.5 text-center">{timeSlots.length}</Text>
                <Text className="text-muted-foreground text-xs font-medium text-center">Available Slots</Text>
              </View>
            </View>
          </CardContent>
        </Card>
      </View>

      {/* Calendar Content */}
      {isLoading ? (
        <View className="px-4 py-8">
          {/* Stats Skeleton */}
          <Card className="mb-6">
            <CardContent className="px-4 py-2">
              <View className="flex-row justify-between items-center">
                <View className="items-center">
                  <Skeleton className="w-12 h-8 mb-1" />
                  <Skeleton className="w-8 h-3" />
                </View>
                <View className="items-center">
                  <Skeleton className="w-12 h-8 mb-1" />
                  <Skeleton className="w-12 h-3" />
                </View>
                <View className="items-center">
                  <Skeleton className="w-12 h-8 mb-1" />
                  <Skeleton className="w-16 h-3" />
                </View>
              </View>
            </CardContent>
          </Card>

          {/* Calendar Content Skeleton */}
          <View className="gap-3">
            {/* Header */}
            <View className="px-4">
              <Skeleton className="w-32 h-6 mb-4" />
            </View>

            {/* Time slots/week items */}
            {Array.from({ length: 6 }).map((_, index) => (
              <Card key={index}>
                <CardContent className="p-3">
                  <View className="flex-row items-center justify-between">
                    <Skeleton className="w-16 h-5" />
                    <View className="flex-1 ml-4">
                      <Skeleton className="w-24 h-4 mb-1" />
                      <Skeleton className="w-32 h-3" />
                    </View>
                  </View>
                </CardContent>
              </Card>
            ))}
          </View>
        </View>
      ) : hasError ? (
        <View className="px-4 py-8">
          <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="p-4">
              <Text className="text-center font-semibold text-destructive mb-2">
                Failed to load schedule
              </Text>
              <Text className="text-center text-sm text-muted-foreground mb-4">
                {error?.message || 'An error occurred while loading your schedule'}
              </Text>
              <Button
                onPress={() => window.location.reload()}
                variant="outline"
                className="w-full"
              >
                <Text className="font-medium">Retry</Text>
              </Button>
            </CardContent>
          </Card>
        </View>
      ) : (
        <>
          {isRefetching && (
            <View className="px-4 py-2">
              <Text className="text-center text-sm text-muted-foreground">
                Updating schedule...
              </Text>
            </View>
          )}

          {currentView === 'day' && (() => {
            const dayViewData = DayView({ timeSlots, bookings, selectedDate, onOpenSettings: () => bottomSheetModalRef.current?.present(), colors });
            return (
              <FlashList
                data={dayViewData.data}
                renderItem={dayViewData.renderItem}
                ListHeaderComponent={dayViewData.header}
                ListEmptyComponent={dayViewData.renderEmpty}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 20 }}
              />
            );
          })()}

          {currentView === 'week' && (() => {
            const weekViewData = WeekView({ selectedDate, bookings, weeklySchedule, colors });
            return (
              <FlashList
                data={weekViewData.data}
                renderItem={weekViewData.renderItem}
                ListHeaderComponent={weekViewData.header}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 20 }}
              />
            );
          })()}
        </>
      )}

      {/* Enhanced Weekly Schedule Bottom Sheet */}
      <BottomSheetModal
        ref={bottomSheetModalRef}
        index={0}
        snapPoints={['85%']}
        backgroundStyle={{ backgroundColor: THEME[colorScheme].background }}
        handleIndicatorStyle={{ backgroundColor: THEME[colorScheme].mutedForeground }}
        onDismiss={() => setShowWeeklyDialog(false)}
      >
        <BottomSheetScrollView className="flex-1 px-4">
          {/* Header */}
          <View className="flex-row items-center justify-between py-4 border-b border-border">
            <View className="flex-row items-center">
              <Ionicons name="settings" size={20} color={colors.primary} />
              <Text className="text-xl font-bold text-foreground ml-2">Working Hours</Text>
            </View>
            <TouchableOpacity
              onPress={() => bottomSheetModalRef.current?.dismiss()}
              className="w-8 h-8 rounded-full bg-muted items-center justify-center"
              accessibilityLabel="Close"
              accessibilityRole="button"
            >
              <Ionicons name="close" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          {/* Description */}
          <View className="py-3">
            <Text className="text-sm text-muted-foreground">
              Configure your availability for each day. Toggle days on/off and set custom working hours.
            </Text>
          </View>

            {/* Enhanced Individual Day Settings */}
            <View className="mb-4">
            <Text className="font-semibold text-foreground mb-3">Working Hours</Text>
              {(() => {
                return Object.entries(weeklySchedule || {}).map(([day, hours]) => {
                  const dayHours = hours as WorkingHours;
                  return (
                    <Card key={day} className={cn(
                      "mb-3 border-l-4",
                      dayHours.enabled ? "border-l-primary" : "border-l-muted"
                    )}>
                      <CardContent className="p-4">
                        <View className="flex-row items-center justify-between mb-3">
                          <View className="flex-row items-center">
                            <Text className="font-semibold text-foreground capitalize mr-2">
                              {day}
                            </Text>
                            <View className={cn(
                              "w-2 h-2 rounded-full",
                              dayHours.enabled ? "bg-primary" : "bg-destructive"
                            )} />
                          </View>
                          <TouchableOpacity
                            onPress={() => handleUpdateWorkingHours(day as keyof WeeklySchedule, {
                              ...dayHours,
                              enabled: !dayHours.enabled
                            })}
                            className={cn(
                              "px-3 py-1 rounded-full border",
                              dayHours.enabled
                                ? "bg-primary/10 border-primary/30"
                                : "bg-muted border-muted-foreground/30"
                            )}
                            accessibilityLabel={`Toggle ${day} availability`}
                            accessibilityRole="button"
                          >
                            <Text className={cn(
                              "text-xs font-medium",
                              dayHours.enabled ? "text-primary" : "text-muted-foreground"
                            )}>
                              {dayHours.enabled ? 'Open' : 'Closed'}
                            </Text>
                          </TouchableOpacity>
                        </View>

                        {dayHours.enabled && (
                          <View className="flex-row items-center gap-3">
                            <TouchableOpacity
                              onPress={() => handleTimePickerPress(day as keyof WeeklySchedule, 'start')}
                              className="flex-1 p-3 bg-secondary/20 rounded-lg border border-border"
                              accessibilityLabel={`Set start time for ${day}`}
                              accessibilityRole="button"
                            >
                              <Text className="text-center text-foreground font-medium">{dayHours.start}</Text>
                              <Text className="text-xs text-center text-muted-foreground">Start Time</Text>
                            </TouchableOpacity>

                            <View className="w-8 items-center">
                              <Text className="text-muted-foreground font-medium">→</Text>
                            </View>

                            <TouchableOpacity
                              onPress={() => handleTimePickerPress(day as keyof WeeklySchedule, 'end')}
                              className="flex-1 p-3 bg-secondary/20 rounded-lg border border-border"
                              accessibilityLabel={`Set end time for ${day}`}
                              accessibilityRole="button"
                            >
                              <Text className="text-center text-foreground font-medium">{dayHours.end}</Text>
                              <Text className="text-xs text-center text-muted-foreground">End Time</Text>
                            </TouchableOpacity>
                          </View>
                        )}
                      </CardContent>
                    </Card>
                  );
                });
              })()}
            </View>

          {/* Footer Actions */}
          <View className="flex-row gap-3 pb-4 pt-4 border-t border-border">
            <TouchableOpacity
              onPress={() => bottomSheetModalRef.current?.dismiss()}
              className="flex-1 py-3 bg-muted rounded-lg items-center"
              accessibilityLabel="Cancel"
              accessibilityRole="button"
            >
              <Text className="font-medium text-muted-foreground">Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => bottomSheetModalRef.current?.dismiss()}
              className="flex-1 py-3 bg-primary rounded-lg items-center"
              accessibilityLabel="Save hours"
              accessibilityRole="button"
            >
              <View className="flex-row items-center">
                <Ionicons name="checkmark-circle" size={16} color={colors.primaryForeground} />
                <Text className="font-medium text-primary-foreground ml-2">Save Hours</Text>
              </View>
            </TouchableOpacity>
          </View>
        </BottomSheetScrollView>
      </BottomSheetModal>

      {/* Time Picker */}
      {showTimePicker && (
        <DateTimePicker
          value={tempTime}
          mode="time"
          is24Hour={false}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleTimePickerChange}
        />
      )}

    </SafeAreaView>
    </BottomSheetModalProvider>
  );
}
import React, { useState, useMemo, useCallback } from 'react';
import { View, ScrollView, Platform, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { FlashList } from '@shopify/flash-list';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/core/utils';
import { useColorScheme } from '@/lib/core/useColorScheme';
import { THEME } from '@/lib/core/theme';
import { useCalendarStore } from '@/stores/ui/calendar';
import {
  useCalendarData,
  useCalendarTimeSlots,
  useCalendarWeekData
} from '@/hooks/provider/useCalendarData';
import { Skeleton } from '@/components/ui/skeleton';

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
  selectedDate
}: {
  timeSlots: { time: string; displayTime: string; }[];
  bookings: Booking[];
  selectedDate: Date;
}) => {
  const todayString = selectedDate.toISOString().split('T')[0];

  const renderTimeSlot = ({ item: slot }: { item: { time: string; displayTime: string; } }) => {
    const booking = bookings.find((b) =>
      b.startTime === slot.time && b.date === todayString
    );

    return (
      <Card key={slot.time} className={cn(
        "mb-2 border-l-4",
        booking ? "border-l-primary bg-primary/10" : "border-l-muted bg-muted/20"
      )}>
        <CardContent className="p-3">
          <View className="flex-row items-center justify-between">
            <Text className="font-semibold text-foreground">{slot.displayTime}</Text>

            {booking ? (
              <View className="flex-1 ml-4">
                <Text className="font-medium text-foreground">{booking.customerName}</Text>
                <Text className="text-sm text-muted-foreground">{booking.serviceTitle}</Text>
                <View className={cn(
                  "px-2 py-1 rounded-full self-start mt-1",
                  booking.status === 'confirmed' ? "bg-secondary/20" : "bg-accent/30"
                )}>
                  <Text className={cn(
                    "text-xs font-medium",
                    booking.status === 'confirmed' ? "text-secondary-foreground" : "text-accent-foreground"
                  )}>{booking.status}</Text>
                </View>
              </View>
            ) : (
              <View className="flex-1 ml-4">
                <Text className="text-muted-foreground font-medium">Available</Text>
                <Text className="text-sm text-muted-foreground">Ready for booking</Text>
              </View>
            )}
          </View>
        </CardContent>
      </Card>
    );
  };

  const renderEmptyState = () => (
    <View className="px-4">
      {timeSlots.length === 0 ? (
        <View className="p-6 bg-card rounded-lg border border-border">
          <Text className="text-center font-semibold text-foreground mb-2">No working hours set</Text>
          <Text className="text-center text-sm text-muted-foreground">
            Set your working hours to start accepting bookings
          </Text>
        </View>
      ) : (
        <View className="mt-6 p-4 bg-card rounded-lg border border-border">
          <Text className="text-center font-semibold text-foreground mb-2">No bookings yet</Text>
          <Text className="text-center text-sm text-muted-foreground">
            Your available time slots are ready for customers to book
          </Text>
        </View>
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
  weeklySchedule
}: {
  selectedDate: Date;
  bookings: Booking[];
  weeklySchedule: WeeklySchedule | undefined;
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
        "mb-2",
        isToday && "border-primary/50 bg-primary/5",
        isPastDay && "opacity-60"
      )}>
        <CardContent className="p-3">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className={cn(
                "font-semibold",
                isToday ? "text-primary" : "text-foreground"
              )}>
                {day.toLocaleDateString('en', { weekday: 'short' })} {day.getDate()}
              </Text>
              {daySchedule?.enabled && (
                <Text className="text-xs text-muted-foreground">
                  {daySchedule.start} - {daySchedule.end}
                </Text>
              )}
            </View>

            <View className="items-end">
              {daySchedule?.enabled ? (
                <>
                  <Text className="text-sm font-medium text-foreground">
                    {dayBookings.length} booking{dayBookings.length !== 1 ? 's' : ''}
                  </Text>
                  {!isPastDay && dayBookings.length === 0 && (
                    <Text className="text-xs text-secondary">Available</Text>
                  )}
                </>
              ) : (
                <Text className="text-sm text-muted-foreground">Closed</Text>
              )}
            </View>
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
    if (!weeklySchedule) return;

    const newSchedule = {
      ...weeklySchedule,
      [day]: hours
    };

    try {
      await updateScheduleMutation.mutateAsync({
        provider_id: 'current-user-id', // This will be handled by the hook
        schedule_data: newSchedule
      });
    } catch (error) {
      console.error('Error updating schedule:', error);
    }
  }, [weeklySchedule, updateScheduleMutation]);

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
    <SafeAreaView className="flex-1 bg-background">
      {/* Header with Gradient */}
      <LinearGradient
        colors={[THEME[colorScheme].gradientStart, THEME[colorScheme].gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 24 }}
      >
        <View className="flex-row items-center justify-between mb-6">
          <View className="flex-shrink">
            <View className='flex flex-row justify-between items-center mb-2 w-full'>
              <View>
                <TouchableOpacity onPress={() => router.back()}>
                  <Text className="text-white/80 text-sm mb-2">← Back</Text>
                </TouchableOpacity>
              </View>
              <View className="flex-row gap-2 ml-4">
                <TouchableOpacity onPress={() => setShowWeeklyDialog(true)}>
                  <View className="bg-white/20 px-3 py-2 rounded-full min-w-[80px]">
                    <Text className="text-white font-medium text-sm text-center">📅 Hours</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>

            <Text className="text-white text-xl font-bold">
              Calendar & Schedule
            </Text>
            <Text className="text-white/70 text-sm mt-1">
              Manage your appointments and availability
            </Text>
          </View>
        </View>

        {/* Date Navigation */}
        <View className="flex-row items-center justify-between mb-4">
          <TouchableOpacity onPress={goToPreviousDay} className="p-2">
            <Text className="text-white text-lg font-bold">‹</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={goToToday} className="flex-1 items-center">
            <Text className={cn(
              "text-lg font-semibold",
              isTodaySelected ? "text-yellow-200" : "text-white"
            )}>
              {dateInfo.dayName}, {dateInfo.monthName} {dateInfo.date}
            </Text>
            <Text className={cn(
              "text-sm",
              isTodaySelected ? "text-yellow-100" : "text-white/70"
            )}>{dateInfo.year}</Text>
            {isTodaySelected && (
              <View className="mt-1 px-2 py-0.5 bg-yellow-400/20 rounded-full">
                <Text className="text-xs text-yellow-200 font-medium">Today</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={goToNextDay} className="p-2">
            <Text className="text-white text-lg font-bold">›</Text>
          </TouchableOpacity>
        </View>

        {/* Calendar View Toggle */}
        <Tabs
          value={currentView}
          onValueChange={(value) => setCurrentView(value as CalendarView)}
        >
          <TabsList className="bg-white/30 flex-row">
            <TabsTrigger value="day" className="flex-1">
              <Text className="font-medium">Day</Text>
            </TabsTrigger>
            <TabsTrigger value="week" className="flex-1">
              <Text className="font-medium">Week</Text>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </LinearGradient>

      {/* Stats Overview */}
      <View className="px-4 -mt-4 mb-6">
        <Card>
          <CardContent className="px-4 py-2">
            <View className="flex-row justify-between items-center">
              <View className="items-center">
                <Text className="text-2xl font-bold text-foreground">{bookingStats.today}</Text>
                <Text className="text-muted-foreground text-xs">Today</Text>
              </View>
              <View className="items-center">
                <Text className="text-2xl font-bold text-foreground">{bookingStats.thisWeek}</Text>
                <Text className="text-muted-foreground text-xs">This Week</Text>
              </View>
              <View className="items-center">
                <Text className="text-2xl font-bold text-foreground">{timeSlots.length}</Text>
                <Text className="text-muted-foreground text-xs">Available Slots</Text>
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
          <View className="space-y-3">
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
            const dayViewData = DayView({ timeSlots, bookings, selectedDate });
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
            const weekViewData = WeekView({ selectedDate, bookings, weeklySchedule });
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

      {/* Bottom spacing */}
      <View className={cn("h-6", Platform.OS === 'ios' && "h-24")} />

      {/* Weekly Schedule Dialog */}
      <AlertDialog open={showWeeklyDialog} onOpenChange={setShowWeeklyDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Working Hours</AlertDialogTitle>
            <AlertDialogDescription>
              Set your availability for each day of the week
            </AlertDialogDescription>
          </AlertDialogHeader>

          <ScrollView className="max-h-96 my-4">
            {/* Quick Presets */}
            <View className="mb-4 p-3 bg-accent/10 rounded-lg">
              <Text className="font-semibold text-foreground mb-2">Quick Presets</Text>
              <View className="flex-row gap-2 flex-wrap">
                <TouchableOpacity
                  onPress={() => {
                    const allDayHours = { start: '09:00', end: '17:00', enabled: true };

                    handleUpdateWorkingHours('monday', allDayHours);
                    handleUpdateWorkingHours('tuesday', allDayHours);
                    handleUpdateWorkingHours('wednesday', allDayHours);
                    handleUpdateWorkingHours('thursday', allDayHours);
                    handleUpdateWorkingHours('friday', allDayHours);
                    handleUpdateWorkingHours('saturday', allDayHours);
                    handleUpdateWorkingHours('sunday', allDayHours);
                  }}
                  className="px-3 py-1 bg-green-500/20 rounded-full"
                >
                  <Text className="text-xs font-medium text-green-700 dark:text-green-400">All Available</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    const businessHours = { start: '09:00', end: '17:00', enabled: true };
                    const weekendHours = { start: '10:00', end: '16:00', enabled: true };

                    handleUpdateWorkingHours('monday', businessHours);
                    handleUpdateWorkingHours('tuesday', businessHours);
                    handleUpdateWorkingHours('wednesday', businessHours);
                    handleUpdateWorkingHours('thursday', businessHours);
                    handleUpdateWorkingHours('friday', businessHours);
                    handleUpdateWorkingHours('saturday', weekendHours);
                    handleUpdateWorkingHours('sunday', weekendHours);
                  }}
                  className="px-3 py-1 bg-primary/20 rounded-full"
                >
                  <Text className="text-xs font-medium text-primary">9-5 Business</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Individual Day Settings */}
            {(() => {
              return Object.entries(weeklySchedule || {}).map(([day, hours]) => {
                const dayHours = hours as WorkingHours;
                return (
                  <View key={day} className="mb-4 p-3 bg-card rounded-lg border border-border">
                    <View className="flex-row items-center justify-between mb-2">
                      <Text className="font-semibold text-foreground capitalize">
                        {day}
                      </Text>
                      <TouchableOpacity
                        onPress={() => handleUpdateWorkingHours(day as keyof WeeklySchedule, {
                          ...dayHours,
                          enabled: !dayHours.enabled
                        })}
                        className={cn(
                          "px-3 py-1 rounded-full",
                          dayHours.enabled ? "bg-primary/20" : "bg-muted"
                        )}
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
                      <View className="flex-row items-center gap-2">
                        <TouchableOpacity
                          onPress={() => handleTimePickerPress(day as keyof WeeklySchedule, 'start')}
                          className="flex-1 p-2 bg-secondary/20 rounded"
                        >
                          <Text className="text-center text-foreground">{dayHours.start}</Text>
                          <Text className="text-xs text-center text-muted-foreground">Start</Text>
                        </TouchableOpacity>

                        <Text className="text-muted-foreground">to</Text>

                        <TouchableOpacity
                          onPress={() => handleTimePickerPress(day as keyof WeeklySchedule, 'end')}
                          className="flex-1 p-2 bg-secondary/20 rounded"
                        >
                          <Text className="text-center text-foreground">{dayHours.end}</Text>
                          <Text className="text-xs text-center text-muted-foreground">End</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              });
            })()}
          </ScrollView>

          <AlertDialogFooter>
            <AlertDialogCancel>
              <Text className="font-medium">Cancel</Text>
            </AlertDialogCancel>
            <AlertDialogAction onPress={() => setShowWeeklyDialog(false)}>
              <Text className="font-medium">💾 Save Hours</Text>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
  );
}
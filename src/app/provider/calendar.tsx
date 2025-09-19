import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { View, ScrollView, Platform, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { supabase, db, auth } from '@/lib/supabase';

// Calendar view types
type CalendarView = 'day' | 'week' | 'month';

// Data types for real implementation
interface WorkingHours {
  start: string; // "07:00"
  end: string;   // "17:00"
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

interface AvailabilitySlot {
  id: string;
  date: string; // YYYY-MM-DD
  startTime: string; // "09:00"
  endTime: string; // "10:00"
  isAvailable: boolean;
  createdAt: Date;
}

interface Booking {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  clientName: string;
  clientId: string;
  service: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  notes?: string;
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

// Day View Component
const DayView = ({ 
  timeSlots, 
  getBookingForTime, 
  getAvailabilityForTime,
  onTimeSlotPress 
}: {
  timeSlots: { time: string; displayTime: string; }[];
  getBookingForTime: (time: string) => any;
  getAvailabilityForTime: (time: string) => boolean;
  onTimeSlotPress: (time: string) => void;
}) => {
  return (
    <View className="px-4">
      <Text className="text-lg font-semibold text-foreground mb-4">Today's Schedule</Text>
      
      {timeSlots.map((slot) => {
        const booking = getBookingForTime(slot.time);
        const isAvailable = getAvailabilityForTime(slot.time);
        
        return (
          <TouchableOpacity 
            key={slot.time} 
            className="mb-2"
            onPress={() => onTimeSlotPress(slot.time)}
            activeOpacity={0.7}
          >
            <Card className={cn(
              "border-l-4",
              booking ? "border-l-primary bg-primary/10" :
              isAvailable ? "border-l-secondary bg-secondary/10" :
              "border-l-muted bg-muted/20"
            )}>
              <CardContent className="p-3">
                <View className="flex-row items-center justify-between">
                  <Text className="font-semibold text-foreground">{slot.displayTime}</Text>
                  
                  {booking ? (
                    <View className="flex-1 ml-4">
                      <Text className="font-medium text-foreground">{booking.clientName}</Text>
                      <Text className="text-sm text-muted-foreground">{booking.service}</Text>
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
                      <Text className="text-muted-foreground font-medium">Open</Text>
                      <Text className="text-sm text-muted-foreground">Tap to add availability</Text>
                    </View>
                  )}
                  
                  <Text className="text-muted-foreground">⋮</Text>
                </View>
              </CardContent>
            </Card>
          </TouchableOpacity>
        );
      })}
      
      {/* Empty state message */}
      <View className="mt-6 p-4 bg-card rounded-lg border border-border">
        <Text className="text-center font-semibold text-foreground mb-2">Ready to get started?</Text>
        <Text className="text-center text-sm text-muted-foreground">
          Add your availability and start accepting bookings from clients
        </Text>
      </View>
    </View>
  );
};

// Week View Component
const WeekView = ({ 
  selectedDate, 
  getBookingForTime, 
  getAvailabilityForTime, 
  bookings,
  timeSlots 
}: { 
  selectedDate: Date;
  getBookingForTime: (date: string, time: string) => any;
  getAvailabilityForTime: (date: string, time: string) => boolean;
  bookings: any[];
  timeSlots: { time: string; displayTime: string; }[];
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

  // Get daily stats for the week
  const getDayStats = (day: Date) => {
    const dayString = day.toISOString().split('T')[0];
    const dayBookings = bookings.filter((booking: any) => booking.date === dayString);
    return {
      bookings: dayBookings.length,
      available: dayBookings.filter((booking: any) => booking.status === 'available').length,
      confirmed: dayBookings.filter((booking: any) => booking.status === 'confirmed').length,
    };
  };

  return (
    <View className="px-4">
      <Text className="text-lg font-semibold text-foreground mb-4">Week Overview</Text>
      
      {/* Week header with stats */}
      <View className="flex-row mb-4">
        {weekDays.map((day, index) => {
          const stats = getDayStats(day);
          const isToday = day.toDateString() === new Date().toDateString();
          const isPastDay = day < new Date(new Date().setHours(0, 0, 0, 0));
          
          return (
            <View key={index} className="flex-1 items-center">
              <Text className={cn(
                "text-sm",
                isToday ? "text-primary font-semibold" : 
                isPastDay ? "text-muted-foreground/60" : "text-muted-foreground"
              )}>
                {day.toLocaleDateString('en', { weekday: 'short' })}
              </Text>
              <Text className={cn(
                "text-lg font-semibold",
                isToday ? "text-primary" : 
                isPastDay ? "text-muted-foreground/60" : "text-foreground"
              )}>
                {day.getDate()}
              </Text>
              
              {/* Daily booking indicators - only show for non-past days */}
              {!isPastDay && (
                <View className="flex-row gap-1 mt-1">
                  {stats.confirmed > 0 && (
                    <View className="w-2 h-2 rounded-full bg-primary" />
                  )}
                  {stats.available > 0 && (
                    <View className="w-2 h-2 rounded-full bg-secondary" />
                  )}
                </View>
              )}
              
              {/* Show "Past" for past days */}
              {isPastDay ? (
                <Text className="text-xs text-muted-foreground/60 mt-1">Past</Text>
              ) : (
                <Text className="text-xs text-muted-foreground mt-1">
                  {stats.bookings > 0 ? `${stats.bookings}` : '0'}
                </Text>
              )}
            </View>
          );
        })}
      </View>

      {/* Simplified time view for week */}
      <ScrollView>
        {['Morning', 'Afternoon', 'Evening'].map((period, periodIndex) => {
          const periodTimes = period === 'Morning' ? timeSlots.slice(0, 5) : 
                             period === 'Afternoon' ? timeSlots.slice(5, 10) : 
                             timeSlots.slice(10, 16);
          
          return (
            <View key={period} className="mb-4">
              <Text className="text-sm font-medium text-muted-foreground mb-2">{period}</Text>
              
              {weekDays.map((day, dayIndex) => {
                const dayString = day.toISOString().split('T')[0];
                const dayBookings = periodTimes.filter(slot => {
                  // For WeekView, we need a different approach since getBookingForTime expects only time
                  const booking = bookings.find((b: any) => 
                    b.date === dayString && b.startTime === slot.time
                  );
                  return booking;
                });
                
                return (
                  <TouchableOpacity key={dayIndex} className="mb-2">
                    <Card className={cn(
                      "border-l-4",
                      dayBookings.length > 0 ? "border-l-primary bg-primary/10" : "border-l-muted bg-muted/20"
                    )}>
                      <CardContent className="p-3">
                        <View className="flex-row items-center justify-between">
                          <Text className="font-medium text-foreground">
                            {day.toLocaleDateString('en', { weekday: 'short' })} {day.getDate()}
                          </Text>
                          
                          <View className="flex-1 ml-4">
                            {dayBookings.length > 0 ? (
                              <View>
                                <Text className="text-sm font-medium text-foreground">
                                  {dayBookings.length} booking{dayBookings.length > 1 ? 's' : ''}
                                </Text>
                                <Text className="text-xs text-muted-foreground">
                                  {period.toLowerCase()}
                                </Text>
                              </View>
                            ) : (
                              <Text className="text-sm text-muted-foreground">Available</Text>
                            )}
                          </View>
                          
                          <Text className="text-muted-foreground">⋮</Text>
                        </View>
                      </CardContent>
                    </Card>
                  </TouchableOpacity>
                );
              })}
            </View>
          );
        })}
      </ScrollView>
      
      <View className="mt-4 p-4 bg-card rounded-lg border border-border">
        <Text className="text-center font-semibold text-foreground mb-2">Week View</Text>
        <Text className="text-center text-sm text-muted-foreground">
          Tap on any day to view detailed schedule or add availability
        </Text>
      </View>
    </View>
  );
};

// Month View Component
const MonthView = ({ selectedDate, bookings }: { selectedDate: Date; bookings: any[]; }) => {
  const getMonthDays = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const days = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Add empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add days of month
    for (let day = 1; day <= daysInMonth; day++) {
      const currentDay = new Date(year, month, day);
      currentDay.setHours(0, 0, 0, 0);
      days.push(currentDay);
    }
    
    return days;
  };

  // Get booking data for a specific day
  const getDayBookings = (day: Date) => {
    const dayString = day.toISOString().split('T')[0];
    return bookings.filter((booking: any) => booking.date === dayString);
  };

  const monthDays = getMonthDays(selectedDate);
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <View className="px-4">
      <Text className="text-lg font-semibold text-foreground mb-4">
        {selectedDate.toLocaleDateString('en', { month: 'long', year: 'numeric' })}
      </Text>
      
      {/* Week day headers */}
      <View className="flex-row mb-2">
        {weekDays.map((day) => (
          <View key={day} className="flex-1 items-center py-2">
            <Text className="text-sm font-medium text-muted-foreground">{day}</Text>
          </View>
        ))}
      </View>

      {/* Calendar grid */}
      <View className="flex-row flex-wrap">
        {monthDays.map((day, index) => {
          const dayBookings = day ? getDayBookings(day) : [];
          const isToday = day && day.toDateString() === new Date().toDateString();
          const isPastDay = day && day < new Date(new Date().setHours(0, 0, 0, 0));
          const hasBookings = dayBookings.length > 0;
          const confirmedBookings = dayBookings.filter((b: any) => b.status === 'confirmed').length;
          const availableSlots = dayBookings.filter((b: any) => b.status === 'available').length;
          
          return (
            <TouchableOpacity 
              key={index} 
              className="w-[14.28%] aspect-square p-1"
              disabled={!day || isPastDay}
            >
              <Card className={cn(
                "flex-1 justify-center items-center border border-border",
                !day && "opacity-0",
                isToday && "bg-primary/20 border-primary/50",
                isPastDay && "bg-muted/50 border-muted opacity-50",
                hasBookings && !isToday && !isPastDay && "bg-accent/20 border-accent/30"
              )}>
                <CardContent className="p-1 flex-1 justify-center items-center bg-card">
                  {day && (
                    <>
                      <Text className={cn(
                        "text-sm font-semibold",
                        isToday ? "text-primary" : 
                        isPastDay ? "text-muted-foreground" : "text-foreground"
                      )}>
                        {day.getDate()}
                      </Text>
                      
                      {/* Booking indicators - only show for future/present days */}
                      {!isPastDay && (
                        <View className="flex-row justify-center items-center mt-1 gap-1">
                          {confirmedBookings > 0 && (
                            <View className="flex-row items-center">
                              <View className="w-1.5 h-1.5 rounded-full bg-primary" />
                              {confirmedBookings > 1 && (
                                <Text className="text-xs text-primary font-medium ml-0.5">{confirmedBookings}</Text>
                              )}
                            </View>
                          )}
                          {availableSlots > 0 && (
                            <View className="flex-row items-center">
                              <View className="w-1.5 h-1.5 rounded-full bg-secondary" />
                              {availableSlots > 1 && (
                                <Text className="text-xs text-secondary font-medium ml-0.5">{availableSlots}</Text>
                              )}
                            </View>
                          )}
                        </View>
                      )}
                      
                      {/* Show "Past" indicator for past days */}
                      {isPastDay && (
                        <Text className="text-xs text-muted-foreground mt-1">Past</Text>
                      )}
                      
                      {/* Total booking count for busy days */}
                      {!isPastDay && dayBookings.length > 3 && (
                        <Text className="text-xs text-muted-foreground font-medium mt-0.5">
                          +{dayBookings.length - 3}
                        </Text>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </TouchableOpacity>
          );
        })}
      </View>
      
      {/* Legend */}
      <View className="mt-6 p-4 bg-card rounded-lg border border-border">
        <Text className="font-semibold text-foreground mb-3">Legend</Text>
        
        <View className="flex-row justify-between mb-2">
          <View className="flex-row items-center">
            <View className="w-3 h-3 rounded-full bg-primary mr-2" />
            <Text className="text-sm text-foreground">Confirmed Bookings</Text>
          </View>
          <View className="flex-row items-center">
            <View className="w-3 h-3 rounded-full bg-secondary mr-2" />
            <Text className="text-sm text-foreground">Available Slots</Text>
          </View>
        </View>
        
        <Text className="text-xs text-muted-foreground text-center mt-2">
          Tap on any date to view detailed schedule or manage availability
        </Text>
      </View>
      
      {/* Monthly Summary */}
      <View className="mt-4 p-4 bg-card rounded-lg border border-border">
        <Text className="font-semibold text-foreground mb-2">Monthly Summary</Text>
        
        <View className="flex-row justify-between">
          <View className="items-center">
            <Text className="text-lg font-bold text-primary">
              {bookings.filter(b => b.status === 'confirmed').length}
            </Text>
            <Text className="text-xs text-muted-foreground">Confirmed</Text>
          </View>
          <View className="items-center">
            <Text className="text-lg font-bold text-secondary">
              {bookings.filter(b => b.status === 'available').length}
            </Text>
            <Text className="text-xs text-muted-foreground">Available</Text>
          </View>
          <View className="items-center">
            <Text className="text-lg font-bold text-foreground">
              {Math.round((bookings.filter(b => b.status === 'confirmed').length / Math.max(bookings.length, 1)) * 100)}%
            </Text>
            <Text className="text-xs text-muted-foreground">Booked</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

export default function ProviderCalendar() {
  const [currentView, setCurrentView] = useState<CalendarView>('day');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showAddSlotDialog, setShowAddSlotDialog] = useState(false);
  const [showWeeklyDialog, setShowWeeklyDialog] = useState(false);
  const [showTimeSlotDialog, setShowTimeSlotDialog] = useState(false);
  const [showWorkingHoursDialog, setShowWorkingHoursDialog] = useState(false);
  const [showManualBookingDialog, setShowManualBookingDialog] = useState(false);
  const [manualBookingData, setManualBookingData] = useState({
    clientName: '',
    service: ''
  });
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('');
  
  // Time picker state management
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [timePickerMode, setTimePickerMode] = useState<'start' | 'end'>('start');
  const [editingDay, setEditingDay] = useState<keyof WeeklySchedule | null>(null);
  const [tempTime, setTempTime] = useState(new Date());
  
  // Supabase state management
  const [user, setUser] = useState<any>(null);
  const [scheduleLoading, setScheduleLoading] = useState(true);
  
  // Real data state management
  const [weeklySchedule, setWeeklySchedule] = useState<WeeklySchedule>({
    monday: { start: '09:00', end: '17:00', enabled: true },
    tuesday: { start: '09:00', end: '17:00', enabled: true },
    wednesday: { start: '09:00', end: '17:00', enabled: true },
    thursday: { start: '09:00', end: '17:00', enabled: true },
    friday: { start: '09:00', end: '17:00', enabled: true },
    saturday: { start: '10:00', end: '16:00', enabled: true },
    sunday: { start: '10:00', end: '16:00', enabled: true }
  });
  
  const [availabilitySlots, setAvailabilitySlots] = useState<AvailabilitySlot[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Load user and schedule on component mount
  useEffect(() => {
    const initializeUserAndSchedule = async () => {
      try {
        // Get current user
        const { user: currentUser, error: userError } = await auth.getCurrentUser();
        
        if (userError) {
          console.error('Error getting current user:', userError);
          setScheduleLoading(false);
          return;
        }
        
        if (!currentUser) {
          console.log('No user logged in');
          setScheduleLoading(false);
          return;
        }
        
        setUser(currentUser);
        
        // Load schedule from Supabase
        const { data: scheduleData, error: scheduleError } = await db.providerSchedules.getSchedule(currentUser.id);
        
        if (scheduleError && scheduleError.code !== 'PGRST116') { // PGRST116 is "not found"
          console.error('Error loading schedule:', scheduleError);
        } else if (scheduleData?.schedule_data) {
          // Validate and set the loaded schedule
          const loadedSchedule = scheduleData.schedule_data;
          if (isValidWeeklySchedule(loadedSchedule)) {
            setWeeklySchedule(loadedSchedule);
            console.log('Weekly schedule loaded from Supabase:', loadedSchedule);
          } else {
            console.warn('Invalid schedule data loaded, using defaults');
          }
        } else {
          console.log('No existing schedule found, using defaults');
        }
      } catch (error) {
        console.error('Error initializing user and schedule:', error);
      } finally {
        setScheduleLoading(false);
      }
    };
    
    initializeUserAndSchedule();
  }, []);
  
  // Helper function to validate weekly schedule data
  const isValidWeeklySchedule = (schedule: any): schedule is WeeklySchedule => {
    if (!schedule || typeof schedule !== 'object') return false;
    
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    
    for (const day of days) {
      if (!schedule[day] || typeof schedule[day] !== 'object') return false;
      if (!schedule[day].start || !schedule[day].end || typeof schedule[day].enabled !== 'boolean') return false;
    }
    
    return true;
  };
  
  // Generate time slots based on current day's working hours
  const timeSlots = useMemo(() => {
    const dayName = selectedDate.toLocaleDateString('en', { weekday: 'long' }).toLowerCase() as keyof WeeklySchedule;
    const daySchedule = weeklySchedule[dayName];
    
    if (!daySchedule.enabled) return [];
    
    const startHour = parseInt(daySchedule.start.split(':')[0]);
    const endHour = parseInt(daySchedule.end.split(':')[0]);
    
    const slots = [];
    const now = new Date();
    const isToday = selectedDate.toDateString() === now.toDateString();
    const currentHour = now.getHours();
    
    for (let hour = startHour; hour < endHour; hour++) {
      // Skip past time slots for today
      if (isToday && hour <= currentHour) continue;
      
      slots.push({
        time: `${hour.toString().padStart(2, '0')}:00`,
        displayTime: hour > 12 ? `${hour - 12}:00 PM` : hour === 12 ? '12:00 PM' : `${hour}:00 AM`
      });
    }
    return slots;
  }, [selectedDate, weeklySchedule]);
  
  console.log('ProviderCalendar rendering, currentView:', currentView);

  const dateInfo = getCurrentDateInfo(selectedDate);
  
  // Navigation functions - prevent going to past days
  const goToPreviousDay = useCallback(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const newDate = new Date(selectedDate);
    newDate.setDate(selectedDate.getDate() - 1);
    newDate.setHours(0, 0, 0, 0);
    
    // Only allow navigation if the new date is not in the past
    if (newDate >= today) {
      setSelectedDate(newDate);
    }
  }, [selectedDate]);

  const goToNextDay = useCallback(() => {
    const newDate = new Date(selectedDate);
    newDate.setDate(selectedDate.getDate() + 1);
    setSelectedDate(newDate);
  }, [selectedDate]);

  const goToToday = useCallback(() => {
    setSelectedDate(new Date());
  }, []);

  // Get booking for specific time - now uses real data
  const getBookingForTime = useCallback((time: string) => {
    const todayString = selectedDate.toISOString().split('T')[0];
    return bookings.find((booking) => 
      booking.startTime === time && booking.date === todayString
    );
  }, [bookings, selectedDate]);

  // Get availability for specific time - now uses real data
  const getAvailabilityForTime = useCallback((time: string) => {
    const todayString = selectedDate.toISOString().split('T')[0];
    const slot = availabilitySlots.find(slot => 
      slot.date === todayString && 
      slot.startTime === time && 
      slot.isAvailable
    );
    return !!slot;
  }, [availabilitySlots, selectedDate]);

  // Calculate real stats from bookings
  const stats = useMemo(() => {
    const today = new Date();
    const todayString = today.toISOString().split('T')[0];
    
    const todayBookings = bookings.filter((booking: any) => 
      booking.date === todayString
    );
    
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    
    const weekBookings = bookings.filter((booking: any) => {
      const bookingDate = new Date(booking.date);
      return bookingDate >= weekStart && bookingDate <= weekEnd;
    });
    
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    const monthBookings = bookings.filter((booking: any) => {
      const bookingDate = new Date(booking.date);
      return bookingDate >= monthStart && bookingDate <= monthEnd;
    });
    
    // Calculate average hours based on bookings (assuming 1 hour per booking)
    const avgHours = monthBookings.length > 0 ? (monthBookings.length * 1.0).toFixed(1) : '0';
    
    return {
      today: todayBookings.length,
      thisWeek: weekBookings.length,
      thisMonth: monthBookings.length,
      avgHours
    };
  }, [bookings]);

  // Handle Add Slot button
  const handleAddSlot = useCallback(() => {
    setShowAddSlotDialog(true);
  }, []);

  // Handle Set Weekly button
  const handleSetWeekly = useCallback(() => {
    setShowWeeklyDialog(true);
  }, []);

  // Handle working hours update
  const handleUpdateWorkingHours = useCallback(async (day: keyof WeeklySchedule, hours: WorkingHours) => {
    const newSchedule = {
      ...weeklySchedule,
      [day]: hours
    };
    
    // Update local state immediately for responsive UI
    setWeeklySchedule(newSchedule);
    
    // Save to Supabase if user is logged in
    if (user) {
      try {
        const { error } = await db.providerSchedules.saveSchedule(user.id, newSchedule);
        if (error) {
          console.error('Error saving schedule to Supabase:', error);
          // Could show a toast notification here
        } else {
          console.log('Weekly schedule saved to Supabase:', newSchedule);
        }
      } catch (error) {
        console.error('Error saving schedule:', error);
      }
    }
  }, [weeklySchedule, user]);

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
    const daySchedule = weeklySchedule[day];
    const timeString = mode === 'start' ? daySchedule.start : daySchedule.end;
    const timeDate = timeStringToDate(timeString);
    
    setTempTime(timeDate);
    setEditingDay(day);
    setTimePickerMode(mode);
    setShowTimePicker(true);
  }, [weeklySchedule, timeStringToDate]);

  const handleTimePickerChange = useCallback((event: DateTimePickerEvent, selectedDate?: Date) => {
    if (event.type === 'set' && selectedDate && editingDay) {
      const timeString = dateToTimeString(selectedDate);
      const daySchedule = weeklySchedule[editingDay];
      
      handleUpdateWorkingHours(editingDay, {
        ...daySchedule,
        [timePickerMode]: timeString
      });
    }
    
    // Close the picker
    setShowTimePicker(false);
    setEditingDay(null);
  }, [editingDay, timePickerMode, weeklySchedule, dateToTimeString, handleUpdateWorkingHours]);

  // Handle quick time slot creation
  const handleQuickSlot = useCallback(() => {
    const todayString = selectedDate.toISOString().split('T')[0];
    
    // Find next available hour slot
    const existingTimes = availabilitySlots
      .filter(slot => slot.date === todayString)
      .map(slot => slot.startTime);
    
    // Start looking from current hour
    const now = new Date();
    let nextHour = now.getHours();
    
    // Find next available slot
    while (existingTimes.includes(`${nextHour.toString().padStart(2, '0')}:00`) && nextHour < 22) {
      nextHour++;
    }
    
    if (nextHour < 22) {
      const newSlot: AvailabilitySlot = {
        id: `slot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        date: todayString,
        startTime: `${nextHour.toString().padStart(2, '0')}:00`,
        endTime: `${(nextHour + 1).toString().padStart(2, '0')}:00`,
        isAvailable: true,
        createdAt: new Date()
      };
      setAvailabilitySlots(prev => [...prev, newSlot]);
    }
    
    setShowAddSlotDialog(false);
  }, [selectedDate, availabilitySlots]);

  // Handle custom time range creation
  const handleCustomRange = useCallback(() => {
    // For now, create a 2-hour slot starting at 2 PM
    const todayString = selectedDate.toISOString().split('T')[0];
    
    const newSlot: AvailabilitySlot = {
      id: `slot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      date: todayString,
      startTime: '14:00',
      endTime: '16:00',
      isAvailable: true,
      createdAt: new Date()
    };
    
    setAvailabilitySlots(prev => [...prev, newSlot]);
    setShowAddSlotDialog(false);
  }, [selectedDate]);

  // Handle manual booking creation
  const handleAddManualBooking = useCallback((time: string) => {
    setSelectedTimeSlot(time);
    setManualBookingData({ clientName: '', service: '' });
    setShowManualBookingDialog(true);
    setShowTimeSlotDialog(false);
  }, []);

  // Handle manual booking form submission
  const handleSubmitManualBooking = useCallback(() => {
    const { clientName, service } = manualBookingData;
    if (!clientName.trim() || !service.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    const todayString = selectedDate.toISOString().split('T')[0];

    const newBooking: Booking = {
      id: `booking_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      date: todayString,
      startTime: selectedTimeSlot,
      endTime: `${parseInt(selectedTimeSlot.split(':')[0]) + 1}:00`.padStart(5, '0'),
      clientName: clientName.trim(),
      clientId: `client_${Date.now()}`,
      service: service.trim(),
      status: 'confirmed',
      notes: 'Manual booking'
    };

    setBookings(prev => [...prev, newBooking]);
    setShowManualBookingDialog(false);
    setManualBookingData({ clientName: '', service: '' });
  }, [manualBookingData, selectedDate, selectedTimeSlot]);

  // Handle time slot press
  const handleTimeSlotPress = useCallback((time: string) => {
    setSelectedTimeSlot(time);
    setShowTimeSlotDialog(true);
  }, []);

  // Handle availability actions
  const handleAddAvailability = useCallback((time: string) => {
    console.log('Adding availability for time:', time);
    const todayString = selectedDate.toISOString().split('T')[0];
    
    // Check if slot already exists
    const existingSlot = availabilitySlots.find(slot => 
      slot.date === todayString && slot.startTime === time
    );
    
    if (existingSlot) {
      // Update existing slot
      setAvailabilitySlots(prev => prev.map(slot => 
        slot.id === existingSlot.id 
          ? { ...slot, isAvailable: true }
          : slot
      ));
    } else {
      // Create new slot
      const newSlot: AvailabilitySlot = {
        id: `slot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        date: todayString,
        startTime: time,
        endTime: `${parseInt(time.split(':')[0]) + 1}:00`.padStart(5, '0'),
        isAvailable: true,
        createdAt: new Date()
      };
      setAvailabilitySlots(prev => [...prev, newSlot]);
    }
    setShowTimeSlotDialog(false);
  }, [selectedDate, availabilitySlots]);

  const handleRemoveAvailability = useCallback((time: string) => {
    console.log('Removing availability for time:', time);
    const todayString = selectedDate.toISOString().split('T')[0];
    
    setAvailabilitySlots(prev => prev.map(slot => 
      slot.date === todayString && slot.startTime === time
        ? { ...slot, isAvailable: false }
        : slot
    ));
    setShowTimeSlotDialog(false);
  }, [selectedDate]);
  
  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header with Gradient */}
      <LinearGradient
        colors={['#E67E4A', '#F5A962']}
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
                <TouchableOpacity onPress={handleAddSlot}>
                  <View className="bg-white/20 px-3 py-2 rounded-full min-w-[80px]">
                    <Text className="text-white font-medium text-sm text-center">+ Add</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSetWeekly}>
                  <View className="bg-white/30 px-3 py-2 rounded-full min-w-[80px]">
                    <Text className="text-white font-medium text-sm text-center">📅 Weekly</Text>
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
            <Text className="text-white text-lg font-semibold">
              {dateInfo.dayName}, {dateInfo.monthName} {dateInfo.date}
            </Text>
            <Text className="text-white/70 text-sm">{dateInfo.year}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity onPress={goToNextDay} className="p-2">
            <Text className="text-white text-lg font-bold">›</Text>
          </TouchableOpacity>
        </View>

        {/* Calendar View Toggle with Tabs */}
        <Tabs
          value={currentView}
          onValueChange={(value) => setCurrentView(value as CalendarView)}
        >
          <TabsList className="bg-white/30 flex-row">
            <TabsTrigger value="day" className="flex-1">
              <Text className="font-medium">Day</Text>
            </TabsTrigger>
            <TabsTrigger value="week" className="flex-1">
              <Text className="font-medium text-primary">Week</Text>
            </TabsTrigger>
            <TabsTrigger value="month" className="flex-1">
              <Text className="font-medium">Month</Text>
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
                <Text className="text-2xl font-bold text-foreground">{stats.today}</Text>
                <Text className="text-muted-foreground text-xs">Today</Text>
              </View>
              <View className="items-center">
                <Text className="text-2xl font-bold text-foreground">{stats.thisWeek}</Text>
                <Text className="text-muted-foreground text-xs">This Week</Text>
              </View>
              <View className="items-center">
                <Text className="text-2xl font-bold text-foreground">{stats.thisMonth}</Text>
                <Text className="text-muted-foreground text-xs">This Month</Text>
              </View>
              <View className="items-center">
                <Text className="text-2xl font-bold text-foreground">{stats.avgHours}</Text>
                <Text className="text-muted-foreground text-xs">Avg Hours</Text>
              </View>
            </View>
          </CardContent>
        </Card>
      </View>

      {/* Calendar Content - Fixed height instead of flex-1 */}
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {loading ? (
          <View className="px-4 py-8">
            <Text className="text-center text-muted-foreground">Loading calendar...</Text>
          </View>
        ) : (
          <>
            {currentView === 'day' && (
              <DayView 
                timeSlots={timeSlots}
                getBookingForTime={getBookingForTime}
                getAvailabilityForTime={getAvailabilityForTime}
                onTimeSlotPress={handleTimeSlotPress}
              />
            )}
            
            {currentView === 'week' && (
              <WeekView 
                selectedDate={selectedDate}
                getBookingForTime={getBookingForTime}
                getAvailabilityForTime={getAvailabilityForTime}
                bookings={bookings}
                timeSlots={timeSlots}
              />
            )}
            
            {currentView === 'month' && (
              <MonthView 
                selectedDate={selectedDate}
                bookings={bookings}
              />
            )}
          </>
        )}
      </ScrollView>

      {/* Bottom spacing for tab bar */}
      <View className={cn("h-6", Platform.OS === 'ios' && "h-24")} />

      {/* Add Slot Dialog */}
      <AlertDialog open={showAddSlotDialog} onOpenChange={setShowAddSlotDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Add Time Slot</AlertDialogTitle>
            <AlertDialogDescription>
              Choose how to add availability to your calendar for {' '}
              <Text className="font-semibold text-foreground">
                {selectedDate.toLocaleDateString('en', { 
                  weekday: 'long', 
                  month: 'short', 
                  day: 'numeric' 
                })}
              </Text>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2">
            <AlertDialogCancel>
              <Text className="font-medium">Cancel</Text>
            </AlertDialogCancel>
            <AlertDialogAction onPress={handleQuickSlot}>
              <Text className="font-medium">⚡ Quick 1-hour slot</Text>
            </AlertDialogAction>
            <AlertDialogAction onPress={handleCustomRange}>
              <Text className="font-medium">🎯 Custom time range (2hrs)</Text>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Weekly Schedule Dialog */}
      <AlertDialog open={showWeeklyDialog} onOpenChange={setShowWeeklyDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Weekly Schedule Settings</AlertDialogTitle>
            <AlertDialogDescription>
              Configure your working hours for each day of the week
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
                    
                    // Update each day individually to trigger Supabase save
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
                    
                    // Update each day individually to trigger Supabase save
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
                
                <TouchableOpacity
                  onPress={() => {
                    const earlyHours = { start: '07:00', end: '17:00', enabled: true };
                    const weekendHours = { start: '08:00', end: '16:00', enabled: true };
                    
                    // Update each day individually to trigger Supabase save
                    handleUpdateWorkingHours('monday', earlyHours);
                    handleUpdateWorkingHours('tuesday', earlyHours);
                    handleUpdateWorkingHours('wednesday', earlyHours);
                    handleUpdateWorkingHours('thursday', earlyHours);
                    handleUpdateWorkingHours('friday', earlyHours);
                    handleUpdateWorkingHours('saturday', weekendHours);
                    handleUpdateWorkingHours('sunday', weekendHours);
                  }}
                  className="px-3 py-1 bg-secondary/20 rounded-full"
                >
                  <Text className="text-xs font-medium text-secondary">7-5 Early</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  onPress={() => {
                    const lateHours = { start: '10:00', end: '18:00', enabled: true };
                    const weekendHours = { start: '10:00', end: '16:00', enabled: true };
                    
                    // Update each day individually to trigger Supabase save
                    handleUpdateWorkingHours('monday', lateHours);
                    handleUpdateWorkingHours('tuesday', lateHours);
                    handleUpdateWorkingHours('wednesday', lateHours);
                    handleUpdateWorkingHours('thursday', lateHours);
                    handleUpdateWorkingHours('friday', lateHours);
                    handleUpdateWorkingHours('saturday', weekendHours);
                    handleUpdateWorkingHours('sunday', weekendHours);
                  }}
                  className="px-3 py-1 bg-accent/30 rounded-full"
                >
                  <Text className="text-xs font-medium text-accent-foreground">10-6 Late</Text>
                </TouchableOpacity>
              </View>
            </View>
            
            {/* Individual Day Settings */}
            {Object.entries(weeklySchedule).map(([day, hours]) => (
              <View key={day} className="mb-4 p-3 bg-card rounded-lg border border-border">
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="font-semibold text-foreground capitalize">
                    {day}
                  </Text>
                  <TouchableOpacity
                    onPress={() => handleUpdateWorkingHours(day as keyof WeeklySchedule, {
                      ...hours,
                      enabled: !hours.enabled
                    })}
                    className={cn(
                      "px-3 py-1 rounded-full",
                      hours.enabled ? "bg-primary/20" : "bg-muted"
                    )}
                  >
                    <Text className={cn(
                      "text-xs font-medium",
                      hours.enabled ? "text-primary" : "text-muted-foreground"
                    )}>
                      {hours.enabled ? 'Open' : 'Closed'}
                    </Text>
                  </TouchableOpacity>
                </View>
                
                {hours.enabled && (
                  <View className="flex-row items-center gap-2">
                    <TouchableOpacity
                      onPress={() => handleTimePickerPress(day as keyof WeeklySchedule, 'start')}
                      className="flex-1 p-2 bg-secondary/20 rounded"
                    >
                      <Text className="text-center text-foreground">{hours.start}</Text>
                      <Text className="text-xs text-center text-muted-foreground">Start</Text>
                    </TouchableOpacity>
                    
                    <Text className="text-muted-foreground">to</Text>
                    
                    <TouchableOpacity
                      onPress={() => handleTimePickerPress(day as keyof WeeklySchedule, 'end')}
                      className="flex-1 p-2 bg-secondary/20 rounded"
                    >
                      <Text className="text-center text-foreground">{hours.end}</Text>
                      <Text className="text-xs text-center text-muted-foreground">End</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))}
          </ScrollView>
          
          <AlertDialogFooter>
            <AlertDialogCancel>
              <Text className="font-medium">Cancel</Text>
            </AlertDialogCancel>
            <AlertDialogAction onPress={async () => {
              console.log('Weekly schedule updated:', weeklySchedule);
              
              // Save all days to Supabase
              try {
                await Promise.all(
                  Object.entries(weeklySchedule).map(([day, hours]) => 
                    handleUpdateWorkingHours(day as keyof WeeklySchedule, hours)
                  )
                );
                setShowWeeklyDialog(false);
              } catch (error) {
                console.error('Failed to save weekly schedule:', error);
                // Could add error toast here
              }
            }}>
              <Text className="font-medium">💾 Save Schedule</Text>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Time Slot Management Dialog */}
      <AlertDialog open={showTimeSlotDialog} onOpenChange={setShowTimeSlotDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Manage Time Slot</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedTimeSlot && (
                <>
                  What would you like to do with the {' '}
                  <Text className="font-semibold text-foreground">
                    {timeSlots.find(slot => slot.time === selectedTimeSlot)?.displayTime}
                  </Text>
                  {' '}time slot on {' '}
                  <Text className="font-semibold text-foreground">
                    {selectedDate.toLocaleDateString('en', { 
                      weekday: 'long', 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </Text>?
                  {'\n\n'}
                  {getBookingForTime(selectedTimeSlot) ? (
                    <Text className="text-destructive">⚠️ This slot has an existing booking</Text>
                  ) : getAvailabilityForTime(selectedTimeSlot) ? (
                    <Text className="text-secondary">✅ Currently available for booking</Text>
                  ) : (
                    <Text className="text-muted-foreground">⚪ Currently blocked/unavailable</Text>
                  )}
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2">
            <AlertDialogCancel>
              <Text className="font-medium">Cancel</Text>
            </AlertDialogCancel>
            
            {!getBookingForTime(selectedTimeSlot) && (
              <>
                {getAvailabilityForTime(selectedTimeSlot) ? (
                  <AlertDialogAction onPress={() => handleRemoveAvailability(selectedTimeSlot)}>
                    <Text className="font-medium">❌ Block This Time</Text>
                  </AlertDialogAction>
                ) : (
                  <AlertDialogAction onPress={() => handleAddAvailability(selectedTimeSlot)}>
                    <Text className="font-medium">✅ Make Available</Text>
                  </AlertDialogAction>
                )}
                
                <AlertDialogAction onPress={() => handleAddManualBooking(selectedTimeSlot)}>
                  <Text className="font-medium">📝 Add Manual Booking</Text>
                </AlertDialogAction>
              </>
            )}
            
            {getBookingForTime(selectedTimeSlot) && (
              <AlertDialogAction onPress={() => {
                console.log('Viewing booking details for:', selectedTimeSlot);
                setShowTimeSlotDialog(false);
              }}>
                <Text className="font-medium">👁️ View Booking Details</Text>
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Manual Booking Dialog */}
      <AlertDialog open={showManualBookingDialog} onOpenChange={setShowManualBookingDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Add Manual Booking</AlertDialogTitle>
            <AlertDialogDescription>
              Create a booking for {' '}
              <Text className="font-semibold text-foreground">
                {timeSlots.find(slot => slot.time === selectedTimeSlot)?.displayTime}
              </Text>
              {' '}on {' '}
              <Text className="font-semibold text-foreground">
                {selectedDate.toLocaleDateString('en', { 
                  weekday: 'long', 
                  month: 'short', 
                  day: 'numeric' 
                })}
              </Text>
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <View className="py-4 gap-4">
            <View>
              <Text className="text-sm font-medium text-foreground mb-2">Client Name</Text>
              <Input
                placeholder="Enter client name"
                value={manualBookingData.clientName}
                onChangeText={(text) => setManualBookingData(prev => ({ ...prev, clientName: text }))}
              />
            </View>
            
            <View>
              <Text className="text-sm font-medium text-foreground mb-2">Service Type</Text>
              <Input
                placeholder="Enter service type"
                value={manualBookingData.service}
                onChangeText={(text) => setManualBookingData(prev => ({ ...prev, service: text }))}
              />
            </View>
          </View>
          
          <AlertDialogFooter>
            <AlertDialogCancel>
              <Text className="font-medium">Cancel</Text>
            </AlertDialogCancel>
            <AlertDialogAction onPress={handleSubmitManualBooking}>
              <Text className="font-medium">📝 Create Booking</Text>
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
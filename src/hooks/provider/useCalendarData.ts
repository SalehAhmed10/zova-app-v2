import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth';

// Types
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

// Custom hook for calendar data with optimized React Query usage
export const useCalendarData = () => {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();

  // Provider weekly schedule with optimistic updates
  const {
    data: weeklySchedule,
    isLoading: scheduleLoading,
    error: scheduleError,
    refetch: refetchSchedule,
    isRefetching: isRefetchingSchedule,
  } = useQuery({
    queryKey: ['providerWeeklySchedule', user?.id],
    queryFn: async (): Promise<WeeklySchedule | null> => {
      if (!user?.id) throw new Error('Provider ID is required');

      const { data, error } = await supabase
        .from('provider_schedules')
        .select('schedule_data')
        .eq('provider_id', user.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // No schedule exists yet
        }
        throw error;
      }

      return data?.schedule_data as WeeklySchedule | null;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    refetchOnWindowFocus: false, // Prevent unnecessary refetches
    refetchOnMount: true,
    retry: (failureCount, error: any) => {
      // Don't retry on auth errors
      if (error?.message?.includes('Provider ID is required')) return false;
      return failureCount < 3;
    },
  });

  // Provider bookings with background updates
  const {
    data: bookings = [],
    isLoading: bookingsLoading,
    error: bookingsError,
    refetch: refetchBookings,
    isRefetching: isRefetchingBookings,
  } = useQuery({
    queryKey: ['providerCalendarBookings', user?.id],
    queryFn: async (): Promise<Booking[]> => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          booking_date,
          start_time,
          end_time,
          status,
          total_amount,
          customer:profiles!customer_id (
            first_name,
            last_name
          ),
          service:provider_services!service_id (
            title
          )
        `)
        .eq('provider_id', user.id)
        .eq('status', 'confirmed')
        .gte('booking_date', new Date().toISOString().split('T')[0])
        .order('booking_date', { ascending: true })
        .order('start_time', { ascending: true });

      if (error) throw error;

      return data?.map(booking => {
        const customer = Array.isArray(booking.customer) ? booking.customer[0] : booking.customer;
        const service = Array.isArray(booking.service) ? booking.service[0] : booking.service;

        return {
          id: booking.id,
          date: booking.booking_date,
          startTime: booking.start_time,
          endTime: booking.end_time,
          customerName: customer
            ? `${customer.first_name || 'Unknown'} ${customer.last_name || 'Customer'}`.trim()
            : 'Unknown Customer',
          serviceTitle: service?.title || 'Service',
          status: booking.status,
          amount: booking.total_amount,
        };
      }) || [];
    },
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true, // Keep bookings fresh
    refetchInterval: 30 * 1000, // Background refetch every 30 seconds
    retry: 2,
  });

  // Update schedule mutation with optimistic updates
  const updateScheduleMutation = useMutation({
    mutationFn: async ({
      provider_id,
      schedule_data
    }: {
      provider_id: string;
      schedule_data: WeeklySchedule;
    }) => {
      const { data, error } = await supabase
        .from('provider_schedules')
        .upsert({
          provider_id,
          schedule_data,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'provider_id'
        });

      if (error) throw error;
      return data;
    },
    onMutate: async ({ schedule_data }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['providerWeeklySchedule', user?.id] });

      // Snapshot previous value
      const previousSchedule = queryClient.getQueryData(['providerWeeklySchedule', user?.id]);

      // Optimistically update
      queryClient.setQueryData(['providerWeeklySchedule', user?.id], schedule_data);

      return { previousSchedule };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousSchedule) {
        queryClient.setQueryData(['providerWeeklySchedule', user?.id], context.previousSchedule);
      }
    },
    onSettled: () => {
      // Always refetch after mutation
      queryClient.invalidateQueries({ queryKey: ['providerWeeklySchedule', user?.id] });
    },
  });

  // Computed loading states
  const isLoading = scheduleLoading || bookingsLoading;
  const isRefetching = isRefetchingSchedule || isRefetchingBookings;
  const hasError = !!scheduleError || !!bookingsError;
  const error = scheduleError || bookingsError;

  // Memoized stats calculation
  const stats = useMemo(() => {
    if (!bookings.length) {
      return { today: 0, thisWeek: 0 };
    }

    const today = new Date();
    const todayString = today.toISOString().split('T')[0];

    const todayBookings = bookings.filter((booking) => booking.date === todayString);

    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    const weekBookings = bookings.filter((booking) => {
      const bookingDate = new Date(booking.date);
      return bookingDate >= weekStart && bookingDate <= weekEnd;
    });

    return {
      today: todayBookings.length,
      thisWeek: weekBookings.length
    };
  }, [bookings]);

  // Refetch all data
  const refetchAll = async () => {
    await Promise.all([
      refetchSchedule(),
      refetchBookings(),
    ]);
  };

  return {
    // Data
    weeklySchedule,
    bookings,
    stats,

    // Loading states
    isLoading,
    isRefetching,
    scheduleLoading,
    bookingsLoading,

    // Error states
    hasError,
    error,
    scheduleError,
    bookingsError,

    // Actions
    refetchAll,
    refetchSchedule,
    refetchBookings,
    updateScheduleMutation,
  };
};

// Hook for calendar time slots generation
export const useCalendarTimeSlots = (selectedDate: Date, weeklySchedule: WeeklySchedule | null | undefined) => {
  return useMemo(() => {
    if (!weeklySchedule) return [];

    const dayName = selectedDate.toLocaleDateString('en', { weekday: 'long' }).toLowerCase() as keyof WeeklySchedule;
    const daySchedule = weeklySchedule[dayName];

    if (!daySchedule || !daySchedule.enabled) return [];

    const startHour = parseInt(daySchedule.start.split(':')[0]);
    const endHour = parseInt(daySchedule.end.split(':')[0]);

    const slots = [];
    const now = new Date();
    const isToday = selectedDate.toDateString() === now.toDateString();
    const currentHour = now.getHours();

    for (let hour = startHour; hour < endHour; hour++) {
      // Skip past hours for today
      if (isToday && hour <= currentHour) continue;

      slots.push({
        time: `${hour.toString().padStart(2, '0')}:00`,
        displayTime: hour > 12 ? `${hour - 12}:00 PM` : hour === 12 ? '12:00 PM' : `${hour}:00 AM`,
        isAvailable: true,
      });
    }

    return slots;
  }, [selectedDate, weeklySchedule]);
};

// Hook for calendar week data
export const useCalendarWeekData = (selectedDate: Date, bookings: Booking[], weeklySchedule: WeeklySchedule | null | undefined) => {
  return useMemo(() => {
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

    return weekDays.map((day) => {
      const dayBookings = bookings.filter((booking) => booking.date === day.toISOString().split('T')[0]);
      const dayName = day.toLocaleDateString('en', { weekday: 'long' }).toLowerCase() as keyof WeeklySchedule;
      const daySchedule = weeklySchedule?.[dayName];
      const isToday = day.toDateString() === new Date().toDateString();
      const isPastDay = day < new Date(new Date().setHours(0, 0, 0, 0));

      return {
        day,
        dayBookings,
        dayName,
        daySchedule,
        isToday,
        isPastDay,
        totalBookings: dayBookings.length,
        availableHours: daySchedule?.enabled ? `${daySchedule.start} - ${daySchedule.end}` : 'Closed',
      };
    });
  }, [selectedDate, bookings, weeklySchedule]);
};
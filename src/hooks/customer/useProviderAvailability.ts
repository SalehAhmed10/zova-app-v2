/**
 * Provider Availability Hook - Updated to use provider_schedules and provider_availability tables
 * ✅ React Query + Zustand architecture
 * ✅ NO useEffect patterns
 * ✅ Uses actual provider schedule data from database
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

// Helper function to add minutes to a time string (HH:MM format)
function addMinutesToTime(time: string, minutes: number): string {
  const [hours, mins] = time.split(':').map(Number);
  const totalMinutes = hours * 60 + mins + minutes;
  const newHours = Math.floor(totalMinutes / 60) % 24;
  const newMinutes = totalMinutes % 60;
  return `${newHours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}`;
}

export interface AvailabilitySlot {
  date: string;
  time: string;
  available: boolean;
  bookingId?: string;
}

export interface ProviderAvailability {
  providerId: string;
  date: string;
  availableSlots: AvailabilitySlot[];
  isFullyBooked: boolean;
}

export interface ProviderSchedule {
  id: string;
  provider_id: string;
  schedule_data: {
    monday?: { start: string; end: string; enabled: boolean };
    tuesday?: { start: string; end: string; enabled: boolean };
    wednesday?: { start: string; end: string; enabled: boolean };
    thursday?: { start: string; end: string; enabled: boolean };
    friday?: { start: string; end: string; enabled: boolean };
    saturday?: { start: string; end: string; enabled: boolean };
    sunday?: { start: string; end: string; enabled: boolean };
  };
  created_at: string;
  updated_at: string;
}

/**
 * Hook to fetch provider's regular schedule (weekly recurring)
 */
export function useProviderSchedule(providerId: string) {
  return useQuery({
    queryKey: ['provider-schedule', providerId],
    queryFn: async (): Promise<ProviderSchedule | null> => {
      if (!providerId) return null;

      console.log('[useProviderSchedule] Fetching schedule for provider:', providerId);

      // Use edge function to bypass RLS
      const { data, error } = await supabase.functions.invoke('get-provider-schedule', {
        body: { providerId }
      });

      if (error) {
        console.error('Error fetching provider schedule:', error);
        return null;
      }

      console.log('[useProviderSchedule] Raw response:', data);
      console.log('[useProviderSchedule] Schedule data received:', data?.schedule);
      console.log('[useProviderSchedule] Schedule data keys:', data?.schedule ? Object.keys(data.schedule.schedule_data || {}) : 'no schedule_data');
      return data?.schedule || null;
    },
    enabled: !!providerId,
  });
}

/**
 * Hook to check provider availability for a specific date
 * Now uses Edge Function to bypass RLS and get proper availability data
 */
export function useProviderAvailability(providerId: string, date: string) {
  return useQuery({
    queryKey: ['provider', 'availability', providerId, date],
    queryFn: async (): Promise<ProviderAvailability> => {
      if (!providerId || !date) {
        return {
          providerId: providerId || '',
          date,
          availableSlots: [],
          isFullyBooked: true,
        };
      }

      try {
        console.log('[useProviderAvailability] Fetching availability for provider:', providerId, 'on date:', date);

        // Use edge function to bypass RLS and get availability data
        const { data, error } = await supabase.functions.invoke('get-provider-availability', {
          body: { providerId, date }
        });

        if (error) {
          console.error('Error fetching provider availability:', error);
          return {
            providerId,
            date,
            availableSlots: [],
            isFullyBooked: true,
          };
        }

        console.log('[useProviderAvailability] Availability data:', data);
        return data || {
          providerId,
          date,
          availableSlots: [],
          isFullyBooked: true,
        };
      } catch (error) {
        console.error('Error in useProviderAvailability:', error);
        return {
          providerId,
          date,
          availableSlots: [],
          isFullyBooked: true,
        };
      }
    },
    enabled: !!providerId && !!date,
  });
}

/**
 * Interface for provider blackout periods
 */
export interface ProviderBlackout {
  id: string;
  start_date: string;
  end_date: string;
  reason: string | null;
  provider_id: string;
}

/**
 * Hook to fetch provider blackout dates
 * Uses Edge Function to bypass RLS
 */
export function useProviderBlackouts(providerId: string) {
  return useQuery({
    queryKey: ['provider-blackouts', providerId],
    queryFn: async (): Promise<string[]> => {
      if (!providerId) return [];

      try {
        console.log('[useProviderBlackouts] Fetching blackouts for provider:', providerId);

        // Use edge function to bypass RLS
        const { data, error } = await supabase.functions.invoke('get-provider-blackouts', {
          body: { providerId }
        });

        if (error) {
          console.error('Error fetching provider blackouts:', error);
          return [];
        }

        const disabledDates = data?.disabledDates || [];
        console.log('[useProviderBlackouts] Disabled dates:', disabledDates);
        return disabledDates;
      } catch (error) {
        console.error('Error in useProviderBlackouts:', error);
        return [];
      }
    },
    enabled: !!providerId,
    staleTime: 5 * 60 * 1000, // 5 minutes - blackouts don't change frequently
  });
}

/**
 * Hook to check if a specific time slot is available
 */
export function useTimeSlotAvailability(providerId: string, date: string, time: string, duration: number = 60) {
  return useQuery({
    queryKey: ['time-slot-availability', providerId, date, time, duration],
    queryFn: async (): Promise<boolean> => {
      if (!providerId || !date || !time || !duration) return false;

      try {
        // Get provider's schedule data
        const { data: schedule, error: scheduleError } = await supabase
          .from('provider_schedules')
          .select('schedule_data')
          .eq('provider_id', providerId)
          .maybeSingle();

        if (scheduleError || !schedule) {
          return false; // No schedule found
        }

        // Parse the day of week and get schedule for that day
        const dayOfWeek = new Date(date).toLocaleString('en-US', { weekday: 'long' }).toLowerCase();
        const daySchedule = schedule.schedule_data[dayOfWeek];

        if (!daySchedule || !daySchedule.enabled) {
          return false; // Provider not available on this day
        }

        // Check if requested time is within schedule hours
        const requestedStart = time;
        const requestedEnd = addMinutesToTime(time, duration);

        if (requestedStart < daySchedule.start || requestedEnd > daySchedule.end) {
          return false; // Outside regular hours
        }

        // Check for weekly availability overrides
        const { data: weeklyOverrides } = await supabase
          .from('provider_availability')
          .select('*')
          .eq('provider_id', providerId)
          .eq('day_of_week', dayOfWeek)
          .eq('is_active', true);

        // Apply weekly overrides if any
        let effectiveStart = daySchedule.start;
        let effectiveEnd = daySchedule.end;
        if (weeklyOverrides && weeklyOverrides.length > 0) {
          const override = weeklyOverrides[0];
          effectiveStart = override.start_time;
          effectiveEnd = override.end_time;
        }

        if (requestedStart < effectiveStart || requestedEnd > effectiveEnd) {
          return false; // Outside effective hours
        }

        // Check for conflicting bookings
        const { data: bookings, error: bookingsError } = await supabase
          .from('bookings')
          .select('start_time, end_time')
          .eq('provider_id', providerId)
          .eq('booking_date', date)
          .in('status', ['confirmed', 'in_progress']);

        if (bookingsError) {
          console.error('Error checking bookings:', bookingsError);
          return false;
        }

        // Check for time conflicts with existing bookings
        for (const booking of bookings || []) {
          const bookingStart = booking.start_time;
          const bookingEnd = booking.end_time || addMinutesToTime(bookingStart, 60); // Default 1 hour if no end_time

          // Check if requested time overlaps with existing booking
          if (requestedStart < bookingEnd && requestedEnd > bookingStart) {
            return false; // Time conflict
          }
        }

        return true; // Available
      } catch (error) {
        console.error('Error checking time slot availability:', error);
        return false;
      }
    },
    enabled: !!providerId && !!date && !!time && !!duration,
  });
}

/**
 * Utility function to check provider availability for a specific date
 */
async function checkProviderAvailability(providerId: string, date: string): Promise<ProviderAvailability> {
  try {
    // Use the already imported supabase instance
    // Get provider schedule
    const { data: schedule } = await supabase
      .from('provider_schedules')
      .select('schedule_data')
      .eq('provider_id', providerId)
      .maybeSingle();

    if (!schedule?.schedule_data) {
      return {
        providerId,
        date,
        availableSlots: [],
        isFullyBooked: true,
      };
    }

    // Parse the schedule data for the specific day
    const dayOfWeek = new Date(date).toLocaleString('en-US', { weekday: 'long' }).toLowerCase();
    const daySchedule = schedule.schedule_data[dayOfWeek];

    if (!daySchedule?.enabled) {
      return {
        providerId,
        date,
        availableSlots: [],
        isFullyBooked: true,
      };
    }

    // Check for availability overrides for this day of week
    const { data: override } = await supabase
      .from('provider_availability')
      .select('*')
      .eq('provider_id', providerId)
      .eq('day_of_week', dayOfWeek)
      .single();

    if (override && !override.is_active) {
      return {
        providerId,
        date,
        availableSlots: [],
        isFullyBooked: true,
      };
    }

    // Generate time slots based on schedule
    const slots: AvailabilitySlot[] = [];
    const startTime = daySchedule.start;
    const endTime = daySchedule.end;
    const slotDuration = 60; // 1 hour slots

    let currentTime = startTime;
    while (currentTime < endTime) {
      slots.push({
        date,
        time: currentTime,
        available: true,
      });
      // Add slot duration
      const [hours, minutes] = currentTime.split(':').map(Number);
      const totalMinutes = hours * 60 + minutes + slotDuration;
      const newHours = Math.floor(totalMinutes / 60);
      const newMinutes = totalMinutes % 60;
      currentTime = `${newHours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}`;
    }

    // Check existing bookings for this date
    const { data: bookings } = await supabase
      .from('bookings')
      .select('start_time, duration')
      .eq('provider_id', providerId)
      .eq('date', date)
      .eq('status', 'confirmed');

    // Filter out booked slots
    const availableSlots = slots.filter(slot => {
      const slotStart = slot.time;
      const [slotHours, slotMinutes] = slotStart.split(':').map(Number);
      const slotStartMinutes = slotHours * 60 + slotMinutes;

      const isBooked = bookings?.some(booking => {
        const [bookingHours, bookingMinutes] = booking.start_time.split(':').map(Number);
        const bookingStartMinutes = bookingHours * 60 + bookingMinutes;
        const bookingEndMinutes = bookingStartMinutes + (booking.duration || 60);

        return slotStartMinutes < bookingEndMinutes && (slotStartMinutes + 60) > bookingStartMinutes;
      });

      return !isBooked;
    });

    return {
      providerId,
      date,
      availableSlots,
      isFullyBooked: availableSlots.length === 0,
    };
  } catch (error) {
    console.error('Error checking provider availability:', error);
    return {
      providerId,
      date,
      availableSlots: [],
      isFullyBooked: true,
    };
  }
}

/**
 * Hook to check multiple providers' availability for a specific date
 */
export function useMultipleProvidersAvailability(providerIds: string[], date: string) {
  return useQuery({
    queryKey: ['providers', 'availability', providerIds, date],
    queryFn: async (): Promise<Record<string, ProviderAvailability>> => {
      const results: Record<string, ProviderAvailability> = {};

      // Process providers in batches to avoid too many concurrent requests
      const batchSize = 5;
      for (let i = 0; i < providerIds.length; i += batchSize) {
        const batch = providerIds.slice(i, i + batchSize);

        const batchPromises = batch.map(async (providerId) => {
          try {
            const availability = await checkProviderAvailability(providerId, date);
            results[providerId] = availability;
          } catch (error) {
            console.error(`Error checking availability for provider ${providerId}:`, error);
            results[providerId] = {
              providerId,
              date,
              availableSlots: [],
              isFullyBooked: true,
            };
          }
        });

        await Promise.all(batchPromises);
      }

      return results;
    },
    enabled: providerIds.length > 0 && !!date,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });
}
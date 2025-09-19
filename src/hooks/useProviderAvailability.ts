import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface ProviderAvailability {
  id: string;
  provider_id: string;
  day_of_week: number; // 0 = Sunday, 1 = Monday, etc.
  start_time: string;
  end_time: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TimeSlotData {
  date: string;
  start_time: string;
  end_time: string;
  service_type?: string;
  notes?: string;
  is_available: boolean;
}

export interface BulkTimeSlotData {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
}

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function useProviderAvailability() {
  const [availability, setAvailability] = useState<ProviderAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get current user/provider ID
  const getCurrentProviderId = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id;
  }, []);

  // Fetch provider availability
  const fetchAvailability = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const providerId = await getCurrentProviderId();
      if (!providerId) {
        throw new Error('No authenticated user found');
      }

      const { data, error: fetchError } = await supabase
        .from('provider_availability')
        .select('*')
        .eq('provider_id', providerId)
        .order('day_of_week', { ascending: true })
        .order('start_time', { ascending: true });

      if (fetchError) {
        throw fetchError;
      }

      setAvailability(data || []);
    } catch (err) {
      console.error('Error fetching availability:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch availability');
    } finally {
      setLoading(false);
    }
  }, [getCurrentProviderId]);

  // Add new time slot (single slot with proper date handling)
  const addTimeSlot = useCallback(async (data: {
    dayOfWeek: number;
    startTime: string;
    endTime: string;
  }) => {
    try {
      setError(null);

      const providerId = await getCurrentProviderId();
      if (!providerId) {
        throw new Error('No authenticated user found');
      }

      // Enhanced date parsing with timezone handling
      const today = new Date();
      const testDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      
      // Find the next occurrence of the target day
      const daysUntilTarget = (data.dayOfWeek - testDate.getDay() + 7) % 7;
      const targetDate = new Date(testDate);
      targetDate.setDate(testDate.getDate() + daysUntilTarget);
      
      const calculatedDayOfWeek = targetDate.getDay();
      
      console.log(`Adding slot for day ${data.dayOfWeek}:`);
      console.log(`- Target date: ${targetDate.toISOString().split('T')[0]}`);
      console.log(`- Calculated day_of_week: ${calculatedDayOfWeek}`);
      console.log(`- Day name: ${dayNames[calculatedDayOfWeek]}`);

      const newSlot = {
        provider_id: providerId,
        day_of_week: calculatedDayOfWeek,
        start_time: data.startTime,
        end_time: data.endTime,
        is_active: true,
      };

      const { data: insertedData, error: insertError } = await supabase
        .from('provider_availability')
        .insert([newSlot])
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      // Update local state
      setAvailability(prev => [...prev, insertedData]);
      
      return { success: true, data: insertedData };
    } catch (err) {
      console.error('Error adding time slot:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to add time slot';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, [getCurrentProviderId]);

  // Add bulk time slots (for weekly patterns like Mon-Fri 9-5)
  const addBulkTimeSlots = useCallback(async (slots: BulkTimeSlotData[]) => {
    try {
      setError(null);

      const providerId = await getCurrentProviderId();
      if (!providerId) {
        throw new Error('No authenticated user found');
      }

      const slotsToInsert = slots.map(slot => ({
        provider_id: providerId,
        day_of_week: slot.dayOfWeek,
        start_time: slot.startTime,
        end_time: slot.endTime,
        is_active: slot.isActive,
      }));

      const { data: insertedData, error: insertError } = await supabase
        .from('provider_availability')
        .insert(slotsToInsert)
        .select();

      if (insertError) {
        throw insertError;
      }

      // Update local state
      setAvailability(prev => [...prev, ...(insertedData || [])]);
      
      return { success: true, data: insertedData };
    } catch (err) {
      console.error('Error adding bulk time slots:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to add bulk time slots';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, [getCurrentProviderId]);

  // Edit existing time slot
  const editTimeSlot = useCallback(async (slotId: string, updates: {
    day_of_week?: number;
    start_time?: string;
    end_time?: string;
    is_active?: boolean;
  }) => {
    try {
      setError(null);

      const { data: updatedData, error: updateError } = await supabase
        .from('provider_availability')
        .update(updates)
        .eq('id', slotId)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      // Update local state
      setAvailability(prev => 
        prev.map(slot => slot.id === slotId ? updatedData : slot)
      );

      return { success: true, data: updatedData };
    } catch (err) {
      console.error('Error editing time slot:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to edit time slot';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, []);

  // Delete time slot
  const deleteTimeSlot = useCallback(async (slotId: string) => {
    try {
      setError(null);

      const { error: deleteError } = await supabase
        .from('provider_availability')
        .delete()
        .eq('id', slotId);

      if (deleteError) {
        throw deleteError;
      }

      // Update local state
      setAvailability(prev => prev.filter(slot => slot.id !== slotId));

      return { success: true };
    } catch (err) {
      console.error('Error deleting time slot:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete time slot';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, []);

  // Legacy method for backward compatibility
  const updateTimeSlot = useCallback(async (id: string, updates: Partial<ProviderAvailability>) => {
    return await editTimeSlot(id, updates);
  }, [editTimeSlot]);

  // Get availability for a specific day of week
  const getAvailabilityForDay = useCallback((dayOfWeek: number) => {
    return availability.filter(slot => slot.day_of_week === dayOfWeek);
  }, [availability]);

  // Get availability for a specific date
  const getAvailabilityForDate = useCallback((date: string) => {
    const dateObj = new Date(date);
    const dayOfWeek = dateObj.getDay();
    return getAvailabilityForDay(dayOfWeek);
  }, [getAvailabilityForDay]);

  // Check if provider is available at a specific time
  const isAvailableAtTime = useCallback((date: string, time: string) => {
    const slotsForDate = getAvailabilityForDate(date);
    
    return slotsForDate.some(slot => {
      const slotStart = slot.start_time;
      const slotEnd = slot.end_time;
      return time >= slotStart && time <= slotEnd && slot.is_active;
    });
  }, [getAvailabilityForDate]);

  // Initialize data on mount
  useEffect(() => {
    fetchAvailability();
  }, [fetchAvailability]);

  return {
    availability,
    loading,
    error,
    // New methods
    addTimeSlot,
    addBulkTimeSlots,
    editTimeSlot,
    deleteTimeSlot,
    // Legacy methods (for backward compatibility)
    updateTimeSlot,
    // Utility methods
    getAvailabilityForDay,
    getAvailabilityForDate,
    isAvailableAtTime,
    refetch: fetchAvailability,
  };
}
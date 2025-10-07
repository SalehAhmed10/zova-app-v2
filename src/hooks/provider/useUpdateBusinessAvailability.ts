import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/core/supabase';

export interface UpdateBusinessAvailabilityParams {
  providerId: string;
  isPaused: boolean;
  availabilityMessage?: string;
  pauseUntil?: string;
}

export const useUpdateBusinessAvailability = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      providerId,
      isPaused,
      availabilityMessage,
      pauseUntil
    }: UpdateBusinessAvailabilityParams) => {
      if (!providerId) {
        throw new Error('Provider ID is required');
      }

      console.log('Updating business availability:', {
        providerId,
        isPaused,
        availabilityMessage,
        pauseUntil
      });

      // Update the profiles table
      const updateData: any = {
        availability_status: isPaused ? 'unavailable' : 'available',
        updated_at: new Date().toISOString(),
      };

      if (availabilityMessage !== undefined) {
        updateData.availability_message = availabilityMessage;
      }

      // Handle pause_until logic
      if (isPaused) {
        // When pausing, set pause_until if provided
        if (pauseUntil !== undefined) {
          updateData.pause_until = pauseUntil;
        }
      } else {
        // When resuming, always clear pause_until
        updateData.pause_until = null;
      }

      const { data, error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', providerId)
        .eq('role', 'provider')
        .select('availability_status, availability_message, pause_until')
        .single();

      if (error) {
        console.error('Error updating business availability:', error);
        throw new Error(`Failed to update business availability: ${error.message}`);
      }

      console.log('Business availability updated successfully:', data);
      return data;
    },
    onSuccess: (data, variables) => {
      // Invalidate and refetch the business availability query
      queryClient.invalidateQueries({
        queryKey: ['businessAvailability', variables.providerId]
      });

      // Also invalidate provider profile queries that might include availability
      queryClient.invalidateQueries({
        queryKey: ['providerProfile', variables.providerId]
      });
    },
    onError: (error, variables) => {
      console.error('Mutation error for business availability update:', error);
    },
  });
};
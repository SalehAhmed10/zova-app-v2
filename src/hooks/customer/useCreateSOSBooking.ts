/**
 * SOS Booking Creation Hook
 * 
 * Creates emergency bookings with instant confirmation and priority handling.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/core/supabase';

export interface CreateSOSBookingParams {
  providerId: string;
  categoryId: string;
  emergencyDescription: string;
  serviceLocation: string;
  urgencyLevel: 'low' | 'medium' | 'high';
  paymentIntentId: string; // REQUIRED: Payment must be processed first
}

export interface SOSBooking {
  id: string;
  provider_id: string;
  customer_id: string;
  service_type: string;
  emergency_description: string;
  service_location: string;
  urgency_level: string;
  status: 'confirmed' | 'en_route' | 'in_progress' | 'completed';
  estimated_arrival?: string;
  created_at: string;
  sos_booking: boolean;
}

/**
 * Hook to create SOS emergency bookings
 */
export function useCreateSOSBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: CreateSOSBookingParams): Promise<SOSBooking> => {
      // Call our Supabase Edge Function for SOS booking creation with payment processing
      const { data, error } = await supabase.functions.invoke('create-sos-booking', {
        body: {
          provider_id: params.providerId,
          category_id: params.categoryId,
          emergency_description: params.emergencyDescription,
          service_location: params.serviceLocation,
          urgency_level: params.urgencyLevel,
          payment_intent_id: params.paymentIntentId, // CRITICAL: Include payment intent
          instant_confirmation: true
        }
      });

      if (error) {
        console.error('Error creating SOS booking:', error);
        throw new Error(error.message || 'Failed to create emergency booking');
      }

      if (!data?.booking) {
        throw new Error('No booking data returned');
      }

      return {
        id: data.booking.id,
        provider_id: data.booking.provider_id,
        customer_id: data.booking.customer_id,
        service_type: data.booking.service_type,
        emergency_description: data.booking.emergency_description,
        service_location: data.booking.service_location,
        urgency_level: data.booking.urgency_level,
        status: data.booking.status || 'confirmed',
        estimated_arrival: data.booking.estimated_arrival,
        created_at: data.booking.created_at,
        sos_booking: true
      };
    },
    onSuccess: (booking) => {
      // Invalidate relevant queries to refresh UI
      queryClient.invalidateQueries({ queryKey: ['customer-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['sos-providers'] });
      
      console.log('SOS booking created successfully:', booking.id);
    },
    onError: (error) => {
      console.error('SOS booking creation failed:', error);
    }
  });
}
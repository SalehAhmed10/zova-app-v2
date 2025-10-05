/**
 * SOS Provider Matching Hook
 * 
 * Finds immediately available providers for emergency bookings
 * with priority matching based on location, rating, and availability.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/core/supabase';

export interface SOSProvider {
  id: string;
  name: string;
  avatar_url?: string;
  rating?: string; // Formatted to 1 decimal place
  review_count?: number;
  estimated_arrival: string;
  completed_jobs?: number;
  distance_km?: number;
  is_verified: boolean;
  emergency_available: boolean;
}

/**
 * Hook to find available SOS providers for emergency booking
 */
export function useSOSProviders(categoryId: string, address: string) {
  return useQuery({
    queryKey: ['sos-providers', categoryId, address],
    queryFn: async (): Promise<SOSProvider[]> => {
      if (!categoryId || !address) {
        console.log('🚨 [useSOSProviders] Missing required params:', { categoryId, address });
        return [];
      }

      console.log('🚨 [useSOSProviders] Calling edge function with:', { 
        category_id: categoryId, 
        service_location: address 
      });

      // Call our Supabase Edge Function for SOS provider matching
      const { data, error } = await supabase.functions.invoke('find-sos-providers', {
        body: {
          category_id: categoryId,
          service_location: address,
          emergency_mode: true,
          max_distance_km: 15, // 15km radius for emergencies
          priority_matching: true
        }
      });

      if (error) {
        console.error('🚨 [useSOSProviders] Edge function error:', error);
        throw new Error('Failed to find emergency providers');
      }

      console.log('🚨 [useSOSProviders] Edge function response:', { 
        providersCount: data?.providers?.length || 0,
        data: data
      });

      // Transform the response to our SOSProvider interface
      const transformedProviders = (data?.providers || []).map((provider: any) => ({
        id: provider.id,
        name: provider.name || provider.business_name || 'Provider',
        avatar_url: provider.profile_picture_url,
        rating: provider.average_rating ? Number(provider.average_rating).toFixed(1) : undefined,
        review_count: provider.review_count || 0,
        estimated_arrival: provider.estimated_arrival || `${Math.ceil((provider.distance_km || 2) * 2)} min`,
        completed_jobs: provider.completed_emergency_jobs || 0,
        distance_km: provider.distance_km,
        is_verified: provider.is_verified || false,
        emergency_available: provider.emergency_available || false
      }));

      console.log('🚨 [useSOSProviders] Transformed providers:', transformedProviders);
      return transformedProviders;
    },
    enabled: Boolean(categoryId && address),
    staleTime: 30 * 1000, // 30 seconds - fresh data for emergencies
    refetchInterval: 60 * 1000, // Auto-refresh every minute
    retry: 3,
    retryDelay: 1000
  });
}
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/core/supabase';

// Types
interface ServiceSubcategory {
  id: string;
  name: string;
  description: string;
  requires_certification: boolean;
}

interface Category {
  id: string;
  name: string;
  description: string;
  icon: string;
}

// ✅ REACT QUERY: Fetch service subcategories by category
export const useServiceSubcategories = (categoryId?: string) => {
  return useQuery({
    queryKey: ['service-subcategories', categoryId],
    queryFn: async () => {
      if (!categoryId) return [];
      
      console.log('[ServiceQueries] Fetching subcategories for category:', categoryId);
      
      const { data, error } = await supabase
        .from('service_subcategories')
        .select('*')
        .eq('category_id', categoryId)
        .order('name');

      if (error) {
        console.error('[ServiceQueries] Error fetching subcategories:', error);
        throw error;
      }

      console.log('[ServiceQueries] Fetched subcategories:', data?.length || 0);
      return data as ServiceSubcategory[];
    },
    enabled: !!categoryId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

// ✅ REACT QUERY: Fetch all categories
export const useCategories = () => {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      console.log('[ServiceQueries] Fetching categories');
      
      const { data, error } = await supabase
        .from('service_categories')
        .select('*')
        .order('name');

      if (error) {
        console.error('[ServiceQueries] Error fetching categories:', error);
        throw error;
      }

      console.log('[ServiceQueries] Fetched categories:', data?.length || 0);
      return data as Category[];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 20 * 60 * 1000, // 20 minutes
  });
};

// ✅ REACT QUERY: Save provider verification step data
export const useSaveVerificationStep = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      providerId: string;
      step: string;
      data: any;
    }) => {
      const { providerId, step, data } = params;
      
      console.log('[VerificationMutation] Saving step:', step, 'for provider:', providerId);
      
      const { error } = await supabase
        .from('provider_verification_steps')
        .upsert({
          provider_id: providerId,
          step_name: step,
          step_data: data,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (error) {
        console.error('[VerificationMutation] Error saving step:', error);
        throw error;
      }

      console.log('[VerificationMutation] Step saved successfully');
      return { success: true };
    },
    onSuccess: () => {
      // Invalidate verification-related queries
      queryClient.invalidateQueries({ queryKey: ['provider-verification'] });
    },
  });
};

// ✅ REACT QUERY: Fetch provider verification progress
export const useProviderVerificationProgress = (providerId?: string) => {
  return useQuery({
    queryKey: ['provider-verification', providerId],
    queryFn: async () => {
      if (!providerId) throw new Error('Provider ID required');
      
      console.log('[VerificationQuery] Fetching verification progress for:', providerId);
      
      const { data, error } = await supabase
        .from('provider_verification_steps')
        .select('*')
        .eq('provider_id', providerId);

      if (error) {
        console.error('[VerificationQuery] Error fetching verification progress:', error);
        throw error;
      }

      console.log('[VerificationQuery] Fetched verification steps:', data?.length || 0);
      return data || [];
    },
    enabled: !!providerId,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 60 * 1000, // 1 minute
  });
};
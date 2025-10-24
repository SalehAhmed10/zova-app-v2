import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useProviderVerificationStore } from '@/stores/verification/provider-verification';


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


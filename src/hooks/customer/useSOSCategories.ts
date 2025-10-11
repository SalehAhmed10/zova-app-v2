/**
 * SOS Categories Hook
 * 
 * Fetches real service categories and subcategories from Supabase
 * for SOS emergency booking functionality.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface SOSSubcategory {
  id: string;
  name: string;
  category_id: string;
  urgency: 'low' | 'medium' | 'high';
}

export interface SOSCategory {
  id: string;
  name: string;
  description: string;
  icon_url: string;
  subcategories: SOSSubcategory[];
}

/**
 * Hook to fetch SOS-enabled categories and subcategories
 */
export function useSOSCategories() {
  return useQuery({
    queryKey: ['sos-categories'],
    queryFn: async (): Promise<SOSCategory[]> => {
      const { data, error } = await supabase
        .from('service_categories')
        .select(`
          id,
          name,
          description,
          icon_url,
          service_subcategories!inner (
            id,
            name,
            category_id
          )
        `)
        .eq('is_active', true)
        .eq('service_subcategories.is_active', true)
        .order('sort_order', { ascending: true });

      if (error) {
        console.error('Error fetching SOS categories:', error);
        throw new Error('Failed to fetch emergency service categories');
      }

      // Transform the data and add urgency levels based on service type
      return (data || []).map((category: any) => {
        const subcategories = category.service_subcategories.map((sub: any) => ({
          id: sub.id,
          name: sub.name,
          category_id: sub.category_id,
          // Assign urgency based on service type for SOS
          urgency: getSubcategoryUrgency(sub.name) as 'low' | 'medium' | 'high'
        }));

        return {
          id: category.id,
          name: category.name,
          description: category.description,
          icon_url: category.icon_url,
          subcategories
        };
      });
    },
    staleTime: 10 * 60 * 1000, // 10 minutes - categories don't change often
    retry: 2
  });
}

/**
 * Helper function to determine urgency level for different service types
 */
function getSubcategoryUrgency(subcategoryName: string): 'low' | 'medium' | 'high' {
  const name = subcategoryName.toLowerCase();
  
  // High urgency services (time-sensitive events/occasions)
  if (name.includes('makeup') || 
      name.includes('hair') || 
      name.includes('photographer') || 
      name.includes('event planner') ||
      name.includes('dj')) {
    return 'high';
  }
  
  // Medium urgency services (can wait a bit but still needed soon)
  if (name.includes('nails') || 
      name.includes('lashes') || 
      name.includes('brows') ||
      name.includes('host') ||
      name.includes('mc')) {
    return 'medium';
  }
  
  // Low urgency services (flexible timing)
  return 'low';
}

/**
 * Hook to get flattened list of SOS subcategories for easy selection
 */
export function useSOSSubcategories() {
  const { data: categories, ...rest } = useSOSCategories();
  
  const subcategories = categories?.flatMap(category => 
    category.subcategories.map(sub => ({
      ...sub,
      category_name: category.name,
      category_icon: category.icon_url
    }))
  ) || [];

  return {
    data: subcategories,
    ...rest
  };
}
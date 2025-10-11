// Updated customer hooks to use provider_onboarding_progress table
// This replaces the old verification_status field in profiles
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export const useProviders = (limit: number = 20) => {
  return useQuery({
    queryKey: ['providers', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          first_name,
          last_name,
          business_name,
          avatar_url,
          bio,
          availability_status,
          is_business_visible,
          created_at,
          coordinates,
          provider_onboarding_progress!inner (
            verification_status
          ),
          reviews!reviews_provider_id_fkey (
            rating
          )
        `)
        .eq('role', 'provider')
        .eq('is_business_visible', true)
        .eq('provider_onboarding_progress.verification_status', 'approved')
        .eq('availability_status', 'available')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      // Calculate average rating for each provider
      const providersWithRatings = data?.map(provider => {
        const reviews = provider.reviews || [];
        const avgRating = reviews.length > 0
          ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
          : null;

        return {
          ...provider,
          verification_status: provider.provider_onboarding_progress?.[0]?.verification_status || 'pending',
          avg_rating: avgRating,
        };
      });

      return providersWithRatings;
    },
  });
};

// Hook to get provider verification status
export const useProviderVerificationStatus = (providerId: string) => {
  return useQuery({
    queryKey: ['provider-verification-status', providerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('provider_onboarding_progress')
        .select(`
          verification_status,
          approved_at,
          rejected_at,
          rejection_reason,
          created_at,
          updated_at
        `)
        .eq('provider_id', providerId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!providerId,
  });
};

// Hook to update provider verification status (admin only)
export const useUpdateProviderVerificationStatus = () => {
  return useMutation({
    mutationFn: async ({
      providerId,
      status,
      rejectionReason,
      notes
    }: {
      providerId: string;
      status: 'approved' | 'rejected' | 'in_review';
      rejectionReason?: string;
      notes?: string;
    }) => {
      const updateData: any = {
        verification_status: status,
        updated_at: new Date().toISOString(),
      };

      if (status === 'approved') {
        updateData.approved_at = new Date().toISOString();
      } else if (status === 'rejected') {
        updateData.rejected_at = new Date().toISOString();
        updateData.rejection_reason = rejectionReason;
      }

      const { data, error } = await supabase
        .from('provider_onboarding_progress')
        .upsert({
          provider_id: providerId,
          ...updateData,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
  });
};
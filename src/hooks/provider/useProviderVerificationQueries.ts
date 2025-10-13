import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useProviderVerificationStore } from '@/stores/verification/provider-verification';

// Step name to number mapping
const STEP_MAPPING: Record<string, number> = {
  'document': 1,
  'selfie': 2,
  'business-info': 3,
  'category': 4,
  'services': 5,
  'portfolio': 6,
  'bio': 7,
  'terms': 8,
  'payment': 9,
};

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
      step: string | number;
      data: any;
    }) => {
      const { providerId, step, data } = params;
      
      console.log('[VerificationMutation] Saving step:', step, 'for provider:', providerId);
      
      // Update profile with verification data based on step
      if (step === 'business-info' || step === 3) {
        const { error } = await supabase
          .from('profiles')
          .update({
            business_name: data.businessName,
            phone_number: data.phoneNumber,
            country_code: data.countryCode,
            address: data.address,
            city: data.city,
            postal_code: data.postalCode,
            updated_at: new Date().toISOString(),
          })
          .eq('id', providerId);

        if (error) {
          console.error('[VerificationMutation] Error saving business info:', error);
          throw error;
        }
      }
      
      // ✅ TERMS STEP: Save terms data to provider_business_terms table
      if (step === 'terms' || step === 8) {
        const { error } = await supabase
          .from('provider_business_terms')
          .upsert({
            provider_id: providerId,
            deposit_percentage: data.depositPercentage,
            cancellation_fee_percentage: data.cancellationFeePercentage,
            cancellation_policy: data.cancellationPolicy,
            terms_accepted: data.termsAccepted ?? true,
            terms_accepted_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'provider_id'
          });

        if (error) {
          console.error('[VerificationMutation] Error saving terms:', error);
          throw error;
        }
      }
      
      // Add other step handling as needed
      
      // ✅ SAVE PROGRESS: Update provider_onboarding_progress table
      const stepNumber = typeof step === 'number' ? step : STEP_MAPPING[step] || parseInt(step.toString()) || 1;
      
      const { error: progressError } = await supabase
        .from('provider_onboarding_progress')
        .upsert({
          provider_id: providerId,
          current_step: stepNumber,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'provider_id'
        });

      if (progressError) {
        console.error('[VerificationMutation] Error saving progress:', progressError);
        // Don't throw here - progress saving failure shouldn't block the main operation
      }
      
      console.log('[VerificationMutation] Step saved successfully');
      return { success: true };
    },
    onSuccess: () => {
      // Invalidate verification-related queries
      queryClient.invalidateQueries({ queryKey: ['provider-verification'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
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
      
      // Fetch from onboarding progress table
      const { data, error } = await supabase
        .from('provider_onboarding_progress')
        .select('*')
        .eq('provider_id', providerId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('[VerificationQuery] Error fetching verification progress:', error);
        throw error;
      }

      console.log('[VerificationQuery] Fetched verification data:', data);
      return data || null;
    },
    enabled: !!providerId,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 60 * 1000, // 1 minute
  });
};

// ✅ REACT QUERY: Load and populate verification data from database
export const useLoadVerificationData = (providerId?: string) => {
  const queryClient = useQueryClient();
  const { 
    updateDocumentData,
    updateSelfieData,
    updateBusinessData,
    updateBioData,
    updateTermsData,
    markStepCompleted, // ✅ USE markStepCompleted instead of completeStepSimple
  } = useProviderVerificationStore();

  return useQuery({
    queryKey: ['load-verification-data', providerId],
    queryFn: async () => {
      if (!providerId) throw new Error('Provider ID required');
      
      console.log('[LoadVerificationData] Loading verification data for provider:', providerId);
      
      // Load profile data which contains verification fields
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', providerId)
        .single();

      if (profileError) {
        console.error('[LoadVerificationData] Error loading profile:', profileError);
        throw profileError;
      }

      // Load onboarding progress
      const { data: progress, error: progressError } = await supabase
        .from('provider_onboarding_progress')
        .select('*')
        .eq('provider_id', providerId)
        .single();

      if (progressError && progressError.code !== 'PGRST116') {
        console.error('[LoadVerificationData] Error loading progress:', progressError);
        throw progressError;
      }

      // Populate Zustand store with loaded data
      if (profile) {
        // Business info (step 3)
        if (profile.business_name || profile.phone_number || profile.address) {
          updateBusinessData({
            businessName: profile.business_name || '',
            phoneNumber: profile.phone_number || '',
            countryCode: profile.country_code || '',
            address: profile.address || '',
            city: profile.city || '',
            postalCode: profile.postal_code || '',
          });
          markStepCompleted(3, true); // ✅ Mark completed WITHOUT advancing step
        }

        // Terms data (step 8)
        if (profile.deposit_percentage !== null || profile.cancellation_fee_percentage !== null || profile.cancellation_policy) {
          updateTermsData({
            depositPercentage: profile.deposit_percentage,
            cancellationFeePercentage: profile.cancellation_fee_percentage,
            cancellationPolicy: profile.cancellation_policy || '',
            termsAccepted: profile.terms_accepted || false,
          });
          markStepCompleted(8, true); // ✅ Mark completed WITHOUT advancing step
        }

        // Bio data (step 7) - if available
        if (profile.business_description || profile.years_of_experience) {
          updateBioData({
            businessDescription: profile.business_description || '',
            yearsOfExperience: profile.years_of_experience || 0,
          });
          markStepCompleted(7, true); // ✅ Mark completed WITHOUT advancing step
        }
      }

      // Load document data if available
      if (profile?.document_url) {
        updateDocumentData({
          documentUrl: profile.document_url,
          documentType: 'id_card', // Default to id_card
        });
        markStepCompleted(1, true); // ✅ Mark completed WITHOUT advancing step
      }

      // Load selfie data if available
      if (profile?.selfie_verification_url) {
        updateSelfieData({
          selfieUrl: profile.selfie_verification_url,
        });
        markStepCompleted(2, true); // ✅ Mark completed WITHOUT advancing step
      }

      console.log('[LoadVerificationData] Verification data loaded and populated in store');
      return { profile, progress };
    },
    enabled: !!providerId,
    staleTime: 60 * 1000, // 1 minute - don't reload too frequently
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false, // Don't refetch on window focus for this data
  });
};
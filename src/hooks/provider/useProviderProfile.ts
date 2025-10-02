import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/core/supabase';

export interface ProviderProfileData {
  id: string;
  first_name: string;
  last_name: string;
  business_name?: string;
  avatar_url?: string;
  bio?: string;
  rating?: number;
  review_count?: number;
  location?: string;
  phone?: string;
  email?: string;
  website?: string;
  years_experience?: number;
  is_verified?: boolean;
  address?: string;
  city?: string;
  postal_code?: string;
  country?: string;
  working_hours?: {
    monday?: { open: string | null; close: string | null; is_open: boolean };
    tuesday?: { open: string | null; close: string | null; is_open: boolean };
    wednesday?: { open: string | null; close: string | null; is_open: boolean };
    thursday?: { open: string | null; close: string | null; is_open: boolean };
    friday?: { open: string | null; close: string | null; is_open: boolean };
    saturday?: { open: string | null; close: string | null; is_open: boolean };
    sunday?: { open: string | null; close: string | null; is_open: boolean };
  };
  services?: Array<{
    id: string;
    title: string;
    description: string;
    base_price: number;
    price_type: 'fixed' | 'hourly';
    category_name: string;
    subcategory_name: string;
  }>;
}

export const useProviderProfile = (providerId: string) => {
  return useQuery({
    queryKey: ['providerProfile', providerId],
    queryFn: async () => {
      if (!providerId) {
        console.warn('useProviderProfile: No provider ID provided');
        throw new Error('Provider ID is required');
      }

      console.log('useProviderProfile: Fetching provider data for ID:', providerId);

      // Fetch provider profile with related data
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select(`
          id,
          first_name,
          last_name,
          business_name,
          avatar_url,
          bio,
          phone_number,
          email,
          website,
          address,
          city,
          postal_code,
          country,
          years_of_experience,
          verification_status,
          created_at,
          provider_services (
            id,
            title,
            description,
            base_price,
            price_type,
            service_subcategories (
              name,
              service_categories (
                name
              )
            )
          )
        `)
        .eq('id', providerId)
        .eq('role', 'provider')
        .single();

      if (profileError) {
        console.error('useProviderProfile: Error fetching profile:', profileError);
        throw new Error(`Failed to fetch provider profile: ${profileError.message}`);
      }

      if (!profileData) {
        console.warn('useProviderProfile: No profile data found for ID:', providerId);
        throw new Error('Provider profile not found');
      }

      console.log('useProviderProfile: Profile data fetched successfully:', profileData.id);

      // Fetch working hours from provider_schedules using regular client (now allowed by RLS)
      console.log('useProviderProfile: About to query provider_schedules for providerId:', providerId);

      const { data: scheduleData, error: scheduleError } = await supabase
        .from('provider_schedules')
        .select('schedule_data')
        .eq('provider_id', providerId);

      console.log('useProviderProfile: Schedule query result:', { dataLength: scheduleData?.length, error: scheduleError });

      if (scheduleError) {
        console.warn('useProviderProfile: Error fetching schedule:', scheduleError);
        // Don't throw here, just log the warning and continue with null values
      }

      // Use the first result if multiple exist
      const scheduleDataItem = scheduleData && scheduleData.length > 0 ? scheduleData[0] : null;

      // Fetch rating and review count
      const { data: reviewsData, error: reviewsError } = await supabase
        .from('reviews')
        .select('rating')
        .eq('provider_id', providerId);

      // Calculate rating and review count
      let rating = undefined;
      let review_count = 0;

      if (reviewsData && reviewsData.length > 0) {
        const totalRating = reviewsData.reduce((sum, review) => sum + review.rating, 0);
        rating = totalRating / reviewsData.length;
        review_count = reviewsData.length;
      }

      // Format location
      const location = [
        profileData.address,
        profileData.city,
        profileData.postal_code,
        profileData.country
      ].filter(Boolean).join(', ') || undefined;

      // Transform services data
      const services = profileData.provider_services?.map((service: any) => ({
        id: service.id,
        title: service.title,
        description: service.description,
        base_price: service.base_price,
        price_type: service.price_type,
        category_name: service.service_subcategories?.service_categories?.name || 'Unknown Category',
        subcategory_name: service.service_subcategories?.name || 'Unknown Subcategory',
      })) || [];

      // Transform working hours data
      let working_hours = undefined;
      if (scheduleDataItem?.schedule_data) {
        console.log('useProviderProfile: Raw schedule data:', scheduleDataItem.schedule_data);

        const transformedHours = {
          monday: scheduleDataItem.schedule_data.monday ? {
            open: scheduleDataItem.schedule_data.monday.start || null,
            close: scheduleDataItem.schedule_data.monday.end || null,
            is_open: Boolean(scheduleDataItem.schedule_data.monday.enabled)
          } : undefined,
          tuesday: scheduleDataItem.schedule_data.tuesday ? {
            open: scheduleDataItem.schedule_data.tuesday.start || null,
            close: scheduleDataItem.schedule_data.tuesday.end || null,
            is_open: Boolean(scheduleDataItem.schedule_data.tuesday.enabled)
          } : undefined,
          wednesday: scheduleDataItem.schedule_data.wednesday ? {
            open: scheduleDataItem.schedule_data.wednesday.start || null,
            close: scheduleDataItem.schedule_data.wednesday.end || null,
            is_open: Boolean(scheduleDataItem.schedule_data.wednesday.enabled)
          } : undefined,
          thursday: scheduleDataItem.schedule_data.thursday ? {
            open: scheduleDataItem.schedule_data.thursday.start || null,
            close: scheduleDataItem.schedule_data.thursday.end || null,
            is_open: Boolean(scheduleDataItem.schedule_data.thursday.enabled)
          } : undefined,
          friday: scheduleDataItem.schedule_data.friday ? {
            open: scheduleDataItem.schedule_data.friday.start || null,
            close: scheduleDataItem.schedule_data.friday.end || null,
            is_open: Boolean(scheduleDataItem.schedule_data.friday.enabled)
          } : undefined,
          saturday: scheduleDataItem.schedule_data.saturday ? {
            open: scheduleDataItem.schedule_data.saturday.start || null,
            close: scheduleDataItem.schedule_data.saturday.end || null,
            is_open: Boolean(scheduleDataItem.schedule_data.saturday.enabled)
          } : undefined,
          sunday: scheduleDataItem.schedule_data.sunday ? {
            open: scheduleDataItem.schedule_data.sunday.start || null,
            close: scheduleDataItem.schedule_data.sunday.end || null,
            is_open: Boolean(scheduleDataItem.schedule_data.sunday.enabled)
          } : undefined,
        };

        console.log('useProviderProfile: Sunday raw data:', scheduleDataItem.schedule_data.sunday);
        console.log('useProviderProfile: Sunday enabled value:', scheduleDataItem.schedule_data.sunday?.enabled);
        console.log('useProviderProfile: Sunday is_open result:', transformedHours.sunday?.is_open);

        // Only set working_hours if at least one day has data
        const hasAnyHours = Object.values(transformedHours).some(day => day !== undefined);
        if (hasAnyHours) {
          working_hours = transformedHours;
        }

      console.log('useProviderProfile: Transformed working hours:', working_hours);
      } else {
        console.log('useProviderProfile: No schedule data found');
      }

      // Transform the data to match our interface
      const providerProfile: ProviderProfileData = {
        id: profileData.id,
        first_name: profileData.first_name,
        last_name: profileData.last_name,
        business_name: profileData.business_name,
        avatar_url: profileData.avatar_url,
        bio: profileData.bio,
        rating: rating,
        review_count: review_count,
        location: location,
        phone: profileData.phone_number,
        email: profileData.email,
        website: profileData.website,
        years_experience: profileData.years_of_experience,
        is_verified: profileData.verification_status === 'approved',
        services: services,
        working_hours: working_hours,
      };

      console.log('useProviderProfile: Final provider profile:', providerProfile);
      console.log('useProviderProfile: Working hours in final profile:', providerProfile.working_hours);

      return providerProfile;
    },
    enabled: !!providerId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error) => {
      console.log(`useProviderProfile: Retry attempt ${failureCount} for provider ${providerId}:`, error);
      return failureCount < 3; // Retry up to 3 times
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  });
};
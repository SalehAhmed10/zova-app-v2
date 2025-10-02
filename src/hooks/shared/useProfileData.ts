import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/core/supabase';

export interface ProfileData {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'customer' | 'provider' | 'admin' | 'super-admin';
  phone?: string;
  avatar_url?: string;
  bio?: string;
  created_at: string;
  updated_at: string;
  address?: string;
  city?: string;
  postal_code?: string;
  country: string;
  phone_number?: string;
  country_code?: string;
  verification_status?: 'pending' | 'in_review' | 'approved' | 'rejected';
}

export interface BookingData {
  id: string;
  booking_date: string;
  start_time: string;
  end_time?: string;
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  total_amount: string;
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
  created_at: string;
  service_title: string;
  base_price: string;
  price_type: 'fixed' | 'hourly';
  category_name: string;
  subcategory_name: string;
  provider_first_name: string;
  provider_last_name: string;
  business_name?: string;
}

export interface ProfileStats {
  total_bookings: number;
  completed_bookings: number;
  avg_rating: number;
  total_spent: number;
}

export interface NotificationSettings {
  user_id: string;
  push_notifications: boolean;
  email_notifications: boolean;
  booking_reminders: boolean;
  marketing_notifications: boolean;
}

export interface ProviderService {
  id: string;
  title: string;
  description: string;
  base_price: number;
  price_type: 'fixed' | 'hourly';
  duration_minutes: number;
  is_active: boolean;
  allows_sos_booking: boolean;
  is_home_service: boolean;
  is_remote_service: boolean;
  house_call_available: boolean;
  house_call_extra_fee: number | null;
  requires_deposit: boolean;
  deposit_percentage: number | null;
  cancellation_policy: string | null;
  service_specific_terms: string | null;
  subcategory_name: string;
  category_name: string;
  category_id: string;
  subcategory_id: string;
  bookings_count?: number;
}

// Hook to fetch current user profile
export const useProfile = (userId?: string) => {
  return useQuery({
    queryKey: ['profile', userId],
    queryFn: async () => {
      if (!userId) throw new Error('User ID is required');
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      return data as ProfileData;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Hook to fetch user bookings with detailed information
export const useUserBookings = (userId?: string) => {
  return useQuery({
    queryKey: ['userBookings', userId],
    queryFn: async () => {
      if (!userId) throw new Error('User ID is required');
      
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          booking_date,
          start_time,
          end_time,
          status,
          total_amount,
          payment_status,
          created_at,
          provider_services (
            title,
            base_price,
            price_type,
            service_subcategories (
              name,
              service_categories (
                name
              )
            )
          ),
          profiles!provider_id (
            first_name,
            last_name,
            business_name
          )
        `)
        .eq('customer_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      
      // Transform the data to match our interface

     
      return data.map((booking: any) => ({
        id: booking.id,
        booking_date: booking.booking_date,
        start_time: booking.start_time,
        end_time: booking.end_time,
        status: booking.status,
        total_amount: booking.total_amount,
        payment_status: booking.payment_status,
        created_at: booking.created_at,
        service_title: booking.provider_services?.title || 'Unknown Service',
        base_price: booking.provider_services?.base_price || '0',
        price_type: booking.provider_services?.price_type || 'fixed',
        category_name: booking.provider_services?.service_subcategories?.service_categories?.name || 'Unknown Category',
        subcategory_name: booking.provider_services?.service_subcategories?.name || 'Unknown Subcategory',
        provider_first_name: booking.profiles?.first_name || 'Unknown',
        provider_last_name: booking.profiles?.last_name || 'Provider',
        business_name: booking.profiles?.business_name,
      })) as BookingData[];
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

// Hook to fetch user statistics
export const useProfileStats = (userId?: string) => {
  return useQuery({
    queryKey: ['profileStats', userId],
    queryFn: async () => {
      if (!userId) throw new Error('User ID is required');
      
      // Get booking stats
      const { data: bookingStats, error: bookingError } = await supabase
        .from('bookings')
        .select('status, total_amount')
        .eq('customer_id', userId);

      if (bookingError) throw bookingError;

      // Get average rating from reviews
      const { data: reviewStats, error: reviewError } = await supabase
        .from('reviews')
        .select('rating')
        .eq('customer_id', userId);

      if (reviewError) throw reviewError;

      const totalBookings = bookingStats?.length || 0;
      const completedBookings = bookingStats?.filter(b => b.status === 'completed').length || 0;
      const totalSpent = bookingStats?.reduce((sum, b) => sum + parseFloat(b.total_amount || '0'), 0) || 0;
      const avgRating = reviewStats?.length > 0 
        ? reviewStats.reduce((sum, r) => sum + r.rating, 0) / reviewStats.length 
        : 0;

      return {
        total_bookings: totalBookings,
        completed_bookings: completedBookings,
        avg_rating: Math.round(avgRating * 10) / 10, // Round to 1 decimal
        total_spent: totalSpent,
      } as ProfileStats;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Hook to fetch notification settings
export const useNotificationSettings = (userId?: string) => {
  return useQuery({
    queryKey: ['notificationSettings', userId],
    queryFn: async () => {
      if (!userId) throw new Error('User ID is required');
      
      const { data, error } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        // If no settings exist, return defaults
        if (error.code === 'PGRST116') {
          return {
            user_id: userId,
            push_notifications: true,
            email_notifications: true,
            booking_reminders: true,
            marketing_notifications: false,
          } as NotificationSettings;
        }
        throw error;
      }
      
      return data as NotificationSettings;
    },
    enabled: !!userId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Mutation to update profile
export const useUpdateProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: Partial<ProfileData> & { id: string }) => {
      const { id, role, ...profileUpdates } = updates; // Exclude role from updates

      const { data, error } = await supabase
        .from('profiles')
        .update({
          ...profileUpdates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      // Invalidate and refetch profile data
      queryClient.invalidateQueries({ queryKey: ['profile', data.id] });
      queryClient.setQueryData(['profile', data.id], data);
    },
  });
};

// Mutation to update notification settings
export const useUpdateNotificationSettings = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (settings: NotificationSettings) => {
      const { data, error } = await supabase
        .from('notification_settings')
        .upsert({
          ...settings,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      // Update cache
      queryClient.invalidateQueries({ queryKey: ['notificationSettings', data.user_id] });
      queryClient.setQueryData(['notificationSettings', data.user_id], data);
    },
  });
};

export interface TrustedProvider {
  id: string;
  first_name: string;
  last_name: string;
  business_name?: string;
  avatar_url?: string;
  bio?: string;
  city?: string;
  is_verified: boolean;
  availability_status: 'available' | 'busy' | 'offline';
  avg_rating?: number;
  total_reviews?: number;
  featured_service?: {
    title: string;
    base_price: string;
    price_type: 'fixed' | 'hourly';
  };
}

// Hook to fetch trusted providers near user
export const useTrustedProviders = (limit: number = 5) => {
  return useQuery({
    queryKey: ['trustedProviders', limit],
    queryFn: async () => {
      // Get providers with their services (simplified query)
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          first_name,
          last_name,
          business_name,
          avatar_url,
          bio,
          city,
          verification_status,
          availability_status,
          provider_services!left (
            title,
            base_price,
            price_type
          )
        `)
        .eq('role', 'provider')
        .eq('is_business_visible', true)
        .eq('availability_status', 'available')
        .order('verification_status', { ascending: false })
        .limit(limit);

      if (error) throw error;

      // Transform data to include featured service
      const transformedData: TrustedProvider[] = data.map((provider: any) => {
        return {
          id: provider.id,
          first_name: provider.first_name,
          last_name: provider.last_name,
          business_name: provider.business_name,
          avatar_url: provider.avatar_url,
          bio: provider.bio,
          city: provider.city,
          is_verified: provider.verification_status === 'approved',
          availability_status: provider.availability_status,
          avg_rating: null, // Temporarily disabled
          total_reviews: 0, // Temporarily disabled
          featured_service: provider.provider_services?.[0] ? {
            title: provider.provider_services[0].title,
            base_price: provider.provider_services[0].base_price,
            price_type: provider.provider_services[0].price_type,
          } : undefined,
        };
      });

      return transformedData;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Hook to fetch provider statistics
export const useProviderStats = (providerId?: string) => {
  return useQuery({
    queryKey: ['providerStats', providerId],
    queryFn: async () => {
      if (!providerId) throw new Error('Provider ID is required');
      
      // Get booking stats for provider
      const { data: bookingStats, error: bookingError } = await supabase
        .from('bookings')
        .select('status, total_amount, booking_date')
        .eq('provider_id', providerId);

      if (bookingError) throw bookingError;

      // Get today's bookings
      const today = new Date().toISOString().split('T')[0];
      const todaysBookings = bookingStats?.filter(b => b.booking_date === today) || [];
      
      // Get this month's earnings
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const thisMonthBookings = bookingStats?.filter(b => {
        const bookingDate = new Date(b.booking_date);
        return bookingDate.getMonth() === currentMonth && bookingDate.getFullYear() === currentYear;
      }) || [];

      // Get average rating from reviews
      const { data: reviewStats, error: reviewError } = await supabase
        .from('reviews')
        .select('rating')
        .eq('provider_id', providerId);

      if (reviewError) throw reviewError;

      const totalBookings = bookingStats?.length || 0;
      const completedBookings = bookingStats?.filter(b => b.status === 'completed').length || 0;
      const todaysBookingCount = todaysBookings.length;
      const thisMonthEarnings = thisMonthBookings.reduce((sum, b) => sum + parseFloat(b.total_amount || '0'), 0);
      const avgRating = reviewStats?.length > 0 
        ? reviewStats.reduce((sum, r) => sum + r.rating, 0) / reviewStats.length 
        : 0;

      return {
        total_bookings: totalBookings,
        completed_bookings: completedBookings,
        todays_bookings: todaysBookingCount,
        this_month_earnings: thisMonthEarnings,
        avg_rating: Math.round(avgRating * 10) / 10, // Round to 1 decimal
      };
    },
    enabled: !!providerId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export interface ProviderService {
  id: string;
  title: string;
  description: string | null;
  base_price: number;
  price_type: 'fixed' | 'hourly';
  duration_minutes: number | null;
  is_active: boolean | null;
  allows_sos_booking: boolean | null;
  is_home_service: boolean | null;
  is_remote_service: boolean | null;
  house_call_available: boolean | null;
  house_call_extra_fee: number | null;
  requires_deposit: boolean | null;
  deposit_percentage: number | null;
  cancellation_policy: string | null;
  service_specific_terms: string | null;
  subcategory_name: string;
  category_name: string;
  bookings_count?: number;
  // Advanced pricing fields
  pricing_type?: 'standard' | 'package' | 'promotion' | 'dynamic';
  package_services?: string[];
  package_discount?: number;
  promotion_discount?: number;
  promotion_end_date?: string;
  peak_hour_surcharge?: number;
  peak_hours?: string[];
}

// Hook to fetch provider services with real data
export const useProviderServices = (providerId?: string) => {
  console.log('[useProviderServices] Hook called with providerId:', providerId);
  return useQuery({
    queryKey: ['providerServices', providerId],
    queryFn: async () => {
      console.log('[useProviderServices] Query function called for providerId:', providerId);
      if (!providerId) throw new Error('Provider ID is required');
      
      // Get provider services with category and subcategory info
      let services = await (async () => {
        const { data, error } = await supabase
          .from('provider_services')
          .select('*')
          .eq('provider_id', providerId);

        if (error) throw error;
        console.log('[useProviderServices] Raw services data:', data);
        return data;
      })();

      // If no services, return empty array
      if (!services || services.length === 0) {
        return [];
      }

      // Get subcategory and category info for all services
      const subcategoryIds = services.map(s => s.subcategory_id).filter(Boolean);
      if (subcategoryIds.length > 0) {
        const { data: subcategories, error: subError } = await supabase
          .from('service_subcategories')
          .select(`
            id,
            name,
            service_categories (
              id,
              name
            )
          `)
          .in('id', subcategoryIds);

        if (subError) {
          console.error('[useProviderServices] Error fetching subcategories:', subError);
          // Continue without category info
        }

        // Create a map for quick lookup
        const subcategoryMap = subcategories?.reduce((acc, sub) => {
          acc[sub.id] = sub;
          return acc;
        }, {} as Record<string, any>) || {};

        // Merge the data
        const servicesWithCategories = services.map(service => ({
          ...service,
          service_subcategories: subcategoryMap[service.subcategory_id] || null
        }));

        services = servicesWithCategories;
      }

      // Get booking counts for each service
      const serviceIds = services?.map(s => s.id) || [];
      if (serviceIds.length > 0) {
        const { data: bookingCounts, error: bookingError } = await supabase
          .from('bookings')
          .select('service_id')
          .in('service_id', serviceIds)
          .eq('status', 'completed');

        if (bookingError) throw bookingError;

        // Count bookings per service
        const bookingCountMap = bookingCounts?.reduce((acc, booking) => {
          acc[booking.service_id] = (acc[booking.service_id] || 0) + 1;
          return acc;
        }, {} as Record<string, number>) || {};

        const processedServices = services?.map(service => ({
          id: service.id,
          title: service.title,
          description: service.description,
          base_price: service.base_price,
          price_type: service.price_type || 'fixed',
          duration_minutes: service.duration_minutes,
          is_active: service.is_active,
          allows_sos_booking: service.allows_sos_booking,
          is_home_service: service.is_home_service,
          is_remote_service: service.is_remote_service,
          house_call_available: service.house_call_available,
          house_call_extra_fee: service.house_call_extra_fee,
          requires_deposit: service.requires_deposit,
          deposit_percentage: service.deposit_percentage,
          cancellation_policy: service.cancellation_policy,
          service_specific_terms: service.service_specific_terms,
          subcategory_name: service.service_subcategories?.name || 'General',
          category_name: service.service_subcategories?.service_categories?.name || 'Services',
          category_id: service.service_subcategories?.service_categories?.id,
          subcategory_id: service.service_subcategories?.id,
          bookings_count: bookingCountMap[service.id] || 0,
        }));

        console.log('[useProviderServices] Processed services:', processedServices?.length || 0);
        return processedServices;
      }

      const processedServices = services?.map(service => ({
        id: service.id,
        title: service.title,
        description: service.description,
        base_price: service.base_price,
        price_type: service.price_type || 'fixed',
        duration_minutes: service.duration_minutes,
        is_active: service.is_active,
        allows_sos_booking: service.allows_sos_booking,
        is_home_service: service.is_home_service,
        is_remote_service: service.is_remote_service,
        house_call_available: service.house_call_available,
        house_call_extra_fee: service.house_call_extra_fee,
        requires_deposit: service.requires_deposit,
        deposit_percentage: service.deposit_percentage,
        cancellation_policy: service.cancellation_policy,
        service_specific_terms: service.service_specific_terms,
        subcategory_name: service.service_subcategories?.name || 'General',
        category_name: service.service_subcategories?.service_categories?.name || 'Services',
        category_id: service.service_subcategories?.service_categories?.id,
        subcategory_id: service.service_subcategories?.id,
        bookings_count: 0,
      }));

      console.log('[useProviderServices] Final processed services:', processedServices);
      return processedServices;
    },
    enabled: !!providerId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: true, // Refetch when window regains focus
    refetchOnMount: 'always', // Always refetch on mount
  });
};

// Hook to fetch business availability status
export const useBusinessAvailability = (providerId?: string) => {
  return useQuery({
    queryKey: ['businessAvailability', providerId],
    queryFn: async () => {
      if (!providerId) throw new Error('Provider ID is required');

      const { data, error } = await supabase
        .from('profiles')
        .select('availability_message, pause_until')
        .eq('id', providerId)
        .single();

      if (error) throw error;

      const isPaused = data.pause_until && new Date(data.pause_until) > new Date();
      return {
        isPaused,
        availabilityMessage: data.availability_message,
        pauseUntil: data.pause_until,
      };
    },
    enabled: !!providerId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Mutation to update business availability status
export const useUpdateBusinessAvailability = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      providerId,
      isPaused,
      availabilityMessage,
      pauseUntil
    }: {
      providerId: string;
      isPaused: boolean;
      availabilityMessage?: string;
      pauseUntil?: string;
    }) => {
      const updateData: any = {
        availability_message: availabilityMessage || null,
      };

      if (isPaused) {
        // If pausing and no specific end date provided, set to 1 year from now (indefinite pause)
        updateData.pause_until = pauseUntil || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
      } else {
        // If resuming, clear the pause_until
        updateData.pause_until = null;
      }

      const { data, error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', providerId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['businessAvailability', variables.providerId] });
      queryClient.invalidateQueries({ queryKey: ['profile', variables.providerId] });
    },
  });
};

// Hook to fetch provider earnings data
export const useProviderEarnings = (providerId?: string) => {
  return useQuery({
    queryKey: ['providerEarnings', providerId],
    queryFn: async () => {
      if (!providerId) throw new Error('Provider ID is required');

      // Get provider payouts
      const { data: payouts, error: payoutsError } = await supabase
        .from('provider_payouts')
        .select('*')
        .eq('provider_id', providerId)
        .order('created_at', { ascending: false });

      if (payoutsError) throw payoutsError;

      // Get completed bookings count
      const { count: bookingsCount } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('provider_id', providerId)
        .eq('status', 'completed');

      if (payouts) {
        const totalEarnings = payouts
          .filter(p => p.status === 'paid')
          .reduce((sum, p) => sum + p.amount, 0);

        const thisMonth = payouts
          .filter(p => {
            const payoutDate = new Date(p.created_at);
            const now = new Date();
            return payoutDate.getMonth() === now.getMonth() &&
                   payoutDate.getFullYear() === now.getFullYear() &&
                   p.status === 'paid';
          })
          .reduce((sum, p) => sum + p.amount, 0);

        const pendingAmount = payouts
          .filter(p => p.status === 'pending' || p.status === 'processing')
          .reduce((sum, p) => sum + p.amount, 0);

        // Calculate next payout date (next Monday)
        const nextMonday = getNextMonday();

        return {
          totalEarnings,
          thisMonth,
          pendingPayouts: pendingAmount,
          completedBookings: bookingsCount || 0,
          nextPayoutDate: nextMonday.toLocaleDateString()
        };
      }

      return {
        totalEarnings: 0,
        thisMonth: 0,
        pendingPayouts: 0,
        completedBookings: bookingsCount || 0,
        nextPayoutDate: getNextMonday().toLocaleDateString()
      };
    },
    enabled: !!providerId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Hook to fetch provider payout history
export const useProviderPayouts = (providerId?: string) => {
  return useQuery({
    queryKey: ['providerPayouts', providerId],
    queryFn: async () => {
      if (!providerId) throw new Error('Provider ID is required');

      const { data: payouts, error } = await supabase
        .from('provider_payouts')
        .select('*')
        .eq('provider_id', providerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return payouts || [];
    },
    enabled: !!providerId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Hook to fetch provider earnings analytics for charts
export const useProviderEarningsAnalytics = (providerId?: string) => {
  return useQuery({
    queryKey: ['providerEarningsAnalytics', providerId],
    queryFn: async () => {
      if (!providerId) throw new Error('Provider ID is required');

      // Get last 12 months of earnings data
      const { data: payouts, error: payoutsError } = await supabase
        .from('provider_payouts')
        .select('amount, created_at, status')
        .eq('provider_id', providerId)
        .eq('status', 'paid')
        .order('created_at', { ascending: false });

      if (payoutsError) throw payoutsError;

      // Get booking trends (last 12 months)
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('total_amount, booking_date, status')
        .eq('provider_id', providerId)
        .eq('status', 'completed')
        .gte('booking_date', new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .order('booking_date', { ascending: false });

      if (bookingsError) throw bookingsError;

      // Process monthly earnings data
      const monthlyEarnings = processMonthlyData(payouts || [], 'amount');
      const monthlyBookings = processMonthlyData(bookings || [], 'total_amount');

      // Get service performance
      const { data: serviceStats, error: serviceError } = await supabase
        .from('bookings')
        .select(`
          total_amount,
          provider_services (
            title,
            category_name,
            subcategory_name
          )
        `)
        .eq('provider_id', providerId)
        .eq('status', 'completed');

      if (serviceError) throw serviceError;

      // Process service performance data
      const servicePerformance = processServicePerformance(serviceStats || []);

      return {
        monthlyEarnings,
        monthlyBookings,
        servicePerformance,
        totalPayouts: payouts?.length || 0,
        averageMonthlyEarnings: calculateAverage(monthlyEarnings.map(m => m.value))
      };
    },
    enabled: !!providerId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Hook to fetch provider weekly schedule
export const useProviderWeeklySchedule = (providerId?: string) => {
  return useQuery({
    queryKey: ['providerWeeklySchedule', providerId],
    queryFn: async () => {
      if (!providerId) throw new Error('Provider ID is required');

      const { data, error } = await supabase
        .from('provider_schedules')
        .select('schedule_data')
        .eq('provider_id', providerId)
        .single();

      if (error) {
        // If no schedule exists yet, return null
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }

      return data?.schedule_data as {
        monday: { start: string; end: string; enabled: boolean };
        tuesday: { start: string; end: string; enabled: boolean };
        wednesday: { start: string; end: string; enabled: boolean };
        thursday: { start: string; end: string; enabled: boolean };
        friday: { start: string; end: string; enabled: boolean };
        saturday: { start: string; end: string; enabled: boolean };
        sunday: { start: string; end: string; enabled: boolean };
      } | null;
    },
    enabled: !!providerId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Mutation to update provider weekly schedule
export const useUpdateWeeklySchedule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      provider_id,
      schedule_data
    }: {
      provider_id: string;
      schedule_data: {
        monday: { start: string; end: string; enabled: boolean };
        tuesday: { start: string; end: string; enabled: boolean };
        wednesday: { start: string; end: string; enabled: boolean };
        thursday: { start: string; end: string; enabled: boolean };
        friday: { start: string; end: string; enabled: boolean };
        saturday: { start: string; end: string; enabled: boolean };
        sunday: { start: string; end: string; enabled: boolean };
      };
    }) => {
      const { data, error } = await supabase
        .from('provider_schedules')
        .upsert({
          provider_id,
          schedule_data,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'provider_id'
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      // Invalidate and refetch provider weekly schedule
      queryClient.invalidateQueries({ queryKey: ['providerWeeklySchedule', variables.provider_id] });
    },
  });
};

// Hook to fetch provider calendar bookings within a date range
export const useProviderCalendarBookings = (providerId?: string, startDate?: Date, endDate?: Date) => {
  return useQuery({
    queryKey: ['providerCalendarBookings', providerId, startDate?.toISOString(), endDate?.toISOString()],
    queryFn: async () => {
      if (!providerId || !startDate || !endDate) return [];

      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          booking_date,
          start_time,
          end_time,
          status,
          total_amount,
          customer_id,
          service_id,
          provider_services (
            title
          ),
          profiles!customer_id (
            first_name,
            last_name
          )
        `)
        .eq('provider_id', providerId)
        .gte('booking_date', startDate.toISOString().split('T')[0])
        .lte('booking_date', endDate.toISOString().split('T')[0])
        .order('booking_date', { ascending: true })
        .order('start_time', { ascending: true });

      if (error) throw error;

      // Transform the data to match the expected interface
      return data.map((booking: any) => ({
        id: booking.id,
        date: booking.booking_date,
        startTime: booking.start_time,
        endTime: booking.end_time,
        customerName: `${booking.profiles?.first_name || 'Unknown'} ${booking.profiles?.last_name || 'Customer'}`.trim(),
        serviceTitle: booking.provider_services?.title || 'Unknown Service',
        status: booking.status,
        amount: parseFloat(booking.total_amount || '0')
      }));
    },
    enabled: !!providerId && !!startDate && !!endDate,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

// Mutation to delete a service
export const useDeleteService = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      provider_id
    }: {
      id: string;
      provider_id: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('manage-services', {
        body: {
          service_id: id,
          provider_id,
          action: 'delete_service'
        }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Failed to delete service');

      return { id: data.deleted_id };
    },
    onSuccess: (data, variables) => {
      // Invalidate and refetch provider services
      queryClient.invalidateQueries({ queryKey: ['providerServices', variables.provider_id] });
    },
  });
};

// Mutation to toggle service status (activate/deactivate)
export const useToggleServiceStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      provider_id,
      is_active
    }: {
      id: string;
      provider_id: string;
      is_active: boolean;
    }) => {
      const { data, error } = await supabase.functions.invoke('manage-services', {
        body: {
          service_id: id,
          provider_id,
          is_active,
          action: 'toggle_status'
        }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Failed to toggle service status');

      return data.data;
    },
    onSuccess: (data, variables) => {
      // Invalidate and refetch provider services
      queryClient.invalidateQueries({ queryKey: ['providerServices', variables.provider_id] });
    },
  });
};

// Mutation to create a new service
export const useCreateService = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (serviceData: {
      provider_id: string;
      subcategory_id: string;
      title: string;
      description: string;
      base_price: number;
      duration_minutes: number;
      price_type: string;
      is_active?: boolean;
      deposit_percentage?: number;
      cancellation_policy?: string;
      house_call_available?: boolean;
      house_call_extra_fee?: number;
      allows_sos_booking?: boolean;
    }) => {
      console.log('🔄 useCreateService mutation called with:', serviceData);
      const { data, error } = await supabase
        .from('provider_services')
        .insert([{
          provider_id: serviceData.provider_id,
          subcategory_id: serviceData.subcategory_id,
          title: serviceData.title,
          description: serviceData.description,
          base_price: serviceData.base_price,
          duration_minutes: serviceData.duration_minutes,
          price_type: serviceData.price_type || 'fixed',
          is_active: serviceData.is_active ?? true,
          // Business terms - use correct field names
          deposit_percentage: serviceData.deposit_percentage,
          cancellation_policy: serviceData.cancellation_policy,
          house_call_available: serviceData.house_call_available,
          house_call_extra_fee: serviceData.house_call_extra_fee,
          allows_sos_booking: serviceData.allows_sos_booking,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }])
        .select()
        .single();

      if (error) {
        console.error('❌ Supabase insert error:', error);
        throw error;
      }
      console.log('✅ Service created successfully:', data);
      return data;
    },
    onSuccess: (data, variables) => {
      // Invalidate and refetch provider services
      queryClient.invalidateQueries({ queryKey: ['providerServices', variables.provider_id] });
    },
  });
};

// Mutation to update an existing service
export const useUpdateService = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (serviceData: {
      id: string;
      provider_id: string;
      subcategory_id?: string;
      title?: string;
      description?: string;
      base_price?: number;
      duration_minutes?: number;
      price_type?: string;
      is_active?: boolean;
      deposit_percentage?: number;
      cancellation_policy?: string;
      house_call_available?: boolean;
      house_call_extra_fee?: number;
      allows_sos_booking?: boolean;
    }) => {
      const updateData: any = {
        updated_at: new Date().toISOString(),
      };

      // Only include fields that are provided
      if (serviceData.subcategory_id !== undefined) updateData.subcategory_id = serviceData.subcategory_id;
      if (serviceData.title !== undefined) updateData.title = serviceData.title;
      if (serviceData.description !== undefined) updateData.description = serviceData.description;
      if (serviceData.base_price !== undefined) updateData.base_price = serviceData.base_price;
      if (serviceData.duration_minutes !== undefined) updateData.duration_minutes = serviceData.duration_minutes;
      if (serviceData.price_type !== undefined) updateData.price_type = serviceData.price_type;
      if (serviceData.is_active !== undefined) updateData.is_active = serviceData.is_active;
      
      // Business terms - use correct field names
      if (serviceData.deposit_percentage !== undefined) updateData.deposit_percentage = serviceData.deposit_percentage;
      if (serviceData.cancellation_policy !== undefined) updateData.cancellation_policy = serviceData.cancellation_policy;
      if (serviceData.house_call_available !== undefined) updateData.house_call_available = serviceData.house_call_available;
      if (serviceData.house_call_extra_fee !== undefined) updateData.house_call_extra_fee = serviceData.house_call_extra_fee;
      if (serviceData.allows_sos_booking !== undefined) updateData.allows_sos_booking = serviceData.allows_sos_booking;

      const { data, error } = await supabase
        .from('provider_services')
        .update(updateData)
        .eq('id', serviceData.id)
        .eq('provider_id', serviceData.provider_id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      // Invalidate and refetch provider services
      queryClient.invalidateQueries({ queryKey: ['providerServices', variables.provider_id] });
    },
  });
};

// Helper function to get next Monday
function getNextMonday(): Date {
  const today = new Date();
  const daysUntilMonday = (7 - today.getDay() + 1) % 7;
  const nextMonday = new Date(today);
  nextMonday.setDate(today.getDate() + (daysUntilMonday === 0 ? 7 : daysUntilMonday));
  return nextMonday;
}

// Helper function to process monthly data
function processMonthlyData(data: any[], amountField: string) {
  const monthlyData: { [key: string]: number } = {};

  data.forEach(item => {
    const date = new Date(item.created_at || item.booking_date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const amount = parseFloat(item[amountField] || '0');

    monthlyData[monthKey] = (monthlyData[monthKey] || 0) + amount;
  });

  // Convert to array format for charts
  return Object.entries(monthlyData)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, value]) => ({
      month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      value: Math.round(value * 100) / 100
    }));
}

// Helper function to process service performance
function processServicePerformance(bookings: any[]) {
  const serviceData: { [key: string]: { revenue: number; bookings: number } } = {};

  bookings.forEach(booking => {
    const service = booking.provider_services;
    if (service) {
      const key = service.title;
      const amount = parseFloat(booking.total_amount || '0');

      if (!serviceData[key]) {
        serviceData[key] = { revenue: 0, bookings: 0 };
      }

      serviceData[key].revenue += amount;
      serviceData[key].bookings += 1;
    }
  });

  return Object.entries(serviceData)
    .map(([service, data]) => ({
      service,
      revenue: Math.round(data.revenue * 100) / 100,
      bookings: data.bookings
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10); // Top 10 services
}

// Hook to fetch provider services

// Hook for creating bookings
export const useCreateBooking = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (bookingData: {
      serviceId: string;
      providerId: string;
      customerId: string;
      bookingDate: string;
      startTime: string;
      customerNotes?: string;
      serviceAddress?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('create-booking', {
        body: bookingData,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['userBookings', variables.customerId] });
      queryClient.invalidateQueries({ queryKey: ['providerCalendarBookings', variables.providerId] });
      queryClient.invalidateQueries({ queryKey: ['providerStats', variables.providerId] });
    },
  });
};

// Helper function to calculate average
function calculateAverage(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round((values.reduce((sum, val) => sum + val, 0) / values.length) * 100) / 100;
}

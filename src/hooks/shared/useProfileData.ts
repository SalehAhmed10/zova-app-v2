import React from 'react';
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
export const useProfileStats = (userId?: string, userRole?: string) => {
  return useQuery({
    queryKey: ['profileStats', userId, userRole],
    queryFn: async () => {
      if (!userId) throw new Error('User ID is required');
      
      if (userRole === 'provider') {
        // Provider stats: bookings they provide service for
        const { data: bookingStats, error: bookingError } = await supabase
          .from('bookings')
          .select('status, total_amount')
          .eq('provider_id', userId);

        if (bookingError) throw bookingError;

        // Get average rating from reviews for provider
        const { data: reviewStats, error: reviewError } = await supabase
          .from('reviews')
          .select('rating')
          .eq('provider_id', userId);

        if (reviewError) throw reviewError;

        const totalBookings = bookingStats?.length || 0;
        const completedBookings = bookingStats?.filter(b => b.status === 'completed').length || 0;
        const totalEarnings = bookingStats?.filter(b => b.status === 'completed')
          .reduce((sum, b) => sum + parseFloat(b.total_amount || '0'), 0) || 0;
        const avgRating = reviewStats?.length > 0 
          ? reviewStats.reduce((sum, r) => sum + r.rating, 0) / reviewStats.length 
          : 0;

        return {
          total_bookings: totalBookings,
          completed_bookings: completedBookings,
          avg_rating: Math.round(avgRating * 10) / 10, // Round to 1 decimal
          total_spent: totalEarnings, // For providers, this represents earnings
        } as ProfileStats;
      } else {
        // Customer stats: bookings they've made
        const { data: bookingStats, error: bookingError } = await supabase
          .from('bookings')
          .select('status, total_amount')
          .eq('customer_id', userId);

        if (bookingError) throw bookingError;

        // Get average rating from reviews made by customer (not really used for customers)
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
      }
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

// Hook to fetch service categories
export const useServiceCategories = () => {
  return useQuery({
    queryKey: ['serviceCategories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('service_categories')
        .select('*')
        .order('name');

      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

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
export interface ProviderEarningsData {
  totalEarnings: number;
  thisMonth: number;
  pendingPayouts: number;
  completedBookings: number;
  nextPayoutDate: string;
}

export interface ProviderPayoutData {
  id: string;
  amount: number;
  status: string;
  expected_payout_date: string;
  actual_payout_date?: string;
  booking_id: string;
  created_at: string;
}

export interface ProviderEarningsAnalytics {
  monthlyRevenue: number[];
  bookingTrends: number[];
  averageBookingValue: number;
  topServices: Array<{
    service_name: string;
    revenue: number;
    bookings: number;
  }>;
}

// Hook to fetch provider earnings summary
export const useProviderEarnings = (providerId?: string) => {
  return useQuery({
    queryKey: ['providerEarnings', providerId],
    queryFn: async (): Promise<ProviderEarningsData> => {
      if (!providerId) throw new Error('Provider ID is required');

      // Get payout records from provider_payouts table
      const { data: payouts, error } = await supabase
        .from('provider_payouts')
        .select('amount, status, expected_payout_date, created_at')
        .eq('provider_id', providerId);

      if (error) throw error;

      // Calculate total earnings (all legitimate payouts including pending)
      const totalEarnings = payouts?.filter(p => 
        p.status === 'paid' || p.status === 'completed' || p.status === 'pending' || p.status === 'processing'
      ).reduce((sum, payout) => sum + parseFloat(payout.amount || '0'), 0) || 0;

      // Calculate this month's earnings (all legitimate payouts including pending)
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const thisMonthEarnings = payouts?.filter(payout => {
        const payoutDate = new Date(payout.created_at);
        return payoutDate >= startOfMonth && (
          payout.status === 'paid' || payout.status === 'completed' || 
          payout.status === 'pending' || payout.status === 'processing'
        );
      }).reduce((sum, payout) => sum + parseFloat(payout.amount || '0'), 0) || 0;

      // Calculate pending payouts
      const pendingPayouts = payouts?.filter(p => p.status === 'pending' || p.status === 'processing')
        .reduce((sum, payout) => sum + parseFloat(payout.amount || '0'), 0) || 0;

      // Get completed bookings count
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('id')
        .eq('provider_id', providerId)
        .eq('status', 'completed');

      if (bookingsError) throw bookingsError;
      const completedBookings = bookings?.length || 0;

      // Calculate next payout date (earliest pending payout)
      const nextPayout = payouts?.filter(p => p.status === 'pending' || p.status === 'processing')
        .sort((a, b) => new Date(a.expected_payout_date).getTime() - new Date(b.expected_payout_date).getTime())[0];

      return {
        totalEarnings,
        thisMonth: thisMonthEarnings,
        pendingPayouts,
        completedBookings,
        nextPayoutDate: nextPayout?.expected_payout_date || '',
      };
    },
    enabled: !!providerId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

// Hook to fetch provider payout history
export const useProviderPayouts = (providerId?: string) => {
  return useQuery({
    queryKey: ['providerPayouts', providerId],
    queryFn: async (): Promise<ProviderPayoutData[]> => {
      if (!providerId) throw new Error('Provider ID is required');

      const { data, error } = await supabase
        .from('provider_payouts')
        .select('id, amount, status, expected_payout_date, actual_payout_date, booking_id, created_at')
        .eq('provider_id', providerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!providerId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

// Hook to fetch provider earnings analytics
export const useProviderEarningsAnalytics = (providerId?: string) => {
  return useQuery({
    queryKey: ['providerEarningsAnalytics', providerId],
    queryFn: async (): Promise<ProviderEarningsAnalytics> => {
      if (!providerId) throw new Error('Provider ID is required');

      // Get last 12 months of payout data
      const twelveMonthsAgo = new Date();
      twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

      const { data: payouts, error } = await supabase
        .from('provider_payouts')
        .select('amount, status, created_at')
        .eq('provider_id', providerId)
        .gte('created_at', twelveMonthsAgo.toISOString())
        .eq('status', 'paid');

      if (error) throw error;

      // Calculate monthly revenue for the last 12 months
      const monthlyRevenue = Array.from({ length: 12 }, (_, i) => {
        const month = new Date();
        month.setMonth(month.getMonth() - (11 - i));
        const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
        const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);

        return payouts?.filter(payout => {
          const payoutDate = new Date(payout.created_at);
          return payoutDate >= monthStart && payoutDate <= monthEnd;
        }).reduce((sum, payout) => sum + parseFloat(payout.amount || '0'), 0) || 0;
      });

      // Get booking trends (completed bookings per month)
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('created_at')
        .eq('provider_id', providerId)
        .eq('status', 'completed')
        .gte('created_at', twelveMonthsAgo.toISOString());

      if (bookingsError) throw bookingsError;

      const bookingTrends = Array.from({ length: 12 }, (_, i) => {
        const month = new Date();
        month.setMonth(month.getMonth() - (11 - i));
        const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
        const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);

        return bookings?.filter(booking => {
          const bookingDate = new Date(booking.created_at);
          return bookingDate >= monthStart && bookingDate <= monthEnd;
        }).length || 0;
      });

      // Calculate average booking value
      const totalRevenue = payouts?.reduce((sum, payout) => sum + parseFloat(payout.amount || '0'), 0) || 0;
      const totalBookings = bookings?.length || 0;
      const averageBookingValue = totalBookings > 0 ? totalRevenue / totalBookings : 0;

      // Get top services (this would require joining with services/bookings, simplified for now)
      const topServices = [];

      return {
        monthlyRevenue,
        bookingTrends,
        averageBookingValue,
        topServices,
      };
    },
    enabled: !!providerId,
    staleTime: 5 * 60 * 1000, // 5 minutes
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

// Hook to fetch provider bookings within a date range
export const useProviderBookings = (providerId?: string, startDate?: Date, endDate?: Date) => {


  return useQuery({
    queryKey: ['providerBookings', providerId, startDate?.toISOString(), endDate?.toISOString()],
    queryFn: async () => {
      if (!providerId) throw new Error('Provider ID is required');

      // First, get the bookings without joins to avoid RLS issues
      let query = supabase
        .from('bookings')
        .select(`
          id,
          booking_date,
          start_time,
          end_time,
          status,
          total_amount,
          customer_id,
          service_id
        `)
        .eq('provider_id', providerId)
        .order('booking_date', { ascending: true })
        .order('start_time', { ascending: true });

      // Add date range filter if provided
      if (startDate) {
        const startDateStr = startDate.toISOString().split('T')[0];
        query = query.gte('booking_date', startDateStr);

      }
      if (endDate) {
        const endDateStr = endDate.toISOString().split('T')[0];
        query = query.lte('booking_date', endDateStr);

      }


      const { data: bookingsData, error: bookingsError } = await query;

      if (bookingsError) {
        console.error('❌ [useProviderBookings] Bookings query error:', bookingsError);
        throw bookingsError;
      }



      if (!bookingsData || bookingsData.length === 0) {

        return [];
      }

      // Get unique customer and service IDs
      const customerIds = Array.from(new Set(bookingsData.map(b => b.customer_id).filter(id => id)));
      const serviceIds = Array.from(new Set(bookingsData.map(b => b.service_id).filter(id => id)));



      // Fetch customer profiles and services separately
      const [customersResult, servicesResult] = await Promise.all([
        customerIds.length > 0
          ? supabase
              .from('profiles')
              .select('id, first_name, last_name, email')
              .in('id', customerIds)
          : Promise.resolve({ data: [], error: null }),
        serviceIds.length > 0
          ? supabase
              .from('provider_services')
              .select('id, title')
              .in('id', serviceIds)
          : Promise.resolve({ data: [], error: null })
      ]);

      if (customersResult.error) {
        console.error('❌ [useProviderBookings] Customers query error:', customersResult.error);
      }
      if (servicesResult.error) {
        console.error('❌ [useProviderBookings] Services query error:', servicesResult.error);
      }

      const customersMap = (customersResult.data || []).reduce((acc: any, customer: any) => {
        acc[customer.id] = customer;
        return acc;
      }, {});

      const servicesMap = (servicesResult.data || []).reduce((acc: any, service: any) => {
        acc[service.id] = service;
        return acc;
      }, {});

      console.log('� [useProviderCalendarBookings] Customers map:', customersMap);
      console.log('📊 [useProviderCalendarBookings] Services map:', servicesMap);

      const transformed = bookingsData.map((booking: any) => {
        const customer = customersMap[booking.customer_id];
        const service = servicesMap[booking.service_id];



        // Build customer name from first_name and last_name
        const firstName = customer?.first_name || '';
        const lastName = customer?.last_name || '';
        const fullName = `${firstName} ${lastName}`.trim();

        // Fallback: Use email username if name is not available
        let customerName = fullName;
        if (!customerName && customer?.email) {
          customerName = customer.email.split('@')[0];
        }
        // If profile doesn't exist, show a generic customer name
        if (!customerName) {
          customerName = 'Unknown Customer';
        }

        return {
          id: booking.id,
          date: booking.booking_date,
          startTime: booking.start_time,
          endTime: booking.end_time,
          customerName,
          serviceTitle: service?.title || 'Unknown Service',
          status: booking.status,
          amount: parseFloat(booking.total_amount || '0'),
        };
      });



      return transformed;
    },
    enabled: !!providerId,
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

// ✅ PROVIDER EARNINGS HOOKS - Following React Query architecture

export interface ProviderEarningsData {
  totalEarnings: number;
  thisMonth: number;
  pendingPayouts: number;
  completedBookings: number;
  nextPayoutDate: string;
}

export interface ProviderPayoutData {
  id: string;
  amount: number;
  status: string;
  expected_payout_date: string;
  actual_payout_date?: string;
  booking_id: string;
  created_at: string;
}

export interface ProviderEarningsAnalytics {
  monthlyRevenue: number[];
  bookingTrends: number[];
  averageBookingValue: number;
  topServices: Array<{
    service_name: string;
    revenue: number;
    bookings: number;
  }>;

}
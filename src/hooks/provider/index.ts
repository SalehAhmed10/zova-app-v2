import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/core/supabase';
import { useProviderProfile } from './useProviderProfile';

export { useBookings } from './useBookings';
export { useProviderProfile, type ProviderProfileData } from './useProviderProfile';
export { useProviderSearch, type SearchFilters, type ProviderSearchResult, type ServiceSearchResult } from './useProviderSearch';
export * from './useCalendarData';

// ✅ New React Query payment hooks - Following copilot-rules.md
export {
  usePaymentStatus,
  useIsPaymentSetupComplete,
  type PaymentStatus
} from './usePaymentStatus';
export {
  useStripeAccountStatus,
  useRefreshStripeAccountStatus,
  useIsStripeAccountComplete,
  type StripeAccountStatus
} from './useStripeAccountStatus';

// ✅ PURE verification status hooks - ZERO useEffect patterns
export {
  useVerificationStatusPure,
  useVerificationStatusSelector,
  useRefreshVerificationStatusPure as useRefreshVerificationStatus,
  useVerificationStatusActions,
  useVerificationNavigationPure,
  VerificationNavigationHandler
} from './useVerificationStatusPure';

// ✅ PURE verification navigation hook - Centralized routing logic
export { useVerificationNavigation } from '../verification/useVerificationNavigation';

// ✅ Map common hook names to existing implementations
export { useProviderProfile as useProfile } from './useProviderProfile';

export const useProviderStats = (providerId?: string) => {
  return useQuery({
    queryKey: ['providerStats', providerId],
    queryFn: async () => {
      if (!providerId) throw new Error('Provider ID is required');

      // Get today's bookings count
      const today = new Date().toISOString().split('T')[0];
      const { data: todaysBookings, error: todaysError } = await supabase
        .from('bookings')
        .select('id')
        .eq('provider_id', providerId)
        .eq('booking_date', today)
        .eq('status', 'confirmed');

      if (todaysError) throw todaysError;

      // Get this month's earnings
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const { data: monthlyBookings, error: monthlyError } = await supabase
        .from('bookings')
        .select('total_amount')
        .eq('provider_id', providerId)
        .eq('status', 'completed')
        .gte('booking_date', startOfMonth.toISOString().split('T')[0]);

      if (monthlyError) throw monthlyError;

      const thisMonthEarnings = monthlyBookings?.reduce((sum, booking) => sum + parseFloat(booking.total_amount || '0'), 0) || 0;

      // Get average rating (placeholder for now)
      const avgRating = 4.5;

      // Get total bookings
      const { data: totalBookings, error: totalError } = await supabase
        .from('bookings')
        .select('id')
        .eq('provider_id', providerId);

      if (totalError) throw totalError;

      // Get completed bookings
      const { data: completedBookings, error: completedError } = await supabase
        .from('bookings')
        .select('id')
        .eq('provider_id', providerId)
        .eq('status', 'completed');

      if (completedError) throw completedError;

      return {
        todays_bookings: todaysBookings?.length || 0,
        this_month_earnings: thisMonthEarnings,
        avg_rating: avgRating,
        total_bookings: totalBookings?.length || 0,
        completed_bookings: completedBookings?.length || 0,
      };
    },
    enabled: !!providerId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
export const useUserBookings = (providerId?: string) => {
  return useQuery({
    queryKey: ['userBookings', providerId],
    queryFn: async () => {
      if (!providerId) throw new Error('Provider ID is required');

      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          booking_date,
          start_time,
          end_time,
          status,
          total_amount,
          service_address,
          customer:profiles!customer_id (
            first_name,
            last_name
          ),
          service:provider_services!service_id (
            title
          )
        `)
        .eq('provider_id', providerId)
        .order('booking_date', { ascending: false })
        .order('start_time', { ascending: true });

      if (error) throw error;

      return data?.map((booking: any) => {
        const customer = Array.isArray(booking.customer) ? booking.customer[0] : booking.customer;
        const service = Array.isArray(booking.service) ? booking.service[0] : booking.service;

        return {
          id: booking.id,
          date: booking.booking_date,
          startTime: booking.start_time,
          endTime: booking.end_time,
          customerName: customer
            ? `${customer.first_name || 'Unknown'} ${customer.last_name || 'Customer'}`.trim()
            : 'Unknown Customer',
          serviceTitle: service?.title || 'Service',
          status: booking.status,
          amount: parseFloat(booking.total_amount || '0'),
        };
      }) || [];
    },
    enabled: !!providerId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};
export const useProviderCalendarBookings = (providerId?: string, startDate?: Date | string, endDate?: Date | string) => {
  // Convert Date objects to ISO strings if needed
  const startDateStr = startDate instanceof Date ? startDate.toISOString().split('T')[0] : startDate;
  const endDateStr = endDate instanceof Date ? endDate.toISOString().split('T')[0] : endDate;

  return useQuery({
    queryKey: ['providerCalendarBookings', providerId, startDateStr, endDateStr],
    queryFn: async () => {
      if (!providerId) throw new Error('Provider ID is required');

      let query = supabase
        .from('bookings')
        .select(`
          id,
          booking_date,
          start_time,
          end_time,
          status,
          total_amount,
          customer:profiles!customer_id (
            first_name,
            last_name
          ),
          service:provider_services!service_id (
            title
          )
        `)
        .eq('provider_id', providerId)
        .order('booking_date', { ascending: true })
        .order('start_time', { ascending: true });

      // Add date range filter if provided
      if (startDateStr) {
        query = query.gte('booking_date', startDateStr);
      }
      if (endDateStr) {
        query = query.lte('booking_date', endDateStr);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data?.map(booking => {
        const customer = Array.isArray(booking.customer) ? booking.customer[0] : booking.customer;
        const service = Array.isArray(booking.service) ? booking.service[0] : booking.service;

        return {
          id: booking.id,
          date: booking.booking_date,
          startTime: booking.start_time,
          endTime: booking.end_time,
          customerName: customer
            ? `${customer.first_name || 'Unknown'} ${customer.last_name || 'Customer'}`.trim()
            : 'Unknown Customer',
          serviceTitle: service?.title || 'Service',
          status: booking.status,
          amount: parseFloat(booking.total_amount || '0'),
        };
      }) || [];
    },
    enabled: !!providerId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};
export const useBusinessAvailability = (providerId?: string) => {
  return useQuery({
    queryKey: ['businessAvailability', providerId],
    queryFn: async () => {
      if (!providerId) throw new Error('Provider ID is required');

      // For now, return a default availability state
      // This would typically come from a provider_availability table
      return {
        isPaused: false,
        availabilityMessage: null,
        pauseUntil: null,
      };
    },
    enabled: !!providerId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
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
      // For now, just log the update
      // This would typically update a provider_availability table
      console.log('Updating business availability:', {
        providerId,
        isPaused,
        availabilityMessage,
        pauseUntil,
      });

      // Invalidate the availability query
      queryClient.invalidateQueries({ queryKey: ['businessAvailability', providerId] });

      return { success: true };
    },
  });
};
export const useProviderEarnings = (providerId?: string) => {
  return useQuery({
    queryKey: ['providerEarnings', providerId],
    queryFn: async () => {
      if (!providerId) throw new Error('Provider ID is required');

      // Get completed bookings for earnings calculation
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('total_amount, booking_date, status')
        .eq('provider_id', providerId)
        .eq('status', 'completed');

      if (bookingsError) throw bookingsError;

      // Calculate earnings
      const totalEarnings = bookings?.reduce((sum, booking) => sum + parseFloat(booking.total_amount || '0'), 0) || 0;

      // Calculate this month's earnings
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const thisMonthEarnings = bookings?.filter(booking => {
        const bookingDate = new Date(booking.booking_date);
        return bookingDate >= startOfMonth;
      }).reduce((sum, booking) => sum + parseFloat(booking.total_amount || '0'), 0) || 0;

      // Get pending payouts (bookings that are completed but not yet paid out)
      const { data: pendingBookings, error: pendingError } = await supabase
        .from('bookings')
        .select('total_amount')
        .eq('provider_id', providerId)
        .eq('status', 'completed')
        .is('payout_date', null);

      if (pendingError) throw pendingError;

      const pendingPayouts = pendingBookings?.reduce((sum, booking) => sum + parseFloat(booking.total_amount || '0'), 0) || 0;

      // Count completed bookings
      const completedBookings = bookings?.length || 0;

      // Calculate next payout date (next Monday)
      const nextMonday = new Date();
      const daysUntilMonday = (7 - nextMonday.getDay() + 1) % 7;
      nextMonday.setDate(nextMonday.getDate() + (daysUntilMonday === 0 ? 7 : daysUntilMonday));
      const nextPayoutDate = nextMonday.toLocaleDateString('en-GB');

      return {
        totalEarnings,
        thisMonth: thisMonthEarnings,
        pendingPayouts,
        completedBookings,
        nextPayoutDate,
      };
    },
    enabled: !!providerId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
export const useProviderPayouts = (providerId?: string) => {
  return useQuery({
    queryKey: ['providerPayouts', providerId],
    queryFn: async () => {
      if (!providerId) throw new Error('Provider ID is required');

      // Get payout history (this would typically come from a payouts table)
      // For now, we'll simulate with booking data
      const { data: bookings, error } = await supabase
        .from('bookings')
        .select('id, total_amount, booking_date, status')
        .eq('provider_id', providerId)
        .eq('status', 'completed')
        .not('payout_date', 'is', null)
        .order('booking_date', { ascending: false })
        .limit(10);

      if (error) throw error;

      return bookings?.map(booking => ({
        id: booking.id,
        amount: parseFloat(booking.total_amount || '0'),
        status: 'paid',
        expected_payout_date: booking.booking_date,
        actual_payout_date: booking.booking_date,
        booking_id: booking.id,
      })) || [];
    },
    enabled: !!providerId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
export const useProviderEarningsAnalytics = (providerId?: string) => {
  return useQuery({
    queryKey: ['providerEarningsAnalytics', providerId],
    queryFn: async () => {
      if (!providerId) throw new Error('Provider ID is required');

      // Get all completed bookings for analytics
      const { data: bookings, error } = await supabase
        .from('bookings')
        .select(`
          total_amount,
          booking_date,
          service:provider_services!service_id (
            title,
            category:service_categories!category_id (
              name
            )
          )
        `)
        .eq('provider_id', providerId)
        .eq('status', 'completed');

      if (error) throw error;

      // Process monthly earnings
      const monthlyData: { [key: string]: number } = {};
      const serviceData: { [key: string]: { revenue: number; bookings: number } } = {};

      bookings?.forEach(booking => {
        const date = new Date(booking.booking_date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const amount = parseFloat(booking.total_amount || '0');

        monthlyData[monthKey] = (monthlyData[monthKey] || 0) + amount;

        // Process service performance
        const service = Array.isArray(booking.service) ? booking.service[0] : booking.service;
        if (service) {
          const key = service.title;
          if (!serviceData[key]) {
            serviceData[key] = { revenue: 0, bookings: 0 };
          }
          serviceData[key].revenue += amount;
          serviceData[key].bookings += 1;
        }
      });

      // Convert to chart format
      const monthlyEarnings = Object.entries(monthlyData)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, value]) => ({
          month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          value: Math.round(value * 100) / 100
        }));

      const servicePerformance = Object.entries(serviceData)
        .map(([service, data]) => ({
          service,
          revenue: Math.round(data.revenue * 100) / 100,
          bookings: data.bookings
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);

      return {
        monthlyEarnings,
        servicePerformance,
      };
    },
    enabled: !!providerId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};
export { useProviderProfile as useNotificationSettings } from './useProviderProfile';

export const useCreateService = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (serviceData: any) => {
      const { data, error } = await supabase
        .from('provider_services')
        .insert(serviceData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['providerServices'] });
    },
  });
};

export const useUpdateService = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & any) => {
      const { data, error } = await supabase
        .from('provider_services')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['providerServices'] });
    },
  });
};

export const useDeleteService = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (serviceId: string) => {
      const { error } = await supabase
        .from('provider_services')
        .delete()
        .eq('id', serviceId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['providerServices'] });
    },
  });
};

export const useToggleServiceStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { data, error } = await supabase
        .from('provider_services')
        .update({ is_active })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['providerServices'] });
    },
  });
};

export const useServiceCategories = () => {
  return useQuery({
    queryKey: ['serviceCategories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('service_categories')
        .select(`
          id,
          name,
          description,
          service_subcategories (
            id,
            name,
            description
          )
        `)
        .order('name');

      if (error) throw error;
      return data || [];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes - categories don't change often
  });
};
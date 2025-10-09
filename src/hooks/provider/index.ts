import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/core/supabase';
import { useProviderProfile } from './useProviderProfile';

// ✅ Business availability hooks - Following React Query + Zustand architecture
export interface BusinessAvailabilityData {
  isPaused: boolean;
  availabilityMessage?: string;
  pauseUntil?: string;
  availabilityStatus: 'available' | 'unavailable';
}

export interface UpdateBusinessAvailabilityParams {
  providerId: string;
  isPaused: boolean;
  availabilityMessage?: string;
  pauseUntil?: string;
}
export { useBookings } from './useBookings';
export { usePendingBookings } from './usePendingBookings';
export { useAcceptBooking } from './useAcceptBooking';
export { useDeclineBooking } from './useDeclineBooking';
export { useProviderBookingDetail, type BookingDetail } from './useProviderBookingDetail';

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

      // Get this week's earnings
      const currentDate = new Date();
      const startOfWeek = new Date(currentDate);
      startOfWeek.setDate(currentDate.getDate() - currentDate.getDay()); // Start of week (Sunday)
      startOfWeek.setHours(0, 0, 0, 0);

      const { data: weeklyBookings, error: weeklyError } = await supabase
        .from('bookings')
        .select('total_amount')
        .eq('provider_id', providerId)
        .eq('status', 'completed')
        .gte('booking_date', startOfWeek.toISOString().split('T')[0]);

      if (weeklyError) throw weeklyError;

      const thisWeekEarnings = weeklyBookings?.reduce((sum, booking) => sum + parseFloat(booking.total_amount || '0'), 0) || 0;

      // Get average rating from reviews table
      const { data: reviews, error: reviewsError } = await supabase
        .from('reviews')
        .select('rating')
        .eq('provider_id', providerId);

      if (reviewsError) throw reviewsError;

      const avgRating = reviews && reviews.length > 0
        ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
        : 0; // No reviews yet

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
        this_week_earnings: thisWeekEarnings,
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
  console.log('🚀 [CALENDAR BOOKINGS HOOK] Called with providerId:', providerId, 'enabled:', !!providerId);

  return useQuery({
    queryKey: ['providerCalendarBookings', providerId, startDate, endDate],
    queryFn: async () => {
      if (!providerId) throw new Error('Provider ID is required');

      console.log('🔍 [CALENDAR BOOKINGS] Starting query for provider:', providerId);

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
        const startDateStr = startDate instanceof Date ? startDate.toISOString().split('T')[0] : startDate;
        query = query.gte('booking_date', startDateStr);
        console.log('🔍 [CALENDAR BOOKINGS] Added start date filter:', startDateStr);
      }
      if (endDate) {
        const endDateStr = endDate instanceof Date ? endDate.toISOString().split('T')[0] : endDate;
        query = query.lte('booking_date', endDateStr);
        console.log('🔍 [CALENDAR BOOKINGS] Added end date filter:', endDateStr);
      }

      console.log('🔍 [CALENDAR BOOKINGS] Executing bookings query...');
      const { data: bookingsData, error: bookingsError } = await query;

      if (bookingsError) {
        console.error('❌ [CALENDAR BOOKINGS] Bookings query error:', bookingsError);
        throw bookingsError;
      }

      console.log('✅ [CALENDAR BOOKINGS] Bookings data received:', bookingsData?.length || 0, 'bookings');

      if (!bookingsData || bookingsData.length === 0) {
        console.log('� [CALENDAR BOOKINGS] No bookings found');
        return [];
      }

      // Get unique customer and service IDs
      const customerIds = [...new Set(bookingsData.map(b => b.customer_id).filter(id => id))];
      const serviceIds = [...new Set(bookingsData.map(b => b.service_id).filter(id => id))];

      console.log('🔍 [CALENDAR BOOKINGS] Customer IDs:', customerIds);
      console.log('🔍 [CALENDAR BOOKINGS] Service IDs:', serviceIds);

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
        console.error('❌ [CALENDAR BOOKINGS] Customers query error:', customersResult.error);
      }
      if (servicesResult.error) {
        console.error('❌ [CALENDAR BOOKINGS] Services query error:', servicesResult.error);
      }

      const customersMap = (customersResult.data || []).reduce((acc: any, customer: any) => {
        acc[customer.id] = customer;
        return acc;
      }, {});

      const servicesMap = (servicesResult.data || []).reduce((acc: any, service: any) => {
        acc[service.id] = service;
        return acc;
      }, {});

      console.log('📊 [CALENDAR BOOKINGS] Customers map:', customersMap);
      console.log('📊 [CALENDAR BOOKINGS] Services map:', servicesMap);

      const transformed = bookingsData.map((booking: any) => {
        const customer = customersMap[booking.customer_id];
        const service = servicesMap[booking.service_id];

        console.log('🔄 [CALENDAR BOOKINGS] Processing booking:', booking.id, 'customer:', customer, 'service:', service);

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

      console.log('🎯 [CALENDAR BOOKINGS] Final transformed data:', transformed.length, 'bookings');
      if (transformed.length > 0) {
        console.log('🎯 [CALENDAR BOOKINGS] First transformed booking:', JSON.stringify(transformed[0], null, 2));
      }

      return transformed;
    },
    enabled: !!providerId,
  });
};
export const useBusinessAvailability = (providerId?: string) => {
  return useQuery({
    queryKey: ['businessAvailability', providerId],
    queryFn: async () => {
      if (!providerId) throw new Error('Provider ID is required');

      const { data, error } = await supabase
        .from('profiles')
        .select('availability_status, availability_message, pause_until')
        .eq('id', providerId)
        .eq('role', 'provider')
        .single();

      if (error) {
        console.error('Error fetching business availability:', error);
        throw new Error(`Failed to fetch business availability: ${error.message}`);
      }

      if (!data) {
        throw new Error('Business availability data not found');
      }

      // Determine if business is paused based on pause_until and availability_status
      const now = new Date();
      const pauseUntil = data.pause_until ? new Date(data.pause_until) : null;
      const isPaused = data.availability_status === 'unavailable' ||
                      (pauseUntil && pauseUntil > now);

      return {
        isPaused,
        availabilityMessage: data.availability_message || undefined,
        pauseUntil: data.pause_until || undefined,
        availabilityStatus: data.availability_status || 'available',
      };
    },
    enabled: !!providerId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: (failureCount, error) => {
      console.log(`useBusinessAvailability: Retry attempt ${failureCount} for provider ${providerId}:`, error);
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
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
      if (!providerId) {
        throw new Error('Provider ID is required');
      }

      console.log('Updating business availability:', {
        providerId,
        isPaused,
        availabilityMessage,
        pauseUntil
      });

      // Update the profiles table
      const updateData: any = {
        availability_status: isPaused ? 'unavailable' : 'available',
        updated_at: new Date().toISOString(),
      };

      if (availabilityMessage !== undefined) {
        updateData.availability_message = availabilityMessage;
      }

      if (pauseUntil !== undefined) {
        updateData.pause_until = pauseUntil;
      } else if (!isPaused) {
        // Clear pause_until when resuming
        updateData.pause_until = null;
      }

      const { data, error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', providerId)
        .eq('role', 'provider')
        .select('availability_status, availability_message, pause_until')
        .single();

      if (error) {
        console.error('Error updating business availability:', error);
        throw new Error(`Failed to update business availability: ${error.message}`);
      }

      console.log('Business availability updated successfully:', data);
      return data;
    },
    onSuccess: (data, variables) => {
      // Invalidate and refetch the business availability query
      queryClient.invalidateQueries({
        queryKey: ['businessAvailability', variables.providerId]
      });

      // Also invalidate provider profile queries that might include availability
      queryClient.invalidateQueries({
        queryKey: ['providerProfile', variables.providerId]
      });
    },
    onError: (error, variables) => {
      console.error('Mutation error for business availability update:', error);
    },
  });
};
export const useProviderEarnings = (providerId?: string) => {
  return useQuery({
    queryKey: ['providerEarnings', providerId],
    queryFn: async () => {
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

      // Get completed bookings count from bookings table
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('id')
        .eq('provider_id', providerId)
        .eq('status', 'completed');

      if (bookingsError) throw bookingsError;
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

      // Get payout records from provider_payouts table
      const { data: payouts, error } = await supabase
        .from('provider_payouts')
        .select('id, amount, status, expected_payout_date, actual_payout_date, booking_id, created_at')
        .eq('provider_id', providerId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return payouts?.map(payout => ({
        id: payout.id,
        amount: parseFloat(payout.amount || '0'),
        status: payout.status,
        expected_payout_date: payout.expected_payout_date,
        actual_payout_date: payout.actual_payout_date,
        booking_id: payout.booking_id,
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

// ✅ Next upcoming booking hook - for dashboard quick actions
export const useNextUpcomingBooking = (providerId?: string) => {
  return useQuery({
    queryKey: ['nextUpcomingBooking', providerId],
    queryFn: async () => {
      if (!providerId) throw new Error('Provider ID is required');

      const today = new Date().toISOString().split('T')[0];
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      const threeDaysAgoStr = threeDaysAgo.toISOString().split('T')[0];

      // First try to get pending bookings (highest priority, including recent past)
      let { data, error } = await supabase
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
            title,
            duration_minutes
          )
        `)
        .eq('provider_id', providerId)
        .eq('status', 'pending')
        .gte('booking_date', threeDaysAgoStr)
        .order('booking_date', { ascending: true })
        .order('start_time', { ascending: true })
        .limit(1);

      // If no pending bookings, try confirmed bookings
      if (!data || data.length === 0) {
        const { data: confirmedData, error: confirmedError } = await supabase
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
              title,
              duration_minutes
            )
          `)
          .eq('provider_id', providerId)
          .eq('status', 'confirmed')
          .gte('booking_date', today)
          .order('booking_date', { ascending: true })
          .order('start_time', { ascending: true })
          .limit(1);
        
        data = confirmedData;
        error = confirmedError;
      }

      if (error) throw error;

      if (!data || data.length === 0) return null;

      const booking = data[0];
      const customer = Array.isArray(booking.customer) ? booking.customer[0] : booking.customer;
      const service = Array.isArray(booking.service) ? booking.service[0] : booking.service;

      return {
        id: booking.id,
        date: booking.booking_date,
        startTime: booking.start_time,
        endTime: booking.end_time,
        status: booking.status,
        customerName: customer
          ? `${customer.first_name || 'Unknown'} ${customer.last_name || 'Customer'}`.trim()
          : 'Unknown Customer',
        customerInitials: customer
          ? `${customer.first_name?.[0] || ''}${customer.last_name?.[0] || ''}`.toUpperCase()
          : 'UC',
        serviceTitle: service?.title || 'Service',
        duration: service?.duration_minutes ? `${Math.round(service.duration_minutes / 60)}hr` : '1.5hr',
        amount: parseFloat(booking.total_amount || '0'),
        address: booking.service_address || 'Address not provided',
      };
    },
    enabled: !!providerId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

export const useRecentActivity = (providerId?: string) => {
  return useQuery({
    queryKey: ['recentActivity', providerId],
    queryFn: async () => {
      if (!providerId) throw new Error('Provider ID is required');

      // Get recent completed bookings (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: completedBookings, error: completedError } = await supabase
        .from('bookings')
        .select(`
          id,
          booking_date,
          start_time,
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
        .eq('status', 'completed')
        .gte('booking_date', sevenDaysAgo.toISOString().split('T')[0])
        .order('booking_date', { ascending: false })
        .order('start_time', { ascending: false })
        .limit(3);

      if (completedError) throw completedError;

      // Get recent reviews (last 7 days)
      const { data: recentReviews, error: reviewsError } = await supabase
        .from('reviews')
        .select(`
          id,
          rating,
          created_at,
          customer:profiles!customer_id (
            first_name,
            last_name
          )
        `)
        .eq('provider_id', providerId)
        .gte('created_at', sevenDaysAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(2);

      if (reviewsError) throw reviewsError;

      // Get upcoming bookings (next 2 days)
      const twoDaysFromNow = new Date();
      twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);

      const { data: upcomingBookings, error: upcomingError } = await supabase
        .from('bookings')
        .select(`
          id,
          booking_date,
          start_time,
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
        .eq('status', 'confirmed')
        .gte('booking_date', new Date().toISOString().split('T')[0])
        .lte('booking_date', twoDaysFromNow.toISOString().split('T')[0])
        .order('booking_date', { ascending: true })
        .order('start_time', { ascending: true })
        .limit(2);

      if (upcomingError) throw upcomingError;

      // Combine and sort activities by recency
      const activities = [];

      // Add completed bookings
      completedBookings?.forEach(booking => {
        const customer = Array.isArray(booking.customer) ? booking.customer[0] : booking.customer;
        const service = Array.isArray(booking.service) ? booking.service[0] : booking.service;
        const customerName = customer
          ? `${customer.first_name || 'Unknown'} ${customer.last_name || 'Customer'}`.trim()
          : 'Unknown Customer';

        activities.push({
          id: `completed-${booking.id}`,
          type: 'completed',
          title: 'Service completed',
          description: `${service?.title || 'Service'} for ${customerName}`,
          amount: parseFloat(booking.total_amount || '0'),
          timestamp: new Date(`${booking.booking_date}T${booking.start_time}`),
          icon: '✅'
        });
      });

      // Add recent reviews
      recentReviews?.forEach(review => {
        const customer = Array.isArray(review.customer) ? review.customer[0] : review.customer;
        const customerName = customer
          ? `${customer.first_name || 'Unknown'} ${customer.last_name || 'Customer'}`.trim()
          : 'Unknown Customer';

        activities.push({
          id: `review-${review.id}`,
          type: 'review',
          title: 'New review',
          description: `${review.rating} stars from ${customerName}`,
          amount: null,
          timestamp: new Date(review.created_at || ''),
          icon: '⭐',
          rating: review.rating
        });
      });

      // Add upcoming bookings
      upcomingBookings?.forEach(booking => {
        const customer = Array.isArray(booking.customer) ? booking.customer[0] : booking.customer;
        const service = Array.isArray(booking.service) ? booking.service[0] : booking.service;
        const customerName = customer
          ? `${customer.first_name || 'Unknown'} ${customer.last_name || 'Customer'}`.trim()
          : 'Unknown Customer';

        activities.push({
          id: `booking-${booking.id}`,
          type: 'booking',
          title: 'New booking',
          description: `${service?.title || 'Service'} • ${new Date(booking.booking_date).toLocaleDateString()} ${booking.start_time}`,
          amount: parseFloat(booking.total_amount || '0'),
          timestamp: new Date(`${booking.booking_date}T${booking.start_time}`),
          icon: '📅'
        });
      });

      // Sort by timestamp (most recent first) and limit to 5 items
      return activities
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, 5);
    },
    enabled: !!providerId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
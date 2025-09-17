import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

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
          profiles!bookings_provider_id_fkey (
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
      const { id, ...profileUpdates } = updates;
      
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
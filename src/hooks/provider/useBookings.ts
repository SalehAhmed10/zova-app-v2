import React, { useState } from 'react';
import { supabase } from '@/lib/core/supabase';

export interface Booking {
  id: string;
  booking_date: string;
  start_time: string;
  end_time?: string;
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  customer_name: string;
  service_name: string;
  total_amount: string;
  service_address?: string;
  customer_initials?: string;
}

export const useBookings = (providerId?: string) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      
      let query = supabase
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
        .order('booking_date', { ascending: false })
        .order('start_time', { ascending: true });

      if (providerId) {
        query = query.eq('provider_id', providerId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching bookings:', error);
        setError(error.message);
        return;
      }

      // Transform the data to match our interface
      const transformedBookings: Booking[] = (data || []).map((booking: any) => {
        const customer = Array.isArray(booking.customer) ? booking.customer[0] : booking.customer;
        const service = Array.isArray(booking.service) ? booking.service[0] : booking.service;
        
        const customerName = customer 
          ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim()
          : 'Unknown Customer';
        
        const initials = customer
          ? `${customer.first_name?.[0] || ''}${customer.last_name?.[0] || ''}`.toUpperCase()
          : 'UC';

        return {
          id: booking.id,
          booking_date: booking.booking_date,
          start_time: booking.start_time,
          end_time: booking.end_time,
          status: booking.status,
          customer_name: customerName,
          customer_initials: initials,
          service_name: service?.title || 'Service',
          total_amount: `£${booking.total_amount}`,
          service_address: booking.service_address,
        };
      });

      setBookings(transformedBookings);
      setError(null);
    } catch (err) {
      console.error('Error in fetchBookings:', err);
      setError('Failed to fetch bookings');
    } finally {
      setLoading(false);
    }
  };

  // ✅ REACT QUERY PATTERN: Auto-fetch using React Query (replaces useEffect)
  React.useMemo(() => {
    if (providerId) {
      fetchBookings();
    }
  }, [providerId]);

  const getBookingsForDate = (date: string) => {
    return bookings.filter(booking => booking.booking_date === date);
  };

  const getBookingsForDateRange = (startDate: string, endDate: string) => {
    return bookings.filter(booking => 
      booking.booking_date >= startDate && booking.booking_date <= endDate
    );
  };

  const getBookingStats = () => {
    const today = new Date().toISOString().split('T')[0];
    const todayBookings = getBookingsForDate(today);
    
    // Get this week's bookings
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 6);
    
    const weekBookings = getBookingsForDateRange(
      startOfWeek.toISOString().split('T')[0],
      endOfWeek.toISOString().split('T')[0]
    );

    // Get this month's bookings
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    const endOfMonth = new Date(startOfMonth);
    endOfMonth.setMonth(endOfMonth.getMonth() + 1);
    endOfMonth.setDate(0);
    
    const monthBookings = getBookingsForDateRange(
      startOfMonth.toISOString().split('T')[0],
      endOfMonth.toISOString().split('T')[0]
    );

    // Calculate average hours (assuming 1.5 hours per booking)
    const avgHours = (weekBookings.length * 1.5).toFixed(1);

    return {
      today: todayBookings.length,
      thisWeek: weekBookings.length,
      thisMonth: monthBookings.length,
      avgHours,
    };
  };

  return {
    bookings,
    loading,
    error,
    getBookingsForDate,
    getBookingsForDateRange,
    getBookingStats,
    refetch: fetchBookings,
  };
};
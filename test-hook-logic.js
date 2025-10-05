const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testHookLogic() {
  const providerId = 'c7fa7484-9609-49d1-af95-6508a739f4a2';
  
  // Calculate date range (same as in the app)
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30); // Include past 30 days
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 60); // Include next 60 days

  console.log('📅 Date range:', {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    startDateStr: startDate.toISOString().split('T')[0],
    endDateStr: endDate.toISOString().split('T')[0]
  });

  console.log('🔍 Step 1: Fetching bookings...');
  
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

  // Add date range filter
  const startDateStr = startDate.toISOString().split('T')[0];
  const endDateStr = endDate.toISOString().split('T')[0];
  query = query.gte('booking_date', startDateStr);
  query = query.lte('booking_date', endDateStr);

  const { data: bookingsData, error: bookingsError } = await query;

  if (bookingsError) {
    console.error('❌ Bookings query error:', bookingsError);
    return;
  }

  console.log('✅ Bookings data received:', bookingsData?.length || 0, 'bookings');

  if (!bookingsData || bookingsData.length === 0) {
    console.log('📭 No bookings found');
    return;
  }

  console.log('📋 Bookings:', bookingsData.map(b => ({
    id: b.id,
    date: b.booking_date,
    customer_id: b.customer_id,
    service_id: b.service_id
  })));

  // Get unique customer and service IDs
  const customerIds = [...new Set(bookingsData.map(b => b.customer_id).filter(id => id))];
  const serviceIds = [...new Set(bookingsData.map(b => b.service_id).filter(id => id))];

  console.log('🔍 Step 2: Fetching customer profiles and services...');
  console.log('Customer IDs:', customerIds);
  console.log('Service IDs:', serviceIds);

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
    console.error('❌ Customers query error:', customersResult.error);
  } else {
    console.log('✅ Customers data:', customersResult.data);
  }

  if (servicesResult.error) {
    console.error('❌ Services query error:', servicesResult.error);
  } else {
    console.log('✅ Services data:', servicesResult.data);
  }

  const customersMap = (customersResult.data || []).reduce((acc, customer) => {
    acc[customer.id] = customer;
    return acc;
  }, {});

  const servicesMap = (servicesResult.data || []).reduce((acc, service) => {
    acc[service.id] = service;
    return acc;
  }, {});

  console.log('🔍 Step 3: Transforming data...');

  const transformed = bookingsData.map((booking) => {
    const customer = customersMap[booking.customer_id];
    const service = servicesMap[booking.service_id];

    console.log('🔄 Processing booking:', booking.id, 'customer:', customer, 'service:', service);

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

  console.log('🎯 Final transformed data:', transformed.length, 'bookings');
  if (transformed.length > 0) {
    console.log('🎯 First transformed booking:', JSON.stringify(transformed[0], null, 2));
    console.log('🎯 All customer names:', transformed.map(b => b.customerName));
  }

  process.exit(0);
}

testHookLogic();
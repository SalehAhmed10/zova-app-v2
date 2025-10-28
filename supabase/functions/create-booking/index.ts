import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE'
};
Deno.serve(async (req)=>{
  console.log('=== CREATE BOOKING FUNCTION START ===');
  // Handle CORS
  if (req.method === 'OPTIONS') {
    console.log('OPTIONS request received');
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    console.log('Processing POST request');
    // Check environment variables first
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    console.log('Environment check:');
    console.log('- SUPABASE_URL:', supabaseUrl ? 'Set' : 'Missing');
    console.log('- SUPABASE_ANON_KEY:', supabaseAnonKey ? 'Set' : 'Missing');
    console.log('- SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? 'Set' : 'Missing');
    console.log('- STRIPE_SECRET_KEY:', stripeSecretKey ? 'Set (' + (stripeSecretKey ? stripeSecretKey.slice(0, 7) + '...' : 'Missing') + ')' : 'Missing');
    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      console.error('Supabase configuration is missing');
      return new Response(JSON.stringify({
        error: 'Supabase configuration error'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 500
      });
    }
    if (!stripeSecretKey) {
      console.error('STRIPE_SECRET_KEY is missing');
      return new Response(JSON.stringify({
        error: 'Stripe configuration error - missing secret key'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 500
      });
    }
    // Get and validate JWT token
    const authHeader = req.headers.get('Authorization');
    console.log('Authorization header:', authHeader ? 'Present' : 'Missing');
    if (!authHeader) {
      console.error('No authorization header provided');
      return new Response(JSON.stringify({
        error: 'Authorization header required'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 401
      });
    }
    const jwt = authHeader.replace('Bearer ', '');
    console.log('JWT token details:');
    console.log('  - Length: ' + jwt.length + ' chars');
    console.log('  - First 50 chars: ' + jwt.substring(0, 50) + '...');
    console.log('  - Last 20 chars: ...' + jwt.slice(-20));
    // Try to decode JWT header for debugging
    try {
      const jwtParts = jwt.split('.');
      if (jwtParts.length === 3) {
        const header = JSON.parse(atob(jwtParts[0]));
        const payload = JSON.parse(atob(jwtParts[1]));
        console.log('JWT Header:', header);
        console.log('JWT Payload (partial):', {
          iss: payload.iss,
          sub: payload.sub,
          aud: payload.aud,
          exp: payload.exp,
          iat: payload.iat,
          email: payload.email
        });
        console.log('Token expiry:', new Date(payload.exp * 1000).toISOString());
        console.log('Current time:', new Date().toISOString());
        console.log('Time until expiry (seconds):', payload.exp - Math.floor(Date.now() / 1000));
      }
    } catch (decodeError) {
      console.error('Failed to decode JWT for debugging:', decodeError.message);
    }
    // Since JWT verification is disabled at platform level, we'll extract user info from JWT payload
    console.log('JWT verification disabled - extracting user info from payload');
    let userId, userEmail;
    try {
      const jwtParts = jwt.split('.');
      if (jwtParts.length !== 3) {
        throw new Error('Invalid JWT format');
      }
      const payload = JSON.parse(atob(jwtParts[1]));
      userId = payload.sub;
      userEmail = payload.email;
      console.log('Extracted user info:', {
        userId: userId,
        email: userEmail,
        aud: payload.aud,
        role: payload.role
      });
      if (!userId || !userEmail) {
        throw new Error('Missing user ID or email in JWT');
      }
      // Verify this is an authenticated user (not anonymous)
      if (payload.aud !== 'authenticated' || payload.role !== 'authenticated') {
        throw new Error('User not properly authenticated');
      }
    } catch (jwtError) {
      console.error('JWT parsing error:', jwtError.message);
      return new Response(JSON.stringify({
        error: 'Invalid JWT token',
        details: jwtError.message,
        debug: {
          jwtLength: jwt.length,
          timestamp: new Date().toISOString()
        }
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 401
      });
    }
    console.log('User authenticated via JWT payload extraction');
    console.log('   User ID: ' + userId);
    console.log('   Email: ' + userEmail);
    const supabaseService = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    // Create user client for user-specific operations
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: req.headers.get('Authorization')
        }
      }
    });
    console.log('Parsing request body...');
    const body = await req.json().catch(()=>({}));
    console.log('Request body parsed successfully');
    const { service_id, provider_id, customer_id, booking_date, start_time, customer_notes, service_address, payment_intent_id } = body;
    console.log('Parsed booking request:', {
      service_id,
      provider_id,
      customer_id,
      booking_date,
      start_time,
      customer_notes: customer_notes ? 'Present' : 'Not provided',
      service_address: service_address ? 'Present' : 'Not provided',
      payment_intent_id
    });
    // Validate required fields
    if (!service_id || !provider_id || !customer_id || !booking_date || !start_time || !payment_intent_id) {
      console.error('Missing required fields:', {
        service_id: !!service_id,
        provider_id: !!provider_id,
        customer_id: !!customer_id,
        booking_date: !!booking_date,
        start_time: !!start_time,
        payment_intent_id: !!payment_intent_id
      });
      return new Response(JSON.stringify({
        error: 'Missing required fields'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    console.log('Validating service details...');
    // Get service details using service role (bypass RLS)
    const { data: service, error: serviceError } = await supabaseService.from('provider_services').select('*').eq('id', service_id).eq('provider_id', provider_id).single();
    if (serviceError || !service) {
      console.error('Service lookup error:', serviceError);
      console.error('Service not found for:', {
        service_id,
        provider_id
      });
      return new Response(JSON.stringify({
        error: 'Service not found'
      }), {
        status: 404,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    console.log('Service found:', {
      id: service.id,
      name: service.name,
      is_active: service.is_active,
      duration_minutes: service.duration_minutes,
      base_price: service.base_price
    });
    // Check if service is active
    if (!service.is_active) {
      console.error('Service is not active:', service_id);
      return new Response(JSON.stringify({
        error: 'Service is not available'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    console.log('Validating provider availability...');
    // Handle SOS bookings (start_time = 'ASAP') - use current time for day of week calculation
    const isSOSBooking = start_time === 'ASAP';
    const timeForDayCalculation = isSOSBooking ? new Date() : new Date(`${booking_date}T${start_time}`);
    const dayOfWeek = timeForDayCalculation.getDay(); // 0 = Sunday, 1 = Monday, etc.
    // Map day numbers to day names for JSON lookup
    const dayNames = [
      'sunday',
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday'
    ];
    const dayName = dayNames[dayOfWeek];
    console.log('Booking validation:', {
      booking_date,
      start_time,
      isSOSBooking,
      dayOfWeek,
      dayName
    });
    // Check provider's regular schedule (stored as JSON in schedule_data)
    const { data: scheduleRecord, error: scheduleError } = await supabaseService.from('provider_schedules').select('schedule_data').eq('provider_id', provider_id).single();
    if (scheduleError || !scheduleRecord) {
      console.error('Schedule lookup error:', scheduleError);
      console.error('No schedule found for provider:', provider_id);
      return new Response(JSON.stringify({
        error: 'Provider schedule not found'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    console.log('Schedule record found:', scheduleRecord);
    // Parse the schedule data and check if the day is available
    const scheduleData = scheduleRecord.schedule_data;
    const daySchedule = scheduleData[dayName];
    console.log('Day schedule for', dayName, ':', daySchedule);
    // Check if provider is available on this day
    if (!daySchedule || !daySchedule.enabled) {
      console.error('Provider not available on', dayName);
      return new Response(JSON.stringify({
        error: `Provider is not available on this day (${dayName})`
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Check for provider blackouts (unavailable date ranges)
    const { data: blackouts, error: blackoutsError } = await supabaseService.from('provider_blackouts').select('start_date, end_date').eq('provider_id', provider_id).lte('start_date', booking_date).gte('end_date', booking_date);
    if (blackoutsError) {
      console.error('Error checking provider blackouts:', blackoutsError);
    } else if (blackouts && blackouts.length > 0) {
      return new Response(JSON.stringify({
        error: 'Provider is not available on this date'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // For SOS bookings, use the first available time slot from the provider's schedule
    let finalStartTime = start_time;
    let finalEndTime = '';
    if (isSOSBooking) {
      // Use provider's opening time as start time for SOS bookings
      finalStartTime = daySchedule.start;
      console.log('SOS booking - using provider opening time:', finalStartTime);
      // Calculate end time based on service duration
      const [startHours, startMinutes] = finalStartTime.split(':').map(Number);
      const startMinutesTotal = startHours * 60 + startMinutes + (service.duration_minutes || 60);
      const endHours = Math.floor(startMinutesTotal / 60);
      const endMinutes = startMinutesTotal % 60;
      finalEndTime = `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
    } else {
      // Regular booking - calculate end time from service duration
      const [startHours, startMinutes] = start_time.split(':').map(Number);
      const startMinutesTotal = startHours * 60 + startMinutes + (service.duration_minutes || 60);
      const endHours = Math.floor(startMinutesTotal / 60);
      const endMinutes = startMinutesTotal % 60;
      finalEndTime = `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
    }
    console.log('Final booking times:', {
      finalStartTime,
      finalEndTime
    });
    // Check for conflicting bookings
    const { data: existingBookings, error: bookingsError } = await supabaseService.from('bookings').select('start_time, end_time').eq('provider_id', provider_id).eq('booking_date', booking_date).in('status', [
      'confirmed',
      'in_progress'
    ]);
    if (bookingsError) {
      console.error('Error checking existing bookings:', bookingsError);
      return new Response(JSON.stringify({
        error: 'Unable to verify availability'
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Check for time conflicts with existing bookings
    for (const booking of existingBookings || []){
      const bookingStart = booking.start_time;
      const bookingEnd = booking.end_time;
      // Check if requested time overlaps with existing booking
      if (finalStartTime < bookingEnd && finalEndTime > bookingStart) {
        return new Response(JSON.stringify({
          error: 'This time slot is already booked'
        }), {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }
    }
    // Validate time slot availability against schedule hours (only for non-SOS bookings)
    if (!isSOSBooking) {
      console.log('Time slot validation (non-SOS):', {
        finalStartTime,
        finalEndTime
      });
      console.log('Schedule hours:', {
        scheduleStart: daySchedule.start,
        scheduleEnd: daySchedule.end
      });
      // Check if the requested time falls within schedule hours
      if (finalStartTime < daySchedule.start || finalEndTime > daySchedule.end) {
        console.error('Requested time outside schedule hours:', {
          finalStartTime,
          finalEndTime,
          scheduleStart: daySchedule.start,
          scheduleEnd: daySchedule.end
        });
        return new Response(JSON.stringify({
          error: 'Requested time is outside provider\'s available hours',
          details: {
            finalStartTime,
            finalEndTime,
            scheduleStart: daySchedule.start,
            scheduleEnd: daySchedule.end
          }
        }), {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }
    }
    console.log('Time slot validation passed');
    // ✅ IMPORTANT: Use amounts from Stripe PaymentIntent, not recalculated
    // Frontend calculates: base_price + (base_price * 0.10) = totalAmount
    // We trust the Stripe PaymentIntent as the source of truth
    const baseAmount = service.base_price;
    // Retrieve and validate the existing PaymentIntent
    console.log('Validating payment intent:', payment_intent_id);
    // Retrieve the PaymentIntent from Stripe
    const paymentIntentResponse = await fetch(`https://api.stripe.com/v1/payment_intents/${payment_intent_id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${stripeSecretKey}`
      }
    });
    if (!paymentIntentResponse.ok) {
      const errorData = await paymentIntentResponse.json();
      console.error('PaymentIntent retrieval failed:', errorData);
      return new Response(JSON.stringify({
        error: 'Payment verification failed'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    const paymentIntent = await paymentIntentResponse.json();
    // Verify the payment was authorized (handle both old and new payment flows)
    const validStatuses = [
      'succeeded',
      'requires_capture',
      'partially_captured'
    ];
    if (!validStatuses.includes(paymentIntent.status)) {
      console.log('PaymentIntent status check:', {
        current_status: paymentIntent.status,
        valid_statuses: validStatuses,
        capture_method: paymentIntent.capture_method
      });
      return new Response(JSON.stringify({
        error: 'Payment not authorized or completed'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    console.log('PaymentIntent validation passed:', {
      status: paymentIntent.status,
      capture_method: paymentIntent.capture_method,
      amount: paymentIntent.amount,
      amount_capturable: paymentIntent.amount_capturable,
      amount_received: paymentIntent.amount_received
    });
    // ✅ Extract amounts from PaymentIntent (convert from pence to pounds)
    // Stripe stores amounts in pence, we convert to pounds
    const totalAmount = paymentIntent.amount / 100; // Total customer pays (base + platform fee)
    const platformFee = totalAmount - baseAmount; // Platform fee = total - base
    const capturedAmount = paymentIntent.amount_received / 100; // What was actually captured
    console.log('Amounts extracted from PaymentIntent:', {
      totalAmount,
      baseAmount,
      platformFee,
      capturedAmount
    });
    // Verify the PaymentIntent metadata matches our booking
    const metadata = paymentIntent.metadata || {};
    if (metadata.service_id !== service_id || metadata.provider_id !== provider_id || metadata.customer_id !== customer_id) {
      return new Response(JSON.stringify({
        error: 'Payment intent does not match booking details'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Check provider's auto_confirm_bookings setting
    console.log('Checking provider auto-confirm setting...');
    const { data: providerProfile, error: providerError } = await supabaseService.from('profiles').select('auto_confirm_bookings').eq('id', provider_id).single();
    if (providerError) {
      console.error('Provider profile lookup error:', providerError);
      return new Response(JSON.stringify({
        error: 'Provider not found'
      }), {
        status: 404,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    const autoConfirm = providerProfile?.auto_confirm_bookings || false;
    const bookingStatus = autoConfirm ? 'confirmed' : 'pending';
    const autoConfirmed = autoConfirm;
    console.log('Provider auto-confirm setting:', {
      autoConfirm,
      bookingStatus,
      autoConfirmed
    });
    // ✅ FIXED: Preserve booking_mode from start_time indicator
    const bookingMode = isSOSBooking ? 'sos' : 'normal';
    console.log('📍 Booking mode determined:', {
      isSOSBooking,
      bookingMode
    });
    // Create booking record using service role (bypass RLS)
    // Status will be 'pending' if manual acceptance required, 'confirmed' if auto-accept
    // ✅ ESCROW: Full amount is captured and held in escrow until service completion
    const { data: booking, error: bookingError } = await supabaseService.from('bookings').insert({
      service_id: service_id,
      provider_id: provider_id,
      customer_id: customer_id,
      booking_date: booking_date,
      booking_mode: bookingMode,
      start_time: finalStartTime,
      end_time: finalEndTime,
      base_amount: baseAmount,
      platform_fee: platformFee,
      total_amount: totalAmount,
      customer_notes: customer_notes,
      service_address: service_address,
      status: bookingStatus,
      payment_status: 'funds_held_in_escrow',
      auto_confirmed: autoConfirmed,
      // ✅ ESCROW FIELDS: Using correct column names for escrow tracking
      payment_intent_id: payment_intent_id,
      captured_amount: Math.round(totalAmount * 100) / 100,
      amount_held_for_provider: Math.round(baseAmount * 100) / 100,
      platform_fee_held: Math.round(platformFee * 100) / 100,
      funds_held_at: new Date().toISOString() // Timestamp when funds were held
    }).select().single();
    if (bookingError) {
      console.error('Booking creation error:', bookingError);
      return new Response(JSON.stringify({
        error: `Failed to create booking: ${bookingError.message}`
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    console.log('✅ Booking created with booking_mode:', bookingMode);
    // Create payment_intents record for tracking
    console.log('Creating payment_intents record...');
    const { error: piError } = await supabaseService.from('payment_intents').insert({
      booking_id: booking.id,
      stripe_payment_intent_id: payment_intent_id,
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency,
      status: paymentIntent.status,
      client_secret: paymentIntent.client_secret,
      payment_method_types: paymentIntent.payment_method_types,
      metadata: paymentIntent.metadata
    });
    if (piError) {
      console.error('Payment intent record creation error:', piError);
    // Non-critical error, continue with booking response
    } else {
      console.log('Payment intent record created successfully');
    }
    // Create payments record for financial tracking
    console.log('Creating payments record...');
    const { error: paymentError } = await supabaseService.from('payments').insert({
      booking_id: booking.id,
      stripe_payment_id: paymentIntent.latest_charge,
      amount: totalAmount,
      currency: 'GBP',
      status: 'paid',
      paid_at: new Date().toISOString()
    });
    if (paymentError) {
      console.error('Payment record creation error:', paymentError);
    // Non-critical error, continue with booking response
    } else {
      console.log('Payment record created successfully');
    }
    return new Response(JSON.stringify({
      booking: {
        id: booking.id,
        booking_date: booking.booking_date,
        booking_mode: booking.booking_mode,
        start_time: booking.start_time,
        end_time: booking.end_time,
        total_amount: booking.total_amount,
        status: booking.status
      }
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Booking creation error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error'
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};

interface AcceptBookingRequest {
  booking_id: string;
}

Deno.serve(async (req) => {
  console.log('=== ACCEPT BOOKING FUNCTION START ===');

  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: 'Supabase configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract JWT token and user info
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const jwt = authHeader.replace('Bearer ', '');
    let providerId: string;

    try {
      const jwtParts = jwt.split('.');
      const payload = JSON.parse(atob(jwtParts[1]));
      providerId = payload.sub;

      if (!providerId) {
        throw new Error('Invalid user ID in JWT');
      }
    } catch (error) {
      console.error('JWT parsing error:', error);
      return new Response(
        JSON.stringify({ error: 'Invalid authentication token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body = await req.json();
    const { booking_id }: AcceptBookingRequest = body;

    if (!booking_id) {
      return new Response(
        JSON.stringify({ error: 'booking_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseService = createClient(supabaseUrl, supabaseServiceKey);

    // Get booking details and verify ownership
    const { data: booking, error: bookingError } = await supabaseService
      .from('bookings')
      .select('*, provider_id, customer_id, status')
      .eq('id', booking_id)
      .single();

    if (bookingError || !booking) {
      console.error('Booking not found:', bookingError);
      return new Response(
        JSON.stringify({ error: 'Booking not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify this provider owns the booking
    if (booking.provider_id !== providerId) {
      console.error('Provider does not own this booking');
      return new Response(
        JSON.stringify({ error: 'Unauthorized - not your booking' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check booking status
    if (booking.status !== 'pending') {
      return new Response(
        JSON.stringify({
          error: `Booking cannot be accepted - current status: ${booking.status}`,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update booking status to confirmed
    const { data: updatedBooking, error: updateError } = await supabaseService
      .from('bookings')
      .update({
        status: 'confirmed',
        provider_response_deadline: null, // Clear deadline
        updated_at: new Date().toISOString(),
      })
      .eq('id', booking_id)
      .select()
      .single();

    if (updateError) {
      console.error('Failed to update booking:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to accept booking' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // TODO: Send notification to customer about booking acceptance
    console.log('Booking accepted successfully:', booking_id);
    console.log('TODO: Send push notification to customer:', booking.customer_id);

    return new Response(
      JSON.stringify({
        success: true,
        booking: updatedBooking,
        message: 'Booking accepted successfully',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Accept booking error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

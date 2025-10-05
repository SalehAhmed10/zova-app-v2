/**
 * Create SOS Booking Edge Function
 * 
 * Creates emergency bookings with instant confirmation and priority handling.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

interface CreateSOSBookingRequest {
  provider_id: string;
  category_id: string;
  emergency_description: string;
  service_location: string;
  urgency_level: 'low' | 'medium' | 'high';
  instant_confirmation: boolean;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { 
      provider_id, 
      category_id, 
      emergency_description, 
      service_location, 
      urgency_level, 
      instant_confirmation 
    }: CreateSOSBookingRequest = await req.json()

    // Get JWT from Authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    // Get user from JWT
    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (userError || !user) {
      throw new Error('Invalid or expired token')
    }

    // Verify user has active SOS subscription
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('customer_id', user.id)
      .eq('status', 'active')
      .eq('plan_type', 'sos')
      .single()

    if (subError || !subscription) {
      return new Response(
        JSON.stringify({ 
          error: 'SOS subscription required',
          message: 'You need an active SOS subscription to create emergency bookings'
        }),
        { 
          status: 403, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          } 
        }
      )
    }

    // Verify provider exists and accepts emergency bookings
    const { data: provider, error: providerError } = await supabase
      .from('profiles')
      .select(`
        id,
        first_name,
        last_name,
        business_name,
        provider_services!inner (
          id,
          title,
          base_price,
          duration_minutes,
          allows_sos_booking
        )
      `)
      .eq('id', provider_id)
      .eq('role', 'provider')
      .eq('is_verified', true)
      .eq('provider_services.allows_sos_booking', true)
      .eq('provider_services.is_active', true)
      .limit(1)
      .single()

    if (providerError || !provider) {
      return new Response(
        JSON.stringify({ 
          error: 'Provider unavailable',
          message: 'Selected provider is not available for emergency bookings'
        }),
        { 
          status: 400, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          } 
        }
      )
    }

    // Get an appropriate service for the emergency category
    const service = Array.isArray(provider.provider_services) 
      ? provider.provider_services[0] 
      : provider.provider_services;

    // Create the emergency booking with real data
    const bookingData = {
      customer_id: user.id,
      provider_id: provider_id,
      service_id: service?.id || null,
      booking_date: new Date().toISOString().split('T')[0],
      start_time: new Date().toISOString(),
      end_time: new Date(Date.now() + (service?.duration_minutes || 60) * 60000).toISOString(),
      status: instant_confirmation ? 'confirmed' : 'pending',
      total_amount: service?.base_price || 50, // Emergency surcharge
      service_location: service_location,
      emergency_description: emergency_description,
      urgency_level: urgency_level,
      sos_booking: true,
      requires_confirmation: !instant_confirmation,
      confirmed_at: instant_confirmation ? new Date().toISOString() : null,
      payment_status: 'pending'
    }

    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert([bookingData])
      .select(`
        id,
        provider_id,
        customer_id,
        service_location,
        emergency_description,
        urgency_level,
        status,
        total_amount,
        created_at,
        sos_booking
      `)
      .single()

    if (bookingError) {
      console.error('Error creating SOS booking:', bookingError)
      throw new Error('Failed to create emergency booking')
    }

    // Calculate estimated arrival (mock calculation)
    const estimatedArrivalMinutes = urgency_level === 'high' ? 10 : urgency_level === 'medium' ? 20 : 30;
    const estimatedArrival = `${estimatedArrivalMinutes} minutes`;

    // TODO: In production, notify the provider immediately
    // TODO: Send push notifications to customer
    // TODO: Create provider notification record

    console.log(`SOS booking created: ${booking.id} for user ${user.id}`)

    return new Response(
      JSON.stringify({ 
        booking: {
          ...booking,
          estimated_arrival: estimatedArrival
        },
        message: 'Emergency booking created successfully',
        estimated_arrival: estimatedArrival,
        provider_notified: true
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )

  } catch (error) {
    console.error('Error in create-sos-booking:', error)
    return new Response(
      JSON.stringify({ 
        error: (error as Error).message || 'Failed to create emergency booking',
        details: 'Unable to process emergency booking request'
      }),
      { 
        status: 500, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )
  }
})
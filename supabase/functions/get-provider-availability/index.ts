import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AvailabilityRequest {
  providerId: string
  date: string
}

Deno.serve(async (req) => {
  console.log('=== GET PROVIDER AVAILABILITY FUNCTION START ===')

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration')
    }

    // Create Supabase client with service role
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    const body: AvailabilityRequest = await req.json().catch(() => ({}))
    const { providerId, date } = body

    if (!providerId || !date) {
      return new Response(
        JSON.stringify({ error: 'Provider ID and date are required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('Fetching availability for provider:', providerId, 'on date:', date)

    // Get provider's schedule data
    const { data: schedule, error: scheduleError } = await supabase
      .from('provider_schedules')
      .select('schedule_data')
      .eq('provider_id', providerId)
      .maybeSingle()

    if (scheduleError) {
      console.error('Schedule error:', scheduleError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch provider schedule' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (!schedule) {
      console.log('No schedule found for provider')
      return new Response(
        JSON.stringify({
          providerId,
          date,
          availableSlots: [],
          isFullyBooked: true,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse the day of week and get schedule for that day
    const dayOfWeek = new Date(date).getDay()
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    const dayName = dayNames[dayOfWeek]
    const daySchedule = schedule.schedule_data[dayName]

    if (!daySchedule || !daySchedule.enabled) {
      console.log('Provider not available on this day:', dayName)
      return new Response(
        JSON.stringify({
          providerId,
          date,
          availableSlots: [],
          isFullyBooked: true,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get existing bookings for this date
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('start_time, end_time')
      .eq('provider_id', providerId)
      .eq('booking_date', date)
      .in('status', ['confirmed', 'in_progress'])

    if (bookingsError) {
      console.error('Bookings error:', bookingsError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch existing bookings' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Helper function to add minutes to time
    function addMinutesToTime(time: string, minutes: number): string {
      const [hours, mins] = time.split(':').map(Number)
      const totalMinutes = hours * 60 + mins + minutes
      const newHours = Math.floor(totalMinutes / 60) % 24
      const newMinutes = totalMinutes % 60
      return `${newHours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}`
    }

    // Generate available time slots based on schedule
    const slots: Array<{ date: string; time: string; available: boolean }> = []
    let scheduleStart = daySchedule.start
    let scheduleEnd = daySchedule.end

    console.log('Generating slots from', scheduleStart, 'to', scheduleEnd)

    // Assume default service duration of 60 minutes for slot generation
    const defaultServiceDuration = 60

    // Generate 30-minute intervals within schedule hours, ensuring service fits
    let currentTime = scheduleStart
    while (currentTime < scheduleEnd) {
      // Check if adding service duration would exceed schedule end
      const serviceEndTime = addMinutesToTime(currentTime, defaultServiceDuration)
      if (serviceEndTime > scheduleEnd) {
        break; // Don't generate slots that would make service end after schedule
      }

      // Check if this time slot conflicts with existing bookings
      const isBooked = bookings?.some(booking => {
        const bookingStart = booking.start_time
        const bookingEnd = booking.end_time || addMinutesToTime(bookingStart, 60) // Default 1 hour if no end_time

        // Check for overlap with the full service duration
        const slotEnd = addMinutesToTime(currentTime, defaultServiceDuration)
        return currentTime < bookingEnd && slotEnd > bookingStart
      }) || false

      slots.push({
        date,
        time: currentTime,
        available: !isBooked,
      })

      // Move to next 30-minute slot
      currentTime = addMinutesToTime(currentTime, 30)
    }

    const availableSlots = slots.filter(slot => slot.available)
    const isFullyBooked = availableSlots.length === 0

    console.log('Generated', availableSlots.length, 'available slots out of', slots.length, 'total slots')

    return new Response(
      JSON.stringify({
        providerId,
        date,
        availableSlots,
        isFullyBooked,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in get-provider-availability:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
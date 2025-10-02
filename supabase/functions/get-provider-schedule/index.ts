import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ScheduleRequest {
  providerId: string
}

Deno.serve(async (req) => {
  console.log('=== GET PROVIDER SCHEDULE FUNCTION START ===')

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

    const body: ScheduleRequest = await req.json().catch(() => ({}))
    const { providerId } = body

    if (!providerId) {
      return new Response(
        JSON.stringify({ error: 'Provider ID is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('Fetching schedule for provider:', providerId)

    // Get provider schedule
    const { data: schedule, error } = await supabase
      .from('provider_schedules')
      .select('*')
      .eq('provider_id', providerId)
      .maybeSingle()

    if (error) {
      console.error('Error fetching schedule:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch provider schedule' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('Schedule found:', !!schedule)

    return new Response(
      JSON.stringify({
        schedule: schedule || null
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Function error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
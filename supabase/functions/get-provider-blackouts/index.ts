import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface BlackoutsRequest {
  providerId: string
}

Deno.serve(async (req) => {
  console.log('=== GET PROVIDER BLACKOUTS FUNCTION START ===')

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration')
    }

    // Create Supabase client with service role (bypasses RLS)
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    const { providerId }: BlackoutsRequest = await req.json()
    console.log('Fetching blackouts for provider:', providerId)

    if (!providerId) {
      return new Response(
        JSON.stringify({ error: 'Provider ID is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Fetch provider blackouts (bypasses RLS with service role)
    const { data: blackouts, error } = await supabase
      .from('provider_blackouts')
      .select('start_date, end_date, reason')
      .eq('provider_id', providerId)
      .order('start_date', { ascending: true })

    if (error) {
      console.error('Error fetching provider blackouts:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch provider blackouts' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('Found blackouts:', blackouts?.length || 0)

    // Convert blackout ranges to individual disabled date strings
    const disabledDates: string[] = []
    
    blackouts?.forEach(blackout => {
      const startDate = new Date(blackout.start_date)
      const endDate = new Date(blackout.end_date)
      
      // Add all dates in the range
      const currentDate = new Date(startDate)
      while (currentDate <= endDate) {
        disabledDates.push(currentDate.toISOString().split('T')[0])
        currentDate.setDate(currentDate.getDate() + 1)
      }
    })

    console.log('Disabled dates generated:', disabledDates)

    return new Response(
      JSON.stringify({ 
        blackouts,
        disabledDates 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in get-provider-blackouts function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
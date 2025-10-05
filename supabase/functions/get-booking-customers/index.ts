import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface BookingCustomerRequest {
  provider_id: string;
  customer_ids: string[];
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { provider_id, customer_ids }: BookingCustomerRequest = await req.json()

    if (!provider_id || !customer_ids || !Array.isArray(customer_ids)) {
      return new Response(
        JSON.stringify({ error: 'provider_id and customer_ids array are required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // First verify that the provider has bookings with these customers
    const { data: bookings, error: bookingsError } = await supabaseClient
      .from('bookings')
      .select('customer_id')
      .eq('provider_id', provider_id)
      .in('customer_id', customer_ids)

    if (bookingsError) {
      console.error('Error verifying bookings:', bookingsError)
      return new Response(
        JSON.stringify({ error: 'Failed to verify bookings' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Get the verified customer IDs (only customers with bookings for this provider)
    const verifiedCustomerIds = bookings?.map(b => b.customer_id) || []

    if (verifiedCustomerIds.length === 0) {
      return new Response(
        JSON.stringify({ customers: [] }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Now get the customer profiles for verified customers only
    const { data: customers, error: customersError } = await supabaseClient
      .from('profiles')
      .select('id, first_name, last_name, role')
      .in('id', verifiedCustomerIds)

    if (customersError) {
      console.error('Error fetching customers:', customersError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch customer profiles' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    return new Response(
      JSON.stringify({ customers: customers || [] }),
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
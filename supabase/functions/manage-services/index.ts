import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ServiceData {
  title: string
  description: string
  base_price: number
  duration_minutes: number
  subcategory_id: string
  provider_id: string
  price_type?: string
  is_active?: boolean
}

Deno.serve(async (req) => {
  console.log('=== MANAGE SERVICES FUNCTION START ===')

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

    const body = await req.json().catch(() => ({}))
    const action = body.action

    console.log('Action:', action)
    console.log('Body:', body)

    switch (action) {
      case 'toggle_status': {
        const { service_id, provider_id, is_active } = body

        if (!service_id || !provider_id) {
          throw new Error('Missing required parameters: service_id, provider_id')
        }

        // Verify the service belongs to the provider
        const { data: service, error: fetchError } = await supabase
          .from('provider_services')
          .select('id, provider_id')
          .eq('id', service_id)
          .eq('provider_id', provider_id)
          .single()

        if (fetchError || !service) {
          throw new Error('Service not found or access denied')
        }

        // Update the service status
        const { data, error } = await supabase
          .from('provider_services')
          .update({ is_active })
          .eq('id', service_id)
          .select()
          .single()

        if (error) throw error

        return new Response(JSON.stringify({ success: true, data }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      case 'delete_service': {
        const { service_id, provider_id } = body

        if (!service_id || !provider_id) {
          throw new Error('Missing required parameters: service_id, provider_id')
        }

        // Verify the service belongs to the provider
        const { data: service, error: fetchError } = await supabase
          .from('provider_services')
          .select('id, provider_id')
          .eq('id', service_id)
          .eq('provider_id', provider_id)
          .single()

        if (fetchError || !service) {
          throw new Error('Service not found or access denied')
        }

        // Delete the service
        const { error } = await supabase
          .from('provider_services')
          .delete()
          .eq('id', service_id)

        if (error) throw error

        return new Response(JSON.stringify({ success: true, deleted_id: service_id }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      default:
        throw new Error(`Unknown action: ${action}`)
    }

  } catch (error) {
    console.error('Error in manage-services function:', error)
    return new Response(JSON.stringify({
      error: error.message || 'Internal server error'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    })
  }
})
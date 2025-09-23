import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get the current user from auth header
    const {
      data: { user },
    } = await supabaseClient.auth.getUser()

    if (!user) {
      throw new Error('User not authenticated')
    }

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
      apiVersion: '2025-08-27.basil',
    })

    // Check if user has a Stripe account in the database
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('stripe_account_id')
      .eq('id', user.id)
      .single()

    if (profileError && profileError.code !== 'PGRST116') {
      throw profileError
    }

    if (!profile?.stripe_account_id) {
      return new Response(
        JSON.stringify({
          hasStripeAccount: false,
          accountSetupComplete: false,
          details_submitted: false,
          charges_enabled: false
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    // Retrieve the Stripe account details
    const account = await stripe.accounts.retrieve(profile.stripe_account_id)

    return new Response(
      JSON.stringify({
        hasStripeAccount: true,
        accountSetupComplete: account.details_submitted === true,
        details_submitted: account.details_submitted,
        charges_enabled: account.charges_enabled,
        accountId: account.id,
        requirements: account.requirements
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error checking Stripe account status:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
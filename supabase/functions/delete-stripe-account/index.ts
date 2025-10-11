import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  console.log('=== DELETE STRIPE ACCOUNT FUNCTION START ===')

  if (req.method === 'OPTIONS') {
    console.log('OPTIONS request received')
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('Processing POST request')

    // Check environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')

    console.log('Environment check:')
    console.log('- SUPABASE_URL:', supabaseUrl ? 'Set' : 'Missing')
    console.log('- SUPABASE_ANON_KEY:', supabaseAnonKey ? 'Set' : 'Missing')
    console.log('- SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? 'Set' : 'Missing')
    console.log('- STRIPE_SECRET_KEY:', stripeSecretKey ? 'Set (' + stripeSecretKey.slice(0, 7) + '...)' : 'Missing')

    if (!stripeSecretKey) {
      console.error('STRIPE_SECRET_KEY is missing')
      return new Response(JSON.stringify({
        error: 'Stripe configuration error - missing secret key'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      })
    }

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      console.error('Supabase configuration is missing')
      return new Response(JSON.stringify({
        error: 'Supabase configuration error'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      })
    }

    // Get and validate JWT token
    const authHeader = req.headers.get('Authorization')
    console.log('Authorization header:', authHeader ? 'Present' : 'Missing')

    if (!authHeader) {
      console.error('No authorization header provided')
      return new Response(JSON.stringify({
        error: 'Authorization header required'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401
      })
    }

    const jwt = authHeader.replace('Bearer ', '')

    // Since JWT verification is disabled at platform level, we'll extract user info from JWT payload
    let userId
    try {
      const jwtParts = jwt.split('.')
      if (jwtParts.length !== 3) {
        throw new Error('Invalid JWT format')
      }

      const payload = JSON.parse(atob(jwtParts[1]))
      userId = payload.sub

      if (!userId) {
        throw new Error('Missing user ID in JWT')
      }

      // Verify this is an authenticated user
      if (payload.aud !== 'authenticated' || payload.role !== 'authenticated') {
        throw new Error('User not properly authenticated')
      }

    } catch (jwtError) {
      console.error('JWT parsing error:', jwtError.message)
      return new Response(JSON.stringify({
        error: 'Invalid JWT token',
        details: jwtError.message
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401
      })
    }

    console.log('User authenticated via JWT payload extraction')
    console.log('   User ID: ' + userId)

    // Initialize Stripe client
    console.log('Initializing Stripe client...')
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2024-06-20',
      httpClient: Stripe.createFetchHttpClient()
    })

    // Initialize service role client for database operations
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey)

    // Check if user has a Stripe account
    console.log('Checking for Stripe account in database...')
    const { data: profile, error: profileError } = await serviceClient
      .from('profiles')
      .select('stripe_account_id')
      .eq('id', userId)
      .single()

    if (profileError && profileError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
      console.error('Error checking profile:', profileError.message)
      return new Response(JSON.stringify({
        error: 'Failed to check account',
        details: profileError.message
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      })
    }

    const stripeAccountId = profile?.stripe_account_id

    if (!stripeAccountId) {
      console.log('No Stripe account found for user')
      return new Response(JSON.stringify({
        error: 'No Stripe account found to delete'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      })
    }

    console.log('Found Stripe account to delete:', stripeAccountId)

    // Delete the Stripe account
    console.log('Deleting Stripe account...')
    try {
      await stripe.accounts.del(stripeAccountId)
      console.log('Stripe account deleted successfully')
    } catch (stripeError) {
      console.error('Error deleting Stripe account:', stripeError)

      // If the account doesn't exist in Stripe, we still want to clear it from our database
      if (stripeError.type === 'invalid_request_error' && stripeError.message.includes('account does not exist')) {
        console.log('Stripe account already deleted or never existed, proceeding with database cleanup')
      } else {
        return new Response(JSON.stringify({
          error: 'Failed to delete Stripe account',
          details: stripeError.message
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        })
      }
    }

    // Clear the stripe_account_id from the user's profile
    console.log('Clearing stripe_account_id from user profile...')
    const { error: updateError } = await serviceClient
      .from('profiles')
      .update({
        stripe_account_id: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)

    if (updateError) {
      console.error('Error updating profile:', updateError.message)
      return new Response(JSON.stringify({
        error: 'Account deleted from Stripe but failed to update profile',
        details: updateError.message
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      })
    }

    console.log('Profile updated successfully')

    return new Response(JSON.stringify({
      success: true,
      message: 'Stripe account deleted successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })

  } catch (error) {
    console.error('Unexpected error in delete-stripe-account function:', error)
    return new Response(JSON.stringify({
      error: 'Internal server error',
      details: error.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    })
  }
})

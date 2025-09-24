import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  console.log('=== CHECK STRIPE ACCOUNT STATUS FUNCTION START ===')

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
        hasStripeAccount: false,
        accountId: null,
        accountSetupComplete: false,
        charges_enabled: false,
        details_submitted: false,
        message: 'No Stripe account found'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      })
    }

    console.log('Found Stripe account:', stripeAccountId)

    // Retrieve account status from Stripe
    console.log('Retrieving account status from Stripe...')
    const account = await stripe.accounts.retrieve(stripeAccountId)

    console.log('Stripe account details:')
    console.log('- ID:', account.id)
    console.log('- Type:', account.type)
    console.log('- Country:', account.country)
    console.log('- Email:', account.email)
    console.log('- Charges enabled:', account.charges_enabled)
    console.log('- Details submitted:', account.details_submitted)
    console.log('- Payouts enabled:', account.payouts_enabled)
    console.log('- Requirements:', account.requirements)

    const chargesEnabled = account.charges_enabled === true
    const detailsSubmitted = account.details_submitted === true
    const accountSetupComplete = chargesEnabled && detailsSubmitted

    console.log('Account status summary:')
    console.log('- Charges enabled:', chargesEnabled)
    console.log('- Details submitted:', detailsSubmitted)
    console.log('- Setup complete:', accountSetupComplete)

    // Update database with latest status
    console.log('Updating database with latest Stripe status...')
    const { error: updateError } = await serviceClient
      .from('profiles')
      .update({
        stripe_charges_enabled: chargesEnabled,
        stripe_details_submitted: detailsSubmitted,
        stripe_account_status: accountSetupComplete ? 'active' : 'pending',
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)

    if (updateError) {
      console.error('Database update error:', updateError.message)
      // Don't fail the request if database update fails, just log it
    } else {
      console.log('Database updated successfully')
    }

    console.log('=== FUNCTION SUCCESS ===')

    return new Response(JSON.stringify({
      hasStripeAccount: true,
      accountId: stripeAccountId,
      accountSetupComplete,
      charges_enabled: chargesEnabled,
      details_submitted: detailsSubmitted,
      payouts_enabled: account.payouts_enabled,
      requirements: account.requirements,
      message: accountSetupComplete ? 'Stripe account is fully set up and ready to accept payments' : 'Stripe account exists but onboarding is not complete'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })

  } catch (error) {
    console.error('=== FUNCTION ERROR ===')
    console.error('Error checking Stripe account status:', error)
    console.error('Error message:', error.message)
    console.error('Error type:', error.type)
    console.error('Error code:', error.code)
    console.error('Error param:', error.param)
    console.error('Error stack:', error.stack)

    return new Response(JSON.stringify({
      error: error.message || 'Internal server error',
      hasStripeAccount: false,
      accountSetupComplete: false
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    })
  }
})

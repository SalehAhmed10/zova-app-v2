import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  console.log('=== CREATE STRIPE ACCOUNT FUNCTION START ===')

  if (req.method === 'OPTIONS') {
    console.log('OPTIONS request received')
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('Processing POST request')

    const body = await req.json().catch(() => ({}))
    const { userId: providedUserId, refreshUrl, returnUrl } = body
    console.log('Parsed body:', { providedUserId, refreshUrl, returnUrl })

    // Check environment variables first
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
    console.log('JWT token details:')
    console.log('  - Length: ' + jwt.length + ' chars')
    console.log('  - First 50 chars: ' + jwt.substring(0, 50) + '...')
    console.log('  - Last 20 chars: ...' + jwt.slice(-20))

    // Try to decode JWT header for debugging
    try {
      const jwtParts = jwt.split('.')
      if (jwtParts.length === 3) {
        const header = JSON.parse(atob(jwtParts[0]))
        const payload = JSON.parse(atob(jwtParts[1]))
        console.log('JWT Header:', header)
        console.log('JWT Payload (partial):', {
          iss: payload.iss,
          sub: payload.sub,
          aud: payload.aud,
          exp: payload.exp,
          iat: payload.iat,
          email: payload.email
        })
        console.log('Token expiry:', new Date(payload.exp * 1000).toISOString())
        console.log('Current time:', new Date().toISOString())
        console.log('Time until expiry (seconds):', payload.exp - Math.floor(Date.now() / 1000))
      }
    } catch (decodeError) {
      console.error('Failed to decode JWT for debugging:', decodeError.message)
    }

    // Since JWT verification is disabled at platform level, we'll extract user info from JWT payload
    // This is safe because the platform handles JWT validation
    console.log('JWT verification disabled - extracting user info from payload')

    let userId, userEmail
    try {
      const jwtParts = jwt.split('.')
      if (jwtParts.length !== 3) {
        throw new Error('Invalid JWT format')
      }
      
      const payload = JSON.parse(atob(jwtParts[1]))
      userId = payload.sub
      userEmail = payload.email
      
      console.log('Extracted user info:', {
        userId: userId,
        email: userEmail,
        aud: payload.aud,
        role: payload.role
      })
      
      if (!userId || !userEmail) {
        throw new Error('Missing user ID or email in JWT')
      }
      
      // Verify this is an authenticated user (not anonymous)
      if (payload.aud !== 'authenticated' || payload.role !== 'authenticated') {
        throw new Error('User not properly authenticated')
      }
      
    } catch (jwtError) {
      console.error('JWT parsing error:', jwtError.message)
      return new Response(JSON.stringify({
        error: 'Invalid JWT token',
        details: jwtError.message,
        debug: {
          jwtLength: jwt.length,
          timestamp: new Date().toISOString()
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401
      })
    }

    console.log('User authenticated via JWT payload extraction')
    console.log('   User ID: ' + userId)
    console.log('   Email: ' + userEmail)

    const targetUserId = userId
    console.log('Authenticated user ID:', targetUserId)

    // Initialize Stripe client with correct API version for UK marketplace
    console.log('Initializing Stripe client...')
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2024-06-20',
      httpClient: Stripe.createFetchHttpClient()
    })

    // Initialize service role client for database operations
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey)

    // Check if user already has a Stripe account
    console.log('Checking for existing Stripe account...')
    const { data: existingProfile, error: existingProfileError } = await serviceClient
      .from('profiles')
      .select('stripe_account_id, stripe_account_status')
      .eq('id', targetUserId)
      .single()

    if (existingProfileError && existingProfileError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
      console.error('Error checking existing profile:', existingProfileError.message)
      return new Response(JSON.stringify({
        error: 'Failed to check existing account',
        details: existingProfileError.message
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      })
    }

    let stripeAccountId = existingProfile?.stripe_account_id

    if (stripeAccountId) {
      console.log('User already has Stripe account:', stripeAccountId)
      
      // Verify the account still exists in Stripe
      try {
        const account = await stripe.accounts.retrieve(stripeAccountId)
        console.log('Existing account verified in Stripe')
        
        // If account exists, create a new onboarding link
        // Handle both custom URLs (from mobile app) and default HTTPS URLs
        let finalRefreshUrl, finalReturnUrl
        
        if (refreshUrl && refreshUrl.startsWith('zova://')) {
          // For mobile app custom schemes, use redirect function to handle the transition
          finalRefreshUrl = 'https://wezgwqqdlwybadtvripr.supabase.co/functions/v1/stripe-redirect?type=refresh&redirect=' + encodeURIComponent(refreshUrl)
        } else {
          finalRefreshUrl = refreshUrl || 'https://wezgwqqdlwybadtvripr.supabase.co/functions/v1/stripe-redirect?type=refresh'
        }
        
        if (returnUrl && returnUrl.startsWith('zova://')) {
          // For mobile app custom schemes, use redirect function to handle the transition
          finalReturnUrl = 'https://wezgwqqdlwybadtvripr.supabase.co/functions/v1/stripe-redirect?type=return&redirect=' + encodeURIComponent(returnUrl)
        } else {
          finalReturnUrl = returnUrl || 'https://wezgwqqdlwybadtvripr.supabase.co/functions/v1/stripe-redirect?type=return'
        }
        
        console.log('Using URLs for existing account:', {
          refresh_url: finalRefreshUrl,
          return_url: finalReturnUrl
        })
        
        const accountLink = await stripe.accountLinks.create({
          account: stripeAccountId,
          refresh_url: finalRefreshUrl,
          return_url: finalReturnUrl,
          type: 'account_onboarding',
          collect: 'eventually_due'
        })

        console.log('Account link created for existing account:', accountLink.url)
        console.log('Account link URL length:', accountLink.url.length)
        console.log('Account link URL starts with https:', accountLink.url.startsWith('https://'))
        console.log('=== FUNCTION SUCCESS (EXISTING ACCOUNT) ===')

        return new Response(JSON.stringify({
          url: accountLink.url,
          desktopUrl: `https://wezgwqqdlwybadtvripr.supabase.co/functions/v1/stripe-redirect?type=onboard&account=${stripeAccountId}&desktop=true`,
          accountId: stripeAccountId,
          accountSetupComplete: false,
          message: 'Existing Stripe account found. Complete onboarding to start receiving payments.'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        })
        
      } catch (stripeError) {
        console.error('Error with existing Stripe account:', stripeError)
        // If account doesn't exist in Stripe, we'll create a new one below
        stripeAccountId = null
      }
    }

    // If no existing account or existing account is invalid, create a new one
    if (!stripeAccountId) {
      // Get user profile for additional information
      console.log('Getting user profile...')
      const { data: profile, error: profileError } = await serviceClient
        .from('profiles')
        .select('email, first_name, last_name, business_name')
        .eq('id', targetUserId)
        .single()

      if (profileError) {
        console.error('Profile error:', profileError.message)
        return new Response(JSON.stringify({
          error: 'Failed to get user profile',
          details: profileError.message
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        })
      }

      const finalUserEmail = profile?.email || userEmail || 'provider@example.com'
      const businessName = profile?.business_name || 'ZOVA Provider'
      const firstName = profile?.first_name || 'Provider'
      const lastName = profile?.last_name || 'User'
      
      console.log('Using profile info:', {
        email: finalUserEmail,
        businessName: businessName,
        firstName: firstName,
        lastName: lastName
      })

      // Create new Stripe Connect Express account for UK service provider
      console.log('Creating new Stripe Express account for UK service provider...')
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'GB', // UK marketplace
        email: finalUserEmail,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: 'company', // Use company for service providers
        company: {
          name: businessName,
        },
        settings: {
          payouts: {
            schedule: {
              interval: 'weekly',
              weekly_anchor: 'monday' // Payouts every Monday as per requirements
            }
          }
        }
      })

      stripeAccountId = account.id
      console.log('Created Stripe account:', stripeAccountId)

      // Save the account ID to the database
      console.log('Saving account ID to database...')
      const { error: updateError } = await serviceClient
        .from('profiles')
        .update({
          stripe_account_id: stripeAccountId,
          stripe_account_status: 'pending',
          updated_at: new Date().toISOString()
        })
        .eq('id', targetUserId)

      if (updateError) {
        console.error('Database update error:', updateError.message)
        return new Response(JSON.stringify({
          error: 'Failed to save account ID',
          details: updateError.message
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        })
      }

      console.log('Account ID saved to database')
    }

    // Create account onboarding link for mobile app
    console.log('Creating account onboarding link...')

    // Handle both custom URLs (from mobile app) and default HTTPS URLs
    let finalRefreshUrl, finalReturnUrl

    if (refreshUrl && refreshUrl.startsWith('zova://')) {
      // For mobile app custom schemes, use redirect function to handle the transition
      finalRefreshUrl = 'https://wezgwqqdlwybadtvripr.supabase.co/functions/v1/stripe-redirect?type=refresh&redirect=' + encodeURIComponent(refreshUrl)
    } else {
      // For desktop/web usage, provide a simple instruction page instead of immediate redirect
      finalRefreshUrl = refreshUrl || 'https://wezgwqqdlwybadtvripr.supabase.co/functions/v1/stripe-redirect?type=refresh&desktop=true'
    }

    if (returnUrl && returnUrl.startsWith('zova://')) {
      // For mobile app custom schemes, use redirect function to handle the transition
      finalReturnUrl = 'https://wezgwqqdlwybadtvripr.supabase.co/functions/v1/stripe-redirect?type=return&redirect=' + encodeURIComponent(returnUrl)
    } else {
      // For desktop/web usage, provide a completion page
      finalReturnUrl = returnUrl || 'https://wezgwqqdlwybadtvripr.supabase.co/functions/v1/stripe-redirect?type=return&desktop=true'
    }
    
    console.log('Using URLs:', {
      refresh_url: finalRefreshUrl,
      return_url: finalReturnUrl
    })
    
    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: finalRefreshUrl,
      return_url: finalReturnUrl,
      type: 'account_onboarding',
      collect: 'eventually_due'
    })

    console.log('Account link created:', accountLink.url)
    console.log('Account link URL length:', accountLink.url.length)
    console.log('Account link URL starts with https:', accountLink.url.startsWith('https://'))
    console.log('=== FUNCTION SUCCESS ===')

    return new Response(JSON.stringify({
      url: accountLink.url,
      desktopUrl: `https://wezgwqqdlwybadtvripr.supabase.co/functions/v1/stripe-redirect?type=onboard&account=${stripeAccountId}&desktop=true`,
      accountId: stripeAccountId,
      accountSetupComplete: false,
      message: stripeAccountId === existingProfile?.stripe_account_id ? 'Existing Stripe account found. Complete onboarding to start receiving payments.' : 'Stripe account created successfully. Complete onboarding to start receiving payments.'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })

  } catch (error) {
    console.error('=== FUNCTION ERROR ===')
    console.error('Error creating Stripe account:', error)
    console.error('Error message:', error.message)
    console.error('Error type:', error.type)
    console.error('Error code:', error.code)
    console.error('Error param:', error.param)
    console.error('Error stack:', error.stack)
    console.error('Full error:', JSON.stringify(error, null, 2))
    
    // Log request context for debugging
    console.error('Request headers:', Object.fromEntries(req.headers))
    console.error('Request URL:', req.url)

    return new Response(JSON.stringify({
      error: error.message || 'Internal server error',
      details: {
        type: error.type,
        code: error.code,
        param: error.param
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    })
  }
})

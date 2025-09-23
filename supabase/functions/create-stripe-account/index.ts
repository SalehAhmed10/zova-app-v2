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
    console.log('Create Stripe Account function called');

    // Get the request body to check for userId (fallback for client-side auth issues)
    const body = await req.json().catch(() => ({}));
    const { userId: providedUserId, refreshUrl, returnUrl } = body;

    console.log('Request body:', { providedUserId, refreshUrl, returnUrl });

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

    console.log('Supabase URL:', Deno.env.get('SUPABASE_URL') ? 'Set' : 'Not set');
    console.log('Supabase Anon Key:', Deno.env.get('SUPABASE_ANON_KEY') ? 'Set' : 'Not set');

    // Get the current user from auth header
    const {
      data: { user },
    } = await supabaseClient.auth.getUser()

    console.log('User from auth:', user ? 'Found' : 'Not found');

    // If no user from auth header, try to use provided userId (for debugging)
    const targetUserId = user?.id || providedUserId;

    console.log('Target user ID:', targetUserId);

    if (!targetUserId) {
      throw new Error('User not authenticated - no user ID found')
    }

    // Initialize Stripe
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    console.log('Stripe Secret Key:', stripeSecretKey ? 'Set' : 'Not set');

    if (!stripeSecretKey) {
      throw new Error('STRIPE_SECRET_KEY environment variable is not set');
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2025-08-27.basil',
    })

    // Check if user already has a Stripe account
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('stripe_account_id')
      .eq('id', targetUserId)
      .single()

    if (profileError && profileError.code !== 'PGRST116') {
      throw profileError
    }

    let stripeAccountId = profile?.stripe_account_id

    // If no Stripe account exists, create one
    if (!stripeAccountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'US', // US for USD currency (more compatible in test mode)
        email: user?.email || 'provider@example.com', // Use authenticated user's email or fallback
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: 'individual', // or 'company' based on your needs
        settings: {
          payouts: {
            schedule: {
              interval: 'weekly',
              weekly_anchor: 'monday'
            }
          }
        }
      })

      stripeAccountId = account.id

      // Save the Stripe account ID to the user's profile
      const { error: updateError } = await supabaseClient
        .from('profiles')
        .update({ stripe_account_id: stripeAccountId })
        .eq('id', targetUserId)

      if (updateError) {
        throw updateError
      }
    }

    // Create an account link for onboarding - use mobile app deep links
    console.log('Creating account link for account:', stripeAccountId);

    // First check if account has started onboarding
    const account = await stripe.accounts.retrieve(stripeAccountId);
    console.log('Account status:', {
      id: account.id,
      charges_enabled: account.charges_enabled,
      details_submitted: account.details_submitted,
      requirements: account.requirements
    });

    if (account.details_submitted && account.charges_enabled) {
      // Account is already fully onboarded
      return new Response(
        JSON.stringify({
          url: null,
          accountId: stripeAccountId,
          message: 'Account already fully onboarded',
          accountSetupComplete: true
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Determine link type based on account state
    const linkType = account.details_submitted ? 'account_update' : 'account_onboarding';
    console.log('Using link type:', linkType);

    try {
      const accountLink = await stripe.accountLinks.create({
        account: stripeAccountId,
        refresh_url: refreshUrl || 'zova://provider-verification/payment?status=refresh',
        return_url: returnUrl || 'zova://provider-verification/payment?status=complete',
        type: linkType,
      });

      console.log('Account link created successfully:', accountLink.url);

      return new Response(
        JSON.stringify({
          url: accountLink.url,
          accountId: stripeAccountId
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    } catch (linkError) {
      console.error('Failed to create account link:', linkError);
      console.error('Link error details:', {
        message: linkError.message,
        type: linkError.type,
        code: linkError.code,
        param: linkError.param
      });

      // Check if account has blocking requirements
      if (account.requirements?.currently_due?.length > 0 || account.requirements?.eventually_due?.length > 0) {
        console.log('Account has pending requirements:', account.requirements);
      }

      // Return helpful error message
      return new Response(
        JSON.stringify({
          error: `Unable to create onboarding link: ${linkError.message}`,
          details: {
            code: linkError.code,
            type: linkError.type,
            accountStatus: {
              charges_enabled: account.charges_enabled,
              details_submitted: account.details_submitted,
              requirements: account.requirements
            }
          },
          suggestion: 'Account may need manual review or have blocking requirements. Try completing verification without Stripe setup for now.'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

  } catch (error) {
    console.error('Error creating Stripe account:', error)
    console.error('Error details:', {
      message: error.message,
      type: error.type,
      code: error.code,
      param: error.param,
      stack: error.stack
    });
    return new Response(
      JSON.stringify({
        error: error.message,
        details: {
          type: error.type,
          code: error.code,
          param: error.param
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
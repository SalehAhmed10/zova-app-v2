// Check if phone number is stored in Stripe account
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@14.21.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') as string, {
      apiVersion: '2023-10-16',
    })

    const { accountId } = await req.json()

    if (!accountId) {
      return new Response(JSON.stringify({ error: 'accountId required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      })
    }

    console.log(`🔍 Retrieving Stripe account: ${accountId}`)
    const account = await stripe.accounts.retrieve(accountId)

    console.log('📊 Account details:', {
      id: account.id,
      business_type: account.business_type,
      company_name: account.company?.name,
      company_phone: account.company?.phone,
      business_profile_phone: account.business_profile?.phone,
      requirements_currently_due: account.requirements?.currently_due,
      requirements_eventually_due: account.requirements?.eventually_due,
      details_submitted: account.details_submitted,
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled
    })

    return new Response(JSON.stringify({
      success: true,
      account: {
        id: account.id,
        business_type: account.business_type,
        company: {
          name: account.company?.name,
          phone: account.company?.phone
        },
        business_profile: {
          phone: account.business_profile?.phone
        },
        requirements: {
          currently_due: account.requirements?.currently_due,
          eventually_due: account.requirements?.eventually_due
        },
        details_submitted: account.details_submitted,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })

  } catch (error) {
    console.error('❌ Error:', error)
    return new Response(JSON.stringify({
      error: error.message,
      details: error
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    })
  }
})

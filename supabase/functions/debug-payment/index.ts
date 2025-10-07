import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('🔧 Debug function started');
    
    const authHeader = req.headers.get('Authorization');
    console.log('🔧 Auth header present:', !!authHeader);
    
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    console.log('🔧 Getting user...');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    
    if (authError) {
      console.error('🔧 Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Auth error', details: authError.message }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!user) {
      console.error('🔧 No user found');
      return new Response(
        JSON.stringify({ error: 'No user found' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('🔧 User found:', user.email);
    
    // Check Stripe key
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    console.log('🔧 Stripe key present:', !!stripeKey);
    
    if (!stripeKey) {
      return new Response(
        JSON.stringify({ error: 'No Stripe key' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Test simple Stripe API call
    console.log('🔧 Testing Stripe API...');
    const testStripeResponse = await fetch('https://api.stripe.com/v1/customers', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    console.log('🔧 Stripe API status:', testStripeResponse.status);
    
    if (!testStripeResponse.ok) {
      const errorData = await testStripeResponse.text();
      console.error('🔧 Stripe API error:', errorData);
      return new Response(
        JSON.stringify({ error: 'Stripe API error', details: errorData }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        user: user.email,
        hasStripeKey: !!stripeKey,
        stripeApiStatus: testStripeResponse.status
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('🔧 Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
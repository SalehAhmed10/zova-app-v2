import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

interface SubmitProviderResponseRequest {
  review_id: string;
  response: string;
}

Deno.serve(async (req) => {
  console.log('=== SUBMIT PROVIDER RESPONSE FUNCTION START ===');

  // Handle CORS
  if (req.method === 'OPTIONS') {
    console.log('OPTIONS request received');
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('Processing POST request');

    // Check environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    console.log('Environment check:');
    console.log('- SUPABASE_URL:', supabaseUrl ? 'Set' : 'Missing');
    console.log('- SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? 'Set' : 'Missing');

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Configuration error');
      return new Response(JSON.stringify({
        error: 'Configuration error'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 500
      });
    }

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const body: SubmitProviderResponseRequest = await req.json();
    const { review_id, response } = body;

    console.log('Request body:', { review_id, response });

    // Validate required fields
    if (!review_id || !response?.trim()) {
      return new Response(JSON.stringify({
        error: 'Review ID and response are required'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 400
      });
    }

    // Validate response length
    if (response.trim().length > 1000) {
      return new Response(JSON.stringify({
        error: 'Response must be 1000 characters or less'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 400
      });
    }

    // 1. Get review details to verify it exists and get provider_id
    console.log('Fetching review details...');
    const { data: review, error: reviewError } = await supabase
      .from('reviews')
      .select(`
        id,
        provider_id,
        provider_response,
        provider_response_at
      `)
      .eq('id', review_id)
      .single();

    if (reviewError || !review) {
      console.error('Review not found:', reviewError);
      return new Response(JSON.stringify({
        error: 'Review not found'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 404
      });
    }

    console.log('Review found:', {
      id: review.id,
      provider_id: review.provider_id,
      has_existing_response: !!review.provider_response
    });

    // 2. Check if provider already responded
    if (review.provider_response) {
      return new Response(JSON.stringify({
        error: 'Provider has already responded to this review'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 400
      });
    }

    // 3. Update the review with provider response
    console.log('Updating review with provider response...');
    const { data: updatedReview, error: updateError } = await supabase
      .from('reviews')
      .update({
        provider_response: response.trim(),
        provider_response_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', review_id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating review:', updateError);
      return new Response(JSON.stringify({
        error: 'Failed to submit provider response'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 500
      });
    }

    // 4. Create notification for customer about provider response
    console.log('Creating notification for customer...');
    const { data: reviewWithCustomer } = await supabase
      .from('reviews')
      .select('customer_id')
      .eq('id', review_id)
      .single();

    if (reviewWithCustomer?.customer_id) {
      await supabase
        .from('notifications')
        .insert({
          user_id: reviewWithCustomer.customer_id,
          type: 'provider_response',
          title: 'Provider Responded to Your Review',
          message: 'A provider has responded to your review.',
          data: {
            review_id: review_id,
            provider_response: response.trim(),
          },
        });
    }

    console.log('=== SUBMIT PROVIDER RESPONSE FUNCTION SUCCESS ===');

    return new Response(JSON.stringify({
      success: true,
      review_id: updatedReview.id,
      message: 'Provider response submitted successfully'
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    });

  } catch (error) {
    console.error('=== SUBMIT PROVIDER RESPONSE FUNCTION ERROR ===');
    console.error('Error details:', error);

    return new Response(JSON.stringify({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 500
    });
  }
});
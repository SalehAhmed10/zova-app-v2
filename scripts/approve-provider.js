/**
 * Admin Verification Approval Script
 * Used for testing provider verification approval flow
 */

const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function approveProviderVerification(providerEmail) {
  console.log(`🔍 Looking up provider: ${providerEmail}`);

  // Find the provider by email
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, email, role')
    .eq('email', providerEmail)
    .single();

  if (profileError || !profile) {
    console.error('❌ Provider not found:', profileError?.message);
    return;
  }

  if (profile.role !== 'provider') {
    console.error('❌ User is not a provider');
    return;
  }

  console.log(`✅ Found provider: ${profile.email} (ID: ${profile.id})`);

  // Check current verification status
  const { data: currentProgress, error: progressError } = await supabase
    .from('provider_onboarding_progress')
    .select('verification_status, current_step, steps_completed')
    .eq('provider_id', profile.id)
    .single();

  if (progressError) {
    console.error('❌ Error fetching verification progress:', progressError.message);
    return;
  }

  console.log(`📊 Current status: ${currentProgress.verification_status}`);
  console.log(`📊 Current step: ${currentProgress.current_step}`);
  console.log(`📊 Steps completed:`, currentProgress.steps_completed);

  // Approve the verification
  console.log(`🚀 Approving verification for ${profile.email}...`);

  const { error: updateError } = await supabase
    .from('provider_onboarding_progress')
    .update({
      verification_status: 'approved',
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('provider_id', profile.id);

  if (updateError) {
    console.error('❌ Failed to approve verification:', updateError.message);
    return;
  }

  // Update profile to mark as verified
  const { error: profileUpdateError } = await supabase
    .from('profiles')
    .update({
      is_verified: true,
      verification_badge_url: 'https://wezgwqqdlwybadtvripr.supabase.co/storage/v1/object/public/assets/verified-badge.png',
      updated_at: new Date().toISOString()
    })
    .eq('id', profile.id);

  if (profileUpdateError) {
    console.warn('⚠️ Failed to update profile verification badge:', profileUpdateError.message);
  }

  console.log(`✅ Successfully approved verification for ${profile.email}!`);
  console.log(`🎉 Provider can now access the dashboard and start accepting bookings.`);
}

// Check command line arguments
const providerEmail = process.argv[2];
if (!providerEmail) {
  console.error('Usage: node approve-provider.js <provider-email>');
  console.error('Example: node approve-provider.js artinsane00@gmail.com');
  process.exit(1);
}

approveProviderVerification(providerEmail).catch(console.error);
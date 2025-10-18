/**
 * Fix Verification Steps Completion Script
 * Updates steps_completed in database based on actual data existence
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

async function fixVerificationSteps(providerEmail) {
  console.log(`🔍 Looking up provider: ${providerEmail}`);

  // Find the provider by email
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, email, role, selfie_verification_url, business_name, phone_number, address, business_description, years_of_experience')
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

  // Get current progress
  const { data: currentProgress, error: progressError } = await supabase
    .from('provider_onboarding_progress')
    .select('*')
    .eq('provider_id', profile.id)
    .single();

  if (progressError) {
    console.error('❌ Error fetching verification progress:', progressError.message);
    return;
  }

  console.log(`📊 Current steps_completed:`, currentProgress.steps_completed);

  // Check actual data existence for each step
  const actualCompletion = {
    1: false, // Document verification
    2: false, // Selfie
    3: false, // Business info
    4: false, // Category
    5: false, // Services
    6: false, // Portfolio
    7: false, // Bio
    8: false, // Terms
    9: false  // Payment (removed)
  };

  // Step 1: Document verification
  const { data: documents } = await supabase
    .from('provider_verification_documents')
    .select('id')
    .eq('provider_id', profile.id)
    .single();
  actualCompletion[1] = !!documents;

  // Step 2: Selfie verification
  actualCompletion[2] = !!profile.selfie_verification_url;

  // Step 3: Business information
  actualCompletion[3] = !!(profile.business_name && profile.phone_number && profile.address);

  // Step 4: Category selection
  const { data: categories } = await supabase
    .from('provider_selected_categories')
    .select('id')
    .eq('provider_id', profile.id)
    .single();
  actualCompletion[4] = !!categories;

  // Step 5: Services
  const { data: services } = await supabase
    .from('provider_services')
    .select('id')
    .eq('provider_id', profile.id)
    .limit(1);
  actualCompletion[5] = services && services.length > 0;

  // Step 6: Portfolio
  const { data: portfolio } = await supabase
    .from('provider_portfolio_images')
    .select('id')
    .eq('provider_id', profile.id)
    .limit(1);
  actualCompletion[6] = portfolio && portfolio.length > 0;

  // Step 7: Bio
  actualCompletion[7] = !!(profile.business_description && profile.years_of_experience);

  // Step 8: Terms
  const { data: terms } = await supabase
    .from('provider_business_terms')
    .select('terms_accepted')
    .eq('provider_id', profile.id)
    .single();
  actualCompletion[8] = terms?.terms_accepted === true;

  console.log(`🔍 Actual completion status:`, actualCompletion);

  // Compare with current steps_completed
  const currentSteps = currentProgress.steps_completed || {};
  const needsUpdate = Object.keys(actualCompletion).some(step =>
    actualCompletion[step] !== (currentSteps[step] || false)
  );

  if (!needsUpdate) {
    console.log(`✅ Steps completion is already accurate`);
    return;
  }

  console.log(`🔧 Updating steps_completed...`);

  // Update the steps_completed
  const { error: updateError } = await supabase
    .from('provider_onboarding_progress')
    .update({
      steps_completed: actualCompletion,
      updated_at: new Date().toISOString()
    })
    .eq('provider_id', profile.id);

  if (updateError) {
    console.error('❌ Failed to update steps_completed:', updateError.message);
    return;
  }

  console.log(`✅ Successfully updated steps_completed for ${profile.email}!`);
  console.log(`📊 New steps_completed:`, actualCompletion);
}

// Check command line arguments
const providerEmail = process.argv[2];
if (!providerEmail) {
  console.error('Usage: node fix-verification-steps.js <provider-email>');
  console.error('Example: node fix-verification-steps.js artinsane00@gmail.com');
  process.exit(1);
}

fixVerificationSteps(providerEmail).catch(console.error);
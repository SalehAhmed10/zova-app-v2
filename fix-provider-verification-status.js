const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Fix provider verification status default issue
 *
 * Problem: New providers are getting verification_status = 'approved' by default,
 * which bypasses the verification flow and sends them to verification-status screen.
 *
 * Solution: Reset verification_status to null for providers who haven't completed
 * any verification steps (no documents uploaded, no business info, etc.)
 */
async function fixProviderVerificationStatus() {
  console.log('🔧 Fixing provider verification status defaults...');

  try {
    // Find providers with 'approved' status but no verification documents
    const { data: providersWithApprovedStatus, error: fetchError } = await supabase
      .from('profiles')
      .select(`
        id,
        verification_status,
        business_name,
        business_description,
        provider_verification_documents!provider_verification_documents_provider_id_fkey(id)
      `)
      .eq('role', 'provider')
      .eq('verification_status', 'approved');

    if (fetchError) {
      console.error('❌ Error fetching providers:', fetchError);
      return;
    }

    console.log(`📊 Found ${providersWithApprovedStatus?.length || 0} providers with 'approved' status`);

    if (!providersWithApprovedStatus || providersWithApprovedStatus.length === 0) {
      console.log('✅ No providers need fixing');
      return;
    }

    // For each provider, check if they have completed verification steps
    for (const provider of providersWithApprovedStatus) {
      console.log(`🔍 Checking provider ${provider.id}...`);

      // Check if they have any verification documents
      const { data: documents, error: docError } = await supabase
        .from('provider_verification_documents')
        .select('id')
        .eq('provider_id', provider.id);

      if (docError) {
        console.error(`❌ Error checking documents for ${provider.id}:`, docError);
        continue;
      }

      // Check if they have business info (business name and description in profiles)
      const hasBusinessInfo = provider.business_name && provider.business_description;

      // Check if they have services
      const { data: services, error: servicesError } = await supabase
        .from('provider_services')
        .select('id')
        .eq('provider_id', provider.id);

      if (servicesError) {
        console.error(`❌ Error checking services for ${provider.id}:`, servicesError);
        continue;
      }

      const hasDocuments = documents && documents.length > 0;
      const hasServices = services && services.length > 0;

      console.log(`   📄 Documents: ${hasDocuments ? '✅' : '❌'}`);
      console.log(`   🏢 Business Info: ${hasBusinessInfo ? '✅' : '❌'}`);
      console.log(`   🛠️ Services: ${hasServices ? '✅' : '❌'}`);

      // If they have NO verification data, reset their status to null
      if (!hasDocuments && !hasBusinessInfo && !hasServices) {
        console.log(`🔄 Resetting verification_status to null for provider ${provider.id}`);

        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            verification_status: null,
            updated_at: new Date().toISOString()
          })
          .eq('id', provider.id);

        if (updateError) {
          console.error(`❌ Error updating provider ${provider.id}:`, updateError);
        } else {
          console.log(`✅ Successfully reset provider ${provider.id}`);
        }
      } else {
        console.log(`⏭️ Provider ${provider.id} has verification data, keeping 'approved' status`);
      }
    }

    console.log('🎉 Provider verification status fix completed!');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the fix
fixProviderVerificationStatus();
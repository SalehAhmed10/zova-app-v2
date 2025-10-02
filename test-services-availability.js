// Test script for services availability filtering
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://wezgwqqdlwybadtvripr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indlemd3cXFkbHd5YmFkdHZyaXByIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0MjU0NDgsImV4cCI6MjA3MDAwMTQ0OH0.qlk1-Cg8UXdoCxVtW14mPKZxRo3xA5Zj9DF382OMSDs';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testServicesQuery() {
  console.log('Testing updated services query...');

  const { data: services, error } = await supabase
    .from('provider_services')
    .select(`
      *,
      profiles!provider_services_provider_id_fkey (
        id,
        first_name,
        last_name,
        avatar_url,
        city,
        country,
        bio,
        years_of_experience,
        availability_status
      )
    `)
    .eq('is_active', true)
    .neq('profiles.availability_status', 'unavailable')
    .limit(20);

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Services found:', services?.length || 0);
    services?.forEach(service => {
      console.log(`- ${service.title} by ${service.profiles?.first_name} ${service.profiles?.last_name} (Status: ${service.profiles?.availability_status})`);
    });
  }
}

testServicesQuery();
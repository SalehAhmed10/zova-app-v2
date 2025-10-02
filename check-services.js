// Test script to check provider_services data
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://wezgwqqdlwybadtvripr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indlemd3cXFkbHd5YmFkdHZyaXByIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0MjU0NDgsImV4cCI6MjA3MDAwMTQ0OH0.qlk1-Cg8UXdoCxVtW14mPKZxRo3xA5Zj9DF382OMSDs';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkServices() {
  console.log('Checking provider_services table...');

  try {
    const { data: services, error } = await supabase
      .from('provider_services')
      .select(`
        id,
        provider_id,
        title,
        base_price,
        is_active,
        profiles!provider_services_provider_id_fkey (
          id,
          first_name,
          last_name,
          business_name
        )
      `)
      .eq('is_active', true)
      .limit(10);

    if (error) {
      console.error('Error:', error);
      return;
    }

    console.log('Found services:', services?.length || 0);
    services?.forEach(service => {
      console.log(`Service ID: ${service.id}, Provider ID: ${service.provider_id}, Title: ${service.title}, Provider: ${service.profiles?.business_name || `${service.profiles?.first_name} ${service.profiles?.last_name}`}`);
    });

  } catch (error) {
    console.error('Error:', error);
  }
}

checkServices();
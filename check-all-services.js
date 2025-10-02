// Test script to check all provider_services data without is_active filter
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://wezgwqqdlwybadtvripr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indlemd3cXFkbHd5YmFkdHZyaXByIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0MjU0NDgsImV4cCI6MjA3MDAwMTQ0OH0.qlk1-Cg8UXdoCxVtW14mPKZxRo3xA5Zj9DF382OMSDs';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAllServices() {
  console.log('Checking ALL provider_services (no is_active filter)...');

  try {
    const { data: services, error } = await supabase
      .from('provider_services')
      .select(`
        id,
        provider_id,
        title,
        base_price,
        is_active,
        is_home_service,
        is_remote_service,
        requires_deposit,
        profiles!provider_services_provider_id_fkey (
          id,
          first_name,
          last_name,
          business_name
        )
      `)
      .limit(10);

    if (error) {
      console.error('Error:', error);
      return;
    }

    console.log('Found services:', services?.length || 0);
    services?.forEach(service => {
      console.log(`Service: ${service.title}, Active: ${service.is_active}, Price: $${service.base_price}, Home: ${service.is_home_service}, Remote: ${service.is_remote_service}, Deposit: ${service.requires_deposit}, Provider: ${service.profiles?.business_name || `${service.profiles?.first_name} ${service.profiles?.last_name}`}`);
    });

  } catch (error) {
    console.error('Error:', error);
  }
}

checkAllServices();
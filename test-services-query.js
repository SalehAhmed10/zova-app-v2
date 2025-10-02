// Test the exact services query from useSearchOptimized.ts
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://wezgwqqdlwybadtvripr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indlemd3cXFkbHd5YmFkdHZyaXByIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0MjU0NDgsImV4cCI6MjA3MDAwMTQ0OH0.qlk1-Cg8UXdoCxVtW14mPKZxRo3xA5Zj9DF382OMSDs';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testServicesQuery() {
  console.log('Testing exact services query from useSearchOptimized.ts...');

  try {
    // This is the exact query from the hook
    let query = supabase
      .from('provider_services')
      .select(`
        *,
        profiles:provider_id (
          id,
          first_name,
          last_name,
          avatar_url,
          city,
          country,
          bio,
          years_of_experience
        )
      `);

    const { data: services, error: servicesError } = await query.limit(20);

    console.log('Query result:', {
      servicesCount: services?.length || 0,
      error: servicesError?.message,
      hasData: !!services
    });

    if (services && services.length > 0) {
      console.log('First service sample:', {
        id: services[0].id,
        title: services[0].title,
        is_active: services[0].is_active,
        provider_id: services[0].provider_id,
        profiles: services[0].profiles
      });
    }

    if (servicesError) {
      console.error('Database error:', servicesError);
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

testServicesQuery();
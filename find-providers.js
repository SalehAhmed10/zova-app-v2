// Find specific providers by email
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://wezgwqqdlwybadtvripr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indlemd3cXFkbHd5YmFkdHZyaXByIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0MjU0NDgsImV4cCI6MjA3MDAwMTQ0OH0.qlk1-Cg8UXdoCxVtW14mPKZxRo3xA5Zj9DF382OMSDs';

const supabase = createClient(supabaseUrl, supabaseKey);

async function findProviders() {
  console.log('Finding providers by email...');

  try {
    const { data: providers, error } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name, business_name, role, verification_status')
      .in('email', ['myworkxpace@gmail.com', 'artinsane00@gmail.com']);

    if (error) {
      console.error('Error:', error);
      return;
    }

    console.log('Found providers:', providers?.length || 0);
    providers?.forEach(provider => {
      console.log(`ID: ${provider.id}, Email: ${provider.email}, Name: ${provider.business_name || `${provider.first_name} ${provider.last_name}`}, Role: ${provider.role}, Status: ${provider.verification_status}`);
    });

  } catch (error) {
    console.error('Error:', error);
  }
}

findProviders();
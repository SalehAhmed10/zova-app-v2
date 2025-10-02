// Check provider blackouts (date-specific unavailability)
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://wezgwqqdlwybadtvripr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indlemd3cXFkbHd5YmFkdHZyaXByIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0MjU0NDgsImV4cCI6MjA3MDAwMTQ0OH0.qlk1-Cg8UXdoCxVtW14mPKZxRo3xA5Zj9DF382OMSDs';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAvailability() {
  console.log('Checking provider_blackouts table...');

  try {
    const { data: blackouts, error } = await supabase
      .from('provider_blackouts')
      .select('*')
      .limit(10);

    if (error) {
      console.error('Error:', error);
      return;
    }

    console.log('Found blackouts:', blackouts?.length || 0);
    blackouts?.forEach(blackout => {
      console.log(`Provider: ${blackout.provider_id}, Start: ${blackout.start_date}, End: ${blackout.end_date}, Reason: ${blackout.reason || 'N/A'}`);
    });

  } catch (error) {
    console.error('Error:', error);
  }
}

checkAvailability();
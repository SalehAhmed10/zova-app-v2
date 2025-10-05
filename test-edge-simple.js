/**
 * Simple Edge Function Test
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://wezgwqqdlwybadtvripr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indlemd3cXFkbHd5YmFkdHZyaXByIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0MjU0NDgsImV4cCI6MjA3MDAwMTQ0OH0.qlk1-Cg8UXdoCxVtW14mPKZxRo3xA5Zj9DF382OMSDs';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testEdgeFunction() {
  console.log('🔍 Testing Edge Function directly...\n');

  try {
    const { data, error } = await supabase.functions.invoke('find-sos-providers', {
      body: {
        category_id: 'hair',
        service_location: 'London, UK',
        emergency_mode: true,
        max_distance_km: 10,
        priority_matching: true
      }
    });

    console.log('Response data:', JSON.stringify(data, null, 2));
    console.log('Response error:', error);

  } catch (error) {
    console.error('❌ Catch error:', error);
  }
  
  process.exit(0);
}

testEdgeFunction();
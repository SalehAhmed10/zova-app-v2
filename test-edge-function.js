// Test the smart-provider-search Edge Function
const fetch = require('node-fetch');

async function testEdgeFunction() {
  const url = 'https://wezgwqqdlwybadtvripr.supabase.co/functions/v1/smart-provider-search';
  const headers = {
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indlemd3cXFkbHd5YmFkdHZyaXByIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0MjU0NDgsImV4cCI6MjA3MDAwMTQ0OH0.qlk1-Cg8UXdoCxVtW14mPKZxRo3xA5Zj9DF382OMSDs',
    'Content-Type': 'application/json'
  };

  const testCases = [
    { query: '', maxResults: 5 },
    { query: 'hair', maxResults: 5 },
    { query: 'nails', maxResults: 5 },
    { query: 'Nail', maxResults: 5 },
  ];

  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    console.log(`\n--- Test Case ${i + 1}: ${JSON.stringify(testCase)} ---`);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(testCase)
      });

      const result = await response.json();
      console.log('Status:', response.status);
      console.log('Response:', JSON.stringify(result, null, 2));

      if (result.error) {
        console.log('❌ Error:', result.error);
      } else {
        console.log('✅ Success: Found', result.data?.length || 0, 'providers');
      }
    } catch (error) {
      console.log('❌ Network Error:', error.message);
    }
  }
}

testEdgeFunction();
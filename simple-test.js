// Simple test for the smart-provider-search Edge Function using built-in Node.js
const https = require('https');

function testEdgeFunction() {
  const postData = JSON.stringify({
    query: '',
    maxResults: 5
  });

  const options = {
    hostname: 'wezgwqqdlwybadtvripr.supabase.co',
    port: 443,
    path: '/functions/v1/smart-provider-search',
    method: 'POST',
    headers: {
      'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indlemd3cXFkbHd5YmFkdHZyaXByIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0MjU0NDgsImV4cCI6MjA3MDAwMTQ0OH0.qlk1-Cg8UXdoCxVtW14mPKZxRo3xA5Zj9DF382OMSDs',
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  console.log('🧪 Testing smart-provider-search Edge Function...');
  console.log('Request:', postData);

  const req = https.request(options, (res) => {
    console.log('Status:', res.statusCode);
    console.log('Headers:', res.headers);

    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      try {
        const result = JSON.parse(data);
        console.log('Response:', JSON.stringify(result, null, 2));

        if (result.error) {
          console.log('❌ Error:', result.error);
        } else {
          console.log('✅ Success: Found', result.data?.length || 0, 'providers');
        }
      } catch (e) {
        console.log('❌ Parse Error:', e.message);
        console.log('Raw response:', data);
      }
    });
  });

  req.on('error', (e) => {
    console.log('❌ Request Error:', e.message);
  });

  req.write(postData);
  req.end();
}

testEdgeFunction();
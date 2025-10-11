import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://wezgwqqdlwybadtvripr.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indlemd3cXFkbHd5YmFkdHZyaXByIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0MjU0NDgsImV4cCI6MjA3MDAwMTQ0OH0.qlk1-Cg8UXdoCxVtW14mPKZxRo3xA5Zj9DF382OMSDs'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testRpcFunction() {
  console.log('🧪 Testing RPC function directly...')

  try {
    const { data, error } = await supabase.rpc('get_providers_with_coordinates', {
      p_limit: 10,
      p_house_call_only: false,
      p_category: null,
      p_subcategory: null,
      p_min_price: null,
      p_max_price: null
    })

    if (error) {
      console.error('❌ RPC Error:', error)
      return
    }

    console.log('✅ RPC Success - Results:', data?.length || 0)
    if (data && data.length > 0) {
      console.log('📍 First provider:', {
        id: data[0].id,
        provider_lat: data[0].provider_lat,
        provider_lng: data[0].provider_lng,
        coordinates: data[0].coordinates,
        business_name: data[0].business_name
      })
    }
  } catch (err) {
    console.error('❌ Test failed:', err)
  }
}

testRpcFunction()
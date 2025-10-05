// Simple test to check if find-sos-providers function is accessible
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://wezgwqqdlwybadtvripr.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indlendnd3FkbHd5YmFkdHZyaXByIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzNDMyNjEsImV4cCI6MjA3MzkxOTI2MX0.GhZn6L9VEf90EzJEMQ-lFRzlSE6vgNZ8nfFuGJq45to'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testBasicConnection() {
  console.log('🧪 Testing basic SOS function connectivity...')
  
  try {
    const { data, error } = await supabase.functions.invoke('find-sos-providers', {
      body: {
        category_id: 'hair'
      }
    })

    if (error) {
      console.error('❌ Function error:', error)
      return
    }

    console.log('✅ Function response:', data)
  } catch (err) {
    console.error('❌ Exception:', err)
  }
}

testBasicConnection()
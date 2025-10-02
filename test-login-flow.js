// Test script for login functionality
const { supabase } = require('./src/lib/core/supabase');

async function testLoginFlow() {
  console.log('🧪 Testing Login Flow...\n');

  // Test 1: Check Supabase connection
  console.log('1. Testing Supabase connection...');
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    console.log('✅ Supabase connection OK');
  } catch (error) {
    console.error('❌ Supabase connection failed:', error.message);
    return;
  }

  // Test 2: Check environment variables
  console.log('\n2. Checking environment variables...');
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase environment variables');
    console.log('Required: EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY');
    return;
  }
  console.log('✅ Environment variables OK');

  // Test 3: Validate login schema
  console.log('\n3. Testing login validation...');
  const { loginSchema } = require('./src/lib/validation/authValidation');

  const testCases = [
    { email: 'test@example.com', password: 'password123' }, // Should pass
    { email: '', password: 'password123' }, // Should fail - empty email
    { email: 'invalid-email', password: 'password123' }, // Should fail - invalid email
    { email: 'test@example.com', password: '' }, // Should fail - empty password
  ];

  testCases.forEach((testCase, index) => {
    try {
      const result = loginSchema.parse(testCase);
      console.log(`✅ Test case ${index + 1}: Valid`);
    } catch (error) {
      console.log(`❌ Test case ${index + 1}: ${error.errors[0].message}`);
    }
  });

  console.log('\n🎯 Login Flow Test Complete!');
  console.log('\nTo test actual login:');
  console.log('1. Start the app: npm start');
  console.log('2. Navigate to login screen');
  console.log('3. Try logging in with valid credentials');
  console.log('4. Check console logs for auth state changes');
}

// Run the test
testLoginFlow().catch(console.error);
import { supabase } from '../lib/supabase';

// Test storage bucket access
export async function testStorageBuckets() {
  try {
    console.log('Testing storage bucket access...');

    // Test verification-images bucket (should be private)
    const { data: verificationData, error: verificationError } = await supabase.storage
      .from('verification-images')
      .list();

    if (verificationError) {
      console.error('Verification images bucket error:', verificationError);
    } else {
      console.log('✅ Verification images bucket accessible:', verificationData);
    }

    // Test service-images bucket (should be public)
    const { data: serviceData, error: serviceError } = await supabase.storage
      .from('service-images')
      .list();

    if (serviceError) {
      console.error('Service images bucket error:', serviceError);
    } else {
      console.log('✅ Service images bucket accessible:', serviceData);
    }

    return { verificationData, serviceData };
  } catch (error) {
    console.error('Storage test failed:', error);
    return null;
  }
}
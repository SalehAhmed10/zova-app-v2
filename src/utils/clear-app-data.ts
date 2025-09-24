import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Clear all auth and app state from AsyncStorage
 * Use this after database cleanup to reset the app
 */
export const clearAllAppData = async () => {
  try {
    console.log('🧹 Clearing all app data from AsyncStorage...');
    
    // Clear all app-related keys
    const keysToRemove = [
      'onboarding_complete',
      'user_role', 
      'supabase.auth.token',
      'sb-wezgwqqdlwybadtvripr-auth-token', // Supabase auth token
      'onboarding-storage',
      'theme-storage',
      'provider-verification-storage'
    ];
    
    await AsyncStorage.multiRemove(keysToRemove);
    console.log('✅ AsyncStorage cleared successfully');
    
    // Get all keys to see what else might be there
    const allKeys = await AsyncStorage.getAllKeys();
    console.log('📋 Remaining AsyncStorage keys:', allKeys);
    
  } catch (error) {
    console.error('❌ Error clearing AsyncStorage:', error);
  }
};

// Export for direct use
export default clearAllAppData;
// ✅ ZOVA App Data Clearing Utility
// Used for debugging and testing - clears all app data

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppStore } from '@/stores/auth/app';
import { useProviderVerificationStore } from '@/stores/verification/provider-verification';
import { supabase } from '@/lib/core/supabase';
import { QueryClient } from '@tanstack/react-query';

/**
 * ✅ Clear all app data - for debugging and testing
 * WARNING: This will sign out the user and clear ALL stored data
 */
const clearAllAppData = async (queryClient?: QueryClient): Promise<void> => {
  try {
    console.log('[ClearAppData] Starting complete app data clearing...');
    
    // 1. Sign out from Supabase
    await supabase.auth.signOut();
    console.log('[ClearAppData] Signed out from Supabase');
    
    // 2. Clear AsyncStorage completely
    await AsyncStorage.clear();
    console.log('[ClearAppData] Cleared AsyncStorage');
    
    // 3. Reset Zustand stores to initial state
    useAppStore.getState().reset?.();
    useProviderVerificationStore.getState().resetVerification();
    console.log('[ClearAppData] Reset Zustand stores');
    
    // 4. Wait a brief moment for Zustand state propagation
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // 5. Clear React Query cache and invalidate initialization
    // This ensures app re-initializes and checks the new state
    if (queryClient) {
      await queryClient.clear();
      await queryClient.invalidateQueries({ queryKey: ['app-initialization'] });
      await queryClient.invalidateQueries({ queryKey: ['navigation-decision'] });
      // Force complete refresh by removing all cached queries
      await queryClient.resetQueries();
      console.log('[ClearAppData] Cleared React Query cache and invalidated initialization');
    } else {
      console.log('[ClearAppData] No queryClient provided, skipping cache invalidation');
    }
    
    console.log('[ClearAppData] ✅ All app data cleared successfully');
  } catch (error) {
    console.error('[ClearAppData] ❌ Error clearing app data:', error);
    throw error;
  }
};

export default clearAllAppData;
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Simple app state without complex hydration
interface AppState {
  isOnboardingComplete: boolean;
  isAuthenticated: boolean;
  userRole: 'customer' | 'provider' | null;
  isLoading: boolean;
  isLoggingOut: boolean;
}

interface AppActions {
  completeOnboarding: () => void;
  forceCompleteOnboarding: () => void;
  setAuthenticated: (authenticated: boolean, role?: 'customer' | 'provider') => void;
  setLoading: (loading: boolean) => void;
  setLoggingOut: (loggingOut: boolean) => void;
  logout: () => void;
  reset: () => void;
}

type AppStore = AppState & AppActions;

// Simple store without complex middleware
export const useAppStore = create<AppStore>((set) => ({
  // State
  isOnboardingComplete: false,
  isAuthenticated: false,
  userRole: null,
  isLoading: true,
  isLoggingOut: false,

  // Actions
  completeOnboarding: () => {
    set({ isOnboardingComplete: true });
    AsyncStorage.setItem('onboarding_complete', 'true');
  },

  // Force complete onboarding (for fixing state mismatch)
  forceCompleteOnboarding: () => {
    set({ isOnboardingComplete: true });
    AsyncStorage.setItem('onboarding_complete', 'true');
  },

  setAuthenticated: (authenticated: boolean, role?: 'customer' | 'provider') => {
    set({ 
      isAuthenticated: authenticated, 
      userRole: role || null 
    });
    if (authenticated && role) {
      AsyncStorage.setItem('user_role', role);
    } else {
      AsyncStorage.removeItem('user_role');
    }
  },

  setLoading: (loading: boolean) => {
    set({ isLoading: loading });
  },

  setLoggingOut: (loggingOut: boolean) => {
    set({ isLoggingOut: loggingOut });
  },

  logout: () => {
    // Clean logout - reset all auth state immediately
    console.log('[AppStore] Executing clean logout');
    
    set({
      isAuthenticated: false,
      userRole: null,
      isLoading: false,
      // Keep isLoggingOut true - will be reset by logout component
    });
    
    // Clear AsyncStorage auth data immediately
    AsyncStorage.removeItem('user_role').catch(error => {
      console.warn('[AppStore] Failed to clear user_role from storage:', error);
    });
    
    // Reset initialization flags to allow re-initialization
    hasInitialized = false;
    isInitializing = false;
    
    console.log('[AppStore] Logout completed - auth state cleared');
  },

  reset: () => {
    // Full reset for testing/debug purposes
    console.log('[AppStore] 🔄 Starting full reset...');
    set({
      isOnboardingComplete: false,
      isAuthenticated: false,
      userRole: null,
      isLoading: false,
      isLoggingOut: false,
    });
    console.log('[AppStore] State reset to:', { 
      isOnboardingComplete: false, 
      isAuthenticated: false, 
      userRole: null 
    });
    AsyncStorage.multiRemove(['onboarding_complete', 'user_role']);
    console.log('[AppStore] Removed AsyncStorage keys');
    
    // Reset initialization flags
    hasInitialized = false;
    isInitializing = false;
    console.log('[AppStore] ✅ Reset completed - ready for re-initialization');
  },
}));

// Simple initialization function
let isInitializing = false;
let hasInitialized = false;

export const initializeApp = async () => {
  // Prevent multiple initializations
  if (isInitializing || hasInitialized) {
    console.log('[AppStore] Already initialized or initializing');
    return true;
  }
  
  console.log('[AppStore] Starting initialization...');
  try {
    isInitializing = true;
    
    // Use parallel async storage reads for better performance
    const storagePromises = Promise.allSettled([
      AsyncStorage.getItem('onboarding_complete'),
      AsyncStorage.getItem('user_role')
    ]);

    const results = await storagePromises;
    
    const onboardingComplete = results[0].status === 'fulfilled' ? results[0].value : null;
    const userRole = results[1].status === 'fulfilled' ? results[1].value : null;

    console.log('[AppStore] Retrieved from storage:', {
      onboardingComplete,
      userRole
    });

    const store = useAppStore.getState();
    
    // Set loading to false immediately
    console.log('[AppStore] Set loading to false');
    store.setLoading(false);
    
    // Apply stored state
    if (onboardingComplete === 'true') {
      store.completeOnboarding();
    }
    
    if (userRole && (userRole === 'customer' || userRole === 'provider')) {
      store.setAuthenticated(true, userRole as 'customer' | 'provider');
    }
    
    hasInitialized = true;
    console.log('[AppStore] Initialization completed successfully');
    return true;
  } catch (error) {
    console.error('[AppStore] Failed to initialize app:', error);
    // Always set loading to false, even on error
    useAppStore.getState().setLoading(false);
    hasInitialized = true; // Prevent retries on error
    return false;
  } finally {
    isInitializing = false;
  }
};
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Simple app state without complex hydration
interface AppState {
  isOnboardingComplete: boolean;
  isAuthenticated: boolean;
  userRole: 'customer' | 'provider' | null;
  isLoading: boolean;
}

interface AppActions {
  completeOnboarding: () => void;
  forceCompleteOnboarding: () => void;
  setAuthenticated: (authenticated: boolean, role?: 'customer' | 'provider') => void;
  setLoading: (loading: boolean) => void;
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

  logout: () => {
    // Only reset auth state, keep onboarding complete
    set({
      isAuthenticated: false,
      userRole: null,
      isLoading: false,
    });
    
    // Clear AsyncStorage auth data
    AsyncStorage.removeItem('user_role').catch(error => {
      console.warn('[AppStore] Failed to clear user_role from storage:', error);
    });
    
    // Reset initialization flags to allow re-initialization
    hasInitialized = false;
    isInitializing = false;
  },

  reset: () => {
    // Full reset for testing/debug purposes
    set({
      isOnboardingComplete: false,
      isAuthenticated: false,
      userRole: null,
      isLoading: false,
    });
    AsyncStorage.multiRemove(['onboarding_complete', 'user_role']);
    
    // Reset initialization flags
    hasInitialized = false;
    isInitializing = false;
  },
}));

// Simple initialization function
let isInitializing = false;
let hasInitialized = false;

export const initializeApp = async () => {
  // Prevent multiple initializations
  if (isInitializing || hasInitialized) {
    return true;
  }
  
  try {
    isInitializing = true;
    const [onboardingComplete, userRole] = await AsyncStorage.multiGet([
      'onboarding_complete',
      'user_role'
    ]);

    const store = useAppStore.getState();
    
    store.setLoading(false);
    
    if (onboardingComplete[1] === 'true') {
      store.completeOnboarding();
    }
    
    if (userRole[1]) {
      store.setAuthenticated(true, userRole[1] as 'customer' | 'provider');
    }
    
    hasInitialized = true;
    return true;
  } catch (error) {
    console.error('[AppStore] Failed to initialize app:', error);
    useAppStore.getState().setLoading(false);
    return false;
  } finally {
    isInitializing = false;
  }
};
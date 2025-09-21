import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Appearance, ColorSchemeName } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colorScheme } from 'nativewind';

// Enhanced system theme detection with fallback and retry logic
function getSystemTheme(): 'light' | 'dark' {
  const systemTheme = Appearance.getColorScheme();
  
  // Log for debugging
  console.log('[Theme Detection] Raw Appearance.getColorScheme():', systemTheme);
  
  // KNOWN ISSUE: React Native Appearance API sometimes fails to detect system theme correctly
  // This is especially common in Expo Go and certain device/OS combinations
  if (!systemTheme) {
    console.warn('[Theme Detection] ⚠️ Appearance API returned null, defaulting to light');
    return 'light';
  }
  
  // Additional logging for debugging API issues
  if (systemTheme === 'light') {
    console.log('[Theme Detection] ℹ️ API reports light theme. If your device is actually dark, this is a known React Native Appearance API bug.');
  }
  
  return systemTheme === 'dark' ? 'dark' : 'light';
}

// Smart initial theme detection with retry mechanism
function getInitialSystemTheme(): 'light' | 'dark' {
  const initialTheme = getSystemTheme();
  console.log('[Theme Detection] Initial theme detected:', initialTheme);
  
  return initialTheme;
}

type ThemePreference = 'light' | 'dark' | 'system';

interface ThemeState {
  preference: ThemePreference;
  resolvedTheme: 'light' | 'dark';
  _hasHydrated: boolean;
  setTheme: (theme: ThemePreference) => void;
  toggleTheme: () => void;
  updateResolvedTheme: () => void;
  setHasHydrated: (hasHydrated: boolean) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => {
      const initialTheme = getInitialSystemTheme();
      console.log('[Theme Store] 🚀 Initializing with:', {
        preference: 'system',
        resolvedTheme: initialTheme
      });
      
      return {
        preference: 'system',
        resolvedTheme: initialTheme,
        _hasHydrated: false,

      setTheme: (preference: ThemePreference) => {
        console.log('[Theme] Setting theme to:', preference);
        const resolvedTheme = preference === 'system'
          ? getSystemTheme() // Use enhanced detection
          : preference;
        
        console.log('[Theme] Resolved theme:', resolvedTheme);
        
        // Update NativeWind color scheme immediately
        colorScheme.set(resolvedTheme);
        
        set({ preference, resolvedTheme });
      },

        toggleTheme: () => {
          const { preference } = get();
          if (preference === 'system') {
            const systemTheme = getSystemTheme(); // Use enhanced detection
            const newTheme = systemTheme === 'dark' ? 'light' : 'dark';
            
            // Update NativeWind color scheme immediately
            colorScheme.set(newTheme);
            
            set({ preference: newTheme, resolvedTheme: newTheme });
          } else {
            const newTheme = preference === 'dark' ? 'light' : 'dark';
            
            // Update NativeWind color scheme immediately
            colorScheme.set(newTheme);
            
            set({ preference: newTheme, resolvedTheme: newTheme });
          }
        },

        updateResolvedTheme: () => {
          console.log('[Theme] Updating resolved theme');
          const { preference } = get();
          const systemTheme = getSystemTheme(); // Use enhanced detection
          console.log('[Theme] Current preference:', preference, 'System theme:', systemTheme);
          
          const resolvedTheme = preference === 'system' ? systemTheme : preference;
          console.log('[Theme] New resolved theme:', resolvedTheme);
          
          // Update NativeWind color scheme immediately
          colorScheme.set(resolvedTheme);
          
          set({ resolvedTheme });
        },

        setHasHydrated: (hasHydrated) => {
          set({ _hasHydrated: hasHydrated });
        },
      };
    },
    {
      name: 'theme-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ preference: state.preference }),
      onRehydrateStorage: () => (state) => {
        console.log('[Theme] 🔄 Rehydrating theme store');
        if (state) {
          console.log('[Theme] 📁 Rehydrated preference:', state.preference);
          console.log('[Theme] 🎯 Current app theme preference is:', state.preference.toUpperCase());
          
          // For system preference, double-check the current system theme
          if (state.preference === 'system') {
            const currentSystemTheme = getSystemTheme();
            console.log('[Theme] Rehydration: Current system theme is:', currentSystemTheme);
            
            // If there's a mismatch, update immediately
            if (state.resolvedTheme !== currentSystemTheme) {
              console.log('[Theme] Rehydration: Theme mismatch detected! Updating from', state.resolvedTheme, 'to', currentSystemTheme);
              state.resolvedTheme = currentSystemTheme;
            }
          }
          
          // Update resolved theme based on preference
          state.updateResolvedTheme();
          state.setHasHydrated(true);
          
          console.log('[Theme] Theme store hydrated with:', {
            preference: state.preference,
            resolvedTheme: state.resolvedTheme
          });
          
          // Ensure NativeWind is synced after rehydration
          colorScheme.set(state.resolvedTheme);
        }
      },
    }
  )
);

export const useThemeHydration = () => useThemeStore((state) => state._hasHydrated);
export const useTheme = () => useThemeStore((state) => ({
  preference: state.preference,
  resolvedTheme: state.resolvedTheme,
}));
export const useThemeActions = () => useThemeStore((state) => ({
  setTheme: state.setTheme,
  toggleTheme: state.toggleTheme,
}));

// Selective subscriptions for performance optimization
export const useResolvedTheme = () => useThemeStore((state) => state.resolvedTheme);
export const useThemePreference = () => useThemeStore((state) => state.preference);
export const useSetTheme = () => useThemeStore((state) => state.setTheme);
export const useToggleTheme = () => useThemeStore((state) => state.toggleTheme);

// Listen for system theme changes with enhanced logging
Appearance.addChangeListener(({ colorScheme: newSystemTheme }) => {
  console.log('[Theme] 🔄 System theme changed to:', newSystemTheme);
  
  const state = useThemeStore.getState();
  console.log('[Theme] Current app state:', {
    preference: state.preference,
    resolvedTheme: state.resolvedTheme,
    newSystemTheme
  });
  
  // Only update if user is using system preference
  if (state.preference === 'system') {
    console.log('[Theme] ✅ User is on system preference, updating app theme');
    state.updateResolvedTheme();
  } else {
    console.log('[Theme] ⏸️ User has manual preference, ignoring system change');
  }
});
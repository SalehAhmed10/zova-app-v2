import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
    (set, get) => ({
      preference: 'system',
      resolvedTheme: Appearance.getColorScheme() ?? 'light',
      _hasHydrated: false,

      setTheme: (preference: ThemePreference) => {
        const resolvedTheme = preference === 'system'
          ? (Appearance.getColorScheme() ?? 'light')
          : preference;
        set({ preference, resolvedTheme });
      },

      toggleTheme: () => {
        const { preference } = get();
        if (preference === 'system') {
          const systemTheme = Appearance.getColorScheme() ?? 'light';
          const newTheme = systemTheme === 'dark' ? 'light' : 'dark';
          set({ preference: newTheme, resolvedTheme: newTheme });
        } else {
          const newTheme = preference === 'dark' ? 'light' : 'dark';
          set({ preference: newTheme, resolvedTheme: newTheme });
        }
      },

      updateResolvedTheme: () => {
        const { preference } = get();
        const resolvedTheme = preference === 'system'
          ? (Appearance.getColorScheme() ?? 'light')
          : preference;
        set({ resolvedTheme });
      },

      setHasHydrated: (hasHydrated) => {
        set({ _hasHydrated: hasHydrated });
      },
    }),
    {
      name: 'theme-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ preference: state.preference }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.updateResolvedTheme();
          state.setHasHydrated(true);
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

Appearance.addChangeListener(() => {
  useThemeStore.getState().updateResolvedTheme();
});
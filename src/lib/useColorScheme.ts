import { useThemeStore } from '@/stores/theme';

export function useColorScheme() {
  const { resolvedTheme, preference, setTheme, toggleTheme } = useThemeStore();

  return {
    colorScheme: resolvedTheme,
    isDarkColorScheme: resolvedTheme === 'dark',
    setColorScheme: (theme: 'light' | 'dark' | 'system') => setTheme(theme as any),
    toggleColorScheme: toggleTheme,
    preference, // Add preference to see what the user has set
  };
}
import { DarkTheme, DefaultTheme, type Theme } from '@react-navigation/native';

export const THEME = {
  light: {
   background: 'hsl(0 0% 100%)',
    foreground: 'hsl(220.9091 39.2857% 10.9804%)',
    card: 'hsl(0 0% 100%)',
    cardForeground: 'hsl(220.9091 39.2857% 10.9804%)',
    popover: 'hsl(0 0% 100%)',
    popoverForeground: 'hsl(220.9091 39.2857% 10.9804%)',
    primary: 'hsl(353.02, 73.5%, 54.12%)',
    primaryForeground: 'hsl(0 0% 100%)',
    secondary: 'hsl(210 40% 50%)', // Professional blue for trust and reliability
    secondaryForeground: 'hsl(0 0% 100%)',
    muted: 'hsl(220.0000 14.2857% 95.8824%)',
    mutedForeground: 'hsl(220 8.9362% 46.0784%)',
    accent: 'hsl(270 30% 88%)', // Light purple accent
    accentForeground: 'hsl(220.9091 39.2857% 10.9804%)',
    destructive: 'hsl(15 85% 55%)', // Orange-red for errors (distinct from primary red)
    destructiveForeground: 'hsl(0 0% 100%)',
    border: 'hsl(220 13.0435% 90.9804%)',
    input: 'hsl(220 13.0435% 90.9804%)',
    ring: 'hsl(353.02, 73.5%, 54.12%)',
    radius: '0.75rem',
    chart1: 'hsl(353 73% 54%)', // Primary red
    chart2: 'hsl(210 40% 50%)', // Secondary blue
    chart3: 'hsl(142 76% 36%)', // Success green
    chart4: 'hsl(38 92% 50%)', // Warning orange
    chart5: 'hsl(260 60% 55%)', // Info purple
    gradientStart: 'hsl(352 72% 55%)', /* Primary red gradient */
    gradientEnd: 'hsl(350 54% 57%)', /* Medium red gradient */
    destructiveGradientStart: 'hsl(0 84% 60%)',
    destructiveGradientEnd: 'hsl(0 70% 50%)',
    success: 'hsl(142 76% 36%)',
    warning: 'hsl(38 92% 50%)',
    info: 'hsl(260 60% 55%)', // Purple for info (distinct from secondary blue)
    purple: 'hsl(262 83% 58%)',
    orange: 'hsl(25 95% 53%)',
  },
  dark: {
    background: 'hsl(270 5.5556% 7.0588%)',
    foreground: 'hsl(0 0% 75.6863%)',
    card: 'hsl(0 0% 7.0588%)',
    cardForeground: 'hsl(0 0% 75.6863%)',
    popover: 'hsl(270 5.5556% 7.0588%)',
    popoverForeground: 'hsl(0 0% 75.6863%)',
    primary: 'hsl(353.02, 73.5%, 54.12%)',
    primaryForeground: 'hsl(0 0% 98%)',
    secondary: 'hsl(210 35% 55%)', // Lighter blue for dark mode
    secondaryForeground: 'hsl(0 0% 98%)',
    muted: 'hsl(0 0% 13.3333%)',
    mutedForeground: 'hsl(0 0% 53.3333%)',
    accent: 'hsl(270 20% 25%)', // Dark purple accent
    accentForeground: 'hsl(0 0% 75.6863%)',
    destructive: 'hsl(15 80% 60%)', // Lighter orange-red for dark mode
    destructiveForeground: 'hsl(0 0% 100%)',
    border: 'hsl(0 0% 13.3333%)',
    input: 'hsl(0 0% 13.3333%)',
    ring: 'hsl(353.02, 73.5%, 54.12%)',
    radius: '0.75rem',
    chart1: 'hsl(353 73% 54%)', // Primary red
    chart2: 'hsl(210 35% 55%)', // Secondary blue (dark mode)
    chart3: 'hsl(142 76% 36%)', // Success green
    chart4: 'hsl(38 92% 50%)', // Warning orange
    chart5: 'hsl(260 60% 55%)', // Info purple
    gradientStart: 'hsl(352 72% 60%)', /* Primary red gradient for dark mode */
    gradientEnd: 'hsl(350 54% 62%)', /* Medium red gradient for dark mode */
    destructiveGradientStart: 'hsl(0 84% 60%)',
    destructiveGradientEnd: 'hsl(0 70% 50%)',
    success: 'hsl(142 76% 36%)',
    warning: 'hsl(38 92% 50%)',
    info: 'hsl(260 60% 55%)', // Purple for info (distinct from secondary blue)
    purple: 'hsl(262 83% 58%)',
    orange: 'hsl(25 95% 53%)',
  },
};

export const NAV_THEME: Record<'light' | 'dark', Theme> = {
  light: {
    ...DefaultTheme,
    colors: {
      background: THEME.light.background,
      border: THEME.light.border,
      card: THEME.light.card,
      notification: THEME.light.destructive,
      primary: THEME.light.primary,
      text: THEME.light.foreground,
    },
  },
  dark: {
    ...DarkTheme,
    colors: {
      background: THEME.dark.background,
      border: THEME.dark.border,
      card: THEME.dark.card,
      notification: THEME.dark.destructive,
      primary: THEME.dark.primary,
      text: THEME.dark.foreground,
    },
  },
};
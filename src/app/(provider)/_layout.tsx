import React from 'react';
import { Tabs, Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from '@/lib/core/useColorScheme';
import { THEME } from '@/lib/theme';
import { useProviderLayoutGuards } from '@/hooks/routing/useLayoutGuards';
import { Text } from '@/components/ui/text';

/**
 * Minimal loading screen optimized for fast data loading
 * Shows only essential UI while verification status loads
 */
const MinimalLoadingScreen = () => {
  const { isDarkColorScheme } = useColorScheme();
  const spinnerColor = isDarkColorScheme ? THEME.dark.foreground : THEME.light.foreground;
  
  return (
    <View className="flex-1 bg-background items-center justify-center px-6">
      <View className="mb-6">
        <ActivityIndicator size="large" color={spinnerColor} />
      </View>
      <Text className="text-muted-foreground text-center text-sm">
        Verifying access...
      </Text>
    </View>
  );
};

/**
 * Provider Layout - Protected Route Group
 * 
 * Guards:
 * - Redirects unauthenticated users to login
 * - Redirects non-provider roles to their dashboard
 * - Redirects unverified providers to verification flow
 * - Only allows verified providers to access provider screens
 */
export default function ProviderLayout() {
  // ✅ CRITICAL: Call all hooks BEFORE any conditional returns (Rules of Hooks)
  // ✅ NO useEffect needed: React Query handles all caching and stale data automatically
  const { guardResult, isLoading, state } = useProviderLayoutGuards();
  const { isDarkColorScheme } = useColorScheme();
  const insets = useSafeAreaInsets();

  console.log('[ProviderLayout] 🔐 Checking access...', { guardResult, isLoading });

  // ✅ Handle loading state
  if (isLoading) {
    console.log('[ProviderLayout] ⏳ Loading verification status...');
    return <MinimalLoadingScreen />;
  }

  // ✅ Handle redirect if guard function requires it
  if (guardResult.type === 'redirect') {
    console.log(`[ProviderLayout] ❌ Access denied, redirecting to ${guardResult.href}`);
    return <Redirect href={guardResult.href as any} />;
  }

  console.log('[ProviderLayout] ✅ Access granted for verified provider');

  return (
    <View className="flex-1 bg-background">
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: isDarkColorScheme ? THEME.dark.foreground : THEME.light.foreground,
          tabBarInactiveTintColor: isDarkColorScheme ? THEME.dark.mutedForeground : THEME.light.mutedForeground,
          tabBarStyle: {
            backgroundColor: isDarkColorScheme ? THEME.dark.background : THEME.light.background,
            borderTopColor: isDarkColorScheme ? THEME.dark.border : THEME.light.border,
            paddingBottom: Math.max(insets.bottom, 8),
            height: Math.max(insets.bottom + 60, 60),
            borderTopWidth: 1,
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '500',
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="home" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="calendar"
          options={{
            title: 'Calendar',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="calendar" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="bookings"
          options={{
            title: 'Bookings',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="clipboard" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="earnings"
          options={{
            title: 'Earnings',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="cash" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="person" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile/reviews"
          options={{
            href: null, // Hide from bottom tab
          }}
        />
        <Tabs.Screen
          name="profile/subscriptions"
          options={{
            href: null, // Hide from bottom tab
          }}
        />
        <Tabs.Screen
          name="bookingdetail/[id]"
          options={{
            href: null, // This hides it from the tab bar
          }}
        />

        <Tabs.Screen
          name="profile/personal-info"
          options={{
            title: 'Personal Info',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="person-circle" size={size} color={color} />
            ),
            href: null, // This hides it from the tab bar
          }}
        />
        <Tabs.Screen
          name="profile/notifications"
          options={{
            title: 'Notifications',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="notifications" size={size} color={color} />
            ),
            href: null, // This hides it from the tab bar
          }}
        />

        <Tabs.Screen
          name='profile/services'
          options={{
            href: null, // Hide from bottom tab
          }}
        />
      <Tabs.Screen
        name='profile/payments'
        options={{
          href: null, // Hide from bottom tab
        }}
      />
      <Tabs.Screen
        name='profile/analytics'
        options={{
          href: null, // Hide from bottom tab
        }}
      />
      <Tabs.Screen
        name='setup-payment/index'
        options={{
          href: null, // Hide from bottom tab - accessed via profile menu or banners
        }}
      />
      </Tabs>
    </View>
  );
}
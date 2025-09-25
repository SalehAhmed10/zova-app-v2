import React, { useEffect } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from '@/lib/useColorScheme';
import { THEME } from '@/lib/theme';
import { useAuth } from '@/hooks/useAuth';
import { useProfileSync } from '@/hooks/useProfileSync';
import { useProfileStore, useProfileHydration } from '@/stores/useProfileStore';

export default function ProviderLayout() {
  const { isDarkColorScheme } = useColorScheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();

  useProfileSync(user?.id); // 🔥 keeps Zustand in sync with Supabase
  const verificationStatus = useProfileStore((s) => s.verificationStatus);
  const isHydrated = useProfileHydration();

  console.log('[ProviderLayout] Current verification status:', verificationStatus, 'Hydrated:', isHydrated);

  // Wait for hydration before making security decisions
  if (!isHydrated) {
    console.log('[ProviderLayout] Waiting for store hydration...');
    return null; // Show nothing while hydrating
  }

  // Security timeout - if no verification status after 5 seconds of being hydrated, redirect
  React.useEffect(() => {
    if (!isHydrated) return; // Don't start timeout until hydrated

    const timeout = setTimeout(() => {
      if (!verificationStatus) {
        console.warn('[ProviderLayout] Security timeout: No verification status after hydration + 5s, redirecting');
        router.replace("/provider-verification/verification-status" as any);
      }
    }, 5000); // Reduced from 10s since we're already hydrated

    return () => clearTimeout(timeout);
  }, [isHydrated, verificationStatus, router]);

  useEffect(() => {
    console.log('[ProviderLayout] useEffect triggered, verificationStatus:', verificationStatus);
    // Only redirect if we have a definitive non-approved status (not null/undefined)
    // Allow time for the profile store to be populated from persistence or sync
    if (verificationStatus !== null && verificationStatus !== "approved") {
      console.log('[ProviderLayout] Status not approved, redirecting to verification status');
      router.replace("/provider-verification/verification-status" as any);
    } else if (verificationStatus === "approved") {
      console.log('[ProviderLayout] Status is approved, showing provider dashboard');
    } else {
      console.log('[ProviderLayout] Status is null, waiting for sync...');
    }
  }, [verificationStatus, router]);

  // Show loading while checking verification status (after hydration)
  if (verificationStatus === null) {
    console.log('[ProviderLayout] Verification status is null, showing loading state');
    return null; // or loading component
  }

  // Only render tabs if approved
  if (verificationStatus !== "approved") {
    console.log('[ProviderLayout] Verification status not approved, redirect will be handled by useEffect');
    return null; // Guard will redirect via useEffect
  }

  console.log('[ProviderLayout] Rendering tabs: Home, Calendar, Bookings, Earnings, Profile');

  return (
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
      </Tabs>
  );
}
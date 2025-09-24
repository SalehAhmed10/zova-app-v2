import React, { useEffect } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from '@/lib/useColorScheme';
import { THEME } from '@/lib/theme';
import { useAuth } from '@/hooks/useAuth';
import { useProfileSync } from '@/hooks/useProfileSync';
import { useProfileStore } from '@/stores/useProfileStore';

export default function ProviderLayout() {
  const { isDarkColorScheme } = useColorScheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();

  useProfileSync(user?.id); // 🔥 keeps Zustand in sync with Supabase
  const verificationStatus = useProfileStore((s) => s.verificationStatus);

  console.log('[ProviderLayout] Current verification status:', verificationStatus);

  // Security timeout - if no verification status after 10 seconds, redirect
  React.useEffect(() => {
    const timeout = setTimeout(() => {
      if (!verificationStatus) {
        console.warn('[ProviderLayout] Security timeout: No verification status after 10s, redirecting');
        router.replace("/provider-verification/verification-status" as any);
      }
    }, 10000);

    return () => clearTimeout(timeout);
  }, [verificationStatus, router]);

  useEffect(() => {
    console.log('[ProviderLayout] useEffect triggered, verificationStatus:', verificationStatus);
    // Always redirect if not explicitly approved
    if (verificationStatus !== "approved") {
      console.log('[ProviderLayout] Status not approved, redirecting to verification status');
      router.replace("/provider-verification/verification-status" as any);
    } else {
      console.log('[ProviderLayout] Status is approved, showing provider dashboard');
    }
  }, [verificationStatus, router]);

  // Show loading while checking verification status
  if (!verificationStatus) {
    return null; // or loading component
  }

  // Only render tabs if approved
  if (verificationStatus !== "approved") {
    return null; // Guard will redirect
  }

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
          name="services"
          options={{
            title: 'Services',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="list" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="earnings"
          options={{
            title: 'Earnings',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="trending-up" size={size} color={color} />
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
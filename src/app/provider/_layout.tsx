import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from '@/lib/core/useColorScheme';
import { THEME } from '@/lib/core/theme';
import { useAuthOptimized, useProfileSync } from '@/hooks';
import { useProfileStore, useProfileHydration } from '@/stores/verification/useProfileStore';
import { useAppStore } from '@/stores/auth/app';
import { Redirect } from 'expo-router';
import { Text } from '@/components/ui/text';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigationDecision } from '@/hooks/shared/useNavigationDecision';

export default function ProviderLayout() {
  const { isDarkColorScheme } = useColorScheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuthOptimized();
  const { isLoggingOut } = useAppStore();
  const isHydrated = useProfileHydration();
  const navigationDecision = useNavigationDecision();

  // ✅ React Query + Zustand pattern: Server state sync
  useProfileSync(user?.id); // Keeps Zustand in sync with Supabase

  console.log('[ProviderLayout] Navigation decision:', navigationDecision);

  // ✅ CRITICAL FIX: Don't render anything during logout to prevent flash
  if (isLoggingOut) {
    console.log('[ProviderLayout] Logout in progress, hiding layout');
    return null;
  }

  // Wait for store hydration
  if (!isHydrated) {
    console.log('[ProviderLayout] Waiting for store hydration...');
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <Skeleton className="w-32 h-32 rounded-full mb-4" />
        <Text className="text-muted-foreground">Loading...</Text>
      </View>
    );
  }

  // ✅ PURE: Use centralized navigation decisions
  if (navigationDecision.shouldRedirect) {
    console.log(`[ProviderLayout] Redirecting to ${navigationDecision.targetRoute} - ${navigationDecision.reason}`);
    return <Redirect href={navigationDecision.targetRoute as any} />;
  }

  console.log('[ProviderLayout] Access granted - rendering provider tabs');

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
          name="subscriptions"
          options={{
            title: 'Premium',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="star" size={size} color={color} />
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
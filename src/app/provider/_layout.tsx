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
import { useStatusChangeMonitor } from '@/hooks/provider/useStatusChangeMonitor';
import { useEffect, useRef } from 'react';

export default function ProviderLayout() {
  const { isDarkColorScheme } = useColorScheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuthOptimized();
  const { isLoggingOut } = useAppStore();
  const isHydrated = useProfileHydration();
  const navigationDecision = useNavigationDecision();
  const statusMonitor = useStatusChangeMonitor();
  const lastRedirectReason = useRef<string | null>(null);

  // ✅ React Query + Zustand pattern: Server state sync
  useProfileSync(user?.id); // Keeps Zustand in sync with Supabase

  console.log('[ProviderLayout] Navigation decision:', navigationDecision);
  console.log('[ProviderLayout] Status monitor:', statusMonitor);

  // ✅ PREVENT RAPID REDIRECTS: If user was just approved and now status changed back,
  // the status monitor will handle it with user notification
  useEffect(() => {
    if (navigationDecision.shouldRedirect &&
        navigationDecision.reason !== 'access-granted' &&
        lastRedirectReason.current === 'access-granted') {
      console.log('[ProviderLayout] Status changed from approved - status monitor will handle notification');
    }
    lastRedirectReason.current = navigationDecision.reason;
  }, [navigationDecision]);

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

  // ✅ CRITICAL FIX: Show loading during verification checks to prevent flash
  if (navigationDecision.reason === 'loading') {
    console.log('[ProviderLayout] Verification checks in progress, showing loading...');
    return (
      <View className="flex-1 bg-background items-center justify-center px-6">
        <View className="items-center">
          <Skeleton className="w-20 h-20 rounded-full mb-6" />
          <Skeleton className="w-48 h-4 rounded mb-3" />
          <Skeleton className="w-32 h-3 rounded" />
        </View>
        <Text className="text-muted-foreground text-center mt-6">
          Checking verification status...
        </Text>
      </View>
    );
  }

  // ✅ PURE: Use centralized navigation decisions
  if (navigationDecision.shouldRedirect) {
    console.log(`[ProviderLayout] Status changed - redirecting to ${navigationDecision.targetRoute} - ${navigationDecision.reason}`);

    // ✅ Show user-friendly message for status changes
    if (navigationDecision.reason.includes('provider-pending') ||
        navigationDecision.reason.includes('provider-in_review') ||
        navigationDecision.reason === 'provider-rejected') {
      console.log('[ProviderLayout] Verification status changed - user will be redirected');
      // Could add a toast notification here in the future
    }

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
import React, { useEffect } from 'react';
import { Tabs, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from '@/lib/useColorScheme';
import { useAppStore } from '@/stores/app';
import { THEME } from '@/lib/theme';

export default function ProviderLayout() {
  const { isDarkColorScheme } = useColorScheme();
  const insets = useSafeAreaInsets();
  const { userRole, isAuthenticated } = useAppStore();

  // Role-based access control - use a timeout to ensure navigation is ready
  useEffect(() => {
    const checkAccess = () => {
      if (!isAuthenticated) {
        console.log('[Provider Layout] Not authenticated, redirecting to auth');
        router.replace('/auth');
        return;
      }

      if (userRole !== 'provider') {
        console.log('[Provider Layout] Access denied for role:', userRole);
        if (userRole === 'customer') {
          router.replace('/customer');
        } else {
          router.replace('/auth');
        }
      }
    };

    // Small delay to ensure navigation system is ready
    const timer = setTimeout(checkAccess, 100);
    return () => clearTimeout(timer);
  }, [userRole, isAuthenticated]);

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
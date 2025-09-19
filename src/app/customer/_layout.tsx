import React, { useEffect } from 'react';
import { Tabs, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from '@/lib/useColorScheme';
import { useAppStore } from '@/stores/app';
import { THEME } from '@/lib/theme';

export default function CustomerLayout() {
  const { isDarkColorScheme } = useColorScheme();
  const insets = useSafeAreaInsets();
  const { userRole, isAuthenticated } = useAppStore();

  // Role-based access control - use a timeout to ensure navigation is ready
  useEffect(() => {
    const checkAccess = () => {
      console.log('[Customer Layout] Checking access - Auth:', isAuthenticated, 'Role:', userRole);

      if (!isAuthenticated) {
        console.log('[Customer Layout] Not authenticated, redirecting to auth');
        router.replace('/auth');
        return;
      }

      if (userRole !== 'customer') {
        console.log('[Customer Layout] Access denied for role:', userRole);
        if (userRole === 'provider') {
          router.replace('/provider');
        } else {
          router.replace('/auth');
        }
        return;
      }

      console.log('[Customer Layout] Access granted for customer');
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
        name="search"
        options={{
          title: 'Search',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="search" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: 'Bookings',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubble" size={size} color={color} />
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
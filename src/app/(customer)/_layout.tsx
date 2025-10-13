import React from 'react';
import { Tabs, Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from '@/lib/core/useColorScheme';
import { useAuthStore } from '@/stores/auth';
import { THEME } from '@/lib/theme';

/**
 * Customer Layout - Protected Route Group
 * 
 * Guards:
 * - Redirects unauthenticated users to login
 * - Redirects non-customer roles to their dashboard
 * - Only allows authenticated customers
 */
export default function CustomerLayout() {
  const { isDarkColorScheme } = useColorScheme();
  const insets = useSafeAreaInsets();
  const session = useAuthStore((state) => state.session);
  const userRole = useAuthStore((state) => state.userRole);

  console.log('[CustomerLayout] 👥 Checking access...', { 
    hasSession: !!session, 
    userRole 
  });

  // ✅ Guard 1: Redirect unauthenticated users to login
  if (!session) {
    console.log('[CustomerLayout] ❌ Not authenticated, redirecting to /(auth)');
    return <Redirect href="/(auth)" />;
  }

  // ✅ Guard 2: Redirect non-customers to their dashboard
  if (userRole !== 'customer') {
    console.log('[CustomerLayout] ❌ Not a customer, redirecting to /(provider)');
    return <Redirect href="/(provider)" />;
  }

  console.log('[CustomerLayout] ✅ Access granted for customer');

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
            <Ionicons name="home" size={size} color={color}  />
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
        name="sos-booking"
        options={{
          title: 'SOS',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="medical" size={size} color={color} />
          ),
        }}
      />
      {/* <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubble" size={size} color={color} />
          ),
        }}
      /> */}

      <Tabs.Screen
        name="messages"
        options={{
          href: null,
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
        name="provider/[id]"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="service/[id]"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="booking/book-service"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="booking/payment"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="booking/confirmation"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="subscriptions"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="booking/sos-confirmation"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="booking/[id]"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
      name='profile/booking-history'
      options={{
        href: null,
      }}
      />
      <Tabs.Screen
      name='profile/favorites'
      options={{
        href: null,
      }}
      />
      <Tabs.Screen
      name='profile/personal-info'
      options={{
        href: null,
      }}
      />
      <Tabs.Screen
        name='profile/reviews'
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name='profile/notifications'
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from '@/lib/core/useColorScheme';
import { useAppStore } from '@/stores/auth/app';
import { THEME } from '@/lib/theme';
import { Redirect } from 'expo-router';
import { useNavigationDecision } from '@/hooks/shared/useNavigationDecision';

export default function CustomerLayout() {
  const { isDarkColorScheme } = useColorScheme();
  const insets = useSafeAreaInsets();
  const { isLoggingOut } = useAppStore();
  const navigationDecision = useNavigationDecision();

  console.log('[Customer Layout] Navigation decision:', navigationDecision);

  // ✅ CRITICAL: Hide layout during logout to prevent flash
  if (isLoggingOut) {
    console.log('[Customer Layout] Logout in progress, hiding layout');
    return null;
  }

  // ✅ PURE: Use centralized navigation decisions
  if (navigationDecision.shouldRedirect) {
    console.log(`[Customer Layout] Redirecting to ${navigationDecision.targetRoute} - ${navigationDecision.reason}`);
    return <Redirect href={navigationDecision.targetRoute as any} />;
  }

  console.log('[Customer Layout] Access granted for customer');

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
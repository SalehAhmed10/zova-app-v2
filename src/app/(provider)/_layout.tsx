import React from 'react';
import { Tabs, Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from '@/lib/core/useColorScheme';
import { THEME } from '@/lib/theme';
import { useAuthOptimized, useProfileSync } from '@/hooks';
import { useProfile } from '@/hooks/shared/useProfileData';
import { useVerificationData } from '@/hooks/provider/useVerificationSingleSource';
import { useProfileHydration } from '@/stores/verification/useProfileStore';
import { useAuthStore } from '@/stores/auth';
import { useProfileStore } from '@/stores/verification/useProfileStore';
import { Text } from '@/components/ui/text';
import { Skeleton } from '@/components/ui/skeleton';
import { PaymentSetupBanner } from '@/components/provider/PaymentSetupBanner';
import { VerificationStatusBanner } from '@/components/provider/VerificationStatusBanner';

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
  const { isDarkColorScheme } = useColorScheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuthOptimized();
  const session = useAuthStore((state) => state.session);
  const userRole = useAuthStore((state) => state.userRole);
  const isHydrated = useProfileHydration();

  // ✅ React Query + Zustand pattern: Server state sync
  useProfileSync(user?.id); // Keeps Zustand in sync with Supabase

  console.log('[ProviderLayout] 🔐 Checking access...', { 
    hasSession: !!session, 
    userRole,
    isHydrated 
  });

  // Wait for store hydration
  if (!isHydrated) {
    console.log('[ProviderLayout] ⏳ Waiting for hydration...');
    return <MinimalLoadingScreen />;
  }

  // ✅ Guard 1: Redirect unauthenticated users to login
  if (!session) {
    console.log('[ProviderLayout] ❌ Not authenticated, redirecting to /(auth)');
    return <Redirect href="/(auth)" />;
  }

  // ✅ Guard 2: Redirect non-providers to their dashboard
  if (userRole !== 'provider') {
    console.log('[ProviderLayout] ❌ Not a provider, redirecting to /(customer)');
    return <Redirect href="/(customer)" />;
  }

  // ✅ Guard 3: CRITICAL - Load verification status FIRST
  // This determines routing and MUST complete before any redirect decisions
  const { data: verificationData, isLoading: verificationLoading } = useVerificationData(user?.id);
  const verificationStatus = verificationData?.progress?.verification_status;

  // 🎯 OPTIMIZATION: Check Zustand cache first for instant rendering
  // If verification data is already in Zustand, use it immediately (no loading screen)
  const cachedStatus = useProfileStore((state) => state.verificationStatus);
  const hasCache = cachedStatus === 'approved';

  // 🎯 SEAMLESS: For approved providers with cache, skip loading screen entirely
  const isApproved = hasCache || verificationStatus === 'approved';

  // 🎯 ONLY wait if verification is loading AND we don't have cache
  // This means only unapproved providers or first-time users might see loading
  if (verificationLoading && !hasCache && !verificationStatus) {
    console.log('[ProviderLayout] ⏳ Loading verification status...');
    return <MinimalLoadingScreen />;
  }

  // 🎯 EARLY EXIT 2: If approved, go straight to dashboard
  // No need to check profile for approved providers
  if (isApproved) {
    console.log('[ProviderLayout] ✅ Verified provider (approved) - Direct access to dashboard', {
      verificationStatus,
    });
    
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
              href: null,
            }}
          />
          <Tabs.Screen
            name="profile/subscriptions"
            options={{
              href: null,
            }}
          />
          <Tabs.Screen
            name="bookingdetail/[id]"
            options={{
              href: null,
            }}
          />
          <Tabs.Screen
            name="profile/personal-info"
            options={{
              title: 'Personal Info',
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="person-circle" size={size} color={color} />
              ),
              href: null,
            }}
          />
          <Tabs.Screen
            name="profile/notifications"
            options={{
              title: 'Notifications',
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="notifications" size={size} color={color} />
              ),
              href: null,
            }}
          />
          <Tabs.Screen
            name='profile/services'
            options={{
              href: null,
            }}
          />
          <Tabs.Screen
            name='profile/payments'
            options={{
              href: null,
            }}
          />
          <Tabs.Screen
            name='profile/analytics'
            options={{
              href: null,
            }}
          />
          <Tabs.Screen
            name='setup-payment/index'
            options={{
              href: null,
            }}
          />
        </Tabs>
      </View>
    );
  }

  // 🔧 Only for non-approved providers: check profile
  const { data: profile, isLoading: profileLoading } = useProfile(user?.id);

  if (profileLoading) {
    console.log('[ProviderLayout] ⏳ Loading profile...');
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <Skeleton className="w-32 h-32 rounded-full mb-4" />
        <Text className="text-muted-foreground">Checking profile...</Text>
      </View>
    );
  }

  // For non-approved providers: require phone number
  const isProfileComplete = profile?.phone_number;

  if (!isProfileComplete) {
    console.log('[ProviderLayout] ⏸️ Incomplete profile, redirecting to /(provider-verification)', {
      hasPhone: !!profile?.phone_number,
      verificationStatus,
      isApproved: false,
    });
    return <Redirect href="/(provider-verification)" />;
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
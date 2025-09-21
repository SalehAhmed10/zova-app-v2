import React, { useEffect, useState } from 'react';
import { Tabs, router } from 'expo-router';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from '@/lib/useColorScheme';
import { useAppStore } from '@/stores/app';
import { useProviderVerificationStore } from '@/stores/provider-verification';
import { THEME } from '@/lib/theme';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';

export default function ProviderLayout() {
  const { isDarkColorScheme } = useColorScheme();
  const insets = useSafeAreaInsets();
  const { userRole, isAuthenticated } = useAppStore();
  const { currentStep, _hasHydrated } = useProviderVerificationStore();
  const [verificationStatus, setVerificationStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Check provider verification status
  useEffect(() => {
    const checkVerificationStatus = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
          .from('profiles')
          .select('verification_status, is_verified')
          .eq('id', user.id)
          .single();

        if (profile) {
          setVerificationStatus(profile.verification_status);
          
          // If provider is not verified, redirect to verification flow
          if (!profile.is_verified || profile.verification_status !== 'approved') {
            // Wait for store to hydrate before redirecting
            if (_hasHydrated) {
              console.log('[Provider Layout] Provider not verified, redirecting to verification step', currentStep);
              const stepRoutes = {
                1: '/provider-verification/',
                2: '/provider-verification/selfie',
                3: '/provider-verification/business-info',
                4: '/provider-verification/category',
                5: '/provider-verification/services',
                6: '/provider-verification/portfolio',
                7: '/provider-verification/bio',
                8: '/provider-verification/terms',
                9: '/provider-verification/payment',
              };
              const targetRoute = stepRoutes[currentStep as keyof typeof stepRoutes];
              console.log('[Provider Layout] Redirecting to route:', targetRoute);
              router.replace(targetRoute as any);
            } else {
              console.log('[Provider Layout] Waiting for verification store to hydrate before redirecting...');
            }
            return;
          }
        }
      } catch (error) {
        console.error('[Provider Layout] Error checking verification:', error);
      } finally {
        setLoading(false);
      }
    };

    // Role-based access control - use a timeout to ensure navigation is ready
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
        return;
      }

      // Check verification status if authenticated as provider
      checkVerificationStatus();
    };

    // Small delay to ensure navigation system is ready
    const timer = setTimeout(checkAccess, 100);
    return () => clearTimeout(timer);
  }, [userRole, isAuthenticated]);

  // Redirect to correct verification step once store is hydrated
  useEffect(() => {
    if (_hasHydrated && verificationStatus && verificationStatus !== 'approved' && currentStep > 1) {
      console.log('[Provider Layout] Store hydrated, redirecting to verification step', currentStep);
      const stepRoutes = {
        1: '/provider-verification/',
        2: '/provider-verification/selfie',
        3: '/provider-verification/business-info',
        4: '/provider-verification/category',
        5: '/provider-verification/services',
        6: '/provider-verification/portfolio',
        7: '/provider-verification/bio',
        8: '/provider-verification/terms',
        9: '/provider-verification/payment',
      };
      const targetRoute = stepRoutes[currentStep as keyof typeof stepRoutes];
      console.log('[Provider Layout] Redirecting to route:', targetRoute);
      router.replace(targetRoute as any);
    }
  }, [_hasHydrated, verificationStatus, currentStep]);

  // Show loading state while checking verification
  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-background">
        <Text className="text-muted-foreground">Checking verification status...</Text>
      </View>
    );
  }

  // If verification is pending or rejected, show status screen
  if (verificationStatus && verificationStatus !== 'approved') {
    return (
      <View className="flex-1 justify-center items-center px-6 bg-background">
        <View className="items-center space-y-4">
          <Text className="text-2xl">⏳</Text>
          <Text className="text-xl font-semibold text-center">
            Verification {verificationStatus === 'pending' ? 'Pending' : 'Required'}
          </Text>
          <Text className="text-muted-foreground text-center">
            {verificationStatus === 'pending' 
              ? 'Your account is being reviewed. You\'ll be notified once approved.'
              : 'Please complete the verification process to access your provider dashboard.'
            }
          </Text>
          {verificationStatus !== 'pending' && (
            <Button onPress={() => router.push('/provider-verification/' as any)}>
              <Text className="text-primary-foreground">Complete Verification</Text>
            </Button>
          )}
        </View>
      </View>
    );
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
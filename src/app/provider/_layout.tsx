import React, { useEffect, useState } from 'react';
import { Tabs, router } from 'expo-router';
import { View, ScrollView } from 'react-native';
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

  const [sessionKey, setSessionKey] = useState(Date.now()); // Force re-run on mount

  // Reset verification status when authentication changes
  useEffect(() => {
    setVerificationStatus(null);
    setLoading(true);
  }, [isAuthenticated]);

  // Check provider verification status
  useEffect(() => {
    let channel: any = null;

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

          // Only allow approved providers to access dashboard
          if (profile.verification_status !== 'approved') {
            // If verification is pending or in_review, show status screen (don't redirect)
            if (profile.verification_status === 'pending' || profile.verification_status === 'in_review') {
              console.log('[Provider Layout] Provider verification status:', profile.verification_status, '- showing status screen');
              setLoading(false);
              return;
            }

            // For rejected or null status, redirect to verification flow
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

    // Set up real-time subscription for verification status changes
    const setupRealtimeSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      console.log('[Provider Layout] Setting up real-time subscription for user:', user.id);

      channel = supabase
        .channel(`profile-verification-updates-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'profiles',
            filter: `id=eq.${user.id}`,
          },
          (payload) => {
            console.log('[Provider Layout] Real-time update received:', payload);
            const newStatus = payload.new.verification_status;
            if (newStatus !== verificationStatus) {
              console.log('[Provider Layout] Verification status changed from', verificationStatus, 'to', newStatus);
              setVerificationStatus(newStatus);
              // Force re-render by updating session key
              setSessionKey(Date.now());
            }
          }
        )
        .subscribe((status) => {
          console.log('[Provider Layout] Subscription status:', status);
        });

      return channel;
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

      // Set up real-time subscription
      setupRealtimeSubscription();
    };

    // Small delay to ensure navigation system is ready
    const timer = setTimeout(checkAccess, 100);

    // Cleanup function
    return () => {
      clearTimeout(timer);
      if (channel) {
        console.log('[Provider Layout] Cleaning up real-time subscription');
        supabase.removeChannel(channel);
      }
    };
  }, [userRole, isAuthenticated, _hasHydrated, sessionKey]);  // Redirect to correct verification step once store is hydrated (only for rejected/null status)
  useEffect(() => {
    if (_hasHydrated && verificationStatus && (verificationStatus === 'rejected' || verificationStatus === null) && currentStep > 1) {
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

  // Show status screen for pending/in_review providers
  if (verificationStatus && (verificationStatus === 'pending' || verificationStatus === 'in_review')) {
    return (
      <View className="flex-1 bg-background">
        {/* Header */}
        <View className="pt-12 pb-6 px-6 bg-card border-b border-border">
          <View className="items-center">
            <View className="w-20 h-20 bg-primary/10 rounded-full justify-center items-center mb-4">
              <Text className="text-4xl">
                {verificationStatus === 'pending' ? '⏳' : '📋'}
              </Text>
            </View>
            <Text className="text-2xl font-bold text-foreground mb-2">
              Verification {verificationStatus === 'pending' ? 'Submitted' : 'Under Review'}
            </Text>
            <View className="px-3 py-1 bg-primary/10 rounded-full">
              <Text className="text-sm font-medium text-primary">
                {verificationStatus === 'pending' ? 'Pending Admin Review' : 'In Progress'}
              </Text>
            </View>
          </View>
        </View>

        {/* Scrollable Content */}
        <ScrollView 
          className="flex-1 px-6 py-8" 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 120 }} // Account for bottom actions
        >
          <View className="mb-6">
            {/* Status Description */}
            <View className="bg-card rounded-xl p-6 border border-border mb-6">
              <Text className="text-base text-foreground mb-3 font-medium">
                What's happening next?
              </Text>
              <Text className="text-muted-foreground leading-6">
                {verificationStatus === 'pending'
                  ? 'Your verification documents have been submitted successfully. Our team will review them within 1-2 business days. You\'ll receive a notification once your account is approved.'
                  : 'Your verification is currently being reviewed by our team. This process typically takes 1-2 business days. We\'ll notify you of the outcome.'
                }
              </Text>
            </View>

            {/* What you can do */}
            <View className="bg-card rounded-xl p-6 border border-border mb-6">
              <Text className="text-base text-foreground mb-3 font-medium">
                What happens next?
              </Text>
              <View>
                <View className="flex-row items-center mb-2">
                  <Text className="text-primary mr-2">📧</Text>
                  <Text className="text-muted-foreground">You'll receive an email notification once reviewed</Text>
                </View>
                <View className="flex-row items-center mb-2">
                  <Text className="text-primary mr-2">⚡</Text>
                  <Text className="text-muted-foreground">Approval typically takes 1-2 business days</Text>
                </View>
                <View className="flex-row items-center">
                  <Text className="text-primary mr-2">🎯</Text>
                  <Text className="text-muted-foreground">Once approved, you'll get full provider dashboard access</Text>
                </View>
              </View>
            </View>

            {/* Timeline */}
            <View className="bg-card rounded-xl p-6 border border-border">
              <Text className="text-base text-foreground mb-4 font-medium">
                Verification Process
              </Text>
              <View>
                <View className="flex-row items-center mb-3">
                  <View className="w-6 h-6 bg-green-500 rounded-full justify-center items-center mr-3">
                    <Text className="text-white text-xs">✓</Text>
                  </View>
                  <Text className="text-muted-foreground">Documents submitted</Text>
                </View>
                <View className="flex-row items-center mb-3">
                  <View className={`w-6 h-6 rounded-full justify-center items-center mr-3 ${
                    verificationStatus === 'in_review' ? 'bg-primary' : 'bg-muted'
                  }`}>
                    <Text className={`text-xs ${
                      verificationStatus === 'in_review' ? 'text-primary-foreground' : 'text-muted-foreground'
                    }`}>
                      {verificationStatus === 'in_review' ? '○' : '○'}
                    </Text>
                  </View>
                  <Text className={`${
                    verificationStatus === 'in_review' ? 'text-foreground' : 'text-muted-foreground'
                  }`}>
                    Admin review in progress
                  </Text>
                </View>
                <View className="flex-row items-center">
                  <View className="w-6 h-6 bg-muted rounded-full justify-center items-center mr-3">
                    <Text className="text-muted-foreground text-xs">○</Text>
                  </View>
                  <Text className="text-muted-foreground">Account approval</Text>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Actions */}
        <View className="px-6 pb-14 pt-4 bg-background border-t border-border">
          <Button
            onPress={() => router.replace('/auth')}
            variant="outline"
            className="w-full"
            size="lg"
          >
            <Text>Sign Out</Text>
          </Button>
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
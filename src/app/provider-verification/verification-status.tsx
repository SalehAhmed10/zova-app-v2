/**
 * ✅ VERIFICATION STATUS SCREEN - Following copilot-rules.md
 * 
 * ARCHITECTURE MIGRATION:
 * ❌ ELIMINATED: 6+ useState hooks, 5+ useEffect patterns, complex subscription management
 * ✅ IMPLEMENTED: Pure React Query + Zustand architecture
 * 
 * ANTI-PATTERNS REMOVED:
 * - useState for refreshing, complex subscription refs
 * - useEffect for subscription lifecycle, manual debouncing
 * - Direct supabase subscription management in component
 * - Global maps for debouncing
 * 
 * CLEAN PATTERNS ADDED:
 * - Zustand store for verification state persistence
 * - React Query for server state management
 * - Real-time subscriptions managed in store
 * - Pure computed properties and selectors
 */

import React from 'react';
import { View, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScreenWrapper } from '@/components/ui/screen-wrapper';
import { useColorScheme } from '@/lib/core/useColorScheme';
import { THEME } from '@/lib/core/theme';

// ✅ REACT QUERY + ZUSTAND: Following copilot-rules.md
import { useAuthOptimized } from '@/hooks';
import {
  useVerificationStatus,
  useVerificationStatusSelector,
  useRefreshVerificationStatus
} from '@/hooks/provider';
import { useVerificationStatusHydration } from '@/stores/verification';

type VerificationStatus = 'pending' | 'in_review' | 'approved' | 'rejected';

interface StatusConfig {
  icon: string;
  iconColor: string;
  bgColor: string;
  title: string;
  subtitle: string;
  badgeText: string;
  badgeColor: string;
  timeline: Array<{
    icon: string;
    iconColor: string;
    title: string;
    description: string;
    completed: boolean;
  }>;
  nextSteps: string[];
  showContactSupport: boolean;
  showRetryButton: boolean;
}

const statusConfigs: Record<VerificationStatus, StatusConfig> = {
  pending: {
    icon: 'time',
    iconColor: '#f59e0b',
    bgColor: 'bg-orange-100 dark:bg-orange-900/20',
    title: 'Verification Pending',
    subtitle: 'Your verification application has been submitted and is currently under review by our team.',
    badgeText: 'Pending Admin Review',
    badgeColor: 'bg-orange-100 dark:bg-orange-900/20 text-orange-800 dark:text-orange-200',
    timeline: [
      {
        icon: 'checkmark',
        iconColor: '#3b82f6',
        title: 'Application Submitted',
        description: 'Your verification documents have been received',
        completed: true,
      },
      {
        icon: 'eye',
        iconColor: '#f59e0b',
        title: 'Under Review',
        description: 'Our team is reviewing your application',
        completed: false,
      },
      {
        icon: 'checkmark-circle',
        iconColor: '#10b981',
        title: 'Verification Complete',
        description: 'You can start accepting bookings',
        completed: false,
      },
    ],
    nextSteps: [
      'Our verification team will review your documents within 24-48 hours',
      'You will receive an email notification once the review is complete',
      'If additional information is needed, we will contact you directly',
    ],
    showContactSupport: true,
    showRetryButton: false,
  },
  in_review: {
    icon: 'eye',
    iconColor: '#3b82f6',
    bgColor: 'bg-blue-100 dark:bg-blue-900/20',
    title: 'Under Review',
    subtitle: 'Our verification team is actively reviewing your application.',
    badgeText: 'In Review',
    badgeColor: 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200',
    timeline: [
      {
        icon: 'checkmark',
        iconColor: '#10b981',
        title: 'Application Submitted',
        description: 'Your verification documents have been received',
        completed: true,
      },
      {
        icon: 'eye',
        iconColor: '#3b82f6',
        title: 'Under Review',
        description: 'Our team is reviewing your application',
        completed: true,
      },
      {
        icon: 'checkmark-circle',
        iconColor: '#6b7280',
        title: 'Verification Complete',
        description: 'You can start accepting bookings',
        completed: false,
      },
    ],
    nextSteps: [
      'Your application is being actively reviewed by our team',
      'This process typically takes 12-24 hours',
      'You will be notified immediately once the review is complete',
    ],
    showContactSupport: true,
    showRetryButton: false,
  },
  approved: {
    icon: 'checkmark-circle',
    iconColor: '#10b981',
    bgColor: 'bg-green-100 dark:bg-green-900/20',
    title: 'Verification Approved',
    subtitle: 'Congratulations! Your verification has been approved. You can now start accepting bookings.',
    badgeText: 'Approved',
    badgeColor: 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200',
    timeline: [
      {
        icon: 'checkmark',
        iconColor: '#10b981',
        title: 'Application Submitted',
        description: 'Your verification documents have been received',
        completed: true,
      },
      {
        icon: 'checkmark',
        iconColor: '#10b981',
        title: 'Review Complete',
        description: 'Your application has been reviewed and approved',
        completed: true,
      },
      {
        icon: 'checkmark-circle',
        iconColor: '#10b981',
        title: 'Verification Complete',
        description: 'You can start accepting bookings',
        completed: true,
      },
    ],
    nextSteps: [
      'Your provider profile is now live and discoverable',
      'You can start accepting bookings from customers',
      'Set up your availability and service pricing',
      'Complete your payment setup to receive earnings',
    ],
    showContactSupport: false,
    showRetryButton: false,
  },
  rejected: {
    icon: 'close-circle',
    iconColor: '#ef4444',
    bgColor: 'bg-red-100 dark:bg-red-900/20',
    title: 'Verification Not Approved',
    subtitle: 'Unfortunately, your verification application was not approved. Please review the feedback and submit a new application.',
    badgeText: 'Not Approved',
    badgeColor: 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200',
    timeline: [
      {
        icon: 'checkmark',
        iconColor: '#10b981',
        title: 'Application Submitted',
        description: 'Your verification documents have been received',
        completed: true,
      },
      {
        icon: 'checkmark',
        iconColor: '#10b981',
        title: 'Review Complete',
        description: 'Your application has been reviewed',
        completed: true,
      },
      {
        icon: 'close-circle',
        iconColor: '#ef4444',
        title: 'Application Declined',
        description: 'Please review feedback and resubmit',
        completed: true,
      },
    ],
    nextSteps: [
      'Review the feedback provided by our verification team',
      'Address any issues identified in your documents',
      'Submit a new verification application when ready',
      'Contact support if you need help understanding the feedback',
    ],
    showContactSupport: true,
    showRetryButton: true,
  },
};

export default function VerificationStatusScreen() {
  const { isDarkColorScheme, colorScheme } = useColorScheme();
  
  // ✅ REACT QUERY + ZUSTAND: Following copilot-rules.md  
  const { user } = useAuthOptimized();
  const isHydrated = useVerificationStatusHydration();
  
  // ✅ PURE REACT QUERY: Server state management (replaces useState + useEffect)
  const {
    data: verificationData,
    isLoading,
    error,
    isFetching
  } = useVerificationStatus(user?.id);

  // ✅ ZUSTAND SELECTORS: Global state access (replaces useState)
  const { status: storeStatus, lastUpdated, isSubscribed } = useVerificationStatusSelector();
  
  // ✅ PURE REACT QUERY MUTATION: Refresh pattern (replaces useState + async functions)
  const refreshStatusMutation = useRefreshVerificationStatus(user?.id);

  // ✅ COMPUTED PROPERTIES: Pure derivation (replaces useState)
  const currentStatus = verificationData?.status || storeStatus;
  const config = statusConfigs[currentStatus];
  const isRefreshing = isFetching && !isLoading;

  // Handle hydration
  if (!isHydrated) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <ScreenWrapper>
          <View className="flex-1 justify-center items-center">
            <Text className="text-muted-foreground">Loading verification status...</Text>
          </View>
        </ScreenWrapper>
      </SafeAreaView>
    );
  }

  if (isLoading && !currentStatus) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <ScreenWrapper>
          <View className="flex-1 justify-center items-center">
            <Text className="text-muted-foreground">Loading verification status...</Text>
          </View>
        </ScreenWrapper>
      </SafeAreaView>
    );
  }

  if (error && !currentStatus) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <ScreenWrapper>
          <View className="flex-1 justify-center items-center p-6">
            <Ionicons 
              name="alert-circle" 
              size={48} 
              color={isDarkColorScheme ? '#ef4444' : '#dc2626'} 
            />
            <Text className="text-foreground text-lg font-semibold mt-4 mb-2">
              Unable to Load Status
            </Text>
            <Text className="text-muted-foreground text-center mb-6">
              We couldn't load your verification status. Please check your connection and try again.
            </Text>
            <Button onPress={() => refreshStatusMutation.mutate()} variant="outline">
              <Text>Try Again</Text>
            </Button>
          </View>
        </ScreenWrapper>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView 
        className="flex-1"
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => refreshStatusMutation.mutate()}
            tintColor={isDarkColorScheme ? '#ffffff' : '#000000'}
          />
        }
      >
        {/* Header with Status */}
        <LinearGradient
          colors={[THEME[colorScheme].gradientStart, THEME[colorScheme].gradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          className="px-6 pt-6 pb-8"
        >
          <View className="flex-row items-center mb-4">
            <Button
              variant="ghost"
              size="sm"
              onPress={() => router.back()}
              className="mr-2 -ml-2"
            >
              <Ionicons name="arrow-back" size={24} color="#ffffff" />
            </Button>
            <Text className="text-white text-lg font-semibold flex-1">
              Verification Status
            </Text>
            {isSubscribed && (
              <View className="bg-white/20 rounded-full px-3 py-1">
                <Text className="text-white text-xs">Live</Text>
              </View>
            )}
          </View>

          {/* Status Badge */}
          <View className="items-center mb-6">
            <View className={`rounded-full p-4 mb-4 ${config.bgColor}`}>
              <Ionicons 
                name={config.icon as any} 
                size={48} 
                color={config.iconColor} 
              />
            </View>
            <View className={`rounded-full px-4 py-2 mb-2 ${config.badgeColor}`}>
              <Text className="font-semibold text-sm">
                {config.badgeText}
              </Text>
            </View>
          </View>
        </LinearGradient>

        <ScreenWrapper className="flex-1 -mt-4">
          {/* Status Details Card */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-foreground text-xl">
                {config.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Text className="text-muted-foreground leading-6 mb-4">
                {config.subtitle}
              </Text>
              
              {lastUpdated > 0 && (
                <Text className="text-xs text-muted-foreground">
                  Last updated: {new Date(lastUpdated).toLocaleString()}
                </Text>
              )}
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-foreground">Verification Progress</CardTitle>
            </CardHeader>
            <CardContent>
              {config.timeline.map((step, index) => (
                <View key={index} className="flex-row items-start mb-4 last:mb-0">
                  <View className="mr-4 mt-1">
                    <Ionicons 
                      name={step.icon as any} 
                      size={20} 
                      color={step.iconColor} 
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-foreground font-medium mb-1">
                      {step.title}
                    </Text>
                    <Text className="text-muted-foreground text-sm">
                      {step.description}
                    </Text>
                  </View>
                </View>
              ))}
            </CardContent>
          </Card>

          {/* Next Steps */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-foreground">What's Next?</CardTitle>
            </CardHeader>
            <CardContent>
              {config.nextSteps.map((step, index) => (
                <View key={index} className="flex-row items-start mb-3 last:mb-0">
                  <Text className="text-primary font-bold mr-3 mt-1">
                    {index + 1}.
                  </Text>
                  <Text className="text-muted-foreground flex-1 leading-5">
                    {step}
                  </Text>
                </View>
              ))}
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <View className="space-y-4 mb-8">
            {config.showRetryButton && (
              <Button
                onPress={() => router.push('/onboarding')}
                className="w-full"
              >
                <Text className="text-primary-foreground font-semibold">
                  Submit New Application
                </Text>
              </Button>
            )}

            {currentStatus === 'approved' && (
              <Button
                onPress={() => router.push('/provider')}
                className="w-full"
              >
                <Text className="text-primary-foreground font-semibold">
                  Go to Dashboard
                </Text>
              </Button>
            )}

            {config.showContactSupport && (
              <Button
                variant="outline"
                onPress={() => {
                  // TODO: Implement contact support
                  console.log('Contact support tapped');
                }}
                className="w-full"
              >
                <Text className="text-foreground">Contact Support</Text>
              </Button>
            )}
          </View>
        </ScreenWrapper>
      </ScrollView>
    </SafeAreaView>
  );
}
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
 * 
 * DESIGN PRINCIPLES:
 * - Uses theme colors exclusively (no hardcoded colors)
 * - Lucide icons for consistency
 * - Proper contrast and accessibility
 * - No gradients or shadows (NativeWind compatibility)
 * - Professional spacing and typography
 */

import React from 'react';
import { View, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  Clock, 
  Eye, 
  CheckCircle, 
  XCircle, 
  AlertCircle 
} from 'lucide-react-native';
import { router } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScreenWrapper } from '@/components/ui/screen-wrapper';
import { Icon } from '@/components/ui/icon';
import { useColorScheme } from '@/lib/core/useColorScheme';
import { cn } from '@/lib/utils';

// ✅ REACT QUERY + ZUSTAND: Following copilot-rules.md
import { useAuthOptimized } from '@/hooks';
import {
  useVerificationStatusPure,
  useVerificationStatusSelector,
  useVerificationNavigationPure,
  VerificationNavigationHandler
} from '@/hooks/provider';
import { SessionRecoveryBanner } from '@/components/verification/SessionRecoveryBanner';
import { useSession } from '@/app/ctx';
import { LogoutButton } from '@/components/ui/logout-button';
import { supabase } from '@/lib/supabase';
import { useProviderVerificationStore } from '@/stores/verification/provider-verification';

type VerificationStatus = 'pending' | 'in_review' | 'approved' | 'rejected';

interface TimelineItem {
  iconType: 'clock' | 'eye' | 'check' | 'x-circle';
  title: string;
  description: string;
  completed: boolean;
}

interface StatusConfig {
  iconType: 'clock' | 'eye' | 'check-circle' | 'x-circle';
  bgColorClass: string;
  title: string;
  subtitle: string;
  badgeText: string;
  badgeBgClass: string;
  badgeTextClass: string;
  timeline: TimelineItem[];
  nextSteps: string[];
  showContactSupport: boolean;
  showRetryButton: boolean;
}

// Helper to get Lucide icon component based on type
const getIconComponent = (iconType: 'clock' | 'eye' | 'check' | 'check-circle' | 'x-circle') => {
  switch (iconType) {
    case 'clock': return Clock;
    case 'eye': return Eye;
    case 'check': return CheckCircle;
    case 'check-circle': return CheckCircle;
    case 'x-circle': return XCircle;
    default: return Clock;
  }
};

const statusConfigs: Record<VerificationStatus, StatusConfig> = {
  pending: {
    iconType: 'clock',
    bgColorClass: 'bg-warning/10',
    title: 'Verification Pending',
    subtitle: 'Your verification application has been submitted and is currently under review by our team.',
    badgeText: 'Pending Admin Review',
    badgeBgClass: 'bg-warning/10',
    badgeTextClass: 'text-warning',
    timeline: [
      {
        iconType: 'check',
        title: 'Application Submitted',
        description: 'Your verification documents have been received',
        completed: true,
      },
      {
        iconType: 'eye',
        title: 'Under Review',
        description: 'Our team is reviewing your application',
        completed: false,
      },
      {
        iconType: 'check',
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
    iconType: 'eye',
    bgColorClass: 'bg-primary/10',
    title: 'Under Review',
    subtitle: 'Our verification team is actively reviewing your application.',
    badgeText: 'In Review',
    badgeBgClass: 'bg-primary/10',
    badgeTextClass: 'text-primary',
    timeline: [
      {
        iconType: 'check',
        title: 'Application Submitted',
        description: 'Your verification documents have been received',
        completed: true,
      },
      {
        iconType: 'eye',
        title: 'Under Review',
        description: 'Our team is reviewing your application',
        completed: true,
      },
      {
        iconType: 'check',
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
    iconType: 'check-circle',
    bgColorClass: 'bg-success/10',
    title: 'Verification Approved',
    subtitle: 'Congratulations! Your verification has been approved. You can now start accepting bookings.',
    badgeText: 'Approved',
    badgeBgClass: 'bg-success/10',
    badgeTextClass: 'text-success',
    timeline: [
      {
        iconType: 'check',
        title: 'Application Submitted',
        description: 'Your verification documents have been received',
        completed: true,
      },
      {
        iconType: 'check',
        title: 'Review Complete',
        description: 'Your application has been reviewed and approved',
        completed: true,
      },
      {
        iconType: 'check',
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
    iconType: 'x-circle',
    bgColorClass: 'bg-destructive/10',
    title: 'Verification Not Approved',
    subtitle: 'Unfortunately, your verification application was not approved. Please review the feedback and submit a new application.',
    badgeText: 'Not Approved',
    badgeBgClass: 'bg-destructive/10',
    badgeTextClass: 'text-destructive',
    timeline: [
      {
        iconType: 'check',
        title: 'Application Submitted',
        description: 'Your verification documents have been received',
        completed: true,
      },
      {
        iconType: 'check',
        title: 'Review Complete',
        description: 'Your application has been reviewed',
        completed: true,
      },
      {
        iconType: 'x-circle',
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
  const { signOut } = useSession();
  
  // ✅ REACT QUERY + ZUSTAND: Following copilot-rules.md  
  const { user, isAuthenticated } = useAuthOptimized();
  const { session } = useSession();
  
  // 🚨 CRITICAL: If user is not authenticated, they shouldn't be on this screen
  // This prevents the loading state after logout
  if (!isAuthenticated || !user) {
    console.log('[VerificationStatus] Auth check failed, showing redirect screen');
    return (
      <SafeAreaView className="flex-1 bg-background">
        <ScreenWrapper>
          <View className="flex-1 justify-center items-center">
            <Text className="text-muted-foreground">Redirecting to login...</Text>
          </View>
        </ScreenWrapper>
      </SafeAreaView>
    );
  }

  // ✅ CONDITIONAL HOOKS: Only call React Query hooks when authenticated
  // This prevents API calls during logout that cause loading states
  const {
    data: verificationData,
    isLoading,
    error,
    isFetching,
    refetch
  } = useVerificationStatusPure(user.id);

  // ✅ ZUSTAND SELECTORS: Global state access (replaces useState)
  const { status: storeStatus, lastUpdated, isSubscribed } = useVerificationStatusSelector();

  // ✅ RESTART VERIFICATION MUTATION: Updates database status and resets local state
  const queryClient = useQueryClient();
  const { resetVerification } = useProviderVerificationStore();
  
  const restartVerificationMutation = useMutation({
    mutationFn: async () => {
      if (!user.id) throw new Error('User ID required');
      
      console.log('[RestartVerification] Starting restart process for user:', user.id);
      
      // Update database status back to 'pending'
      const { error } = await supabase
        .from('provider_onboarding_progress')
        .update({ verification_status: 'pending' })
        .eq('provider_id', user.id);
        
      if (error) throw error;
      
      console.log('[RestartVerification] Database status updated to pending');
      
     
      resetVerification();
      
      console.log('[RestartVerification] Local store reset completed');
      
      return { success: true };
    },
    onSuccess: () => {
      console.log('[RestartVerification] Restart completed successfully');
      
      // Invalidate verification status query to refetch
      queryClient.invalidateQueries({
        queryKey: ['verification-status', user.id],
      });
      
      // Navigate to provider verification flow
      router.replace('/(provider-verification)');
    },
    onError: (error) => {
      console.error('[RestartVerification] Failed to restart verification:', error);
      // Could add toast notification here
    },
  });

  // ✅ COMPUTED PROPERTIES: Pure derivation (replaces useState)
  const rawStatus = verificationData?.status || storeStatus || 'pending';
  const currentStatus = (['pending', 'in_review', 'approved', 'rejected'].includes(rawStatus) ? rawStatus : 'pending') as VerificationStatus;
  const config = statusConfigs[currentStatus] || statusConfigs.pending;
  const isRefreshing = isFetching && !isLoading;

  // ✅ PURE NAVIGATION: No useEffect in component - navigation logic is pure computation
  const { shouldNavigateToProvider, shouldRedirectToAuth } = useVerificationNavigationPure(currentStatus, isLoading);

  // ✅ DEBUG: Log config to help debug text rendering issues
  console.log('[VerificationStatus] Config for status', currentStatus, ':', config);

  // ✅ REACT QUERY LOADING: Handle loading states properly
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
            <View className="w-16 h-16 bg-destructive/10 rounded-full items-center justify-center mb-4">
              <Icon as={AlertCircle} size={32} className="text-destructive" />
            </View>
            <Text className="text-foreground text-lg font-semibold mt-4 mb-2">
              Unable to Load Status
            </Text>
            <Text className="text-muted-foreground text-center mb-6">
              We couldn't load your verification status. Please check your connection and try again.
            </Text>
            <Button onPress={() => refetch()} variant="outline">
              <Text>Try Again</Text>
            </Button>
          </View>
        </ScreenWrapper>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <VerificationNavigationHandler
        shouldNavigateToProvider={shouldNavigateToProvider}
        shouldRedirectToAuth={shouldRedirectToAuth}
      />
      
      <ScrollView 
        className="flex-1"
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => refetch()}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Status Section */}
        <View className="px-6 pt-8 pb-6">
         
          <View className="items-center mb-6">
            <View className={cn(
              "w-24 h-24 rounded-full items-center justify-center mb-4",
              config?.bgColorClass || 'bg-warning/10'
            )}>
              <Icon 
                as={getIconComponent(config.iconType)} 
                size={48} 
                className={
                  config.iconType === 'clock' ? 'text-warning' :
                  config.iconType === 'eye' ? 'text-primary' :
                  config.iconType === 'check-circle' ? 'text-success' :
                  'text-destructive'
                }
              />
            </View>

            {/* Status Badge */}
            <Badge 
              variant="outline" 
              className={cn(
                "px-4 py-1.5 rounded-full",
                config?.badgeBgClass || 'bg-warning/10',
                'border-0'
              )}
            >
              <Text className={cn(
                "font-semibold text-sm",
                config?.badgeTextClass || 'text-warning'
              )}>
                {config?.badgeText || 'Loading...'}
              </Text>
            </Badge>

            {/* Debug Info */}
            {__DEV__ && lastUpdated && typeof lastUpdated === 'number' && lastUpdated > 0 && (
              <Badge variant="outline" className="mt-3 bg-muted/50 border-0">
                <Text className="text-muted-foreground text-xs">
                  Last updated: <Text>{new Date(lastUpdated).toLocaleTimeString()}</Text>
                </Text>
              </Badge>
            )}

            {/* Live Indicator */}
            {typeof isSubscribed === 'boolean' && isSubscribed && (
              <View className="flex-row items-center mt-3 bg-success/10 px-3 py-1 rounded-full">
                <View className="w-2 h-2 bg-success rounded-full mr-2" />
                <Text className="text-success text-xs font-medium">Live Updates Active</Text>
              </View>
            )}
          </View>

          {/* Title & Description */}
          <View className="items-center mb-2">
            <Text className="text-foreground text-2xl font-bold text-center mb-3">
              {config?.title || 'Verification Status'}
            </Text>
            <Text className="text-muted-foreground text-center text-base leading-6 px-4">
              {config?.subtitle || 'Your verification status is being loaded.'}
            </Text>
          </View>
        </View>

        <View className="px-6">
          {/* Session Recovery Banner */}
          <SessionRecoveryBanner className="mb-6" />

          {/* Timeline Card */}
          <Card className="mb-6 overflow-hidden">
            <CardHeader className="pb-4">
              <View className="flex-row items-center">
                <View className="w-10 h-10 bg-primary/10 rounded-full items-center justify-center mr-3">
                  <Icon as={CheckCircle} size={20} className="text-primary" />
                </View>
                <CardTitle className="text-foreground text-lg flex-1">
                  Verification Progress
                </CardTitle>
              </View>
            </CardHeader>
            <CardContent className="pt-0">
              {(config?.timeline || []).map((step, index) => {
                const TimelineIconComponent = step?.iconType ? getIconComponent(step.iconType) : CheckCircle;
                const isCompleted = step?.completed;
                const isLast = index === (config?.timeline || []).length - 1;

                return (
                  <View key={`timeline-${index}`} className="flex-row items-start mb-6 last:mb-0">
                    {/* Timeline Line & Icon */}
                    <View className="items-center mr-4">
                      <View className={cn(
                        "w-10 h-10 rounded-full items-center justify-center",
                        isCompleted ? 'bg-success/15' : 'bg-muted/50'
                      )}>
                        <Icon
                          as={TimelineIconComponent}
                          size={20}
                          className={isCompleted ? 'text-success' : 'text-muted-foreground'}
                        />
                      </View>
                      {!isLast && (
                        <View className={cn(
                          "w-0.5 h-8 mt-2",
                          isCompleted ? 'bg-success/30' : 'bg-border'
                        )} />
                      )}
                    </View>

                    {/* Step Content */}
                    <View className="flex-1 pt-1">
                      <Text className={cn(
                        "font-semibold mb-1 text-base",
                        isCompleted ? 'text-foreground' : 'text-muted-foreground'
                      )}>
                        {step?.title || 'Step'}
                      </Text>
                      <Text className="text-muted-foreground text-sm leading-5">
                        {step?.description || 'Description'}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </CardContent>
          </Card>

          {/* Next Steps Card */}
          <Card className="mb-6">
            <CardHeader className="pb-4">
              <View className="flex-row items-center">
                <View className="w-10 h-10 bg-primary/10 rounded-full items-center justify-center mr-3">
                  <Icon as={Clock} size={20} className="text-primary" />
                </View>
                <CardTitle className="text-foreground text-lg flex-1">
                  What's Next?
                </CardTitle>
              </View>
            </CardHeader>
            <CardContent className="pt-0">
              {(config?.nextSteps || []).map((step, index) => (
                <View key={`next-step-${index}`} className="flex-row items-start mb-4 last:mb-0">
                  <View className="w-6 h-6 bg-primary/10 rounded-full items-center justify-center mr-3 mt-0.5">
                    <Text className="text-primary font-bold text-xs">
                      {index + 1}
                    </Text>
                  </View>
                  <Text className="text-muted-foreground flex-1 leading-6 text-base">
                    {typeof step === 'string' ? step : 'Step description'}
                  </Text>
                </View>
              ))}
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <View className="gap-3 pb-8">
            {/* Primary Actions */}
            {currentStatus === 'approved' && (
              <Button
                onPress={() => router.replace('/(provider)')}
                className="w-full h-14 rounded-xl"
                size="lg"
              >
                <View className="flex-row items-center">
                  <Icon as={CheckCircle} size={20} className="text-primary-foreground mr-2" />
                  <Text className="text-primary-foreground font-semibold text-base">
                    Go to Dashboard
                  </Text>
                </View>
              </Button>
            )}

            {typeof config?.showRetryButton === 'boolean' && config?.showRetryButton && (
              <Button
                onPress={() => restartVerificationMutation.mutate()}
                disabled={restartVerificationMutation.isPending}
                className="w-full h-14 rounded-xl"
                size="lg"
              >
                <View className="flex-row items-center">
                  {restartVerificationMutation.isPending ? (
                    <Icon as={Clock} size={20} className="text-primary-foreground mr-2 animate-spin" />
                  ) : (
                    <Icon as={XCircle} size={20} className="text-primary-foreground mr-2" />
                  )}
                  <Text className="text-primary-foreground font-semibold text-base">
                    {restartVerificationMutation.isPending ? 'Starting Over...' : 'Submit New Application'}
                  </Text>
                </View>
              </Button>
            )}

            {/* Secondary Actions */}
            {typeof config?.showContactSupport === 'boolean' && config?.showContactSupport && (
              <Button
                variant="outline"
                onPress={() => {
                  console.log('Contact support tapped');
                }}
                className="w-full h-14 rounded-xl border-border"
              >
                <View className="flex-row items-center">
                  <Icon as={AlertCircle} size={20} className="text-foreground mr-2" />
                  <Text className="text-foreground font-medium text-base">
                    Contact Support
                  </Text>
                </View>
              </Button>
            )}

            {/* Dev Tools */}
            {__DEV__ && (
              <Button
                variant="outline"
                onPress={() => refetch()}
                disabled={isRefreshing}
                className="w-full h-12 rounded-xl border-dashed border-muted-foreground/30"
              >
                <Text className="text-muted-foreground text-sm">
                  {isRefreshing ? 'Refreshing...' : '🔄 Refresh Status (Dev)'}
                </Text>
              </Button>
            )}

            {/* Logout */}
            <View className="mt-2">
              <LogoutButton
                variant="outline"
                className="w-full h-12 rounded-xl"
              >
                <Text className="text-muted-foreground font-medium">Sign Out</Text>
              </LogoutButton>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
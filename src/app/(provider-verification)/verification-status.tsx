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

import { useVerificationData, useVerificationRealtime } from '@/hooks/provider/useVerificationSingleSource';
import { useAuthStore } from '@/stores/auth';
import { useSignOut } from '@/hooks/auth/useSignOut';
import { LogoutButton } from '@/components/ui/logout-button';
import { supabase } from '@/lib/supabase';

type VerificationStatus = 'pending' | 'in_review' | 'approved' | 'rejected' | 'submitted';

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
  submitted: {
    iconType: 'clock',
    bgColorClass: 'bg-warning/10',
    title: 'Verification Submitted',
    subtitle: 'Your verification application has been submitted and is currently under review by our team.',
    badgeText: 'Submitted',
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
};

export default function VerificationStatusScreen() {
  const { isDarkColorScheme, colorScheme } = useColorScheme();
  const signOutMutation = useSignOut();

  const user = useAuthStore((state) => state.user);
  const session = useAuthStore((state) => state.session);
  const isAuthenticated = !!session;

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

  const {
    data: verificationData,
    isLoading,
    error,
    isFetching,
    refetch
  } = useVerificationData(user.id);

  const queryClient = useQueryClient();

  

  const restartVerificationMutation = useMutation({
    mutationFn: async () => {
      if (!user.id) throw new Error('User ID required');

      console.log('[RestartVerification] Starting restart process for user:', user.id);

      const { error } = await supabase
        .from('provider_onboarding_progress')
        .update({ verification_status: 'pending' })
        .eq('provider_id', user.id);

      if (error) throw error;

      console.log('[RestartVerification] Database status updated to pending');

      // Note: No more Zustand store reset needed - database is single source of truth

      return { success: true };
    },
    onSuccess: () => {
      console.log('[RestartVerification] Restart completed successfully');

      queryClient.invalidateQueries({
        queryKey: ['verification-data', user.id],
      });

      router.replace('/(provider-verification)');
    },
    onError: (error) => {
      console.error('[RestartVerification] Failed to restart verification:', error);
    },
  });

  const rawStatus = verificationData?.progress?.verification_status || 'pending';
  const normalizedStatus = rawStatus;
  const currentStatus = (['pending', 'in_progress', 'in_review', 'approved', 'rejected'].includes(normalizedStatus) ? normalizedStatus : 'pending') as VerificationStatus;
  const config = statusConfigs[currentStatus] || statusConfigs.pending;
  const isRefreshing = isFetching && !isLoading;

  console.log('[VerificationStatus] Config for status', currentStatus, ':', config);

  // 🎯 AUTO-REDIRECT: If status is approved, redirect to dashboard immediately
  React.useEffect(() => {
    if (currentStatus === 'approved' && !isLoading) {
      console.log('[VerificationStatus] 🎯 Status is approved - redirecting to dashboard');
      router.replace('/(provider)');
    }
  }, [currentStatus, isLoading]);

  // Show loading state while redirecting
  if (currentStatus === 'approved' && !isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <ScreenWrapper>
          <View className="flex-1 justify-center items-center">
            <Text className="text-muted-foreground">🎉 Verification approved! Redirecting to dashboard...</Text>
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
        <View className="px-6 pt-8 pb-6">
          <View className="items-center mb-6">
            <View className="w-24 h-24 rounded-full items-center justify-center mb-4 bg-primary/10">
              <Icon
                as={getIconComponent(config?.iconType || 'clock')}
                size={48}
                className="text-primary"
              />
            </View>

            <Badge
              variant="outline"
              className="px-4 py-1.5 rounded-full border-0 bg-primary/10"
            >
              <Text className="font-semibold text-sm text-primary">
                {config?.badgeText || 'Loading...'}
              </Text>
            </Badge>

            {/* Real-time updates are now automatic with Supabase subscriptions */}
            <View className="flex-row items-center mt-3 bg-success/10 px-3 py-1 rounded-full">
              <View className="w-2 h-2 bg-success rounded-full mr-2" />
              <Text className="text-success text-xs font-medium">Live Updates Active</Text>
            </View>
          </View>

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
          {/* <SessionRecoveryBanner className="mb-6" /> */}

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

                    <View className="flex-1 pt-1">
                      <Text className="font-semibold mb-1 text-base text-foreground">
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

          <View className="gap-3 pb-8">
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

            {config?.showRetryButton && (
              <Button
                onPress={() => restartVerificationMutation.mutate()}
                disabled={restartVerificationMutation.isPending}
                className="w-full h-14 rounded-xl"
                size="lg"
              >
                <View className="flex-row items-center">
                  {restartVerificationMutation.isPending ? (
                    <Icon as={Clock} size={20} className="text-primary-foreground mr-2" />
                  ) : (
                    <Icon as={XCircle} size={20} className="text-primary-foreground mr-2" />
                  )}
                  <Text className="text-primary-foreground font-semibold text-base">
                    {restartVerificationMutation.isPending ? 'Starting Over...' : 'Submit New Application'}
                  </Text>
                </View>
              </Button>
            )}

            {config?.showContactSupport && (
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

            {__DEV__ && (
              <Button
                variant="outline"
                onPress={() => refetch()}
                disabled={isRefreshing}
                className="w-full h-12 rounded-xl border-dashed border-muted-foreground/30"
              >
                <Text className="text-muted-foreground text-sm">
                  {isRefreshing ? 'Refreshing...' : 'Refresh Status (Dev)'}
                </Text>
              </Button>
            )}

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
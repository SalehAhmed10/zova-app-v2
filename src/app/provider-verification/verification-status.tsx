import React from 'react';
import { View, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScreenWrapper } from '@/components/ui/screen-wrapper';
import { useColorScheme } from '@/lib/core/useColorScheme';

import { useAuth } from '@/hooks';
import { supabase } from '@/lib/core/supabase';
import { router } from 'expo-router';
import { useProfileStore } from '@/stores/verification/useProfileStore';

// Global debouncing store to persist across component remounts
const verificationDebounceMap = new Map<string, { lastStatus: string | null; lastTime: number }>();

// Use the correct database enum type
type VerificationStatus = 'pending' | 'in_review' | 'approved' | 'rejected';

// React Query hook for fetching verification status
const useVerificationStatus = (userId: string | undefined) => {
  return useQuery({
    queryKey: ['verification-status', userId],
    queryFn: async (): Promise<{ status: VerificationStatus }> => {
      if (!userId) throw new Error('User ID is required');

      console.log('[VerificationStatus] Fetching verification status from database for user:', userId);

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('verification_status')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('[VerificationStatus] Error fetching verification status:', error);
        throw error;
      }
      if (!profile?.verification_status) {
        console.warn('[VerificationStatus] No verification status found in database');
        throw new Error('No verification status found');
      }

      console.log('[VerificationStatus] Fetched status from database:', profile.verification_status);
      return { status: profile.verification_status as VerificationStatus };
    },
    enabled: !!userId,
    staleTime: 0, // Always consider data stale to ensure fresh fetches
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error) => {
      console.log(`[VerificationStatus] Query retry ${failureCount}, error:`, error?.message);
      // Don't retry on auth errors or if user doesn't exist
      if (error?.message?.includes('User ID is required') || error?.message?.includes('No verification status found')) {
        return false;
      }
      return failureCount < 3;
    },
  });
};

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
        icon: 'time',
        iconColor: '#f59e0b',
        title: 'Under Review',
        description: 'Our team is carefully reviewing your application',
        completed: false,
      },
      {
        icon: 'checkmark-circle-outline',
        iconColor: '#6b7280',
        title: 'Approval Pending',
        description: 'You\'ll be notified once the review is complete',
        completed: false,
      },
    ],
    nextSteps: [
      '1-2 business days: Initial document review',
      'Background check: Verification of credentials',
      'Final approval: Account activation and notification',
    ],
    showContactSupport: true,
    showRetryButton: false,
  },
  in_review: {
    icon: 'document-text',
    iconColor: '#3b82f6',
    bgColor: 'bg-blue-100 dark:bg-blue-900/20',
    title: 'Verification Under Review',
    subtitle: 'Your verification is currently being reviewed by our team. This process typically takes 1-2 business days.',
    badgeText: 'In Progress',
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
        icon: 'document-text',
        iconColor: '#3b82f6',
        title: 'Admin Review',
        description: 'Our team is actively reviewing your application',
        completed: true,
      },
      {
        icon: 'checkmark-circle-outline',
        iconColor: '#6b7280',
        title: 'Final Decision',
        description: 'Approval or additional information needed',
        completed: false,
      },
    ],
    nextSteps: [
      'Document verification: Checking authenticity',
      'Background check: Professional credentials validation',
      'Quality assurance: Final review and approval',
    ],
    showContactSupport: true,
    showRetryButton: false,
  },
  approved: {
    icon: 'checkmark-circle',
    iconColor: '#10b981',
    bgColor: 'bg-green-100 dark:bg-green-900/20',
    title: 'Verification Approved!',
    subtitle: 'Congratulations! Your verification has been approved. You now have full access to the provider dashboard.',
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
        title: 'Review Completed',
        description: 'All documents and information verified successfully',
        completed: true,
      },
      {
        icon: 'checkmark',
        iconColor: '#10b981',
        title: 'Account Activated',
        description: 'Full provider access granted',
        completed: true,
      },
    ],
    nextSteps: [
      'Set up your services and pricing',
      'Complete your profile information',
      'Start accepting bookings from customers',
    ],
    showContactSupport: false,
    showRetryButton: false,
  },
  rejected: {
    icon: 'close-circle',
    iconColor: '#ef4444',
    bgColor: 'bg-red-100 dark:bg-red-900/20',
    title: 'Verification Rejected',
    subtitle: 'Unfortunately, your verification application could not be approved at this time. Please review the feedback and resubmit.',
    badgeText: 'Rejected',
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
        icon: 'close',
        iconColor: '#ef4444',
        title: 'Review Completed',
        description: 'Additional information or corrections needed',
        completed: true,
      },
      {
        icon: 'refresh',
        iconColor: '#f59e0b',
        title: 'Resubmission Required',
        description: 'Please address the issues and resubmit',
        completed: false,
      },
    ],
    nextSteps: [
      'Review the rejection reasons below',
      'Update your documents or information as needed',
      'Resubmit your verification application',
    ],
    showContactSupport: true,
    showRetryButton: true,
  },
};

// Custom hook for managing real-time verification status subscription
const useVerificationSubscription = (userId: string | undefined, queryClient: any, currentStatus: string) => {
  const subscriptionRef = React.useRef<any>(null);
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const lastKnownStatusRef = React.useRef<string | null>(null);

  // Update last known status when currentStatus changes
  React.useEffect(() => {
    lastKnownStatusRef.current = currentStatus;
  }, [currentStatus]);

  const setupSubscription = React.useCallback(() => {
    if (!userId) return;

    console.log('[VerificationStatus] Setting up real-time subscription for user:', userId);

    // Clean up any existing subscription before setting up a new one
    if (subscriptionRef.current) {
      console.log('[VerificationStatus] Cleaning up existing subscription before setup');
      supabase.removeChannel(subscriptionRef.current);
      subscriptionRef.current = null;
    }

    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    const channel = supabase
      .channel(`verification-status-${userId}`) // Simplified channel name without timestamp
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${userId}`,
        },
        (payload) => {
          console.log('[VerificationStatus] Real-time update received:', payload);
          const newStatus = payload.new.verification_status;
          const payloadOldStatus = payload.old?.verification_status;

          // Validate that the new status is one of our expected values
          const validStatuses: VerificationStatus[] = ['pending', 'in_review', 'approved', 'rejected'];
          if (!validStatuses.includes(newStatus as VerificationStatus)) {
            console.warn('[VerificationStatus] Received invalid status:', newStatus);
            return;
          }

          // Use the last known status from our component state, or fallback to payload old status
          const oldStatus = lastKnownStatusRef.current || payloadOldStatus;

          // Debounce duplicate status changes (ignore if same status within 1 second)
          const now = Date.now();
          const debounceKey = userId;
          const debounceData = verificationDebounceMap.get(debounceKey) || { lastStatus: null, lastTime: 0 };

          if (debounceData.lastStatus === newStatus && (now - debounceData.lastTime) < 1000) {
            console.log('[VerificationStatus] Ignoring duplicate status update within 1 second');
            return;
          }

          verificationDebounceMap.set(debounceKey, { lastStatus: newStatus, lastTime: now });

          // Always log status changes with accurate old status
          const oldStatusDisplay = oldStatus || 'unknown';
          if (oldStatus !== newStatus) {
            console.log(`[VerificationStatus] Status change: ${oldStatusDisplay} → ${newStatus}`);
          } else {
            console.log(`[VerificationStatus] Status update received: ${newStatus} (no change)`);
          }

          // Update profile store to keep it in sync
          useProfileStore.getState().setProfile(userId, newStatus as VerificationStatus);

          // Update our last known status
          lastKnownStatusRef.current = newStatus;

          if (newStatus === 'approved') {
            console.log('[VerificationStatus] ✅ Status changed to APPROVED');
            // Don't auto-redirect - let user click "Go to Dashboard" button for better UX
          }

          // Always invalidate the query to ensure fresh data for all status changes
          queryClient.invalidateQueries({ queryKey: ['verification-status', userId] });
        }
      )
      .subscribe((status, err) => {
        console.log('[VerificationStatus] Subscription status:', status, err ? `Error: ${err}` : '');

        // Handle different subscription states
        if (status === 'SUBSCRIBED') {
          console.log('[VerificationStatus] Subscription successfully established');
          // Clear any pending timeout since we're now subscribed
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }
        } else if (status === 'TIMED_OUT' || status === 'CLOSED') {
          console.log('[VerificationStatus] Subscription failed, forcing refetch and retry');
          
          // Force refetch the data since real-time failed
          queryClient.invalidateQueries({ queryKey: ['verification-status', userId] });
          
          // Retry subscription after a delay
          timeoutRef.current = setTimeout(() => {
            console.log('[VerificationStatus] Retrying subscription setup...');
            setupSubscription();
          }, 2000); // Retry after 2 seconds
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[VerificationStatus] Channel error:', err);
          // Force refetch on channel error too
          queryClient.invalidateQueries({ queryKey: ['verification-status', userId] });
        }
      });

    subscriptionRef.current = channel;

    return () => {
      console.log('[VerificationStatus] Cleaning up real-time subscription');
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [userId, queryClient]);

  // Set up subscription when userId changes
  React.useEffect(() => {
    const cleanup = setupSubscription();
    return cleanup;
  }, [setupSubscription]);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, []);
};

export default function VerificationStatusScreen() {
  const { isDarkColorScheme } = useColorScheme();
  const { user } = useAuth();
  const [refreshing, setRefreshing] = React.useState(false);
  const queryClient = useQueryClient();

  // Use React Query for verification status
  const {
    data: verificationData,
    isLoading,
    error,
    refetch
  } = useVerificationStatus(user?.id);

  // Force refetch on mount to ensure we have latest data
  React.useEffect(() => {
    if (user?.id) {
      console.log('[VerificationStatus] Component mounted, forcing refetch for user:', user.id);
      refetch();
    }
  }, [user?.id, refetch]);

  const currentStatus = verificationData?.status || 'pending';

  // Sync profile store with React Query data
  React.useEffect(() => {
    if (user?.id && verificationData?.status) {
      console.log('[VerificationStatus] Syncing profile store with status:', verificationData.status);
      useProfileStore.getState().setProfile(user.id, verificationData.status);
    }
  }, [user?.id, verificationData?.status]);

  // Set up real-time subscription
  useVerificationSubscription(user?.id, queryClient, currentStatus);

  // Handle pull-to-refresh
  const handleRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await queryClient.invalidateQueries({ queryKey: ['verification-status', user?.id] });
    } finally {
      setRefreshing(false);
    }
  }, [queryClient, user?.id]);

  const config = statusConfigs[currentStatus];

  // Handle contact support
  const handleContactSupport = React.useCallback(() => {
    // TODO: Implement contact support functionality
    console.log('[VerificationStatus] Contact support requested');
    // Could open email, chat, or support ticket
  }, []);

  // Handle sign out
  const handleSignOut = React.useCallback(() => {
    router.replace('/auth');
  }, []);

  if (isLoading) {
    return (
      <ScreenWrapper>
        <View className="flex-1 justify-center items-center">
          <View className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
          <Text className="text-muted-foreground">Loading verification status...</Text>
        </View>
      </ScreenWrapper>
    );
  }

  if (error) {
    return (
      <ScreenWrapper>
        <View className="flex-1 justify-center items-center p-6">
          <View className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full justify-center items-center mb-4">
            <Ionicons name="alert-circle" size={32} color="#ef4444" />
          </View>
          <Text className="text-xl font-semibold text-foreground mb-2">Unable to Load Status</Text>
          <Text className="text-muted-foreground text-center mb-6">
            We couldn't load your verification status. Please try again.
          </Text>
          <View className="w-full max-w-sm">
            <Button onPress={() => refetch()} className="w-full mb-3">
              <Text>Try Again</Text>
            </Button>
            <Button onPress={handleContactSupport} variant="outline" className="w-full">
              <Text>Contact Support</Text>
            </Button>
          </View>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper 
      scrollable={true} 
      contentContainerClassName="px-6 py-4"
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={isDarkColorScheme ? '#ffffff' : '#000000'}
        />
      }
    >
      {/* Header */}
      <View className="items-center mb-8">
        <View className={`w-20 h-20 ${config.bgColor} rounded-3xl justify-center items-center mb-6`}>
          <Ionicons name={config.icon as any} size={40} color={config.iconColor} />
        </View>
        <Text className="text-3xl font-bold text-foreground text-center mb-2">
          {config.title}
        </Text>
        <Text className="text-lg text-muted-foreground text-center leading-6">
          {config.subtitle}
        </Text>
        <View className={`px-3 py-1 ${config.badgeColor} rounded-full mt-4`}>
          <Text className="text-sm font-medium">
            {config.badgeText}
          </Text>
        </View>
      </View>

      {/* Status Card */}
      <Card className="mb-6">
        <CardHeader>
          <View className="flex-row items-center">
            <Ionicons name="information-circle" size={20} color="#3b82f6" />
            <Text className="ml-2 font-semibold text-foreground">Verification Process</Text>
          </View>
        </CardHeader>
        <CardContent>
          <View>
            {config.timeline.map((step, index) => (
              <View key={index} className={`flex-row items-start ${index < config.timeline.length - 1 ? 'mb-4' : ''}`}>
                <View className={`w-6 h-6 ${step.completed ? 'bg-green-100 dark:bg-green-900/20' : 'bg-gray-100 dark:bg-gray-800'} rounded-full justify-center items-center mt-0.5 mr-3`}>
                  <Ionicons name={step.icon as any} size={12} color={step.iconColor} />
                </View>
                <View className="flex-1">
                  <Text className={`font-medium ${step.completed ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {step.title}
                  </Text>
                  <Text className="text-sm text-muted-foreground">
                    {step.description}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </CardContent>
      </Card>

      {/* What Happens Next */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>
            {currentStatus === 'approved' ? 'What\'s Next?' : 'What Happens Next?'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <View>
            {config.nextSteps.map((step, index) => (
              <Text key={index} className={`text-sm text-muted-foreground ${index < config.nextSteps.length - 1 ? 'mb-3' : ''}`}>
                • <Text className="font-medium">{step.split(':')[0]}:</Text> {step.split(':')[1]}
              </Text>
            ))}
          </View>
        </CardContent>
      </Card>

      {/* Contact Support */}
      {config.showContactSupport && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Need Help?</CardTitle>
          </CardHeader>
          <CardContent>
            <Text className="text-sm text-muted-foreground mb-4">
              If you have questions about your verification status or need to update your information, our support team is here to help.
            </Text>
            <Button variant="outline" className="w-full" onPress={handleContactSupport}>
              <View className="flex-row items-center">
                <Ionicons name="mail" size={16} className="mr-2" />
                <Text>Contact Support</Text>
              </View>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <View>
        {config.showRetryButton && (
          <Button
            onPress={() => router.replace('/provider-verification')}
            className="w-full mb-3"
          >
            <Text>Resubmit Verification</Text>
          </Button>
        )}

        {currentStatus === 'approved' && (
          <Button
            onPress={() => router.replace('/provider')}
            className="w-full mb-3"
          >
            <Text>Go to Dashboard</Text>
          </Button>
        )}

        <Button
          onPress={handleSignOut}
          variant="outline"
          className="w-full"
        >
          <Text>Sign Out</Text>
        </Button>
      </View>
    </ScreenWrapper>
  );
}
import React from 'react';
import { View, Alert, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Animated, { FadeIn, SlideInDown, SlideInUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/lib/core/useColorScheme';
import { THEME } from '@/lib/theme';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '@/lib/supabase';
import { PaymentAnalyticsService } from '@/lib/payment/payment-analytics';
import { useProviderAccess } from '@/hooks/provider/useProviderAccess';
import { useAuthOptimized } from '@/hooks';
import { usePaymentSetupStore } from '@/stores/verification/usePaymentSetupStore';
import { CheckCircle, AlertCircle, CreditCard, Zap, Lock, Info } from 'lucide-react-native';

/**
 * ✅ PAYMENT SETUP SCREEN (Onboarding)
 * 
 * First-time payment setup wizard for approved providers.
 * Modern UI matching payment settings screen.
 * 
 * Features:
 * - Stripe Connect OAuth flow with proper deep links
 * - Real-time status checking with React Query
 * - Status badges and indicators with theme colors
 * - Guided setup experience
 * - Zustand for state management (no useState anti-pattern)
 */
export default function PaymentSetupScreen() {
  const queryClient = useQueryClient();
  const { user } = useAuthOptimized();
  const { colorScheme } = useColorScheme();
  const colors = THEME[colorScheme];
  
  // ✅ ZUSTAND: Payment state (replaces useState anti-pattern)
  const {
    stripeAccountId,
    accountSetupComplete,
    setStripeAccountId,
    setAccountSetupComplete
  } = usePaymentSetupStore();
  
  // ✅ REACT QUERY + ZUSTAND: Access control
  const { 
    isFullyActive,
    needsPaymentSetup,
    paymentSetupInProgress,
    canViewDashboard
  } = useProviderAccess();

  // ✅ WEBBROWSER SETUP: One-time initialization
  React.useEffect(() => {
    const setupWebBrowser = async () => {
      try {
        await WebBrowser.warmUpAsync();
      } catch (error) {
        console.log('[PaymentSetup] WebBrowser warmUp not available');
      }
    };
    setupWebBrowser();

    return () => {
      WebBrowser.coolDownAsync();
    };
  }, []);

  // ✅ REACT QUERY: Check Stripe account status
  const checkStripeStatusMutation = useMutation({
    mutationFn: async ({ showSuccessOnChange = false }: { showSuccessOnChange?: boolean } = {}) => {
      try {
        // Check database for cached Stripe status first
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('stripe_account_id, stripe_charges_enabled, stripe_details_submitted, stripe_account_status')
            .eq('id', user.id)
            .single();

          if (profile?.stripe_account_id) {
            const isComplete = profile.stripe_details_submitted === true && profile.stripe_charges_enabled === true;
            setStripeAccountId(profile.stripe_account_id);
            setAccountSetupComplete(isComplete);
          }
        }

        // Call edge function to check actual Stripe account status
        const { data, error } = await supabase.functions.invoke('check-stripe-account-status');

        if (error) {
          console.error('[PaymentSetup] Error checking Stripe status:', error);
          return null;
        }

        if (data?.hasStripeAccount) {
          const wasPreviouslyComplete = accountSetupComplete;
          const isNowComplete = data.accountSetupComplete;
          const statusChanged = !wasPreviouslyComplete && isNowComplete;

          // Update local state
          setStripeAccountId(data.accountId);
          setAccountSetupComplete(isNowComplete);

          // Update database with latest Stripe status
          if (user) {
            await supabase.from('profiles').update({
              stripe_charges_enabled: data.charges_enabled,
              stripe_details_submitted: data.details_submitted,
              stripe_account_status: data.charges_enabled ? 'active' : 'pending',
              updated_at: new Date().toISOString()
            }).eq('id', user.id);
          }

          // Track analytics
          if (isNowComplete && statusChanged) {
            await PaymentAnalyticsService.trackPaymentSetupCompleted(
              user?.id || '', 
              data.accountId, 
              'dashboard' // Use 'dashboard' context (allowed by constraint)
            );
          }

          return {
            accountId: data.accountId,
            accountSetupComplete: isNowComplete,
            statusChanged,
            showSuccessOnChange
          };
        } else {
          // No Stripe account found
          setStripeAccountId(null);
          setAccountSetupComplete(false);
          return null;
        }
      } catch (error) {
        console.error('[PaymentSetup] Error checking account status:', error);
        throw error;
      }
    },
    onSuccess: (result) => {
      if (result?.statusChanged && result?.showSuccessOnChange) {
          Alert.alert(
          '✅ Success!',
          'Your payment account is now active. You can start accepting bookings!',
          [
            {
              text: 'View Dashboard',
              onPress: () => router.replace('/(tabs)/provider' as any)
            }
          ]
        );
      }
      // ✅ CRITICAL: Invalidate ALL related queries to sync cache across screens
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] }); // 🔥 ADDED: Profile menu needs this!
      queryClient.invalidateQueries({ queryKey: ['provider-access', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['stripeAccount'] });
    },
    onError: (error: any) => {
      console.error('[PaymentSetup] Error checking Stripe status:', error);
      Alert.alert('Error', 'Failed to check payment status. Please try again.');
    }
  });

  // ✅ REACT QUERY MUTATION: Handle Stripe setup
  const stripeSetupMutation = useMutation({
    mutationFn: async () => {
      // Refresh session to get fresh JWT token
      console.log('[PaymentSetup] Refreshing session...');
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      
      if (refreshError) {
        console.error('[PaymentSetup] Refresh error:', refreshError);
        throw new Error('Please sign in again to continue');
      }

      // Get current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.user) {
        throw new Error('You must be logged in to set up payments');
      }

      const userId = session.user.id;
      console.log('[PaymentSetup] Creating Stripe Connect link for user:', userId);

      // Track analytics - use 'dashboard' context (allowed by constraint)
      await PaymentAnalyticsService.trackPaymentSetupStarted(userId, 'dashboard');

      // Call edge function to create Stripe Connect account link
      const { data, error } = await supabase.functions.invoke('create-stripe-connect-link', {
        body: { 
          userId,
          returnUrl: 'zova://provider/setup-payment', // Proper deep link from app.json
          refreshUrl: 'zova://provider/setup-payment'
        }
      });

      if (error) {
        console.error('[PaymentSetup] Error creating Stripe link:', error);
        throw error;
      }

      if (!data?.url) {
        throw new Error('No Stripe Connect URL returned');
      }

      console.log('[PaymentSetup] Stripe Connect link created:', data.url);
      return data;
    },
    onSuccess: async (data) => {
      console.log('[PaymentSetup] Opening Stripe Connect URL...');
      
      try {
        // ✅ FIX: Use openBrowserAsync instead of openAuthSessionAsync
        // openAuthSessionAsync uses limited WebView that may not support:
        // - Stripe's "Use test phone number" button
        // - Phone pre-fill functionality
        // - Full JavaScript features
        // 
        // openBrowserAsync opens full in-app browser with all features
        const result = await WebBrowser.openBrowserAsync(
          data.url,
          {
            // Open in full browser for complete Stripe experience
            presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
            // Enable toolbar for better UX
            toolbarColor: colors.background,
            // Control bar color
            controlsColor: colors.primary,
            // Enable bar collapsing on scroll
            enableBarCollapsing: false,
            // Show title
            showTitle: true,
            // Dismiss button style
            dismissButtonStyle: 'close',
          }
        );

        console.log('[PaymentSetup] WebBrowser result:', result);

        // Note: openBrowserAsync returns when browser is dismissed
        // Check if setup was completed
        if (result.type === 'dismiss' || result.type === 'cancel') {
          console.log('[PaymentSetup] Browser dismissed, checking if setup completed...');
          
          // Wait a moment for Stripe webhook to process
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Check status silently (no success notification yet)
          const statusResult = await checkStripeStatusMutation.mutateAsync({ showSuccessOnChange: false });
          
          if (statusResult?.accountSetupComplete) {
            // Setup was completed!
            Alert.alert(
              '✅ Success!',
              'Your payment account is now active. You can start accepting bookings!',
              [
                {
                  text: 'View Dashboard',
                  onPress: () => router.replace('/(tabs)/provider' as any)
                }
              ]
            );
          } else {
            // Setup not complete, show helpful message
            Alert.alert(
              'Setup In Progress',
              'Complete your payment setup to start accepting bookings.',
              [{ text: 'OK' }]
            );
          }
        }
      } catch (error) {
        console.error('[PaymentSetup] Error opening Stripe URL:', error);
        Alert.alert(
          'Unable to Open',
          'Could not open payment setup. Please try again or contact support.'
        );
      }
    },
    onError: (error: any) => {
      console.error('[PaymentSetup] Stripe setup error:', error);
      Alert.alert(
        'Setup Failed',
        error.message || 'Failed to start payment setup. Please try again.'
      );
    }
  });

  // Check status on mount and when returning from background
  React.useEffect(() => {
    checkStripeStatusMutation.mutate({ showSuccessOnChange: false });
  }, []);

  // Guard: Must be verified to access payment setup
  if (!canViewDashboard) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
        <View className="flex-1 items-center justify-center p-6">
          <AlertCircle size={64} color={colors.destructive} />
          <Text className="text-xl font-semibold text-center mb-2 text-foreground">
            Complete Verification First
          </Text>
          <Text className="text-muted-foreground text-center mb-6">
            You need to complete provider verification before setting up payments.
          </Text>
          <Button onPress={() => router.replace('/(provider-verification)')} size="lg">
            <Text className="text-primary-foreground font-semibold">Go to Verification</Text>
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  const isLoading = checkStripeStatusMutation.isPending || stripeSetupMutation.isPending;

  // Helper functions for UI
  const getStatusBadge = () => {
    if (isLoading) return <Skeleton className="h-6 w-20" />;

    if (!stripeAccountId) {
      return <Badge variant="destructive"><Text>Not Connected</Text></Badge>;
    }

    if (accountSetupComplete) {
      return <Badge variant="default" style={{ backgroundColor: colors.success }}><Text>Active</Text></Badge>;
    }

    return <Badge variant="secondary"><Text>Setup Required</Text></Badge>;
  };

  const getStatusDescription = () => {
    if (isLoading) return 'Checking account status...';

    if (!stripeAccountId) {
      return 'Connect your Stripe account to start accepting payments from customers.';
    }

    if (accountSetupComplete) {
      return 'Your payment account is fully set up and ready to accept bookings.';
    }

    return 'Complete your Stripe account setup to start receiving payments.';
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      {/* Header */}
      <View className="px-4 py-4 border-b border-border">
        <View className="flex-row items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onPress={() => router.back()}
            className="w-8 h-8 p-0"
          >
            <Ionicons name="chevron-back" size={24} color={colors.primary} />
          </Button>
          <Text className="text-xl font-bold text-foreground">
            Payment Setup
          </Text>
          <View className="w-8" />
        </View>
      </View>

      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={() => checkStripeStatusMutation.mutate({ showSuccessOnChange: false })}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View className="p-4">
          {/* Status Card */}
          <Card className="mb-4">
            <CardHeader>
              <View className="flex-row items-center justify-between">
                <CardTitle>Payment Account Status</CardTitle>
                {getStatusBadge()}
              </View>
              <Text variant="small" className="text-muted-foreground">
                {getStatusDescription()}
              </Text>
            </CardHeader>
          </Card>

          {/* Setup Required Card */}
          {!stripeAccountId && (
            <Animated.View entering={FadeIn}>
              <Card className="mb-4">
                <CardHeader>
                  <CardTitle style={{ color: colors.warning }}>
                    Setup Required
                  </CardTitle>
                  <Text variant="small" className="text-muted-foreground">
                    Connect your payment account to start earning
                  </Text>
                </CardHeader>
                <CardContent>
                  <Button
                    onPress={() => stripeSetupMutation.mutate()}
                    disabled={isLoading}
                    className="h-12"
                  >
                    <Text className="text-primary-foreground font-semibold">
                      {isLoading ? 'Connecting...' : 'Connect Payment Account'}
                    </Text>
                  </Button>
                </CardContent>
              </Card>
            </Animated.View>
          )}

          {/* Account Setup In Progress Card */}
          {stripeAccountId && !accountSetupComplete && (
            <Animated.View entering={SlideInDown}>
              <Card className="mb-4">
                <CardHeader>
                  <CardTitle className="text-blue-600 dark:text-blue-400">
                    Complete Account Setup
                  </CardTitle>
                  <Text variant="small" className="text-muted-foreground">
                    Finish setting up your Stripe account to start accepting payments
                  </Text>
                </CardHeader>
                <CardContent>
                  <Button
                    onPress={() => stripeSetupMutation.mutate()}
                    disabled={isLoading}
                    className="h-12 mb-4"
                  >
                    <Text className="text-primary-foreground font-semibold">
                      {isLoading ? 'Opening Setup...' : 'Continue Setup'}
                    </Text>
                  </Button>

                  <View className="gap-2">
                    <Text variant="small" className="font-medium text-foreground">
                      Setup includes:
                    </Text>
                    <Text variant="small" className="text-muted-foreground">
                      • Business information{'\n'}
                      • Bank account details{'\n'}
                      • Tax information{'\n'}
                      • Identity verification
                    </Text>
                  </View>
                </CardContent>
              </Card>
            </Animated.View>
          )}

          {/* Account Active Card */}
          {accountSetupComplete && (
            <Animated.View entering={SlideInUp}>
              <Card className="mb-4">
                <CardHeader>
                  <CardTitle className="text-green-600 dark:text-green-400">
                    Account Active
                  </CardTitle>
                  <Text variant="small" className="text-muted-foreground">
                    Your Stripe account is ready to accept payments
                  </Text>
                </CardHeader>
                <CardContent>
                  <View className="gap-4">
                    <View className="flex-row items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <Text variant="small" className="text-foreground font-medium">
                        Account ID
                      </Text>
                      <Text variant="small" className="text-muted-foreground font-mono">
                        {stripeAccountId ? `${stripeAccountId.slice(0, 8)}...` : 'N/A'}
                      </Text>
                    </View>

                    <View className="flex-row items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <Text variant="small" className="text-foreground font-medium">
                        Status
                      </Text>
                      <Badge variant="default" style={{ backgroundColor: colors.success }}>
                        <Text>Ready</Text>
                      </Badge>
                    </View>

                    <View className="pt-4 border-t border-border">
                      <Button
                        variant="outline"
                        onPress={() => router.replace('/(provider)')}
                        className="h-10"
                      >
                        <Text className="font-medium text-foreground">
                          Return to Dashboard
                        </Text>
                      </Button>
                    </View>
                  </View>
                </CardContent>
              </Card>
            </Animated.View>
          )}

          {/* Why Payment Setup? */}
          <Animated.View entering={SlideInDown.delay(100).springify()}>
            <Card className="mb-4">
              <CardHeader>
                <CardTitle>Why do I need this?</CardTitle>
              </CardHeader>
              <CardContent>
                <View className="gap-4">
                  <View className="flex-row items-start gap-3">
                    <View className="w-10 h-10 bg-primary/10 rounded-full items-center justify-center">
                      <CreditCard size={20} color={colors.primary} />
                    </View>
                    <View className="flex-1">
                      <Text className="font-medium text-foreground mb-1">Accept Payments</Text>
                      <Text variant="small" className="text-muted-foreground">
                        Receive payments securely from customers
                      </Text>
                    </View>
                  </View>

                  <View className="flex-row items-start gap-3">
                    <View className="w-10 h-10 bg-primary/10 rounded-full items-center justify-center">
                      <Zap size={20} color={colors.primary} />
                    </View>
                    <View className="flex-1">
                      <Text className="font-medium text-foreground mb-1">Fast Payouts</Text>
                      <Text variant="small" className="text-muted-foreground">
                        Get paid automatically to your bank account
                      </Text>
                    </View>
                  </View>

                  <View className="flex-row items-start gap-3">
                    <View className="w-10 h-10 bg-primary/10 rounded-full items-center justify-center">
                      <Lock size={20} color={colors.primary} />
                    </View>
                    <View className="flex-1">
                      <Text className="font-medium text-foreground mb-1">Secure & Compliant</Text>
                      <Text variant="small" className="text-muted-foreground">
                        Bank-level security with Stripe
                      </Text>
                    </View>
                  </View>
                </View>
              </CardContent>
            </Card>
          </Animated.View>

          {/* Info Card */}
          <Card className="bg-muted/30">
            <CardContent className="p-4">
              <View className="flex-row items-start">
                <Info size={20} color={colors.mutedForeground} />
                <View className="flex-1 ml-3">
                  <Text variant="small" className="text-muted-foreground leading-relaxed">
                    <Text className="font-medium">Secure Payments:</Text>
                    {'\n'}
                    All payments are processed securely through Stripe. ZOVA never stores your payment information.
                    {'\n\n'}
                    <Text className="font-medium">Quick Setup:</Text>
                    {'\n'}
                    The entire process takes just 2-3 minutes. You'll be redirected to Stripe to complete verification.
                    {'\n\n'}
                    <Text className="font-medium">Support:</Text>
                    {'\n'}
                    Need help? Contact our support team or Stripe directly for assistance.
                  </Text>
                </View>
              </View>
            </CardContent>
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

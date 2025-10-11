import React from 'react';
import { View, Alert, Linking } from 'react-native';
import { router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { ScreenWrapper } from '@/components/ui/screen-wrapper';
import * as WebBrowser from 'expo-web-browser';
import * as Clipboard from 'expo-clipboard';
import { supabase } from '@/lib/supabase';
import { PaymentAnalyticsService } from '@/lib/payment/payment-analytics';
import { useProviderAccess } from '@/hooks/provider/useProviderAccess';
import { useAuthOptimized } from '@/hooks';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { ArrowLeft, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react-native';

/**
 * ✅ PAYMENT SETUP SCREEN (Dashboard)
 * 
 * Moved from provider-verification to provider dashboard.
 * Now accessible at /provider/setup-payment after verification approval.
 * 
 * Features:
 * - Stripe Connect OAuth flow
 * - Account status checking
 * - Real-time payment status updates
 * - Integrated with useProviderAccess hook
 */
export default function PaymentSetupScreen() {
  const queryClient = useQueryClient();
  const { user } = useAuthOptimized();
  const [stripeAccountId, setStripeAccountId] = React.useState<string | null>(null);
  const [accountSetupComplete, setAccountSetupComplete] = React.useState(false);
  
  // ✅ REACT QUERY + ZUSTAND: Access control
  const { 
    isFullyActive, // Use isFullyActive instead of isPaymentActive
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
              'dashboard_setup'
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
      // Invalidate provider access query to refresh access flags
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

      // Track analytics - use 'dashboard' instead of 'dashboard_setup'
      await PaymentAnalyticsService.trackPaymentSetupStarted(userId, 'dashboard');

      // Call edge function to create Stripe Connect account link
      const { data, error } = await supabase.functions.invoke('create-stripe-connect-link', {
        body: { 
          userId,
          returnUrl: 'exp://192.168.1.100:8081/--/provider/setup-payment', // Will be updated for production
          refreshUrl: 'exp://192.168.1.100:8081/--/provider/setup-payment'
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
        // Open Stripe Connect OAuth flow
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          'exp://192.168.1.100:8081/--/provider/setup-payment' // Deep link back to this screen
        );

        console.log('[PaymentSetup] WebBrowser result:', result);

        if (result.type === 'success') {
          console.log('[PaymentSetup] Stripe setup completed, checking status...');
          
          // Wait a moment for Stripe to process
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Check status with success notification enabled
          await checkStripeStatusMutation.mutateAsync({ showSuccessOnChange: true });
        } else if (result.type === 'cancel') {
          console.log('[PaymentSetup] User cancelled Stripe setup');
          Alert.alert(
            'Setup Cancelled',
            'You can complete payment setup anytime from your dashboard.'
          );
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
      <ScreenWrapper>
        <View className="flex-1 items-center justify-center p-6">
          <AlertCircle size={64} className="text-destructive mb-4" />
          <Text className="text-xl font-semibold text-center mb-2">
            Complete Verification First
          </Text>
          <Text className="text-muted-foreground text-center mb-6">
            You need to complete provider verification before setting up payments.
          </Text>
          <Button onPress={() => router.replace('/provider-verification')}>
            <Text>Go to Verification</Text>
          </Button>
        </View>
      </ScreenWrapper>
    );
  }

  const isLoading = checkStripeStatusMutation.isPending || stripeSetupMutation.isPending;

  return (
    <ScreenWrapper>
      {/* Header */}
      <View className="px-5 py-4 border-b border-border bg-background">
        <View className="flex-row items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onPress={() => router.back()}
          >
            <ArrowLeft size={24} className="text-foreground" />
          </Button>
          <View className="flex-1">
            <Text className="text-xl font-bold text-foreground">Payment Setup</Text>
            <Text className="text-sm text-muted-foreground">Connect your payment account</Text>
          </View>
        </View>
      </View>

      <Animated.ScrollView 
        entering={FadeIn}
        className="flex-1"
        contentContainerStyle={{ padding: 20 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Status Card */}
        <Animated.View entering={SlideInDown.delay(100).springify()}>
          <Card className={accountSetupComplete ? 'border-green-500 bg-green-50 dark:bg-green-950' : 'border-border'}>
            <CardContent className="p-4">
              <View className="flex-row items-center gap-3">
                {accountSetupComplete ? (
                  <CheckCircle size={32} className="text-green-600" />
                ) : (
                  <AlertCircle size={32} className="text-amber-600" />
                )}
                <View className="flex-1">
                  <Text className="font-semibold text-foreground mb-1">
                    {accountSetupComplete ? 'Payment Active' : 'Setup Required'}
                  </Text>
                  <Text className="text-sm text-muted-foreground">
                    {accountSetupComplete
                      ? 'Your payment account is ready to receive payments'
                      : 'Connect your account to start accepting bookings'}
                  </Text>
                </View>
              </View>
            </CardContent>
          </Card>
        </Animated.View>

        {/* Why Payment Setup? */}
        <Animated.View entering={SlideInDown.delay(200).springify()} className="mt-6">
          <Card>
            <CardHeader>
              <Text className="font-semibold text-foreground">Why do I need this?</Text>
            </CardHeader>
            <CardContent className="gap-3">
              <View className="flex-row gap-3">
                <Text className="text-foreground">💰</Text>
                <View className="flex-1">
                  <Text className="font-medium text-foreground mb-1">Accept Payments</Text>
                  <Text className="text-sm text-muted-foreground">
                    Receive payments securely from customers
                  </Text>
                </View>
              </View>
              <View className="flex-row gap-3">
                <Text className="text-foreground">⚡</Text>
                <View className="flex-1">
                  <Text className="font-medium text-foreground mb-1">Fast Payouts</Text>
                  <Text className="text-sm text-muted-foreground">
                    Get paid automatically to your bank account
                  </Text>
                </View>
              </View>
              <View className="flex-row gap-3">
                <Text className="text-foreground">🔒</Text>
                <View className="flex-1">
                  <Text className="font-medium text-foreground mb-1">Secure & Compliant</Text>
                  <Text className="text-sm text-muted-foreground">
                    Bank-level security with Stripe
                  </Text>
                </View>
              </View>
            </CardContent>
          </Card>
        </Animated.View>

        {/* Account Info (if connected) */}
        {stripeAccountId && (
          <Animated.View entering={SlideInDown.delay(300).springify()} className="mt-6">
            <Card>
              <CardHeader>
                <Text className="font-semibold text-foreground">Account Details</Text>
              </CardHeader>
              <CardContent className="gap-2">
                <View className="flex-row justify-between items-center">
                  <Text className="text-muted-foreground">Account ID</Text>
                  <Text className="font-mono text-sm text-foreground">{stripeAccountId}</Text>
                </View>
                <View className="flex-row justify-between items-center">
                  <Text className="text-muted-foreground">Status</Text>
                  <Text className={`font-medium ${accountSetupComplete ? 'text-green-600' : 'text-amber-600'}`}>
                    {accountSetupComplete ? 'Active' : 'Pending'}
                  </Text>
                </View>
              </CardContent>
            </Card>
          </Animated.View>
        )}

        {/* Security Notice */}
        <Animated.View entering={SlideInDown.delay(400).springify()} className="mt-6">
          <Card className="border-muted bg-muted/50">
            <CardContent className="p-4">
              <Text className="text-xs text-muted-foreground text-center">
                🔒 Powered by Stripe. Your banking information is never stored on our servers.
              </Text>
            </CardContent>
          </Card>
        </Animated.View>

        <View className="h-32" />
      </Animated.ScrollView>

      {/* Fixed Bottom CTA */}
      <View className="px-5 pb-6 pt-4 bg-background border-t border-border">
        {accountSetupComplete ? (
          <Animated.View entering={SlideInDown.delay(500).springify()} className="gap-3">
            <Button
              size="lg"
              variant="outline"
              onPress={() => checkStripeStatusMutation.mutate({ showSuccessOnChange: false })}
              disabled={isLoading}
            >
              <Text className="font-semibold">
                {isLoading ? 'Checking...' : 'Refresh Status'}
              </Text>
            </Button>
            <Button
              size="lg"
              onPress={() => router.replace('/(tabs)/provider' as any)}
            >
              <Text className="font-semibold text-primary-foreground">
                Return to Dashboard
              </Text>
            </Button>
          </Animated.View>
        ) : (
          <Animated.View entering={SlideInDown.delay(500).springify()} className="gap-3">
            <Button
              size="lg"
              onPress={() => stripeSetupMutation.mutate()}
              disabled={isLoading}
            >
              <Text className="font-semibold text-primary-foreground">
                {isLoading ? 'Loading...' : stripeAccountId ? 'Continue Setup' : 'Connect Payment Account'}
              </Text>
            </Button>
            {stripeAccountId && (
              <Button
                size="lg"
                variant="outline"
                onPress={() => checkStripeStatusMutation.mutate({ showSuccessOnChange: true })}
                disabled={isLoading}
              >
                <Text className="font-semibold">
                  Check Status
                </Text>
              </Button>
            )}
          </Animated.View>
        )}
      </View>
    </ScreenWrapper>
  );
}

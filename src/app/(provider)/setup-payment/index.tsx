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
import { useAuthStore } from '@/stores/auth';
import { usePaymentSetupStore } from '@/stores/verification/usePaymentSetupStore';
import { CheckCircle, AlertCircle, CreditCard, Zap, Lock, Info } from 'lucide-react-native';
import { Icon } from '@/components/ui/icon';

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
  const user = useAuthStore((state) => state.user);
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
      // TEST: Check Stripe configuration first
      console.log('[PaymentSetup] Testing Stripe configuration...')
      const { data: configData, error: configError } = await supabase.functions.invoke('stripe-config-check', {})
      
      if (configError) {
        console.error('[PaymentSetup] Config check error:', configError)
      } else {
        console.log('[PaymentSetup] Stripe config response:', configData)
      }

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
      const { data, error } = await supabase.functions.invoke('create-stripe-account', {
        body: { 
          userId,
          returnUrl: 'zova://provider/setup-payment', // Proper deep link from app.json
          refreshUrl: 'zova://provider/setup-payment'
        }
      });

      if (error) {
        console.error('[PaymentSetup] Error creating Stripe link:', error);
        
        // Try to extract the actual error response
        let errorMessage = error?.message || 'Unknown error';
        let errorDetails = null;
        
        try {
          if (error?.context?._bodyBlob?._data) {
            const bodyData = error.context._bodyBlob._data;
            if (Array.isArray(bodyData)) {
              const decoder = new TextDecoder();
              const text = decoder.decode(new Uint8Array(bodyData));
              errorDetails = JSON.parse(text);
              errorMessage = errorDetails?.error || errorDetails?.message || errorMessage;
            }
          }
        } catch (parseErr) {
          console.warn('[PaymentSetup] Could not parse error response');
        }
        
        console.error('[PaymentSetup] Error details:', {
          message: errorMessage,
          status: error?.status,
          errorBody: errorDetails,
          constructor: error?.constructor?.name
        });
        throw new Error(errorMessage);
      }

      if (!data?.url) {
        console.error('[PaymentSetup] No URL in response. Data:', data);
        throw new Error('No Stripe Connect URL returned');
      }

      console.log('[PaymentSetup] Stripe Connect link created:', data.url);
      console.log('[PaymentSetup] Desktop URL:', data.desktopUrl);
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
          <Icon as={AlertCircle} size={64} className="text-destructive mb-4" />
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
        contentContainerStyle={{ paddingVertical: 8, paddingBottom: 40 }}
      >
        <View className="px-4 gap-6">
          {/* Hero Section */}
          <Animated.View entering={FadeIn}>
            <View className="relative h-48 rounded-3xl overflow-hidden -mx-4 mb-2">
              {/* Background gradient */}
              <View className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20" />
              <View className="absolute top-0 right-0 w-56 h-56 bg-primary/15 rounded-full blur-3xl" />
              <View className="absolute bottom-0 left-0 w-40 h-40 bg-secondary/10 rounded-full blur-3xl" />
              
              {/* Content */}
              <View className="absolute inset-0 items-center justify-center">
                <View className="w-32 h-32 bg-primary/10 rounded-full items-center justify-center">
                  <View className="w-20 h-20 bg-primary/20 rounded-full items-center justify-center">
                    <Icon as={CreditCard} size={56} className="text-primary" />
                  </View>
                </View>
              </View>
            </View>
          </Animated.View>

          {/* Status Overview Card */}
          {!stripeAccountId && (
            <Animated.View entering={SlideInUp}>
              <Card className="border-0 bg-card">
                <CardContent className="p-6 gap-4">
                  <View className="gap-2">
                    <Text className="text-3xl font-bold text-foreground leading-tight">
                      Get Started with Payments
                    </Text>
                    <Text className="text-muted-foreground text-base leading-relaxed">
                      Connect your Stripe account in 2 minutes to start earning from bookings.
                    </Text>
                  </View>

                  {/* Status Badge Row */}
                  <View className="flex-row items-center gap-3 p-4 bg-muted/50 rounded-2xl border border-border/50">
                    <View className="w-12 h-12 bg-destructive/20 rounded-full items-center justify-center">
                      <Icon as={AlertCircle} size={24} className="text-destructive" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-foreground font-semibold mb-1">Not Connected</Text>
                      <Text className="text-muted-foreground text-xs">
                        {getStatusDescription()}
                      </Text>
                    </View>
                  </View>
                </CardContent>
              </Card>
            </Animated.View>
          )}

          {/* Setup In Progress */}
          {stripeAccountId && !accountSetupComplete && (
            <Animated.View entering={SlideInDown}>
              <Card className="border-0 bg-card">
                <CardContent className="p-6 gap-4">
                  <View className="gap-2">
                    <Text className="text-2xl font-bold text-foreground leading-tight">
                      Complete Your Setup
                    </Text>
                    <Text className="text-muted-foreground text-base leading-relaxed">
                      Finish verifying your information with Stripe to activate payments.
                    </Text>
                  </View>

                  {/* Status Badge Row */}
                  <View className="flex-row items-center gap-3 p-4 bg-secondary/10 rounded-2xl border border-secondary/25">
                    <View className="w-12 h-12 bg-secondary/20 rounded-full items-center justify-center">
                      <Icon as={Zap} size={24} className="text-secondary" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-foreground font-semibold mb-1">Setup In Progress</Text>
                      <Text className="text-muted-foreground text-xs">
                        {getStatusDescription()}
                      </Text>
                    </View>
                  </View>
                </CardContent>
              </Card>
            </Animated.View>
          )}

          {/* Account Active */}
          {accountSetupComplete && (
            <Animated.View entering={SlideInUp}>
              <Card className="border-0 bg-gradient-to-br from-green-500/10 to-green-500/5">
                <CardContent className="p-6 gap-4">
                  <View className="gap-2">
                    <Text className="text-2xl font-bold text-foreground leading-tight">
                      Payment Ready!
                    </Text>
                    <Text className="text-muted-foreground text-base leading-relaxed">
                      Your account is fully set up and ready to accept bookings.
                    </Text>
                  </View>

                  {/* Status Badge Row */}
                  <View className="flex-row items-center gap-3 p-4 bg-green-500/20 rounded-2xl border border-green-500/25">
                    <View className="w-12 h-12 bg-green-500/30 rounded-full items-center justify-center">
                      <Icon as={CheckCircle} size={24} className="text-green-600 dark:text-green-400" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-foreground font-semibold mb-1">Account Active</Text>
                      <Text className="text-muted-foreground text-xs">
                        {getStatusDescription()}
                      </Text>
                    </View>
                  </View>

                  {/* Account Info */}
                  <View className="gap-3 pt-3 border-t border-border">
                    <View className="flex-row items-center justify-between">
                      <Text className="text-muted-foreground text-sm">Account ID</Text>
                      <Text className="text-foreground font-mono text-sm font-semibold">
                        {stripeAccountId ? `${stripeAccountId.slice(0, 8)}...` : 'N/A'}
                      </Text>
                    </View>
                    <View className="flex-row items-center justify-between">
                      <Text className="text-muted-foreground text-sm">Status</Text>
                      <Badge className="bg-green-500/20 border-0">
                        <Text className="text-green-600 dark:text-green-400 font-semibold">Ready</Text>
                      </Badge>
                    </View>
                  </View>
                </CardContent>
              </Card>
            </Animated.View>
          )}

          {/* CTA Button */}
          {!accountSetupComplete && (
            <Animated.View entering={SlideInUp.delay(100)}>
              <Button
                size="lg"
                className="w-full h-14"
                onPress={() => stripeSetupMutation.mutate()}
                disabled={isLoading}
              >
                <View className="flex-row items-center gap-3">
                  <Icon as={CreditCard} size={20} className="text-primary-foreground" />
                  <Text className="font-bold text-primary-foreground text-base">
                    {isLoading ? 'Connecting...' : !stripeAccountId ? 'Connect Stripe Account' : 'Continue Setup'}
                  </Text>
                </View>
              </Button>
            </Animated.View>
          )}

          {accountSetupComplete && (
            <Animated.View entering={SlideInUp.delay(100)}>
              <Button
                size="lg"
                variant="outline"
                className="w-full h-14"
                onPress={() => router.replace('/(provider)')}
              >
                <Text className="font-bold text-foreground text-base">
                  Go to Dashboard
                </Text>
              </Button>
            </Animated.View>
          )}

          {/* Benefits Section */}
          <Card className="border-0 bg-card">
            <CardHeader>
              <CardTitle className="text-lg">Why Connect Stripe?</CardTitle>
            </CardHeader>
            <CardContent className="gap-4">
              {/* Benefit 1 */}
              <View className="flex-row items-start gap-4 p-4 bg-muted/50 rounded-2xl border border-border/50">
                <View className="w-12 h-12 bg-primary/20 rounded-xl items-center justify-center flex-shrink-0">
                  <Icon as={CheckCircle} size={24} className="text-primary" />
                </View>
                <View className="flex-1 gap-1">
                  <Text className="font-semibold text-foreground">Secure Payments</Text>
                  <Text className="text-muted-foreground text-sm leading-relaxed">
                    Bank-level security with industry-leading fraud protection
                  </Text>
                </View>
              </View>

              {/* Benefit 2 */}
              <View className="flex-row items-start gap-4 p-4 bg-muted/50 rounded-2xl border border-border/50">
                <View className="w-12 h-12 bg-secondary/20 rounded-xl items-center justify-center flex-shrink-0">
                  <Icon as={Zap} size={24} className="text-secondary" />
                </View>
                <View className="flex-1 gap-1">
                  <Text className="font-semibold text-foreground">Fast Payouts</Text>
                  <Text className="text-muted-foreground text-sm leading-relaxed">
                    Automatic deposits to your bank every Monday • 2-7 day delivery
                  </Text>
                </View>
              </View>

              {/* Benefit 3 */}
              <View className="flex-row items-start gap-4 p-4 bg-muted/50 rounded-2xl border border-border/50">
                <View className="w-12 h-12 bg-accent/20 rounded-xl items-center justify-center flex-shrink-0">
                  <Icon as={Lock} size={24} className="text-accent-foreground" />
                </View>
                <View className="flex-1 gap-1">
                  <Text className="font-semibold text-foreground">Compliance Ready</Text>
                  <Text className="text-muted-foreground text-sm leading-relaxed">
                    Full PCI compliance • Tax reporting • Regulatory support
                  </Text>
                </View>
              </View>
            </CardContent>
          </Card>

          {/* What's Included */}
          <Card className="border-0 bg-primary/5">
            <CardHeader>
              <CardTitle className="text-lg">What's Included in Setup</CardTitle>
            </CardHeader>
            <CardContent className="gap-3">
              <View className="gap-3">
                <View className="flex-row items-center gap-3">
                  <View className="w-6 h-6 bg-primary rounded-full items-center justify-center">
                    <Text className="text-primary-foreground text-xs font-bold">1</Text>
                  </View>
                  <Text className="text-foreground flex-1">Business information & verification</Text>
                </View>
                <View className="flex-row items-center gap-3">
                  <View className="w-6 h-6 bg-primary rounded-full items-center justify-center">
                    <Text className="text-primary-foreground text-xs font-bold">2</Text>
                  </View>
                  <Text className="text-foreground flex-1">Bank account details for payouts</Text>
                </View>
                <View className="flex-row items-center gap-3">
                  <View className="w-6 h-6 bg-primary rounded-full items-center justify-center">
                    <Text className="text-primary-foreground text-xs font-bold">3</Text>
                  </View>
                  <Text className="text-foreground flex-1">Tax identification & reporting setup</Text>
                </View>
                <View className="flex-row items-center gap-3">
                  <View className="w-6 h-6 bg-primary rounded-full items-center justify-center">
                    <Text className="text-primary-foreground text-xs font-bold">4</Text>
                  </View>
                  <Text className="text-foreground flex-1">Identity verification (takes 2-3 min)</Text>
                </View>
              </View>
              <View className="pt-4 border-t border-border">
                <Text className="text-muted-foreground text-xs leading-relaxed">
                  💡 <Text className="font-semibold">Tip:</Text> Have your business documents ready for faster setup. Most providers complete this in under 5 minutes.
                </Text>
              </View>
            </CardContent>
          </Card>

          {/* Trust Badges */}
          <View className="flex-row gap-2 justify-center px-2">
            <View className="flex-row items-center gap-2 px-3 py-2 bg-card rounded-full border border-border">
              <Icon as={Lock} size={12} className="text-primary" />
              <Text className="text-xs font-medium text-muted-foreground">Secure</Text>
            </View>
            <View className="flex-row items-center gap-2 px-3 py-2 bg-card rounded-full border border-border">
              <Icon as={CheckCircle} size={12} className="text-green-600 dark:text-green-400" />
              <Text className="text-xs font-medium text-muted-foreground">Verified</Text>
            </View>
            <View className="flex-row items-center gap-2 px-3 py-2 bg-card rounded-full border border-border">
              <Icon as={Zap} size={12} className="text-secondary" />
              <Text className="text-xs font-medium text-muted-foreground">Fast Setup</Text>
            </View>
          </View>

          {/* Footer Info */}
          <Card className="border-0 bg-muted/30">
            <CardContent className="p-4 gap-2">
              <View className="flex-row items-start gap-3">
                <Icon as={Info} size={16} className="text-muted-foreground mt-0.5 flex-shrink-0" />
                <Text className="text-muted-foreground text-xs leading-relaxed flex-1">
                  Your payment information is handled entirely by Stripe. ZOVA never has access to card or banking details. Payment processing is subject to Stripe's Terms of Service.
                </Text>
              </View>
            </CardContent>
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

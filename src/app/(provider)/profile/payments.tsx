import React from 'react';
import { View, ScrollView, Alert, Linking, TouchableOpacity, RefreshControl, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/lib/core/useColorScheme';
import { THEME } from '@/lib/theme';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/lib/supabase';
import Animated, { FadeIn, SlideInDown, SlideInUp } from 'react-native-reanimated';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { usePaymentSetupStore } from '@/stores/verification/usePaymentSetupStore';
import { useDeepLinkHandler } from '@/hooks/shared/useDeepLinkHandler';
import * as WebBrowser from 'expo-web-browser';
import { useProfile } from '@/hooks/shared/useProfileData';
import { useAuthStore } from '@/stores/auth';

interface StripeAccountStatus {
  hasStripeAccount: boolean;
  accountSetupComplete: boolean;
  details_submitted: boolean;
  charges_enabled: boolean;
  accountId?: string;
  requirements?: any;
}

export default function PaymentsScreen() {
  const { colorScheme, isDarkColorScheme } = useColorScheme();
  const colors = THEME[colorScheme];
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);

  // ✅ REACT QUERY: Fetch user profile for phone info
  const { data: profile } = useProfile(user?.id);

  console.log('[PaymentsScreen] Profile data:', {
    hasProfile: !!profile,
    hasPhone: !!profile?.phone_number,
    phone: profile?.phone_number,
    countryCode: profile?.country_code
  });

  // ✅ PURE ZUSTAND: Payment state management (replaces useState)
  const {
    stripeAccountId,
    accountSetupComplete,
    setStripeAccountId,
    setAccountSetupComplete
  } = usePaymentSetupStore();

  // ✅ WEBBROWSER SETUP: One-time initialization
  React.useEffect(() => {
    const setupWebBrowser = async () => {
      try {
        await WebBrowser.warmUpAsync();
      } catch (error) {
        console.log('[PaymentsScreen] WebBrowser warmUp not available');
      }
    };
    setupWebBrowser();

    return () => {
      WebBrowser.coolDownAsync();
    };
  }, []);

  // ✅ REACT QUERY: Stripe status fetching (replaces useState + useEffect)
  const {
    data: accountStatus,
    isLoading: checkingStatus,
    error,
    refetch
  } = useQuery({
    queryKey: ['stripe-status'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // First check database for cached status
      const { data: profile } = await supabase.from('profiles')
        .select('stripe_account_id, stripe_charges_enabled, stripe_details_submitted, stripe_account_status')
        .eq('id', user.id)
        .single();

      if (profile?.stripe_account_id) {
        // Update Zustand store with database status
        setStripeAccountId(profile.stripe_account_id);
        setAccountSetupComplete(profile.stripe_details_submitted === true && profile.stripe_charges_enabled === true);
      }

      // Then call edge function for real-time status
      const { data, error } = await supabase.functions.invoke('check-stripe-account-status');
      if (error) throw new Error('Failed to check account status');

      console.log('Stripe account status:', data);
      return data;
    },
    enabled: true, // Always enabled since this is a dedicated screen
    staleTime: 30 * 1000, // 30 seconds
  });

  // ✅ REACT QUERY MUTATION: Stripe account creation (replaces manual state management)
  const createAccountMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('create-stripe-account');
      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      return data;
    },
    onSuccess: async (data) => {
      console.log('✅ Stripe account created successfully!', data);
      queryClient.invalidateQueries({ queryKey: ['stripe-status'] });

      // ✅ FIX: Edge function returns 'url', not 'onboardingUrl'
      const onboardingUrl = data.url || data.onboardingUrl;
      
      if (onboardingUrl) {
        console.log('🔗 Opening Stripe onboarding URL:', onboardingUrl);
        
        try {
          // ✅ FIX: Use openBrowserAsync instead of Linking.openURL
          // This opens full in-app browser with all Stripe features enabled
          const result = await WebBrowser.openBrowserAsync(onboardingUrl, {
            // Full browser experience for Stripe onboarding
            presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
            toolbarColor: colors.background,
            controlsColor: colors.primary,
            showTitle: true,
            dismissButtonStyle: 'close',
            enableBarCollapsing: false,
          });

          console.log('[PaymentsScreen] WebBrowser result:', result);

          // Check if setup was completed after browser closes
          if (result.type === 'dismiss' || result.type === 'cancel') {
            console.log('[PaymentsScreen] Browser dismissed, checking status...');
            
            // Wait for Stripe webhook to process
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Refetch status to see if setup completed
            await refetch();
            
            // Check if setup is now complete
            if (accountStatus?.accountSetupComplete) {
              Alert.alert(
                '✅ Success!',
                'Your payment account is now active. You can start accepting bookings!',
                [{ text: 'OK' }]
              );
            } else {
              Alert.alert(
                'Setup In Progress',
                'Complete your payment setup to start accepting bookings.',
                [{ text: 'OK' }]
              );
            }
          }
        } catch (error) {
          console.error('[PaymentsScreen] Failed to open browser:', error);
          Alert.alert(
            'Unable to Open',
            'Could not open payment setup. Please try again or contact support.'
          );
        }
      } else {
        console.warn('⚠️ No onboarding URL in response');
        Alert.alert(
          'Setup URL Missing',
          'The Stripe account was created but no setup URL was provided. Please try again or contact support.'
        );
      }
    },
    onError: (error) => {
      console.error('❌ Failed to create Stripe account:', error);
      Alert.alert('Error', error.message || 'Failed to create Stripe account. Please try again.');
    },
  });

  // ❌ REMOVED: Disconnect functionality - users must contact support
  // Disconnecting Stripe accounts requires admin oversight due to:
  // - Pending payouts that would be orphaned
  // - Financial reconciliation requirements
  // - Stripe Terms of Service compliance
  // Users should contact support@zova.com for account disconnection

  // Handle deep links for Stripe onboarding completion
  useDeepLinkHandler({
    onStripeComplete: () => {
      console.log('🎉 Stripe onboarding completed via deep link!');
      queryClient.invalidateQueries({ queryKey: ['stripe-status'] });
    },
    onStripeRefresh: () => {
      console.log('🔄 Stripe onboarding refresh via deep link!');
      queryClient.invalidateQueries({ queryKey: ['stripe-status'] });
    }
  });

  const handleCreateAccount = () => {
    createAccountMutation.mutate();
  };

  // ❌ REMOVED: handleDeleteAccount - users must contact support for disconnection

  const handleRefresh = () => {
    refetch();
  };

  const getStatusBadge = () => {
    if (checkingStatus) return <Skeleton className="h-6 w-20" />;

    if (!accountStatus?.hasStripeAccount) {
      return <Badge variant="destructive"><Text>Not Connected</Text></Badge>;
    }

    if (accountStatus.accountSetupComplete) {
      return <Badge variant="default" style={{ backgroundColor: colors.success }}><Text>Active</Text></Badge>;
    }

    return <Badge variant="secondary"><Text>Setup Required</Text></Badge>;
  };

  const getStatusDescription = () => {
    if (checkingStatus) return 'Checking account status...';

    if (!accountStatus?.hasStripeAccount) {
      return 'Connect your Stripe account to start accepting payments from clients.';
    }

    if (accountStatus.accountSetupComplete) {
      return 'Your Stripe account is fully set up and ready to accept payments.';
    }

    return 'Complete your Stripe account setup to start receiving payments.';
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
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
            Payment Integration
          </Text>
          <View className="w-8" />
        </View>
      </View>

      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl
            refreshing={checkingStatus}
            onRefresh={handleRefresh}
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
                <CardTitle>Stripe Account Status</CardTitle>
                {getStatusBadge()}
              </View>
              <Text variant="small" className="text-muted-foreground">
                {getStatusDescription()}
              </Text>
            </CardHeader>
          </Card>

          {/* Setup Required Card */}
          {!accountStatus?.hasStripeAccount && (
            <Animated.View entering={FadeIn}>
              {/* Phone Verification Info Card */}
              <Card className="mb-4 border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
                <CardContent className="p-4">
                  <View className="flex-row items-start gap-3">
                    <View className="w-10 h-10 bg-blue-100 dark:bg-blue-900/50 rounded-full items-center justify-center">
                      <Ionicons name="information-circle" size={20} color={colors.primary} />
                    </View>
                    <View className="flex-1">
                      <Text className="font-semibold text-foreground mb-1">
                        Phone Verification Required
                      </Text>
                      <Text variant="small" className="text-muted-foreground mb-2">
                        Stripe will ask you to verify your phone number during setup for security and compliance.
                      </Text>
                      {profile?.phone_number && (
                        <View className="mt-2 p-2 bg-background/80 rounded-md">
                          <Text variant="small" className="text-muted-foreground">
                            Your registered phone:
                          </Text>
                          <Text variant="small" className="font-mono font-semibold text-foreground">
                            {profile.country_code} {profile.phone_number}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </CardContent>
              </Card>

              <Card className="mb-4">
                <CardHeader>
                  <CardTitle style={{ color: colors.warning }}>
                    Setup Required
                  </CardTitle>
                  <Text variant="small" className="text-muted-foreground">
                    Connect Stripe to accept payments from your clients
                  </Text>
                </CardHeader>
                <CardContent>
                  <Button
                    onPress={handleCreateAccount}
                    disabled={createAccountMutation.isPending}
                    className="h-12"
                  >
                    <Text className="text-primary-foreground font-semibold">
                      {createAccountMutation.isPending ? 'Creating Account...' : 'Connect Stripe Account'}
                    </Text>
                  </Button>
                </CardContent>
              </Card>
            </Animated.View>
          )}

          {/* Account Setup Card */}
          {accountStatus?.hasStripeAccount && !accountStatus.accountSetupComplete && (
            <Animated.View entering={SlideInDown}>
              {/* Phone Verification Info Card */}
              <Card className="mb-4 border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
                <CardContent className="p-4">
                  <View className="flex-row items-start gap-3">
                    <View className="w-10 h-10 bg-blue-100 dark:bg-blue-900/50 rounded-full items-center justify-center">
                      <Ionicons name="shield-checkmark" size={20} color={colors.primary} />
                    </View>
                    <View className="flex-1">
                      <Text className="font-semibold text-foreground mb-1">
                        Verification Required
                      </Text>
                      <Text variant="small" className="text-muted-foreground">
                        Stripe requires phone verification and identity documents for security compliance.
                      </Text>
                      {profile?.phone_number && (
                        <View className="mt-2 p-2 bg-background/80 rounded-md">
                          <Text variant="small" className="text-muted-foreground">
                            Have ready: {profile.country_code} {profile.phone_number}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </CardContent>
              </Card>

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
                    onPress={handleCreateAccount}
                    disabled={createAccountMutation.isPending}
                    className="h-12 mb-4"
                  >
                    <Text className="text-primary-foreground font-semibold">
                      {createAccountMutation.isPending ? 'Opening Setup...' : 'Complete Setup'}
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
          {accountStatus?.accountSetupComplete && (
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
                        {accountStatus.accountId ? `${accountStatus.accountId.slice(0, 8)}...` : 'N/A'}
                      </Text>
                    </View>

                    <View className="flex-row items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <Text variant="small" className="text-foreground font-medium">
                        Charges Enabled
                      </Text>
                      <Badge variant={accountStatus.charges_enabled ? "default" : "destructive"}>
                        <Text>{accountStatus.charges_enabled ? 'Yes' : 'No'}</Text>
                      </Badge>
                    </View>

                    <View className="flex-row items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <Text variant="small" className="text-foreground font-medium">
                        Details Submitted
                      </Text>
                      <Badge variant={accountStatus.details_submitted ? "default" : "secondary"}>
                        <Text>{accountStatus.details_submitted ? 'Yes' : 'Pending'}</Text>
                      </Badge>
                    </View>

                    {/* Support Contact for Disconnection */}
                    <View className="pt-4 border-t border-border bg-muted/30 rounded-lg p-4">
                      <View className="flex-row items-start">
                        <Ionicons name="information-circle-outline" size={20} color={colors.muted} />
                        <View className="flex-1 ml-3">
                          <Text className="text-foreground font-medium mb-1">
                            Need to Disconnect?
                          </Text>
                          <Text className="text-muted-foreground text-sm">
                            For account disconnection, please contact our support team at support@zova.com. 
                            This ensures your pending earnings are properly handled.
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                </CardContent>
              </Card>
            </Animated.View>
          )}

          {/* Requirements Card */}
          {accountStatus?.hasStripeAccount && accountStatus.requirements && (
            <Card className="mb-4">
              <CardHeader>
                <CardTitle>Account Requirements</CardTitle>
                <Text variant="small" className="text-muted-foreground">
                  Complete these requirements to enable payments
                </Text>
              </CardHeader>
              <CardContent>
                <View className="gap-2">
                  {accountStatus.requirements.currently_due?.map((req: string, index: number) => (
                    <View key={index} className="flex-row items-center">
                      <Ionicons name="warning" size={16} color={colors.warning} />
                      <Text variant="small" className="text-muted-foreground ml-2">
                        {req.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </Text>
                    </View>
                  ))}
                  {accountStatus.requirements.eventually_due?.map((req: string, index: number) => (
                    <View key={index} className="flex-row items-center">
                      <Ionicons name="time" size={16} color={colors.mutedForeground} />
                      <Text variant="small" className="text-muted-foreground ml-2">
                        {req.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </Text>
                    </View>
                  ))}
                </View>
              </CardContent>
            </Card>
          )}

          {/* Info Card */}
          <Card className="bg-muted/30">
            <CardContent className="p-4">
              <View className="flex-row items-start">
                <Ionicons name="information-circle" size={20} color={colors.mutedForeground} />
                <View className="flex-1 ml-3">
                  <Text variant="small" className="text-muted-foreground leading-relaxed">
                    <Text className="font-medium">Secure Payments:</Text>
                    {'\n'}
                    All payments are processed securely through Stripe. ZOVA never stores your payment information.
                    {'\n\n'}
                    <Text className="font-medium">Fees:</Text>
                    {'\n'}
                    Stripe charges a standard processing fee. ZOVA does not charge additional fees for payment processing.
                    {'\n\n'}
                    <Text className="font-medium">Support:</Text>
                    {'\n'}
                    Need help? Contact Stripe support or our team for assistance.
                    {'\n\n'}
                    You can modify your account settings anytime from the Stripe dashboard.
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
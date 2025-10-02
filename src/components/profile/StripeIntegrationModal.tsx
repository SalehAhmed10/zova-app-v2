import React from 'react';
import { View, ScrollView, Alert, Linking, Modal, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from '@/lib/core/useColorScheme';
import { THEME } from '@/lib/core/theme';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/lib/core/supabase';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, SlideInDown, SlideInUp } from 'react-native-reanimated';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { usePaymentSetupStore } from '@/stores/verification/usePaymentSetupStore';
import { useDeepLinkHandler } from '@/hooks/shared/useDeepLinkHandler';

interface StripeAccountStatus {
  hasStripeAccount: boolean;
  accountSetupComplete: boolean;
  details_submitted: boolean;
  charges_enabled: boolean;
  accountId?: string;
  requirements?: any;
}

interface StripeIntegrationModalProps {
  visible: boolean;
  onClose: () => void;
}

export function StripeIntegrationModal({ visible, onClose }: StripeIntegrationModalProps) {
  const { colorScheme, isDarkColorScheme } = useColorScheme();
  const queryClient = useQueryClient();
  
  // ✅ PURE ZUSTAND: Payment state management (replaces useState)
  const {
    stripeAccountId,
    accountSetupComplete,
    setStripeAccountId,
    setAccountSetupComplete
  } = usePaymentSetupStore();
  
  // ✅ REACT QUERY: Stripe status fetching (replaces useState + useEffect)
  const {
    data: accountStatus,
    isLoading: checkingStatus,
    error,
    refetch
  } = useQuery({
    queryKey: ['stripe-status', visible],
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
    enabled: visible, // Only run when modal is visible
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
    onSuccess: (data) => {
      console.log('✅ Stripe account created successfully!', data);
      queryClient.invalidateQueries({ queryKey: ['stripe-status'] });
      
      if (data.onboardingUrl) {
        console.log('🔗 Opening Stripe onboarding URL:', data.onboardingUrl);
        Linking.openURL(data.onboardingUrl).catch(() => {
          Alert.alert('Error', 'Could not open Stripe setup page');
        });
      }
    },
    onError: (error) => {
      console.error('❌ Failed to create Stripe account:', error);
      Alert.alert('Error', error.message || 'Failed to set up Stripe account');
    },
  });
  
  // ✅ REACT QUERY: Handle deep links using custom hook (eliminates useEffect)
  useDeepLinkHandler({
    onStripeComplete: refetch,
    onStripeRefresh: refetch,
  });

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
      accessibilityViewIsModal={true}
      accessibilityLabel="Stripe Integration Setup"
    >
      <SafeAreaView className="flex-1 bg-background">
        {/* Header */}
        <View className="flex-row items-center justify-between px-6 py-4 border-b border-border">
          <TouchableOpacity
            onPress={onClose}
            className="p-2 -ml-2"
            accessibilityLabel="Close Stripe integration modal"
            accessibilityRole="button"
          >
            <Ionicons
              name="close"
              size={24}
              color={isDarkColorScheme ? THEME.dark.foreground : THEME.light.foreground}
            />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-foreground flex-1 text-center mr-8">
            Payment Integration
          </Text>
          <View className="w-6" />
        </View>

        <ScrollView
          className="flex-1"
          refreshControl={
            <RefreshControl
              refreshing={checkingStatus}
              onRefresh={refetch}
              tintColor={THEME[colorScheme].primary}
              accessibilityLabel="Pull to refresh Stripe account status"
            />
          }
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          {/* Initial Loading State */}
          {checkingStatus && !accountStatus && (
            <View className="p-6">
              <Animated.View entering={FadeIn.springify()} className="items-center py-12">
                <Skeleton className="w-16 h-16 rounded-2xl mb-4" />
                <Skeleton className="h-6 w-48 mb-2" />
                <Skeleton className="h-4 w-64 mb-8" />
                <Skeleton className="h-12 w-full rounded-lg" />
              </Animated.View>
            </View>
          )}

          {/* Main Content */}
          {(!checkingStatus || accountStatus) && (
            <View className="p-6">
            {/* Header */}
            <Animated.View
              entering={FadeIn.delay(200).springify()}
              className="items-center mb-8"
            >
              <View className="w-16 h-16 bg-primary rounded-2xl justify-center items-center mb-4">
                <Text className="text-2xl">💳</Text>
              </View>
              <Text className="text-2xl font-bold text-foreground mb-2">
                Payment Integration
              </Text>
              <Text className="text-muted-foreground text-center">
                Connect your Stripe account to start receiving payments from customers
              </Text>
            </Animated.View>

            {/* Status Card */}
            <Animated.View entering={SlideInDown.delay(300).springify()} className="mb-6">
              <Card className="border-border bg-card">
                <CardHeader>
                  <CardTitle className="flex-row items-center justify-between">
                    <View className="flex-row items-center">
                      <Ionicons
                        name={accountSetupComplete ? "checkmark-circle" : checkingStatus ? "refresh-circle" : "alert-circle"}
                        size={20}
                        color={accountSetupComplete ? THEME[colorScheme].primary : checkingStatus ? THEME[colorScheme].mutedForeground : THEME[colorScheme].destructive}
                        style={{ marginRight: 8 }}
                      />
                      <Text className="text-foreground font-semibold">Account Status</Text>
                    </View>
                    {!checkingStatus && (
                      <TouchableOpacity
                        onPress={() => refetch()}
                        className="p-1"
                        accessibilityLabel="Refresh status"
                      >
                        <Ionicons
                          name="refresh"
                          size={16}
                          color={THEME[colorScheme].mutedForeground}
                        />
                      </TouchableOpacity>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {checkingStatus ? (
                    <View className="items-center py-6">
                      <Skeleton className="w-32 h-4 mb-3 bg-muted" />
                      <Skeleton className="w-24 h-4 mb-4 bg-muted" />
                      <View className="flex-row items-center gap-2">
                        <Ionicons name="refresh-circle" size={16} color={THEME[colorScheme].primary} />
                        <Text className="text-sm text-muted-foreground">Checking status...</Text>
                      </View>
                    </View>
                  ) : accountSetupComplete ? (
                    <View className="items-center py-4">
                      <Badge variant="default" className="mb-3 bg-green-100 dark:bg-green-900">
                        <Ionicons name="checkmark-circle" size={14} color={THEME[colorScheme].primary} style={{ marginRight: 4 }} />
                        <Text className="text-green-700 dark:text-green-300 font-medium">Connected</Text>
                      </Badge>
                      <Text className="text-sm text-muted-foreground text-center">
                        Your Stripe account is fully set up and ready to receive payments.
                      </Text>
                      {accountStatus?.accountId && (
                        <Text className="text-xs text-muted-foreground mt-2">
                          Account ID: {accountStatus.accountId}
                        </Text>
                      )}
                    </View>
                  ) : accountStatus?.hasStripeAccount ? (
                    <View className="items-center py-4">
                      <Badge variant="secondary" className="mb-3 bg-orange-100 dark:bg-orange-900">
                        <Ionicons name="alert-circle" size={14} color="#F59E0B" style={{ marginRight: 4 }} />
                        <Text className="text-orange-700 dark:text-orange-300 font-medium">Setup Incomplete</Text>
                      </Badge>
                      <Text className="text-sm text-muted-foreground text-center mb-3">
                        Your Stripe account exists but needs additional setup to start receiving payments.
                      </Text>
                      <View className="flex-row gap-4 w-full">
                        <View className="flex-1 items-center">
                          <Ionicons
                            name={accountStatus?.details_submitted ? "checkmark-circle" : "close-circle"}
                            size={16}
                            color={accountStatus?.details_submitted ? THEME[colorScheme].primary : THEME[colorScheme].destructive}
                          />
                          <Text className="text-xs text-muted-foreground mt-1">Details</Text>
                        </View>
                        <View className="flex-1 items-center">
                          <Ionicons
                            name={accountStatus?.charges_enabled ? "checkmark-circle" : "close-circle"}
                            size={16}
                            color={accountStatus?.charges_enabled ? THEME[colorScheme].primary : THEME[colorScheme].destructive}
                          />
                          <Text className="text-xs text-muted-foreground mt-1">Charges</Text>
                        </View>
                      </View>
                    </View>
                  ) : (
                    <View className="items-center py-4">
                      <Badge variant="outline" className="mb-3">
                        <Ionicons name="link" size={14} color={THEME[colorScheme].mutedForeground} style={{ marginRight: 4 }} />
                        <Text className="text-muted-foreground font-medium">Not Connected</Text>
                      </Badge>
                      <Text className="text-sm text-muted-foreground text-center">
                        Connect your Stripe account to start receiving payments from customers.
                      </Text>
                    </View>
                  )}
                </CardContent>
              </Card>
            </Animated.View>

            {/* Stripe Features */}
            <Animated.View entering={SlideInDown.delay(400).springify()} className="mb-6">
              <Text className="text-lg font-semibold text-foreground mb-4">
                Why Choose Stripe?
              </Text>
              <View className="gap-4">
                <View className="flex-row items-start gap-3 p-3 bg-card border border-border rounded-lg">
                  <View className="w-8 h-8 bg-primary/10 rounded-full items-center justify-center">
                    <Ionicons name="shield-checkmark" size={16} color={THEME[colorScheme].primary} />
                  </View>
                  <View className="flex-1">
                    <Text className="font-medium text-foreground mb-1">Bank-Level Security</Text>
                    <Text className="text-sm text-muted-foreground leading-5">
                      Industry-leading security with PCI DSS compliance and instant payment processing
                    </Text>
                  </View>
                </View>

                <View className="flex-row items-start gap-3 p-3 bg-card border border-border rounded-lg">
                  <View className="w-8 h-8 bg-primary/10 rounded-full items-center justify-center">
                    <Ionicons name="cash" size={16} color={THEME[colorScheme].primary} />
                  </View>
                  <View className="flex-1">
                    <Text className="font-medium text-foreground mb-1">Automatic Payouts</Text>
                    <Text className="text-sm text-muted-foreground leading-5">
                      Get paid weekly or daily directly to your bank account with no extra fees
                    </Text>
                  </View>
                </View>

                <View className="flex-row items-start gap-3 p-3 bg-card border border-border rounded-lg">
                  <View className="w-8 h-8 bg-primary/10 rounded-full items-center justify-center">
                    <Ionicons name="bar-chart" size={16} color={THEME[colorScheme].primary} />
                  </View>
                  <View className="flex-1">
                    <Text className="font-medium text-foreground mb-1">Detailed Analytics</Text>
                    <Text className="text-sm text-muted-foreground leading-5">
                      Track earnings, payment history, and customer insights in real-time
                    </Text>
                  </View>
                </View>

                <View className="flex-row items-start gap-3 p-3 bg-card border border-border rounded-lg">
                  <View className="w-8 h-8 bg-primary/10 rounded-full items-center justify-center">
                    <Ionicons name="globe" size={16} color={THEME[colorScheme].primary} />
                  </View>
                  <View className="flex-1">
                    <Text className="font-medium text-foreground mb-1">Global Payments</Text>
                    <Text className="text-sm text-muted-foreground leading-5">
                      Accept payments from customers worldwide in multiple currencies
                    </Text>
                  </View>
                </View>
              </View>
            </Animated.View>

            {/* Setup Button */}
            <Animated.View entering={SlideInDown.delay(600).springify()} className="mb-6">
              {!accountSetupComplete && (
                <View className="gap-3">
                  <Button
                    size="lg"
                    onPress={() => createAccountMutation.mutate()}
                    disabled={createAccountMutation.isPending || checkingStatus}
                    className="w-full"
                    accessibilityLabel={
                      createAccountMutation.isPending
                        ? "Setting up Stripe account, please wait"
                        : accountStatus?.hasStripeAccount
                        ? "Complete Stripe account setup"
                        : "Connect new Stripe account"
                    }
                    accessibilityRole="button"
                    accessibilityState={{
                      disabled: createAccountMutation.isPending || checkingStatus,
                      busy: createAccountMutation.isPending
                    }}
                  >
                    <View className="flex-row items-center justify-center gap-2">
                      {createAccountMutation.isPending ? (
                        <>
                          <Ionicons name="refresh-circle" size={18} color="white" />
                          <Text className="font-semibold text-primary-foreground">
                            Setting up account...
                          </Text>
                        </>
                      ) : accountStatus?.hasStripeAccount ? (
                        <>
                          <Ionicons name="create" size={18} color="white" />
                          <Text className="font-semibold text-primary-foreground">
                            Complete Setup
                          </Text>
                        </>
                      ) : (
                        <>
                          <Ionicons name="link" size={18} color="white" />
                          <Text className="font-semibold text-primary-foreground">
                            Connect Stripe Account
                          </Text>
                        </>
                      )}
                    </View>
                  </Button>

                  {accountStatus?.hasStripeAccount && !accountSetupComplete && (
                    <Text className="text-xs text-muted-foreground text-center">
                      Complete the setup process in Stripe to start receiving payments
                    </Text>
                  )}
                </View>
              )}

              {accountSetupComplete && (
                <View className="items-center gap-3">
                  <View className="flex-row items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                    <Ionicons name="checkmark-circle" size={20} color={THEME[colorScheme].primary} />
                    <Text className="text-green-700 dark:text-green-300 font-medium">
                      Payment integration is active
                    </Text>
                  </View>
                  <Button
                    variant="outline"
                    size="sm"
                    onPress={() => refetch()}
                    disabled={checkingStatus}
                    className="flex-row items-center gap-2"
                    accessibilityLabel={checkingStatus ? "Refreshing status, please wait" : "Refresh Stripe account status"}
                    accessibilityRole="button"
                    accessibilityState={{
                      disabled: checkingStatus,
                      busy: checkingStatus
                    }}
                  >
                    <Ionicons name="refresh" size={16} color={THEME[colorScheme].primary} />
                    <Text className="text-primary">Refresh Status</Text>
                  </Button>
                </View>
              )}
            </Animated.View>

            {/* Error Message */}
            {error && (
              <Animated.View entering={SlideInUp.springify()}>
                <Card className="mb-6 border-destructive bg-destructive/5">
                  <CardContent className="pt-4">
                    <View className="flex-row items-start gap-3">
                      <Ionicons name="alert-circle" size={20} color={THEME[colorScheme].destructive} />
                      <View className="flex-1">
                        <Text className="text-destructive font-medium mb-1">Connection Error</Text>
                        <Text className="text-destructive text-sm leading-5">
                          {error.message || 'Unable to check Stripe account status. Please try again.'}
                        </Text>
                        <TouchableOpacity
                          onPress={() => refetch()}
                          className="mt-3 flex-row items-center gap-1"
                          accessibilityLabel="Retry connection"
                        >
                          <Ionicons name="refresh" size={14} color={THEME[colorScheme].destructive} />
                          <Text className="text-destructive text-sm font-medium">Try Again</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </CardContent>
                </Card>
              </Animated.View>
            )}

            {/* Success Message for Account Creation */}
            {createAccountMutation.isSuccess && !accountSetupComplete && (
              <Animated.View entering={SlideInUp.springify()}>
                <Card className="mb-6 border-green-500 bg-green-50 dark:bg-green-900/20">
                  <CardContent className="pt-4">
                    <View className="flex-row items-start gap-3">
                      <Ionicons name="checkmark-circle" size={20} color={THEME[colorScheme].primary} />
                      <View className="flex-1">
                        <Text className="text-green-700 dark:text-green-300 font-medium mb-1">
                          Account Created Successfully
                        </Text>
                        <Text className="text-green-600 dark:text-green-400 text-sm leading-5">
                          Complete the setup in Stripe to start receiving payments. You'll be redirected to Stripe's secure onboarding process.
                        </Text>
                      </View>
                    </View>
                  </CardContent>
                </Card>
              </Animated.View>
            )}

            {/* Info Text */}
            <Animated.View entering={FadeIn.delay(800)} className="mt-8">
              <Text className="text-xs text-muted-foreground text-center">
                Stripe handles all payment processing securely. You'll only pay Stripe's standard fees.
                {'\n\n'}
                You can modify your account settings anytime from the Stripe dashboard.
              </Text>
            </Animated.View>
          </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
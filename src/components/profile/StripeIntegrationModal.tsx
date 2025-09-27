import React from 'react';
import { View, ScrollView, Alert, Linking, Modal, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from '@/lib/core/useColorScheme';
import { THEME } from '@/lib/core/theme';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/core/supabase';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
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
  const { isDarkColorScheme } = useColorScheme();
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
      onRequestClose={onClose}
    >
      <SafeAreaView className="flex-1 bg-background">
        {/* Header */}
        <View className="flex-row items-center justify-between px-6 py-4 border-b border-border">
          <TouchableOpacity onPress={onClose}>
            <Ionicons
              name="close"
              size={24}
              color={isDarkColorScheme ? THEME.dark.foreground : THEME.light.foreground}
            />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-foreground">Payment Integration</Text>
          <View className="w-6" />
        </View>

        <ScrollView className="flex-1">
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
              <Card>
                <CardHeader>
                  <CardTitle className="flex-row items-center">
                    <Ionicons
                      name={accountSetupComplete ? "checkmark-circle" : "alert-circle"}
                      size={20}
                      color={accountSetupComplete ? "#10B981" : "#F59E0B"}
                      style={{ marginRight: 8 }}
                    />
                    Account Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {checkingStatus ? (
                    <View className="items-center py-4">
                      <Text className="text-sm text-muted-foreground mb-2">Checking status...</Text>
                      <View className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    </View>
                  ) : accountSetupComplete ? (
                    <View>
                      <Text className="text-green-600 font-semibold mb-2">
                        ✅ Stripe Account Connected
                      </Text>
                      <Text className="text-sm text-muted-foreground">
                        Your account is fully set up and ready to receive payments.
                      </Text>
                    </View>
                  ) : accountStatus?.hasStripeAccount ? (
                    <View>
                      <Text className="text-orange-600 font-semibold mb-2">
                        ⚠️ Setup Incomplete
                      </Text>
                      <Text className="text-sm text-muted-foreground mb-2">
                        Your Stripe account exists but needs additional setup.
                      </Text>
                      <Text className="text-xs text-muted-foreground">
                        Details submitted: {accountStatus?.details_submitted ? 'Yes' : 'No'}
                        {' • '}
                        Charges enabled: {accountStatus?.charges_enabled ? 'Yes' : 'No'}
                      </Text>
                    </View>
                  ) : (
                    <View>
                      <Text className="text-blue-600 font-semibold mb-2">
                        🔗 Not Connected
                      </Text>
                      <Text className="text-sm text-muted-foreground">
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
                Why Stripe?
              </Text>
              <View className="space-y-3">
                <View className="flex-row items-start gap-3">
                  <View className="w-6 h-6 bg-accent rounded-full items-center justify-center mt-0.5">
                    <Text className="text-accent-foreground text-xs font-bold">✓</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="font-medium text-foreground">Fast & Secure Payments</Text>
                    <Text className="text-sm text-muted-foreground">
                      Industry-leading security with instant payment processing
                    </Text>
                  </View>
                </View>

                <View className="flex-row items-start gap-3">
                  <View className="w-6 h-6 bg-accent rounded-full items-center justify-center mt-0.5">
                    <Text className="text-accent-foreground text-xs font-bold">✓</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="font-medium text-foreground">Automatic Payouts</Text>
                    <Text className="text-sm text-muted-foreground">
                      Get paid weekly directly to your bank account
                    </Text>
                  </View>
                </View>

                <View className="flex-row items-start gap-3">
                  <View className="w-6 h-6 bg-accent rounded-full items-center justify-center mt-0.5">
                    <Text className="text-accent-foreground text-xs font-bold">✓</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="font-medium text-foreground">Detailed Analytics</Text>
                    <Text className="text-sm text-muted-foreground">
                      Track your earnings and payment history
                    </Text>
                  </View>
                </View>
              </View>
            </Animated.View>

            {/* Setup Button */}
            <Animated.View entering={SlideInDown.delay(600).springify()} className="mb-6">
              {!accountSetupComplete && (
                <Button
                  size="lg"
                  onPress={() => createAccountMutation.mutate()}
                  disabled={createAccountMutation.isPending}
                  className="w-full"
                >
                  <Text className="font-semibold text-primary-foreground">
                    {createAccountMutation.isPending ? 'Setting up...' : accountStatus?.hasStripeAccount ? 'Complete Setup' : 'Connect Stripe Account'}
                  </Text>
                </Button>
              )}
            </Animated.View>

            {/* Error Message */}
            {error && (
              <Animated.View entering={FadeIn.delay(600)}>
                <Card className="mb-6 border-destructive">
                  <CardContent className="pt-4">
                    <Text className="text-destructive text-sm">{error.message}</Text>
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
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
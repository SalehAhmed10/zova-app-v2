import React, { useEffect, useState } from 'react';
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
  const [loading, setLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [accountStatus, setAccountStatus] = useState<StripeAccountStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Check account status when modal opens
  useEffect(() => {
    if (visible) {
      checkStripeAccountStatus();
    }
  }, [visible]);

  // Handle deep links when returning from Stripe onboarding
  useEffect(() => {
    const handleDeepLink = (event: { url: string }) => {
      const url = event.url;
      if (url.includes('stripe=complete') || url.includes('stripe=refresh')) {
        console.log('Returned from Stripe onboarding, refreshing status...');
        // Small delay to allow Stripe to process the onboarding completion
        setTimeout(() => {
          checkStripeAccountStatus(true);
        }, 2000);
      }
    };

    // Add event listener for deep links
    const subscription = Linking.addEventListener('url', handleDeepLink);

    return () => {
      subscription?.remove();
    };
  }, []);

  const checkStripeAccountStatus = async (silent = false) => {
    try {
      if (!silent) {
        setCheckingStatus(true);
      }
      setError(null);

      // First check database for any cached Stripe status
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from('profiles')
          .select('stripe_account_id, stripe_charges_enabled, stripe_details_submitted, stripe_account_status')
          .eq('id', user.id)
          .single();

        if (profile?.stripe_account_id) {
          // Update local store with database status
          const accountData = {
            stripeAccountId: profile.stripe_account_id,
            accountSetupComplete: profile.stripe_details_submitted === true && profile.stripe_charges_enabled === true,
          };
        }
      }

      // Then call the edge function to check actual Stripe account status
      const { data, error } = await supabase.functions.invoke('check-stripe-account-status');

      if (error) {
        console.error('Error checking Stripe status:', error);
        setError('Failed to check account status');
        return;
      }

      console.log('Stripe account status:', data);
      setAccountStatus(data);
    } catch (err) {
      console.error('Error checking Stripe status:', err);
      setError('Failed to check account status');
    } finally {
      setCheckingStatus(false);
    }
  };

  const handleStripeSetup = async () => {
    setLoading(true);
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'You must be logged in to set up payments');
        return;
      }

      // First check if user already has a Stripe account
      const { data: profile } = await supabase
        .from('profiles')
        .select('stripe_account_id')
        .eq('id', user.id)
        .single();

      console.log('Setting up Stripe account...');

      // Always use the edge function to create/get onboarding URL
      // This ensures proper account link generation for both new and existing accounts
      const { data, error } = await supabase.functions.invoke('create-stripe-account', {
        body: {
          userId: user.id,
          refreshUrl: 'zova://provider/profile', // Deep link back to profile
          returnUrl: 'zova://provider/profile'   // Deep link back to profile
        }
      });

      if (error) {
        console.error('Error creating Stripe account:', error);
        setError(error.message || 'Failed to create Stripe account');
        return;
      }

      console.log('Stripe account creation response:', data);

      if (data.error) {
        setError(data.error);
        return;
      }

      if (data.accountSetupComplete) {
        // Account is already fully set up
        Alert.alert(
          'Account Already Set Up',
          'Your Stripe account is already fully configured and ready to receive payments.',
          [{ text: 'OK' }]
        );

        // Update local state to reflect completion
        const accountData = {
          stripeAccountId: data.accountId,
          accountSetupComplete: true,
        };

        // Update database with latest Stripe status
        if (user) {
          await supabase.from('profiles').update({
            stripe_charges_enabled: data.charges_enabled,
            stripe_details_submitted: data.details_submitted,
            stripe_account_status: data.charges_enabled ? 'active' : 'pending',
            updated_at: new Date().toISOString()
          }).eq('id', user.id);
        }

        // Only complete the step if account is actually set up
        if (data.accountSetupComplete) {
          setAccountStatus(prev => prev ? { ...prev, accountSetupComplete: true } : null);
        }
      } else if (data.accountLink) {
        // Open Stripe onboarding in browser
        console.log('Opening Stripe onboarding URL:', data.accountLink);
        await Linking.openURL(data.accountLink);
      } else {
        setError('No onboarding URL received from Stripe');
      }
    } catch (err) {
      console.error('Error setting up Stripe account:', err);
      setError('Failed to set up Stripe account');
    } finally {
      setLoading(false);
    }
  };

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
                      name={accountStatus?.accountSetupComplete ? "checkmark-circle" : "alert-circle"}
                      size={20}
                      color={accountStatus?.accountSetupComplete ? "#10B981" : "#F59E0B"}
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
                  ) : accountStatus?.accountSetupComplete ? (
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
                        Details submitted: {accountStatus.details_submitted ? 'Yes' : 'No'}
                        {' • '}
                        Charges enabled: {accountStatus.charges_enabled ? 'Yes' : 'No'}
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
              {!accountStatus?.accountSetupComplete && (
                <Button
                  size="lg"
                  onPress={handleStripeSetup}
                  disabled={loading}
                  className="w-full"
                >
                  <Text className="font-semibold text-primary-foreground">
                    {loading ? 'Setting up...' : accountStatus?.hasStripeAccount ? 'Complete Setup' : 'Connect Stripe Account'}
                  </Text>
                </Button>
              )}
            </Animated.View>

            {/* Error Message */}
            {error && (
              <Animated.View entering={FadeIn.delay(600)}>
                <Card className="mb-6 border-destructive">
                  <CardContent className="pt-4">
                    <Text className="text-destructive text-sm">{error}</Text>
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
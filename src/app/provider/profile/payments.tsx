import React from 'react';
import { View, ScrollView, Alert, Linking, TouchableOpacity, RefreshControl, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/lib/core/useColorScheme';
import { THEME } from '@/lib/core/theme';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/lib/core/supabase';
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

export default function PaymentsScreen() {
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
    onSuccess: (data) => {
      console.log('✅ Stripe account created successfully!', data);
      queryClient.invalidateQueries({ queryKey: ['stripe-status'] });

      if (data.onboardingUrl) {
        console.log('🔗 Opening Stripe onboarding URL:', data.onboardingUrl);
        Linking.openURL(data.onboardingUrl).catch(() => {
          Alert.alert('Error', 'Failed to open Stripe onboarding. Please try again.');
        });
      }
    },
    onError: (error) => {
      console.error('❌ Failed to create Stripe account:', error);
      Alert.alert('Error', error.message || 'Failed to create Stripe account. Please try again.');
    },
  });

  // ✅ REACT QUERY MUTATION: Stripe account deletion (replaces manual state management)
  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('delete-stripe-account');
      if (error) throw error;

      return data;
    },
    onSuccess: () => {
      console.log('✅ Stripe account deleted successfully!');
      queryClient.invalidateQueries({ queryKey: ['stripe-status'] });
      setStripeAccountId(null);
      setAccountSetupComplete(false);
    },
    onError: (error) => {
      console.error('❌ Failed to delete Stripe account:', error);
      Alert.alert('Error', 'Failed to delete Stripe account. Please try again.');
    },
  });

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

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Stripe Account',
      'Are you sure you want to delete your Stripe account? This will disable payment processing for your business.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteAccountMutation.mutate() },
      ]
    );
  };

  const handleRefresh = () => {
    refetch();
  };

  const getStatusBadge = () => {
    if (checkingStatus) return <Skeleton className="h-6 w-20" />;

    if (!accountStatus?.hasStripeAccount) {
      return <Badge variant="destructive"><Text>Not Connected</Text></Badge>;
    }

    if (accountStatus.accountSetupComplete) {
      return <Badge variant="default" className="bg-green-500"><Text>Active</Text></Badge>;
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
      <View className="flex-row items-center justify-between p-4 border-b border-border">
        <Pressable onPress={() => router.back()} className="p-2">
          <Ionicons name="arrow-back" size={24} color={THEME[colorScheme].foreground} />
        </Pressable>
        <Text variant="h4" className="text-foreground font-bold">
          Payment Integration
        </Text>
        <View className="w-10" />
      </View>

      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl
            refreshing={checkingStatus}
            onRefresh={handleRefresh}
            tintColor={THEME[colorScheme].primary}
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
              <Card className="mb-4">
                <CardHeader>
                  <CardTitle className="text-orange-600 dark:text-orange-400">
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

                    <View className="pt-4 border-t border-border">
                      <Button
                        variant="outline"
                        onPress={handleDeleteAccount}
                        disabled={deleteAccountMutation.isPending}
                        className="h-10 border-red-200 dark:border-red-800"
                      >
                        <Text className="text-red-600 dark:text-red-400 font-medium">
                          {deleteAccountMutation.isPending ? 'Disconnecting...' : 'Disconnect Account'}
                        </Text>
                      </Button>
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
                      <Ionicons name="warning" size={16} color={THEME[colorScheme].warning} />
                      <Text variant="small" className="text-muted-foreground ml-2">
                        {req.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </Text>
                    </View>
                  ))}
                  {accountStatus.requirements.eventually_due?.map((req: string, index: number) => (
                    <View key={index} className="flex-row items-center">
                      <Ionicons name="time" size={16} color={THEME[colorScheme].mutedForeground} />
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
                <Ionicons name="information-circle" size={20} color={THEME[colorScheme].mutedForeground} />
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
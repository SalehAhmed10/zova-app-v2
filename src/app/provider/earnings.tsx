import React, { useState, useEffect } from 'react';
import { View, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Text } from '@/components/ui/text';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

interface EarningsData {
  totalEarnings: number;
  thisMonth: number;
  pendingPayouts: number;
  completedBookings: number;
  nextPayoutDate: string;
}

interface PayoutHistoryItem {
  id: string;
  amount: number;
  status: string;
  expected_payout_date: string;
  actual_payout_date?: string;
  booking_id: string;
}

export default function ProviderEarningsScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [earnings, setEarnings] = useState<EarningsData>({
    totalEarnings: 0,
    thisMonth: 0,
    pendingPayouts: 0,
    completedBookings: 0,
    nextPayoutDate: 'N/A'
  });
  const [payoutHistory, setPayoutHistory] = useState<PayoutHistoryItem[]>([]);
  const [stripeStatus, setStripeStatus] = useState<any>(null);

  useEffect(() => {
    loadEarningsData();
    checkStripeStatus();
  }, []);

  const loadEarningsData = async () => {
    if (!user?.id) return;

    try {
      // Get provider payouts
      const { data: payouts, error: payoutsError } = await supabase
        .from('provider_payouts')
        .select('*')
        .eq('provider_id', user.id)
        .order('created_at', { ascending: false });

      if (payoutsError) throw payoutsError;

      // Get completed bookings count
      const { count: bookingsCount } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('provider_id', user.id)
        .eq('status', 'completed');

      if (payouts) {
        const totalEarnings = payouts
          .filter(p => p.status === 'paid')
          .reduce((sum, p) => sum + p.amount, 0);

        const thisMonth = payouts
          .filter(p => {
            const payoutDate = new Date(p.created_at);
            const now = new Date();
            return payoutDate.getMonth() === now.getMonth() && 
                   payoutDate.getFullYear() === now.getFullYear() &&
                   p.status === 'paid';
          })
          .reduce((sum, p) => sum + p.amount, 0);

        const pendingAmount = payouts
          .filter(p => p.status === 'pending' || p.status === 'processing')
          .reduce((sum, p) => sum + p.amount, 0);

        // Calculate next payout date (next Monday)
        const nextMonday = getNextMonday();

        setEarnings({
          totalEarnings,
          thisMonth,
          pendingPayouts: pendingAmount,
          completedBookings: bookingsCount || 0,
          nextPayoutDate: nextMonday.toLocaleDateString()
        });

        setPayoutHistory(payouts.slice(0, 10)); // Last 10 payouts
      }
    } catch (error) {
      console.error('Error loading earnings data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const checkStripeStatus = async () => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('stripe_account_id, stripe_charges_enabled, stripe_details_submitted')
        .eq('id', user?.id)
        .single();

      if (profile?.stripe_account_id) {
        const { data } = await supabase.functions.invoke('check-stripe-account-status', {
          body: { account_id: profile.stripe_account_id }
        });
        setStripeStatus(data);
      }
    } catch (error) {
      console.error('Error checking Stripe status:', error);
    }
  };

  const getNextMonday = () => {
    const today = new Date();
    const daysUntilMonday = (7 - today.getDay() + 1) % 7;
    const nextMonday = new Date(today);
    nextMonday.setDate(today.getDate() + (daysUntilMonday === 0 ? 7 : daysUntilMonday));
    return nextMonday;
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadEarningsData();
    checkStripeStatus();
  };

  const formatCurrency = (amount: number) => {
    return `£${amount.toFixed(2)}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'text-green-600';
      case 'pending': return 'text-yellow-600';
      case 'processing': return 'text-blue-600';
      case 'failed': return 'text-red-600';
      default: return 'text-muted-foreground';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'paid': return 'Paid';
      case 'pending': return 'Pending';
      case 'processing': return 'Processing';
      case 'failed': return 'Failed';
      default: return status;
    }
  };

  const isStripeReady = stripeStatus?.charges_enabled && stripeStatus?.details_submitted;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-6 py-4 border-b border-border">
        <TouchableOpacity onPress={() => router.back()}>
          <Text className="text-lg">←</Text>
        </TouchableOpacity>
        <Text className="text-lg font-semibold text-foreground">Earnings</Text>
        <View className="w-6" />
      </View>

      <ScrollView 
        className="flex-1"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View className="p-6 space-y-6">
          {/* Stripe Status Alert */}
          {!isStripeReady && (
            <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20">
              <CardContent className="p-4">
                <Text className="text-yellow-800 dark:text-yellow-200 font-medium mb-2">
                  ⚠️ Payment Setup Required
                </Text>
                <Text className="text-yellow-700 dark:text-yellow-300 text-sm mb-3">
                  Complete your Stripe account setup to receive payments from customers.
                </Text>
                <Button
                  size="sm"
                  onPress={() => router.push('/provider-verification/payment')}
                  className="self-start"
                >
                  <Text className="text-primary-foreground font-medium">Complete Setup</Text>
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Earnings Overview */}
          <View className="grid grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-4">
                <Text className="text-sm text-muted-foreground">Total Earnings</Text>
                <Text className="text-2xl font-bold text-foreground">
                  {formatCurrency(earnings.totalEarnings)}
                </Text>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <Text className="text-sm text-muted-foreground">This Month</Text>
                <Text className="text-2xl font-bold text-foreground">
                  {formatCurrency(earnings.thisMonth)}
                </Text>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <Text className="text-sm text-muted-foreground">Pending Payouts</Text>
                <Text className="text-2xl font-bold text-yellow-600">
                  {formatCurrency(earnings.pendingPayouts)}
                </Text>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <Text className="text-sm text-muted-foreground">Completed Bookings</Text>
                <Text className="text-2xl font-bold text-foreground">
                  {earnings.completedBookings}
                </Text>
              </CardContent>
            </Card>
          </View>

          {/* Next Payout Info */}
          <Card>
            <CardHeader>
              <CardTitle>Next Payout</CardTitle>
            </CardHeader>
            <CardContent>
              <View className="flex-row items-center justify-between">
                <View>
                  <Text className="text-sm text-muted-foreground">Scheduled for</Text>
                  <Text className="text-lg font-semibold text-foreground">
                    {earnings.nextPayoutDate}
                  </Text>
                </View>
                <View className="items-end">
                  <Text className="text-sm text-muted-foreground">Amount</Text>
                  <Text className="text-lg font-semibold text-primary">
                    {formatCurrency(earnings.pendingPayouts)}
                  </Text>
                </View>
              </View>
              <Text className="text-xs text-muted-foreground mt-2">
                Payouts are processed every Monday. Funds typically arrive in 2-7 business days.
              </Text>
            </CardContent>
          </Card>

          {/* Payout History */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Payouts</CardTitle>
            </CardHeader>
            <CardContent>
              {payoutHistory.length > 0 ? (
                <View className="space-y-3">
                  {payoutHistory.map((payout) => (
                    <View key={payout.id} className="flex-row items-center justify-between py-2 border-b border-border last:border-b-0">
                      <View className="flex-1">
                        <Text className="font-medium text-foreground">
                          {formatCurrency(payout.amount)}
                        </Text>
                        <Text className="text-sm text-muted-foreground">
                          {new Date(payout.expected_payout_date || payout.actual_payout_date || '').toLocaleDateString()}
                        </Text>
                      </View>
                      <Text className={`text-sm font-medium ${getStatusColor(payout.status)}`}>
                        {getStatusText(payout.status)}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text className="text-center text-muted-foreground py-4">
                  No payouts yet. Complete bookings to start earning!
                </Text>
              )}
            </CardContent>
          </Card>

          {/* Commission Info */}
          <Card>
            <CardHeader>
              <CardTitle>How Earnings Work</CardTitle>
            </CardHeader>
            <CardContent>
              <View className="space-y-2">
                <Text className="text-sm text-muted-foreground">
                  • You keep 85% of each booking payment
                </Text>
                <Text className="text-sm text-muted-foreground">
                  • 15% platform fee covers payment processing and platform costs
                </Text>
                <Text className="text-sm text-muted-foreground">
                  • Payouts happen every Monday for completed services
                </Text>
                <Text className="text-sm text-muted-foreground">
                  • Minimum payout amount is £20
                </Text>
              </View>
            </CardContent>
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
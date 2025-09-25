import React, { useState, useEffect } from 'react';
import { View, ScrollView, RefreshControl, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Text } from '@/components/ui/text';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import {
  useProviderEarnings,
  useProviderPayouts,
  useProviderEarningsAnalytics
} from '@/hooks/useProfileData';
import { supabase } from '@/lib/supabase';
import { useColorScheme } from '@/lib/useColorScheme';
import { THEME } from '@/lib/theme';
import {
  LineChart,
  BarChart,
  PieChart,
  ProgressChart
} from 'react-native-chart-kit';

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
  const { isDarkColorScheme } = useColorScheme();
  const [refreshing, setRefreshing] = useState(false);

  // React Query hooks
  const {
    data: earnings,
    isLoading: earningsLoading,
    refetch: refetchEarnings
  } = useProviderEarnings(user?.id);

  const {
    data: payoutHistory,
    isLoading: payoutsLoading
  } = useProviderPayouts(user?.id);

  const {
    data: analytics,
    isLoading: analyticsLoading
  } = useProviderEarningsAnalytics(user?.id);

  const [stripeStatus, setStripeStatus] = useState<any>(null);

  useEffect(() => {
    checkStripeStatus();
  }, []);

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

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      refetchEarnings(),
      checkStripeStatus()
    ]);
    setRefreshing(false);
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

  // Chart configuration
  const chartConfig = {
    backgroundColor: isDarkColorScheme ? THEME.dark.background : THEME.light.background,
    backgroundGradientFrom: isDarkColorScheme ? THEME.dark.background : THEME.light.background,
    backgroundGradientTo: isDarkColorScheme ? THEME.dark.background : THEME.light.background,
    decimalPlaces: 0,
    color: (opacity = 1) => isDarkColorScheme ? `rgba(255, 255, 255, ${opacity})` : `rgba(0, 0, 0, ${opacity})`,
    labelColor: (opacity = 1) => isDarkColorScheme ? `rgba(255, 255, 255, ${opacity})` : `rgba(0, 0, 0, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '6',
      strokeWidth: '2',
      stroke: isDarkColorScheme ? THEME.dark.primary : THEME.light.primary,
    },
  };

  const screenWidth = Dimensions.get('window').width - 32; // Account for padding

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
                {earningsLoading ? (
                  <Skeleton className="w-20 h-8 mt-2" />
                ) : (
                  <Text className="text-2xl font-bold text-foreground">
                    {formatCurrency(earnings?.totalEarnings || 0)}
                  </Text>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <Text className="text-sm text-muted-foreground">This Month</Text>
                {earningsLoading ? (
                  <Skeleton className="w-20 h-8 mt-2" />
                ) : (
                  <Text className="text-2xl font-bold text-foreground">
                    {formatCurrency(earnings?.thisMonth || 0)}
                  </Text>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <Text className="text-sm text-muted-foreground">Pending Payouts</Text>
                {earningsLoading ? (
                  <Skeleton className="w-20 h-8 mt-2" />
                ) : (
                  <Text className="text-2xl font-bold text-yellow-600">
                    {formatCurrency(earnings?.pendingPayouts || 0)}
                  </Text>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <Text className="text-sm text-muted-foreground">Completed Bookings</Text>
                {earningsLoading ? (
                  <Skeleton className="w-20 h-8 mt-2" />
                ) : (
                  <Text className="text-2xl font-bold text-foreground">
                    {earnings?.completedBookings || 0}
                  </Text>
                )}
              </CardContent>
            </Card>
          </View>

          {/* Monthly Earnings Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Earnings Trend</CardTitle>
            </CardHeader>
            <CardContent>
              {analyticsLoading ? (
                <Skeleton className="w-full h-64" />
              ) : analytics?.monthlyEarnings && analytics.monthlyEarnings.length > 0 ? (
                <LineChart
                  data={{
                    labels: analytics.monthlyEarnings.map(d => d.month),
                    datasets: [{
                      data: analytics.monthlyEarnings.map(d => d.value),
                    }],
                  }}
                  width={screenWidth}
                  height={220}
                  chartConfig={chartConfig}
                  bezier
                  style={{
                    marginVertical: 8,
                    borderRadius: 16,
                  }}
                />
              ) : (
                <View className="items-center justify-center py-8">
                  <Text className="text-muted-foreground">No earnings data yet</Text>
                </View>
              )}
            </CardContent>
          </Card>

          {/* Service Performance Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Services</CardTitle>
            </CardHeader>
            <CardContent>
              {analyticsLoading ? (
                <Skeleton className="w-full h-64" />
              ) : analytics?.servicePerformance && analytics.servicePerformance.length > 0 ? (
                <BarChart
                  data={{
                    labels: analytics.servicePerformance.slice(0, 5).map(s => s.service.substring(0, 10) + (s.service.length > 10 ? '...' : '')),
                    datasets: [{
                      data: analytics.servicePerformance.slice(0, 5).map(s => s.revenue),
                    }],
                  }}
                  width={screenWidth}
                  height={220}
                  yAxisLabel="£"
                  yAxisSuffix=""
                  chartConfig={chartConfig}
                  showValuesOnTopOfBars
                  style={{
                    marginVertical: 8,
                    borderRadius: 16,
                  }}
                />
              ) : (
                <View className="items-center justify-center py-8">
                  <Text className="text-muted-foreground">No service data yet</Text>
                </View>
              )}
            </CardContent>
          </Card>

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
                    {earnings?.nextPayoutDate || 'N/A'}
                  </Text>
                </View>
                <View className="items-end">
                  <Text className="text-sm text-muted-foreground">Amount</Text>
                  <Text className="text-lg font-semibold text-primary">
                    {formatCurrency(earnings?.pendingPayouts || 0)}
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
              {payoutsLoading ? (
                <View className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="w-full h-12" />
                  ))}
                </View>
              ) : payoutHistory && payoutHistory.length > 0 ? (
                <View className="space-y-3">
                  {payoutHistory.slice(0, 10).map((payout) => (
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
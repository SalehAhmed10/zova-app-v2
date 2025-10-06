import React, { useState } from 'react';
import { View, ScrollView, RefreshControl, TouchableOpacity, Dimensions, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Text } from '@/components/ui/text';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/icon';
import {
  useAuthOptimized,
  useProviderEarnings,
  useProviderPayouts,
  useProviderEarningsAnalytics,
  useStripeAccountStatus
} from '@/hooks';
import { supabase } from '@/lib/core/supabase';
import { useQuery } from '@tanstack/react-query';
import { useColorScheme } from '@/lib/core/useColorScheme';
import { THEME } from '@/lib/core/theme';
import {
  LineChart,
  BarChart,
  PieChart,
  ProgressChart
} from 'react-native-chart-kit';
import {
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle,
  Calendar,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Target,
  PieChart as PieChartIcon,
  BarChart3,
  Activity,
  Percent,
  Info,
  XCircle
} from 'lucide-react-native';

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

type TimePeriod = '7d' | '30d' | '90d' | '1y';

export default function ProviderEarningsScreen() {
  const { user, profile } = useAuthOptimized();
  const { isDarkColorScheme } = useColorScheme();
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('30d');

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

  // ✅ REACT QUERY: Fetch stripe account ID from profile
  const { data: profileWithStripe } = useQuery({
    queryKey: ['profileStripe', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('stripe_account_id, stripe_charges_enabled, stripe_details_submitted')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      return profile;
    },
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // ✅ REACT QUERY: Stripe status using account ID
  const { data: stripeStatus } = useStripeAccountStatus(profileWithStripe?.stripe_account_id || '');

  // ✅ PURE REACT QUERY: Refresh all data without state management
  const onRefresh = async () => {
    await refetchEarnings();
  };

  const formatCurrency = (amount: number) => {
    return `£${amount.toFixed(2)}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'text-green-600 dark:text-green-400';
      case 'pending': return 'text-yellow-600 dark:text-yellow-400';
      case 'processing': return 'text-blue-600 dark:text-blue-400';
      case 'failed': return 'text-red-600 dark:text-red-400';
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

  // Enhanced chart configuration with better colors
  const chartConfig = {
    backgroundColor: 'transparent',
    backgroundGradientFrom: isDarkColorScheme ? THEME.dark.card : THEME.light.card,
    backgroundGradientTo: isDarkColorScheme ? THEME.dark.card : THEME.light.card,
    decimalPlaces: 0,
    color: (opacity = 1) => isDarkColorScheme ? `rgba(255, 255, 255, ${opacity})` : `rgba(0, 0, 0, ${opacity})`,
    labelColor: (opacity = 1) => isDarkColorScheme ? `rgba(255, 255, 255, ${opacity})` : `rgba(0, 0, 0, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '6',
      strokeWidth: '2',
      stroke: THEME.light.primary,
    },
    propsForLabels: {
      fontSize: 12,
    },
  };

  const screenWidth = Math.min(Dimensions.get('window').width - 80, 400); // Account for padding, max width for better mobile experience

  const calculateGrowth = () => {
    if (!analytics?.monthlyEarnings || analytics.monthlyEarnings.length < 2) return 0;
    const current = analytics.monthlyEarnings[analytics.monthlyEarnings.length - 1].value;
    const previous = analytics.monthlyEarnings[analytics.monthlyEarnings.length - 2].value;
    return previous > 0 ? ((current - previous) / previous) * 100 : 0;
  };

  const growthRate = calculateGrowth();

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      {/* Enhanced Header */}
      <View className="flex-row items-center justify-between px-6 py-4 border-b border-border bg-card">
        <TouchableOpacity
          onPress={() => router.back()}
          className="p-2 rounded-full bg-muted active:bg-muted/80"
        >
          <Icon as={ArrowUpRight} className="rotate-[-135deg]" size={20} />
        </TouchableOpacity>
        <View className="flex-1 items-center">
          <Text className="text-xl font-bold text-foreground">Earnings</Text>
          <Text className="text-sm text-muted-foreground">Track your business performance</Text>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        refreshControl={<RefreshControl refreshing={earningsLoading} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        <View className="px-1 py-6 gap-6">
          {/* Stripe Status Alert - Enhanced */}
          {stripeStatus && !isStripeReady && (
            <Card className="border-yellow-200 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-l-4 border-l-yellow-500">
              <CardContent className="p-4">
                <View className="flex-row items-start gap-3">
                  <View className="p-2 bg-yellow-100 dark:bg-yellow-900/50 rounded-full">
                    <Icon as={Wallet} className="text-yellow-600 dark:text-yellow-400" size={20} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-yellow-800 dark:text-yellow-200 font-semibold mb-1">
                      Payment Setup Required
                    </Text>
                    <Text className="text-yellow-700 dark:text-yellow-300 text-sm mb-3">
                      Complete your Stripe account setup to receive payments from customers.
                    </Text>
                    <Button
                      size="sm"
                      onPress={() => router.push('/provider-verification/payment')}
                      className="self-start bg-yellow-600 hover:bg-yellow-700"
                    >
                      <Text className="text-primary-foreground font-medium">Complete Setup</Text>
                    </Button>
                  </View>
                </View>
              </CardContent>
            </Card>
          )}

          {/* Enhanced Earnings Summary Cards - Enhanced with Icons and Gradients */}
          <View className="gap-4">
            <View className="flex-row items-center justify-between">
              <Text className="text-lg font-semibold text-foreground">Overview</Text>
              <TouchableOpacity
                onPress={() => Alert.alert('Coming Soon', 'Detailed earnings breakdown will be available soon!')}
                className="flex-row items-center px-3 py-1 bg-primary/10 rounded-full"
              >
                <Icon as={BarChart3} className="text-primary mr-1" size={14} />
                <Text className="text-primary text-sm font-medium">Details</Text>
              </TouchableOpacity>
            </View>
            <View className="grid grid-cols-2 gap-4">
              {/* Total Earnings Card */}
              <Card className="bg-gradient-to-br from-green-500 to-emerald-600 border-0 shadow-lg">
                <CardContent className="p-4">
                  <View className="flex-row items-center justify-between mb-2">
                    <Icon as={DollarSign} className="text-primary-foreground/80" size={20} />
                    <View className="flex-row items-center">
                      {growthRate > 0 && <Icon as={ArrowUpRight} className="text-primary-foreground/80 mr-1" size={14} />}
                      <Text className="text-primary-foreground/80 text-xs">
                        {growthRate > 0 ? '+' : ''}{growthRate.toFixed(1)}%
                      </Text>
                    </View>
                  </View>
                  <Text className="text-primary-foreground/60 text-sm mb-1">Total Earnings</Text>
                  {earningsLoading ? (
                    <Skeleton className="w-20 h-8 bg-white/20" />
                  ) : (
                    <Text className="text-primary-foreground text-2xl font-bold">
                      {formatCurrency(earnings?.totalEarnings || 0)}
                    </Text>
                  )}
                </CardContent>
              </Card>

              {/* This Month Card */}
              <Card className="bg-gradient-to-br from-blue-500 to-cyan-600 border-0 shadow-lg">
                <CardContent className="p-4">
                  <View className="flex-row items-center justify-between mb-2">
                    <Icon as={Calendar} className="text-primary-foreground/80" size={20} />
                    <Badge className="bg-white/20 text-primary-foreground text-xs px-2 py-0.5">
                      <Text className="text-primary-foreground">This Month</Text>
                    </Badge>
                  </View>
                  <Text className="text-primary-foreground/60 text-sm mb-1">Monthly Revenue</Text>
                  {earningsLoading ? (
                    <Skeleton className="w-20 h-8 bg-white/20" />
                  ) : (
                    <Text className="text-primary-foreground text-2xl font-bold">
                      {formatCurrency(earnings?.thisMonth || 0)}
                    </Text>
                  )}
                </CardContent>
              </Card>

              {/* Pending Payouts Card */}
              <Card className="bg-gradient-to-br from-yellow-500 to-orange-600 border-0 shadow-lg">
                <CardContent className="p-4">
                  <View className="flex-row items-center justify-between mb-2">
                    <Icon as={Clock} className="text-primary-foreground/80" size={20} />
                    <Badge className="bg-white/20 text-primary-foreground text-xs px-2 py-0.5">
                      <Text className="text-primary-foreground">Pending</Text>
                    </Badge>
                  </View>
                  <Text className="text-primary-foreground/60 text-sm mb-1">Pending Payouts</Text>
                  {earningsLoading ? (
                    <Skeleton className="w-20 h-8 bg-white/20" />
                  ) : (
                    <Text className="text-yellow-100 text-2xl font-bold">
                      {formatCurrency(earnings?.pendingPayouts || 0)}
                    </Text>
                  )}
                </CardContent>
              </Card>

              {/* Completed Bookings Card */}
              <Card className="bg-gradient-to-br from-purple-500 to-pink-600 border-0 shadow-lg">
                <CardContent className="p-4">
                  <View className="flex-row items-center justify-between mb-2">
                    <Icon as={CheckCircle} className="text-primary-foreground/80" size={20} />
                    <Badge className="bg-white/20 text-primary-foreground text-xs px-2 py-0.5">
                      <Text className="text-primary-foreground">Completed</Text>
                    </Badge>
                  </View>
                  <Text className="text-primary-foreground/60 text-sm mb-1">Total Bookings</Text>
                  {earningsLoading ? (
                    <Skeleton className="w-16 h-8 bg-white/20" />
                  ) : (
                    <Text className="text-primary-foreground text-2xl font-bold">
                      {earnings?.completedBookings || 0}
                    </Text>
                  )}
                </CardContent>
              </Card>
            </View>

            {/* Quick Stats Row */}
            <View className="flex-row justify-between bg-muted/50 rounded-lg p-3">
              <View className="items-center flex-1">
                <Text className="text-2xl font-bold text-foreground">
                  {earningsLoading ? '...' : `${((earnings?.totalEarnings || 0) / Math.max(earnings?.completedBookings || 1, 1)).toFixed(0)}`}
                </Text>
                <Text className="text-xs text-muted-foreground">Avg per booking</Text>
              </View>
              <View className="w-px bg-border" />
              <View className="items-center flex-1">
                <Text className="text-2xl font-bold text-foreground">
                  {earningsLoading ? '...' : `${Math.round(((earnings?.completedBookings || 0) / Math.max(Math.ceil((new Date().getTime() - new Date(user?.created_at || Date.now()).getTime()) / (1000 * 60 * 60 * 24 * 30)), 1)) * 10) / 10}`}
                </Text>
                <Text className="text-xs text-muted-foreground">Avg/month</Text>
              </View>
              <View className="w-px bg-border" />
              <View className="items-center flex-1">
                <Text className="text-2xl font-bold text-foreground">
                  {earningsLoading ? '...' : `${Math.round((earnings?.thisMonth || 0) / Math.max(new Date().getDate(), 1) * 30)}`}
                </Text>
                <Text className="text-xs text-muted-foreground">Projected</Text>
              </View>
            </View>
          </View>

          {/* Analytics Section */}
          <View className="gap-4">
            <View className="flex-row items-center justify-between">
              <Text className="text-lg font-semibold text-foreground">Analytics</Text>
              <View className="flex-row bg-muted rounded-lg p-1">
                {(['7d', '30d', '90d', '1y'] as TimePeriod[]).map((period) => (
                  <TouchableOpacity
                    key={period}
                    onPress={() => setSelectedPeriod(period)}
                    className={`px-3 py-1 rounded-md ${
                      selectedPeriod === period ? 'bg-primary' : 'bg-transparent'
                    }`}
                  >
                    <Text className={`text-sm font-medium ${
                      selectedPeriod === period ? 'text-primary-foreground' : 'text-muted-foreground'
                    }`}>
                      {period}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Enhanced Earnings Trend Chart */}
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <View>
                  <CardTitle className="flex-row items-center">
                    <Icon as={TrendingUp} className="mr-2 text-primary" size={20} />
                    Earnings Trend
                  </CardTitle>
                  <Text className="text-sm text-muted-foreground mt-1">
                    Revenue growth over time
                  </Text>
                </View>
              </CardHeader>
              <CardContent>
                {analyticsLoading ? (
                  <Skeleton className="w-full h-64 rounded-lg" />
                ) : analytics?.monthlyEarnings && analytics.monthlyEarnings.length > 0 ? (
                  <LineChart
                    data={{
                      labels: analytics.monthlyEarnings.slice(-6).map(d => d.month),
                      datasets: [{
                        data: analytics.monthlyEarnings.slice(-6).map(d => d.value),
                        color: (opacity = 1) => `rgba(34, 197, 94, ${opacity})`,
                        strokeWidth: 3,
                      }],
                    }}
                    width={screenWidth}
                    height={220}
                    chartConfig={{
                      ...chartConfig,
                      color: (opacity = 1) => `rgba(34, 197, 94, ${opacity})`,
                    }}
                    bezier
                    style={{
                      marginVertical: 8,
                      borderRadius: 16,
                    }}
                    withDots={true}
                    withShadow={false}
                    withInnerLines={false}
                    withOuterLines={false}
                  />
                ) : (
                  <View className="items-center justify-center py-12">
                    <Icon as={BarChart3} className="text-muted-foreground mb-3" size={48} />
                    <Text className="text-muted-foreground text-center">
                      No earnings data yet{'\n'}Complete your first booking to see trends
                    </Text>
                  </View>
                )}
              </CardContent>
            </Card>

            {/* Enhanced Service Performance Chart */}
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <View className="flex-row items-center justify-between">
                  <View>
                    <CardTitle className="flex-row items-center">
                      <Icon as={PieChartIcon} className="mr-2 text-primary" size={20} />
                      Top Services
                    </CardTitle>
                    <Text className="text-sm text-muted-foreground mt-1">
                      Your highest earning services
                    </Text>
                  </View>
                  <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                    <Text className="text-blue-800 dark:text-blue-200">Revenue</Text>
                  </Badge>
                </View>
              </CardHeader>
              <CardContent>
                {analyticsLoading ? (
                  <Skeleton className="w-full h-64 rounded-lg" />
                ) : analytics?.servicePerformance && analytics.servicePerformance.length > 0 ? (
                  <BarChart
                    data={{
                      labels: analytics.servicePerformance.slice(0, 5).map(s => s.service.substring(0, 8) + (s.service.length > 8 ? '...' : '')),
                      datasets: [{
                        data: analytics.servicePerformance.slice(0, 5).map(s => s.revenue),
                      }],
                    }}
                    width={screenWidth}
                    height={220}
                    yAxisLabel="£"
                    yAxisSuffix=""
                    chartConfig={{
                      ...chartConfig,
                      color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
                    }}
                    showValuesOnTopOfBars
                    style={{
                      marginVertical: 8,
                      borderRadius: 16,
                    }}
                    withInnerLines={false}
                  />
                ) : (
                  <View className="items-center justify-center py-12">
                    <Icon as={Target} className="text-muted-foreground mb-3" size={48} />
                    <Text className="text-muted-foreground text-center">
                      No service data yet{'\n'}Add services and complete bookings to see performance
                    </Text>
                  </View>
                )}
              </CardContent>
            </Card>
          </View>

          {/* Enhanced Commission Breakdown Section */}
          <Card className="bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 dark:from-primary/10 dark:via-primary/20 dark:to-primary/10 border-primary/20 shadow-lg">
            <CardHeader className="pb-4">
              <View className="flex-row items-center justify-between">
                <View>
                  <CardTitle className="flex-row items-center text-primary">
                    <Icon as={Percent} className="mr-3" size={24} />
                    <View>
                      <Text className="text-lg font-bold text-primary">Commission Structure</Text>
                      <Text className="text-sm text-muted-foreground font-normal">How your earnings are calculated</Text>
                    </View>
                  </CardTitle>
                </View>
                <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 px-3 py-1">
                  <Text className="text-orange-800 dark:text-orange-200 font-medium">15% Platform Fee</Text>
                </Badge>
              </View>
            </CardHeader>
            <CardContent className="gap-4">
              {/* Visual Earnings Flow */}
              <View className="bg-card/50 dark:bg-card/20 rounded-xl p-4 mb-2">
                <Text className="text-sm font-semibold text-foreground mb-4 text-center">Earnings Flow</Text>
                <View className="gap-3">
                  {/* Service Revenue */}
                  <View className="flex-row items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200/50 dark:border-green-800/50">
                    <View className="w-10 h-10 bg-green-100 dark:bg-green-900/50 rounded-full items-center justify-center flex-shrink-0">
                      <Icon as={DollarSign} className="text-green-600 dark:text-green-400" size={18} />
                    </View>
                    <View className="flex-1 min-w-0">
                      <Text className="font-semibold text-green-800 dark:text-green-200">Service Revenue</Text>
                      <Text className="text-sm text-green-700 dark:text-green-300">Amount charged to customer</Text>
                    </View>
                    <Text className="font-bold text-green-600 text-lg flex-shrink-0">
                      {formatCurrency(earnings?.totalEarnings || 0)}
                    </Text>
                  </View>

                  {/* Arrow Down */}
                  <View className="items-center py-1">
                    <Icon as={ArrowDownRight} className="text-muted-foreground rotate-90" size={16} />
                  </View>

                  {/* Platform Commission */}
                  <View className="flex-row items-center gap-3 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200/50 dark:border-orange-800/50">
                    <View className="w-10 h-10 bg-orange-100 dark:bg-orange-900/50 rounded-full items-center justify-center flex-shrink-0">
                      <Icon as={Percent} className="text-orange-600 dark:text-orange-400" size={16} />
                    </View>
                    <View className="flex-1 min-w-0">
                      <Text className="font-semibold text-orange-800 dark:text-orange-200">Platform Commission</Text>
                      <Text className="text-sm text-orange-700 dark:text-orange-300">15% service fee deducted</Text>
                    </View>
                    <Text className="font-bold text-orange-600 text-lg flex-shrink-0">
                      -{formatCurrency((earnings?.totalEarnings || 0) * 0.15)}
                    </Text>
                  </View>

                  {/* Arrow Down */}
                  <View className="items-center py-1">
                    <Icon as={ArrowDownRight} className="text-primary rotate-90" size={16} />
                  </View>

                  {/* Your Earnings - Highlighted */}
                  <View className="flex-row items-center gap-3 p-4 bg-primary/10 rounded-lg border-2 border-primary/30">
                    <View className="w-12 h-12 bg-primary/20 rounded-full items-center justify-center flex-shrink-0">
                      <Icon as={Wallet} className="text-primary" size={20} />
                    </View>
                    <View className="flex-1 min-w-0">
                      <Text className="font-bold text-primary text-lg">Your Earnings</Text>
                      <Text className="text-sm text-muted-foreground">Amount you receive</Text>
                    </View>
                    <Text className="font-black text-primary text-2xl flex-shrink-0">
                      {formatCurrency((earnings?.totalEarnings || 0) * 0.85)}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Enhanced Info Section */}
              <View className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-4 border border-blue-200/50 dark:border-blue-800/50">
                <View className="flex-row items-start gap-3">
                  <View className="w-8 h-8 bg-blue-100 dark:bg-blue-900/50 rounded-full items-center justify-center flex-shrink-0 mt-0.5">
                    <Icon as={Info} className="text-blue-600 dark:text-blue-400" size={16} />
                  </View>
                  <View className="flex-1 min-w-0">
                    <Text className="text-blue-800 dark:text-blue-200 font-semibold mb-2">
                      💰 Transparent Commission Structure
                    </Text>
                    <Text className="text-blue-700 dark:text-blue-300 text-sm leading-relaxed">
                      ZOVA charges a competitive 15% platform fee on all completed services. This covers secure payment processing, 24/7 customer support, platform maintenance, and continuous feature development. Your earnings are paid out automatically every Monday.
                    </Text>
                    <View className="flex-row items-center gap-2 mt-3">
                      <View className="w-2 h-2 bg-green-500 rounded-full"></View>
                      <Text className="text-xs text-blue-600 dark:text-blue-400 font-medium">No hidden fees • Weekly payouts • Secure payments</Text>
                    </View>
                  </View>
                </View>
              </View>
            </CardContent>
          </Card>

          {/* Enhanced Next Payout Card */}
          <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border-indigo-200 dark:border-indigo-800">
            <CardHeader>
              <CardTitle className="flex-row items-center text-indigo-900 dark:text-indigo-100">
                <Icon as={Wallet} className="mr-2" size={20} />
                Next Payout
              </CardTitle>
            </CardHeader>
            <CardContent>
              <View className="flex-row items-center justify-between mb-4">
                <View className="flex-1">
                  <Text className="text-sm text-indigo-700 dark:text-indigo-300 mb-1">Scheduled for</Text>
                  <Text className="text-lg font-bold text-indigo-900 dark:text-indigo-100">
                    {earnings?.nextPayoutDate || 'N/A'}
                  </Text>
                </View>
                <View className="items-end">
                  <Text className="text-sm text-indigo-700 dark:text-indigo-300 mb-1">Amount</Text>
                  <Text className="text-xl font-bold text-indigo-900 dark:text-indigo-100">
                    {formatCurrency(earnings?.pendingPayouts || 0)}
                  </Text>
                </View>
              </View>
              <View className="bg-white/50 dark:bg-black/20 rounded-lg p-3">
                <Text className="text-xs text-indigo-700 dark:text-indigo-300 text-center">
                  💰 Payouts are processed every Monday • Funds arrive in 2-7 business days
                </Text>
              </View>
            </CardContent>
          </Card>

          {/* Enhanced Payout History */}
          <Card className="shadow-sm">
            <CardHeader>
              <View className="flex-row items-center justify-between">
                <CardTitle className="flex-row items-center">
                  <Icon as={Activity} className="mr-2 text-primary" size={20} />
                  Recent Payouts
                </CardTitle>
                <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
                  <Text className="text-gray-800 dark:text-gray-200">{payoutHistory?.length || 0} total</Text>
                </Badge>
              </View>
            </CardHeader>
            <CardContent>
              {payoutsLoading ? (
                <View className="gap-3">
                  {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="w-full h-16 rounded-lg" />
                  ))}
                </View>
              ) : payoutHistory && payoutHistory.length > 0 ? (
                <View className="gap-3">
                  {payoutHistory.slice(0, 5).map((payout) => (
                    <View key={payout.id} className="flex-row items-center justify-between p-4 bg-card rounded-xl border border-border/50 shadow-sm">
                      <View className="flex-1">
                        <View className="flex-row items-center justify-between mb-2">
                          <Text className="font-bold text-foreground text-lg">
                            {formatCurrency(payout.amount)}
                          </Text>
                          <Badge className={`${
                            payout.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                            payout.status === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
                            payout.status === 'processing' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' :
                            'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                          } px-2 py-1`}>
                            <Text className={`${
                              payout.status === 'completed' ? 'text-green-800 dark:text-green-300' :
                              payout.status === 'pending' ? 'text-yellow-800 dark:text-yellow-300' :
                              payout.status === 'processing' ? 'text-blue-800 dark:text-blue-300' :
                              'text-red-800 dark:text-red-300'
                            } text-xs font-medium`}>{getStatusText(payout.status)}</Text>
                          </Badge>
                        </View>
                        <View className="flex-row items-center">
                          <Icon as={Calendar} className="text-muted-foreground mr-2" size={14} />
                          <Text className="text-sm text-muted-foreground">
                            {new Date(payout.expected_payout_date || payout.actual_payout_date || '').toLocaleDateString('en-GB', {
                              weekday: 'short',
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </Text>
                        </View>
                      </View>
                      <View className={`w-10 h-10 rounded-full items-center justify-center ml-4 ${
                        payout.status === 'completed' ? 'bg-green-100 dark:bg-green-900/50' :
                        payout.status === 'pending' ? 'bg-yellow-100 dark:bg-yellow-900/50' :
                        'bg-red-100 dark:bg-red-900/50'
                      }`}>
                        <Icon
                          as={payout.status === 'completed' ? CheckCircle :
                              payout.status === 'pending' ? Clock :
                              XCircle}
                          className={`${
                            payout.status === 'completed' ? 'text-green-600 dark:text-green-400' :
                            payout.status === 'pending' ? 'text-yellow-600 dark:text-yellow-400' :
                            'text-red-600 dark:text-red-400'
                          }`}
                          size={18}
                        />
                      </View>
                    </View>
                  ))}
                  {payoutHistory.length > 5 && (
                    <TouchableOpacity className="items-center py-3 mt-2 border-t border-border">
                      <View className="flex-row items-center px-4 py-2 bg-primary/10 rounded-full">
                        <Text className="text-primary font-medium mr-2">View All Payouts</Text>
                        <Icon as={ArrowUpRight} className="text-primary" size={14} />
                      </View>
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                <View className="items-center justify-center py-12">
                  <Icon as={Wallet} className="text-muted-foreground mb-3" size={48} />
                  <Text className="text-muted-foreground text-center mb-2">
                    No payouts yet
                  </Text>
                  <Text className="text-sm text-muted-foreground text-center">
                    Complete bookings to start earning and receiving payouts
                  </Text>
                </View>
              )}
            </CardContent>
          </Card>

          {/* Enhanced Commission Info */}
          <Card className="bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 dark:from-primary/10 dark:via-primary/20 dark:to-primary/10 border-primary/20 shadow-lg">
            <CardHeader className="pb-4">
              <CardTitle className="flex-row items-center text-primary">
                <Icon as={Target} className="mr-3" size={24} />
                <View>
                  <Text className="text-lg font-bold text-primary">How Earnings Work</Text>
                  <Text className="text-sm text-muted-foreground font-normal">Transparent breakdown of your earnings</Text>
                </View>
              </CardTitle>
            </CardHeader>
            <CardContent className="gap-4">
              {/* Earnings Split Visualization */}
              <View className="bg-card/50 dark:bg-card/20 rounded-xl p-4 mb-2">
                <Text className="text-sm font-semibold text-foreground mb-3 text-center">Earnings Distribution</Text>
                <View className="gap-3">
                  <View className="flex-row items-center gap-3">
                    <View className="flex-1 bg-green-500 rounded-full h-3 min-w-0">
                      <View className="bg-green-500 rounded-full h-3" style={{width: '85%'}} />
                    </View>
                    <Text className="text-xs font-bold text-green-600 dark:text-green-400 flex-shrink-0">85%</Text>
                  </View>
                  <View className="flex-row items-center gap-3">
                    <View className="flex-1 bg-blue-500 rounded-full h-2 min-w-0">
                      <View className="bg-blue-500 rounded-full h-2" style={{width: '15%'}} />
                    </View>
                    <Text className="text-xs font-bold text-blue-600 dark:text-blue-400 flex-shrink-0">15%</Text>
                  </View>
                </View>
                <View className="flex-row justify-between mt-2 px-1">
                  <Text className="text-xs text-muted-foreground">You earn</Text>
                  <Text className="text-xs text-muted-foreground">Platform fee</Text>
                </View>
              </View>

              {/* Detailed Breakdown */}
              <View className="gap-3">
                <View className="flex-row items-start gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200/50 dark:border-green-800/50">
                  <View className="w-10 h-10 bg-green-100 dark:bg-green-900/50 rounded-full items-center justify-center flex-shrink-0">
                    <Icon as={DollarSign} className="text-green-600 dark:text-green-400" size={18} />
                  </View>
                  <View className="flex-1 min-w-0">
                    <View className="flex-row items-center gap-2 mb-1 flex-wrap">
                      <Text className="text-base font-bold text-green-800 dark:text-green-200">85% You Keep</Text>
                      <View className="bg-green-100 dark:bg-green-900/50 px-2 py-0.5 rounded-full">
                        <Text className="text-xs font-bold text-green-700 dark:text-green-300">Highest Rate</Text>
                      </View>
                    </View>
                    <Text className="text-sm text-green-700 dark:text-green-300 leading-relaxed">Every booking payment goes directly to you after platform fee</Text>
                  </View>
                </View>

                <View className="flex-row items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200/50 dark:border-blue-800/50">
                  <View className="w-10 h-10 bg-blue-100 dark:bg-blue-900/50 rounded-full items-center justify-center flex-shrink-0">
                    <Icon as={Percent} className="text-blue-600 dark:text-blue-400" size={16} />
                  </View>
                  <View className="flex-1 min-w-0">
                    <View className="flex-row items-center gap-2 mb-1 flex-wrap">
                      <Text className="text-base font-bold text-blue-800 dark:text-blue-200">15% Platform Fee</Text>
                      <View className="bg-blue-100 dark:bg-blue-900/50 px-2 py-0.5 rounded-full">
                        <Text className="text-xs font-bold text-blue-700 dark:text-blue-300">Lowest Fee</Text>
                      </View>
                    </View>
                    <Text className="text-sm text-blue-700 dark:text-blue-300 leading-relaxed">Covers payment processing, customer support, and platform maintenance</Text>
                  </View>
                </View>

                <View className="flex-row items-start gap-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200/50 dark:border-purple-800/50">
                  <View className="w-10 h-10 bg-purple-100 dark:bg-purple-900/50 rounded-full items-center justify-center flex-shrink-0">
                    <Icon as={Calendar} className="text-purple-600 dark:text-purple-400" size={16} />
                  </View>
                  <View className="flex-1 min-w-0">
                    <View className="flex-row items-center gap-2 mb-1 flex-wrap">
                      <Text className="text-base font-bold text-purple-800 dark:text-purple-200">Weekly Payouts</Text>
                      <View className="bg-purple-100 dark:bg-purple-900/50 px-2 py-0.5 rounded-full">
                        <Text className="text-xs font-bold text-purple-700 dark:text-purple-300">Every Monday</Text>
                      </View>
                    </View>
                    <Text className="text-sm text-purple-700 dark:text-purple-300 leading-relaxed">Payments processed automatically every Monday for completed services</Text>
                  </View>
                </View>

                <View className="flex-row items-start gap-3 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-200/50 dark:border-orange-800/50">
                  <View className="w-10 h-10 bg-orange-100 dark:bg-orange-900/50 rounded-full items-center justify-center flex-shrink-0">
                    <Icon as={Wallet} className="text-orange-600 dark:text-orange-400" size={16} />
                  </View>
                  <View className="flex-1 min-w-0">
                    <View className="flex-row items-center gap-2 mb-1 flex-wrap">
                      <Text className="text-base font-bold text-orange-800 dark:text-orange-200">£20 Minimum Payout</Text>
                      <View className="bg-orange-100 dark:bg-orange-900/50 px-2 py-0.5 rounded-full">
                        <Text className="text-xs font-bold text-orange-700 dark:text-orange-300">Low Threshold</Text>
                      </View>
                    </View>
                    <Text className="text-sm text-orange-700 dark:text-orange-300 leading-relaxed">Payouts only process when you reach the minimum £20 threshold</Text>
                  </View>
                </View>
              </View>

              {/* Trust Indicator */}
              <View className="bg-primary/5 dark:bg-primary/10 rounded-lg p-3 mt-2 border border-primary/20">
                <View className="flex-row items-center gap-2">
                  <Icon as={CheckCircle} className="text-primary" size={16} />
                  <Text className="text-sm font-medium text-primary">100% Transparent • No Hidden Fees</Text>
                </View>
              </View>
            </CardContent>
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
import React, { useState } from 'react';
import { View, ScrollView, RefreshControl, TouchableOpacity, Dimensions, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
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
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { useColorScheme } from '@/lib/core/useColorScheme';
import { THEME } from '@/lib/theme';
import { formatCurrency } from '@/lib/utils';
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
  const colors = isDarkColorScheme ? THEME.dark : THEME.light;
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('30d');
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics' | 'payouts'>('overview');

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

  // Using centralized formatCurrency from utils

  

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

  // Enhanced chart configuration with theme colors
  const chartConfig = {
    backgroundColor: 'transparent',
    backgroundGradientFrom: 'transparent', 
    backgroundGradientTo: 'transparent',
    decimalPlaces: 0,
    color: (opacity = 1) => colors.chart2,
    labelColor: (opacity = 1) => colors.mutedForeground,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '6',
      strokeWidth: '2',
      stroke: colors.chart2,
    },
    propsForLabels: {
      fontSize: 11,
    },
  };

  const screenWidth = Dimensions.get('window').width - 64; // Account for padding (32px on each side)

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
            Earnings
          </Text>
          <View className="w-8" />
        </View>
      </View>

      {/* Tab Navigation - Sticky */}
      <View className="px-4 py-4 bg-card border-b border-border">
        <View className="flex-row bg-muted rounded-lg p-1">
          {[
            { key: 'overview' as const, label: 'Overview', icon: Activity },
            { key: 'analytics' as const, label: 'Analytics', icon: BarChart3 },
            { key: 'payouts' as const, label: 'Payouts', icon: Wallet }
          ].map((tab) => (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              className={`flex-1 flex-row items-center justify-center py-2 rounded-md ${
                activeTab === tab.key ? 'bg-primary' : 'bg-transparent'
              }`}
            >
              <Icon
                as={tab.icon}
                size={16}
                color={activeTab === tab.key ? colors.primaryForeground : colors.mutedForeground}
              />
              <Text className={`text-sm font-medium ml-2 ${
                activeTab === tab.key ? 'text-primary-foreground' : 'text-muted-foreground'
              }`}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView
        className="flex-1"
        refreshControl={<RefreshControl refreshing={earningsLoading} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 4, paddingBottom: 8 }}
      >
        <View className="px-4 gap-6">
          {/* Tab Content */}
          {activeTab === 'overview' && (
            <>
              {/* Stripe Status Alert - Enhanced */}
              {stripeStatus && !isStripeReady && (
                <Card className="border-destructive/20 bg-destructive/10 border-l-4 border-l-destructive">
                  <CardContent className="p-4">
                    <View className="flex-row items-start gap-3">
                      <View className="p-2 bg-destructive/20 rounded-full">
                        <Icon as={Wallet} size={20} color={colors.destructive} />
                      </View>
                      <View className="flex-1">
                        <Text className="text-destructive font-semibold mb-1">
                          Payment Setup Required
                        </Text>
                        <Text className="text-muted-foreground text-sm mb-3">
                          Complete your Stripe account setup to receive payments from customers.
                        </Text>
                        <Button
                          size="sm"
                          onPress={() => router.push('/provider-verification/payment')}
                          className="self-start"
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
                <Icon as={BarChart3} size={14} className="text-primary" />
                <Text className="text-primary text-sm font-medium">Details</Text>
              </TouchableOpacity>
            </View>
            <View className="grid grid-cols-2 gap-4">
              {/* Total Earnings Card */}
              <Card className="bg-primary border border-primary/20">
                <CardContent className="p-4">
                  <View className="flex-row items-center justify-between mb-2">
                    <Icon as={DollarSign} size={20} color={colors.primaryForeground} />
                    <View className="flex-row items-center">
                      {growthRate > 0 && <Icon as={ArrowUpRight} size={14} color={colors.primaryForeground} />}
                      <Text className="text-primary-foreground/80 text-xs">
                        {growthRate > 0 ? '+' : ''}{growthRate.toFixed(1)}%
                      </Text>
                    </View>
                  </View>
                  <Text className="text-primary-foreground/70 text-sm mb-1">Total Earnings</Text>
                  {earningsLoading ? (
                    <Skeleton className="w-20 h-8 bg-primary-foreground/20" />
                  ) : (
                    <>
                      <Text className="text-primary-foreground text-2xl font-bold">
                        {formatCurrency(earnings?.totalEarnings || 0)}
                      </Text>
                      <Text className="text-primary-foreground/60 text-xs mt-1">
                        Includes pending & completed
                      </Text>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* This Month Card */}
              <Card className="bg-secondary border border-secondary/20">
                <CardContent className="p-4">
                  <View className="flex-row items-center justify-between mb-2">
                    <Icon as={Calendar} size={20} color={colors.secondaryForeground} />
                    <Badge className="bg-secondary-foreground/20 border-0">
                      <Text className="text-secondary-foreground text-xs">This Month</Text>
                    </Badge>
                  </View>
                  <Text className="text-secondary-foreground/70 text-sm mb-1">Monthly Revenue</Text>
                  {earningsLoading ? (
                    <Skeleton className="w-20 h-8 bg-secondary-foreground/20" />
                  ) : (
                    <>
                      <Text className="text-secondary-foreground text-2xl font-bold">
                        {formatCurrency(earnings?.thisMonth || 0)}
                      </Text>
                      <Text className="text-secondary-foreground/60 text-xs mt-1">
                        This month's earnings
                      </Text>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Pending Payouts Card */}
              <Card className="bg-destructive border border-destructive/20">
                <CardContent className="p-4">
                  <View className="flex-row items-center justify-between mb-2">
                    <Icon as={Clock} size={20} color={colors.destructiveForeground} />
                    <Badge className="bg-destructive-foreground/20 border-0">
                      <Text className="text-destructive-foreground text-xs">Pending</Text>
                    </Badge>
                  </View>
                  <Text className="text-destructive-foreground/70 text-sm mb-1">Pending Payouts</Text>
                  {earningsLoading ? (
                    <Skeleton className="w-20 h-8 bg-destructive-foreground/20" />
                  ) : (
                    <>
                      <Text className="text-destructive-foreground text-2xl font-bold">
                        {formatCurrency(earnings?.pendingPayouts || 0)}
                      </Text>
                      <Text className="text-destructive-foreground/60 text-xs mt-1">
                        Being processed to bank
                      </Text>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Completed Bookings Card */}
              <Card className="bg-accent border border-accent/20">
                <CardContent className="p-4">
                  <View className="flex-row items-center justify-between mb-2">
                    <Icon as={CheckCircle} size={20} color={colors.accentForeground} />
                    <Badge className="bg-accent-foreground/20 border-0">
                      <Text className="text-accent-foreground text-xs">Completed</Text>
                    </Badge>
                  </View>
                  <Text className="text-accent-foreground/70 text-sm mb-1">Total Bookings</Text>
                  {earningsLoading ? (
                    <Skeleton className="w-16 h-8 bg-accent-foreground/20" />
                  ) : (
                    <Text className="text-accent-foreground text-2xl font-bold">
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
                  {earningsLoading ? '...' : formatCurrency(((earnings?.totalEarnings || 0) / Math.max(earnings?.completedBookings || 1, 1)))}
                </Text>
                <Text className="text-xs text-muted-foreground">Avg per booking</Text>
              </View>
              <View className="w-px bg-border" />
              <View className="items-center flex-1">
                <Text className="text-2xl font-bold text-foreground">
                  {earningsLoading ? '...' : `${(((earnings?.completedBookings || 0) / Math.max(Math.ceil((new Date().getTime() - new Date(user?.created_at || Date.now()).getTime()) / (1000 * 60 * 60 * 24 * 30)), 1))).toFixed(1)}`}
                </Text>
                <Text className="text-xs text-muted-foreground">Avg/month</Text>
              </View>
              <View className="w-px bg-border" />
              <View className="items-center flex-1">
                <Text className="text-2xl font-bold text-foreground">
                  {earningsLoading ? '...' : formatCurrency((earnings?.thisMonth || 0) / Math.max(new Date().getDate(), 1) * 30)}
                </Text>
                <Text className="text-xs text-muted-foreground">Projected</Text>
              </View>
            </View>
          </View>

            </>
          )}

          {/* Analytics Section */}
          {activeTab === 'analytics' && (
            <>
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
            <Card className="">
              <CardHeader className="pb-2">
                <View>
                  <CardTitle className="flex-row items-center">
                    <Icon as={TrendingUp} size={20} className="text-secondary" />
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
                  <View style={{ backgroundColor: isDarkColorScheme ? '#1e293b' : '#ffffff', borderRadius: 16, padding: 8 }}>
                    <LineChart
                      data={{
                        labels: analytics.monthlyEarnings.slice(-6).map(d => d.month),
                        datasets: [{
                          data: analytics.monthlyEarnings.slice(-6).map(d => d.value),
                          color: (opacity = 1) => isDarkColorScheme ? `rgba(34, 197, 94, ${opacity})` : `rgba(22, 163, 74, ${opacity})`,
                          strokeWidth: 3,
                        }],
                      }}
                      width={screenWidth - 16}
                      height={220}
                      chartConfig={{
                        ...chartConfig,
                        backgroundColor: 'transparent',
                        backgroundGradientFrom: 'transparent',
                        backgroundGradientTo: 'transparent',
                      }}
                      bezier
                      style={{
                        borderRadius: 16,
                      }}
                      withDots={true}
                      withShadow={false}
                      withInnerLines={false}
                      withOuterLines={false}
                      withHorizontalLabels={true}
                      withVerticalLabels={true}
                    />
                  </View>
                ) : (
                  <View className="items-center justify-center py-12">
                    <Icon as={BarChart3} size={48} className="text-muted-foreground" />
                    <Text className="text-muted-foreground text-center">
                      No earnings data yet{'\n'}Complete your first booking to see trends
                    </Text>
                  </View>
                )}
              </CardContent>
            </Card>

            {/* Enhanced Service Performance Chart */}
            <Card className="">
              <CardHeader className="pb-2">
                <View className="flex-row items-center justify-between">
                  <View>
                    <CardTitle className="flex-row items-center">
                      <Icon as={PieChartIcon} size={20} className="text-secondary" />
                      Top Services
                    </CardTitle>
                    <Text className="text-sm text-muted-foreground mt-1">
                      Your highest earning services
                    </Text>
                  </View>
                  <Badge className="bg-primary/20">
                    <Text className="text-primary">Revenue</Text>
                  </Badge>
                </View>
              </CardHeader>
              <CardContent>
                {analyticsLoading ? (
                  <Skeleton className="w-full h-64 rounded-lg" />
                ) : analytics?.servicePerformance && analytics.servicePerformance.length > 0 ? (
                  <View style={{ backgroundColor: isDarkColorScheme ? '#1e293b' : '#ffffff', borderRadius: 16, padding: 8 }}>
                    <BarChart
                      data={{
                        labels: analytics.servicePerformance.slice(0, 5).map(s => s.service.substring(0, 8) + (s.service.length > 8 ? '...' : '')),
                        datasets: [{
                          data: analytics.servicePerformance.slice(0, 5).map(s => s.revenue),
                        }],
                      }}
                      width={screenWidth - 16}
                      height={220}
                      yAxisLabel="£"
                      yAxisSuffix=""
                      chartConfig={{
                        ...chartConfig,
                        color: (opacity = 1) => isDarkColorScheme ? `rgba(168, 85, 247, ${opacity})` : `rgba(99, 102, 241, ${opacity})`,
                        backgroundColor: 'transparent',
                        backgroundGradientFrom: 'transparent',
                        backgroundGradientTo: 'transparent',
                      }}
                      showValuesOnTopOfBars
                      style={{
                        borderRadius: 16,
                      }}
                      withInnerLines={false}
                    />
                  </View>
                ) : (
                  <View className="items-center justify-center py-12">
                    <Icon as={Target} size={48} className="text-muted-foreground" />
                    <Text className="text-muted-foreground text-center">
                      No service data yet{'\n'}Add services and complete bookings to see performance
                    </Text>
                  </View>
                )}
              </CardContent>
            </Card>
          </View>

            </>
          )}
          {activeTab === 'payouts' && (
            <>
              {/* Enhanced Next Payout Card */}
              <Card className="bg-primary/10 border-primary/20">
            <CardHeader>
              <CardTitle className="flex-row items-center text-primary">
                <Icon as={Wallet} size={20} className="text-primary" />
                Next Payout
              </CardTitle>
            </CardHeader>
            <CardContent>
              <View className="flex-row items-center justify-between mb-4">
                <View className="flex-1">
                  <Text className="text-sm text-muted-foreground mb-1">Scheduled for</Text>
                  <Text className="text-lg font-bold text-foreground">
                    {earnings?.nextPayoutDate || 'N/A'}
                  </Text>
                </View>
                <View className="items-end">
                  <Text className="text-sm text-muted-foreground mb-1">Amount</Text>
                  <Text className="text-xl font-bold text-foreground">
                    {formatCurrency(earnings?.pendingPayouts || 0)}
                  </Text>
                </View>
              </View>
              <View className="bg-muted rounded-lg p-3">
                <Text className="text-xs text-muted-foreground text-center">
                  💰 Payouts are processed every Monday • Funds arrive in 2-7 business days
                </Text>
              </View>
            </CardContent>
          </Card>

          {/* Enhanced Payout History */}
          <Card className="">
            <CardHeader>
              <View className="flex-row items-center justify-between">
                <CardTitle className="flex-row items-center">
                  <Icon as={Activity} size={20} className="text-secondary" />
                  Recent Payouts
                </CardTitle>
                <Badge className="bg-muted">
                  <Text className="text-muted-foreground">{payoutHistory?.length || 0} total</Text>
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
                    <View key={payout.id} className="flex-row items-center justify-between p-4 bg-card rounded-xl border border-border/50 ">
                      <View className="flex-1">
                        <View className="flex-row items-center justify-between mb-2">
                          <Text className="font-bold text-foreground text-lg">
                            {formatCurrency(payout.amount)}
                          </Text>
                          <Badge className={`${
                            payout.status === 'completed' ? 'bg-secondary/20' :
                            payout.status === 'pending' ? 'bg-destructive/20' :
                            payout.status === 'processing' ? 'bg-primary/20' :
                            'bg-destructive/20'
                          } px-2 py-1`}>
                            <Text className={`${
                              payout.status === 'completed' ? 'text-secondary' :
                              payout.status === 'pending' ? 'text-destructive' :
                              payout.status === 'processing' ? 'text-primary' :
                              'text-destructive'
                            } text-xs font-medium`}>{getStatusText(payout.status)}</Text>
                          </Badge>
                        </View>
                        <View className="flex-row items-center">
                          <Icon as={Calendar} size={14} className="text-muted-foreground" />
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
                        payout.status === 'completed' ? 'bg-secondary/20' :
                        payout.status === 'pending' ? 'bg-destructive/20' :
                        'bg-destructive/20'
                      }`}>
                        <Icon
                          as={payout.status === 'completed' ? CheckCircle :
                              payout.status === 'pending' ? Clock :
                              XCircle}
                          className={`${
                            payout.status === 'completed' ? 'text-secondary' :
                            payout.status === 'pending' ? 'text-destructive' :
                            'text-destructive'
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
                        <Icon as={ArrowUpRight} size={14} className="text-primary" />
                      </View>
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                <View className="items-center justify-center py-12">
                  <Icon as={Wallet} size={48} className="text-muted-foreground" />
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
          <Card className="bg-card border-border">
            <CardHeader className="pb-4">
              <CardTitle className="flex-row items-center text-primary">
                <Icon as={Target} size={24} className="text-primary" />
                <View>
                  <Text className="text-lg font-bold text-primary">How Earnings Work</Text>
                  <Text className="text-sm text-muted-foreground font-normal">Transparent breakdown of your earnings</Text>
                </View>
              </CardTitle>
            </CardHeader>
            <CardContent className="gap-4">
              {/* Earnings Split Visualization */}
              <View className="bg-muted rounded-xl p-4 mb-2">
                <Text className="text-sm font-semibold text-foreground mb-3 text-center">Earnings Distribution</Text>
                <View className="gap-3">
                  <View className="flex-row items-center gap-3">
                    <View className="flex-1 bg-secondary rounded-full h-3 min-w-0">
                      <View className="bg-secondary rounded-full h-3" style={{width: '90%'}} />
                    </View>
                    <Text className="text-xs font-bold text-secondary flex-shrink-0">90%</Text>
                  </View>
                  <View className="flex-row items-center gap-3">
                    <View className="flex-1 bg-primary rounded-full h-2 min-w-0">
                      <View className="bg-primary rounded-full h-2" style={{width: '10%'}} />
                    </View>
                    <Text className="text-xs font-bold text-primary flex-shrink-0">10%</Text>
                  </View>
                </View>
                <View className="flex-row justify-between mt-2 px-1">
                  <Text className="text-xs text-muted-foreground">You earn</Text>
                  <Text className="text-xs text-muted-foreground">Platform fee</Text>
                </View>
              </View>

              {/* Detailed Breakdown */}
              <View className="gap-3">
                <View className="flex-row items-start gap-3 p-3 bg-secondary/10 rounded-xl border border-secondary/20">
                  <View className="w-10 h-10 bg-secondary/20 rounded-full items-center justify-center flex-shrink-0">
                    <Icon as={DollarSign} size={18} className="text-secondary" />
                  </View>
                  <View className="flex-1 min-w-0">
                    <View className="flex-row items-center gap-2 mb-1 flex-wrap">
                      <Text className="text-base font-bold text-secondary">90% You Keep</Text>
                      <View className="bg-secondary/20 px-2 py-0.5 rounded-full">
                        <Text className="text-xs font-bold text-secondary">Highest Rate</Text>
                      </View>
                    </View>
                    <Text className="text-sm text-muted-foreground leading-relaxed">Every booking payment goes directly to you after platform fee</Text>
                  </View>
                </View>

                <View className="flex-row items-start gap-3 p-3 bg-primary/10 rounded-xl border border-primary/20">
                  <View className="w-10 h-10 bg-primary/20 rounded-full items-center justify-center flex-shrink-0">
                    <Icon as={Percent} size={16} className="text-primary" />
                  </View>
                  <View className="flex-1 min-w-0">
                    <View className="flex-row items-center gap-2 mb-1 flex-wrap">
                      <Text className="text-base font-bold text-primary">10% Platform Fee</Text>
                      <View className="bg-primary/20 px-2 py-0.5 rounded-full">
                        <Text className="text-xs font-bold text-primary">Lowest Fee</Text>
                      </View>
                    </View>
                    <Text className="text-sm text-muted-foreground leading-relaxed">Covers payment processing, customer support, and platform maintenance</Text>
                  </View>
                </View>

                <View className="flex-row items-start gap-3 p-3 bg-accent/10 rounded-xl border border-accent/20">
                  <View className="w-10 h-10 bg-accent/20 rounded-full items-center justify-center flex-shrink-0">
                    <Icon as={Calendar} size={16} className="text-accent-foreground" />
                  </View>
                  <View className="flex-1 min-w-0">
                    <View className="flex-row items-center gap-2 mb-1 flex-wrap">
                      <Text className="text-base font-bold text-accent-foreground">Weekly Payouts</Text>
                      <View className="bg-accent/20 px-2 py-0.5 rounded-full">
                        <Text className="text-xs font-bold text-accent-foreground">Every Monday</Text>
                      </View>
                    </View>
                    <Text className="text-sm text-muted-foreground leading-relaxed">Payments processed automatically every Monday for completed services</Text>
                  </View>
                </View>

                <View className="flex-row items-start gap-3 p-3 bg-destructive/10 rounded-xl border border-destructive/20">
                  <View className="w-10 h-10 bg-destructive/20 rounded-full items-center justify-center flex-shrink-0">
                    <Icon as={Wallet} size={16} className="text-destructive" />
                  </View>
                  <View className="flex-1 min-w-0">
                    <View className="flex-row items-center gap-2 mb-1 flex-wrap">
                      <Text className="text-base font-bold text-destructive">£20 Minimum Payout</Text>
                      <View className="bg-destructive/20 px-2 py-0.5 rounded-full">
                        <Text className="text-xs font-bold text-destructive">Low Threshold</Text>
                      </View>
                    </View>
                    <Text className="text-sm text-muted-foreground leading-relaxed">Payouts only process when you reach the minimum £20 threshold</Text>
                  </View>
                </View>
              </View>

              {/* Trust Indicator */}
              <View className="bg-primary/10 rounded-lg p-3 mt-2 border border-primary/20">
                <View className="flex-row items-center gap-2">
                  <Icon as={CheckCircle} size={16} className="text-primary" />
                  <Text className="text-sm font-medium text-primary">100% Transparent • No Hidden Fees</Text>
                </View>
              </View>
            </CardContent>
          </Card>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
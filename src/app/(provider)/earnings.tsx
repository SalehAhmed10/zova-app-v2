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
  useStripeAccountStatus
} from '@/hooks/provider';
import { useAuthStore } from '@/stores/auth';
import { useProviderAccess } from '@/hooks/provider/useProviderAccess';
import {
  useProviderEarnings,
  useProviderPayouts,
  useProviderEarningsAnalytics
} from '@/hooks/shared/useProfileData';
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
  XCircle,
  Zap,
  Users,
  ChevronRight,
  Shield
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
  const user = useAuthStore((state) => state.user);
  const { isDarkColorScheme } = useColorScheme();
  const colors = isDarkColorScheme ? THEME.dark : THEME.light;
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('30d');
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics' | 'payouts'>('overview');

  // ✅ REACT QUERY + ZUSTAND: Access control for feature gates
  const { 
    canViewEarnings, 
    needsPaymentSetup,
    getPrimaryCTA 
  } = useProviderAccess();

  // ✅ React Query hooks - Fetch provider earnings data
  const { 
    data: earnings, 
    isLoading: earningsLoading, 
    refetch: refetchEarnings 
  } = useProviderEarnings(user?.id);

  const { 
    data: payoutHistory = [], 
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
    if (!analytics?.monthlyRevenue || analytics.monthlyRevenue.length < 2) return 0;
    const current = analytics.monthlyRevenue[analytics.monthlyRevenue.length - 1];
    const previous = analytics.monthlyRevenue[analytics.monthlyRevenue.length - 2];
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

      {/* ✅ FEATURE GATE: Earnings Screen (50-60% conversion) */}
      {!canViewEarnings && needsPaymentSetup ? (
        <ScrollView 
          className="flex-1 bg-background"
          contentContainerStyle={{ paddingVertical: 12, paddingBottom: 40, flexGrow: 1 }}
        >
          <View className="px-4 gap-6">
            {/* Decorative Hero Element */}
            <View className="relative h-40 rounded-3xl overflow-hidden -mx-4 mb-2">
              <View className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20" />
              <View className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
              <View className="absolute bottom-0 left-0 w-48 h-48 bg-accent/10 rounded-full blur-3xl" />
              
              <View className="absolute inset-0 items-center justify-center">
                <View className="w-28 h-28 bg-primary/15 rounded-full items-center justify-center">
                  <View className="w-20 h-20 bg-primary/25 rounded-full items-center justify-center">
                    <Wallet size={48} className="text-primary" />
                  </View>
                </View>
              </View>
            </View>

            {/* Premium Onboarding Card */}
            <Card className="border-0 overflow-hidden">
              <CardContent className="p-6 gap-4">
                {/* Main Headline */}
                <View className="gap-2">
                  <Text className="text-3xl font-bold text-foreground leading-tight">
                    Unlock Your Earning Potential
                  </Text>
                  <Text className="text-muted-foreground text-base leading-relaxed">
                    Complete your payment setup in just 2 minutes to start accepting bookings and earning money.
                  </Text>
                </View>

                {/* Key Benefits - Enhanced Layout */}
                <View className="gap-3 mt-2">
                  {/* Benefit 1 - Secure Payments */}
                  <View className="flex-row items-center gap-4 p-3 rounded-2xl bg-green-500/10 border border-green-500/25">
                    <View className="w-12 h-12 bg-green-500/20 rounded-xl items-center justify-center flex-shrink-0">
                      <Icon as={CheckCircle} size={24} className="text-green-600 dark:text-green-400" />
                    </View>
                    <View className="flex-1 gap-0.5">
                      <Text className="font-semibold text-foreground text-base">Secure Payments</Text>
                      <Text className="text-muted-foreground text-sm">Powered by Stripe's bank-level security</Text>
                    </View>
                  </View>

                  {/* Benefit 2 - Real-Time Tracking */}
                  <View className="flex-row items-center gap-4 p-3 rounded-2xl bg-blue-500/10 border border-blue-500/25">
                    <View className="w-12 h-12 bg-blue-500/20 rounded-xl items-center justify-center flex-shrink-0">
                      <Icon as={TrendingUp} size={24} className="text-blue-600 dark:text-blue-400" />
                    </View>
                    <View className="flex-1 gap-0.5">
                      <Text className="font-semibold text-foreground text-base">Real-Time Tracking</Text>
                      <Text className="text-muted-foreground text-sm">Monitor earnings as bookings come in</Text>
                    </View>
                  </View>

                  {/* Benefit 3 - Fast Payouts */}
                  <View className="flex-row items-center gap-4 p-3 rounded-2xl bg-secondary/10 border border-secondary/25">
                    <View className="w-12 h-12 bg-secondary/20 rounded-xl items-center justify-center flex-shrink-0">
                      <Icon as={Zap} size={24} className="text-secondary" />
                    </View>
                    <View className="flex-1 gap-0.5">
                      <Text className="font-semibold text-foreground text-base">Fast Payouts</Text>
                      <Text className="text-muted-foreground text-sm">Weekly transfers to your bank account</Text>
                    </View>
                  </View>

                  {/* Benefit 4 - More Bookings */}
                  <View className="flex-row items-center gap-4 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/25">
                    <View className="w-12 h-12 bg-amber-500/20 rounded-xl items-center justify-center flex-shrink-0">
                      <Icon as={Users} size={24} className="text-amber-600 dark:text-amber-400" />
                    </View>
                    <View className="flex-1 gap-0.5">
                      <Text className="font-semibold text-foreground text-base">More Bookings</Text>
                      <Text className="text-muted-foreground text-sm">Unlock premium features and visibility</Text>
                    </View>
                  </View>
                </View>

                {/* Earning Projection */}
                <View className="mt-2 p-4 rounded-2xl bg-primary/10 dark:bg-primary/15 border border-primary/25 dark:border-primary/30 gap-2">
                  <View className="flex-row items-center gap-2">
                    <Icon as={Zap} size={18} color={isDarkColorScheme ? colors.primary : colors.primary} />
                    <Text className="font-semibold text-primary text-base">Quick Win</Text>
                  </View>
                  <Text className="text-foreground font-bold text-lg">90% of providers earn within first week</Text>
                  <Text className="text-muted-foreground text-xs">Complete setup now to join successful providers</Text>
                </View>
              </CardContent>
            </Card>

            {/* CTA Button - Primary */}
            <Button 
              size="lg" 
              className="w-full h-14"
              onPress={() => router.push('/(provider)/setup-payment' as any)}
            >
              <Icon as={Wallet} size={20} className="text-primary-foreground mr-2" />
              <Text className="font-bold text-primary-foreground text-base">
                Setup Payments Now
              </Text>
              <Icon as={ChevronRight} size={20} className="text-primary-foreground ml-2" />
            </Button>

            {/* Trust & Info Section */}
            <View className="gap-4">
              {/* Trust Badges */}
              <View className="flex-row gap-2 justify-center">
                <View className="flex-row items-center gap-1.5 px-3 py-2 bg-card rounded-full border border-border">
                  <Icon as={Shield} size={14} color={isDarkColorScheme ? colors.primary : colors.primary} />
                  <Text className="text-xs font-medium text-muted-foreground">Secure</Text>
                </View>
                <View className="flex-row items-center gap-1.5 px-3 py-2 bg-card rounded-full border border-border">
                  <Icon as={Clock} size={14} color={isDarkColorScheme ? colors.secondary : colors.secondary} />
                  <Text className="text-xs font-medium text-muted-foreground">2 min setup</Text>
                </View>
                <View className="flex-row items-center gap-1.5 px-3 py-2 bg-card rounded-full border border-border">
                  <Icon as={CheckCircle} size={14} color={isDarkColorScheme ? '#4ade80' : '#16a34a'} />
                  <Text className="text-xs font-medium text-muted-foreground">100+ reviews</Text>
                </View>
              </View>

              {/* Bottom Info */}
              <View className="gap-2">
                <Text className="text-center text-muted-foreground text-xs leading-relaxed">
                  By connecting Stripe, you agree to their Terms. No credit card required to get started.
                </Text>
                <View className="flex-row items-center justify-center gap-1">
                  <Text className="text-muted-foreground text-xs">Powered by</Text>
                  <View className="px-2 py-1 bg-card rounded border border-border/50">
                    <Text className="text-xs font-bold text-foreground">Stripe</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      ) : (
        <>
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
                        <Text className="text-muted-foreground text-xs leading-relaxed">
                          Complete your Stripe account setup to receive payments from customers.
                        </Text>
                        <Button
                          size="sm"
                          onPress={() => router.push('/(provider)/setup-payment' as any)}
                          className="self-start"
                        >
                          <Text className="text-primary-foreground font-medium">Complete Setup</Text>
                        </Button>
                      </View>
                    </View>
                  </CardContent>
                </Card>
              )}

          {/* Premium Earnings Summary - Hero Card */}
          <View className="gap-4">
            {/* Main Earnings Hero Card - Glassmorphic Style */}
            <Card className="bg-gradient-to-br from-primary/90 to-primary/70 border-0 overflow-hidden">
              <View className="absolute top-0 right-0 w-40 h-40 bg-primary-foreground/10 rounded-full blur-3xl" />
              <CardContent className="p-6 relative z-10">
                <View className="flex-row items-center justify-between mb-4">
                  <View>
                    <Text className="text-primary-foreground/80 text-sm font-medium">Total Earnings</Text>
                    <Text className="text-primary-foreground text-4xl font-bold mt-1">
                      {earningsLoading ? '...' : formatCurrency(earnings?.totalEarnings || 0)}
                    </Text>
                  </View>
                  <View className="items-center justify-center w-16 h-16 bg-primary-foreground/20 rounded-2xl">
                    <View className="flex-row items-center gap-1">
                      {growthRate > 0 && <Icon as={ArrowUpRight} size={20} color={colors.primaryForeground} />}
                      <Text className="text-primary-foreground font-bold text-lg">
                        {growthRate > 0 ? '+' : ''}{growthRate.toFixed(1)}%
                      </Text>
                    </View>
                  </View>
                </View>
                <View className="h-px bg-primary-foreground/20 mb-4" />
                <View className="flex-row justify-between">
                  <View>
                    <Text className="text-primary-foreground/70 text-xs">This Month</Text>
                    <Text className="text-primary-foreground font-bold text-lg">
                      {earningsLoading ? '...' : formatCurrency(earnings?.thisMonth || 0)}
                    </Text>
                  </View>
                  <View>
                    <Text className="text-primary-foreground/70 text-xs">Pending</Text>
                    <Text className="text-primary-foreground font-bold text-lg">
                      {earningsLoading ? '...' : formatCurrency(earnings?.pendingPayouts || 0)}
                    </Text>
                  </View>
                  <View>
                    <Text className="text-primary-foreground/70 text-xs">Bookings</Text>
                    <Text className="text-primary-foreground font-bold text-lg">
                      {earningsLoading ? '...' : earnings?.completedBookings || 0}
                    </Text>
                  </View>
                </View>
              </CardContent>
            </Card>

            {/* Elegant Stat Cards - 2 Column Grid */}
            <View className="gap-3">
              <View className="flex-row gap-3">
                {/* Avg Per Booking */}
                <Card className="flex-1 bg-card border-border/50">
                  <CardContent className="p-4">
                    <View className="flex-row items-center justify-between mb-3">
                      <View className="w-10 h-10 bg-secondary/20 rounded-xl items-center justify-center">
                        <Icon as={TrendingUp} size={20} className="text-secondary" />
                      </View>
                      <Badge className="bg-secondary/20 border-0">
                        <Text className="text-secondary text-xs font-medium">Avg</Text>
                      </Badge>
                    </View>
                    <Text className="text-muted-foreground text-xs font-medium mb-1">Per Booking</Text>
                    <Text className="text-foreground text-xl font-bold">
                      {earningsLoading ? '...' : formatCurrency(((earnings?.totalEarnings || 0) / Math.max(earnings?.completedBookings || 1, 1)))}
                    </Text>
                  </CardContent>
                </Card>

                {/* Projected Monthly */}
                <Card className="flex-1 bg-card border-border/50">
                  <CardContent className="p-4">
                    <View className="flex-row items-center justify-between mb-3">
                      <View className="w-10 h-10 bg-accent/20 rounded-xl items-center justify-center">
                        <Icon as={Target} size={20} className="text-accent-foreground" />
                      </View>
                      <Badge className="bg-accent/20 border-0">
                        <Text className="text-accent-foreground text-xs font-medium">Est.</Text>
                      </Badge>
                    </View>
                    <Text className="text-muted-foreground text-xs font-medium mb-1">Projected</Text>
                    <Text className="text-foreground text-xl font-bold">
                      {earningsLoading ? '...' : formatCurrency((earnings?.thisMonth || 0) / Math.max(new Date().getDate(), 1) * 30)}
                    </Text>
                  </CardContent>
                </Card>
              </View>

              <View className="flex-row gap-3">
                {/* Completion Rate */}
                <Card className="flex-1 bg-card border-border/50">
                  <CardContent className="p-4">
                    <View className="flex-row items-center justify-between mb-3">
                      <View className="w-10 h-10 bg-green-500/20 rounded-xl items-center justify-center">
                        <Icon as={CheckCircle} size={20} className="text-green-600 dark:text-green-400" />
                      </View>
                      <Badge className="bg-green-500/20 border-0">
                        <Text className="text-green-600 dark:text-green-400 text-xs font-medium">Active</Text>
                      </Badge>
                    </View>
                    <Text className="text-muted-foreground text-xs font-medium mb-1">Completed</Text>
                    <Text className="text-foreground text-xl font-bold">
                      {earningsLoading ? '...' : `${earnings?.completedBookings || 0}`}
                    </Text>
                  </CardContent>
                </Card>

                {/* Monthly Bookings */}
                <Card className="flex-1 bg-card border-border/50">
                  <CardContent className="p-4">
                    <View className="flex-row items-center justify-between mb-3">
                      <View className="w-10 h-10 bg-secondary/20 rounded-xl items-center justify-center">
                        <Icon as={Calendar} size={20} className="text-secondary" />
                      </View>
                      <Badge className="bg-secondary/20 border-0">
                        <Text className="text-secondary text-xs font-medium">Rate</Text>
                      </Badge>
                    </View>
                    <Text className="text-muted-foreground text-xs font-medium mb-1">Avg/Month</Text>
                    <Text className="text-foreground text-xl font-bold">
                      {earningsLoading ? '...' : `${(((earnings?.completedBookings || 0) / Math.max(Math.ceil((new Date().getTime() - new Date(user?.created_at || Date.now()).getTime()) / (1000 * 60 * 60 * 24 * 30)), 1))).toFixed(1)}`}
                    </Text>
                  </CardContent>
                </Card>
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
                ) : analytics?.monthlyRevenue && analytics.monthlyRevenue.length > 0 ? (
                  <View style={{ backgroundColor: isDarkColorScheme ? '#1e293b' : '#ffffff', borderRadius: 16, padding: 8 }}>
                    <LineChart
                      data={{
                        labels: Array.from({ length: 6 }, (_, i) => `M${i + 1}`),
                        datasets: [{
                          data: analytics.monthlyRevenue.slice(-6),
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
                ) : analytics?.topServices && analytics.topServices.length > 0 ? (
                  <View style={{ backgroundColor: isDarkColorScheme ? '#1e293b' : '#ffffff', borderRadius: 16, padding: 8 }}>
                    <BarChart
                      data={{
                        labels: analytics.topServices.slice(0, 5).map(s => s.service_name.substring(0, 8) + (s.service_name.length > 8 ? '...' : '')),
                        datasets: [{
                          data: analytics.topServices.slice(0, 5).map(s => s.revenue),
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
              {/* Premium Next Payout Card - Glassmorphic */}
              <Card className="bg-gradient-to-br from-secondary/90 to-secondary/70 border-0 overflow-hidden">
                <View className="absolute top-0 right-0 w-32 h-32 bg-secondary-foreground/10 rounded-full blur-3xl" />
                <CardContent className="p-6 relative z-10">
                  <View className="flex-row items-start justify-between mb-4">
                    <View className="flex-1">
                      <Text className="text-secondary-foreground/70 text-sm font-medium mb-2">Next Payout</Text>
                      <Text className="text-secondary-foreground text-3xl font-bold">
                        {formatCurrency(earnings?.pendingPayouts || 0)}
                      </Text>
                      <Text className="text-secondary-foreground/60 text-xs mt-1">
                        {earnings?.nextPayoutDate || 'N/A'}
                      </Text>
                    </View>
                    <View className="items-center justify-center w-14 h-14 bg-secondary-foreground/20 rounded-2xl">
                      <Icon as={Wallet} size={28} color={colors.secondaryForeground} />
                    </View>
                  </View>
                  <View className="h-px bg-secondary-foreground/20 mb-3" />
                  <View className="flex-row items-center gap-2 px-3 py-2 bg-secondary-foreground/10 rounded-xl">
                    <Icon as={Clock} size={14} className="text-secondary-foreground" />
                    <Text className="text-secondary-foreground/80 text-xs font-medium">
                      Processed every Monday • 2-7 business days delivery
                    </Text>
                  </View>
                </CardContent>
              </Card>

              {/* Enhanced Payout History */}
              <Card>
                <CardHeader className="pb-3">
                  <View className="flex-row items-center justify-between">
                    <CardTitle className="flex-row items-center">
                      <Icon as={Activity} size={20} className="text-secondary mr-2" />
                      Recent Payouts
                    </CardTitle>
                    <Badge className="bg-primary/20">
                      <Text className="text-primary">{payoutHistory?.length || 0} total</Text>
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
                    <View className="gap-2">
                      {payoutHistory.slice(0, 5).map((payout) => (
                        <View key={payout.id} className="flex-row items-center gap-4 p-4 bg-muted/50 rounded-xl border border-border/30 hover:border-border/60 transition-colors">
                          {/* Status Icon */}
                          <View className={`w-12 h-12 rounded-full items-center justify-center flex-shrink-0 ${
                            payout.status === 'completed' ? 'bg-green-500/20' :
                            payout.status === 'pending' ? 'bg-yellow-500/20' :
                            payout.status === 'processing' ? 'bg-blue-500/20' :
                            'bg-destructive/20'
                          }`}>
                            <Icon
                              as={payout.status === 'completed' ? CheckCircle :
                                  payout.status === 'pending' ? Clock :
                                  payout.status === 'processing' ? TrendingUp :
                                  XCircle}
                              size={20}
                              className={`${
                                payout.status === 'completed' ? 'text-green-600 dark:text-green-400' :
                                payout.status === 'pending' ? 'text-yellow-600 dark:text-yellow-400' :
                                payout.status === 'processing' ? 'text-blue-600 dark:text-blue-400' :
                                'text-destructive'
                              }`}
                            />
                          </View>

                          {/* Payout Details */}
                          <View className="flex-1 min-w-0">
                            <View className="flex-row items-center justify-between mb-1">
                              <Text className="text-foreground font-bold text-lg">
                                {formatCurrency(payout.amount)}
                              </Text>
                              <Badge className={`${
                                payout.status === 'completed' ? 'bg-green-500/20 border-0' :
                                payout.status === 'pending' ? 'bg-yellow-500/20 border-0' :
                                payout.status === 'processing' ? 'bg-blue-500/20 border-0' :
                                'bg-destructive/20 border-0'
                              }`}>
                                <Text className={`${
                                  payout.status === 'completed' ? 'text-green-600 dark:text-green-400' :
                                  payout.status === 'pending' ? 'text-yellow-600 dark:text-yellow-400' :
                                  payout.status === 'processing' ? 'text-blue-600 dark:text-blue-400' :
                                  'text-destructive'
                                } text-xs font-bold`}>{getStatusText(payout.status)}</Text>
                              </Badge>
                            </View>
                            <View className="flex-row items-center gap-1">
                              <Icon as={Calendar} size={12} className="text-muted-foreground" />
                              <Text className="text-muted-foreground text-xs">
                                {new Date(payout.expected_payout_date || payout.actual_payout_date || '').toLocaleDateString('en-GB', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric'
                                })}
                              </Text>
                            </View>
                          </View>
                        </View>
                      ))}
                      {payoutHistory.length > 5 && (
                        <TouchableOpacity className="items-center py-4 mt-2 border-t border-border/30">
                          <View className="flex-row items-center px-4 py-2 bg-primary/10 rounded-full">
                            <Text className="text-primary font-semibold text-sm">View All Payouts</Text>
                            <Icon as={ArrowUpRight} size={14} className="text-primary ml-2" />
                          </View>
                        </TouchableOpacity>
                      )}
                    </View>
                  ) : (
                    <View className="items-center justify-center py-12">
                      <View className="w-16 h-16 bg-primary/10 rounded-full items-center justify-center mb-3">
                        <Icon as={Wallet} size={32} className="text-primary" />
                      </View>
                      <Text className="text-foreground font-semibold mb-1">No Payouts Yet</Text>
                      <Text className="text-muted-foreground text-sm text-center">
                        Complete bookings to start earning and receiving payouts
                      </Text>
                    </View>
                  )}
                </CardContent>
              </Card>

              {/* Beautiful Commission Info Section */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex-row items-center text-primary">
                    <View className="w-8 h-8 bg-primary/20 rounded-full items-center justify-center mr-3">
                      <Icon as={Target} size={18} className="text-primary" />
                    </View>
                    Earnings Structure
                  </CardTitle>
                </CardHeader>
                <CardContent className="gap-4">
                  {/* Visual Split Bar */}
                  <View className="bg-muted rounded-2xl p-4">
                    <Text className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Distribution</Text>
                    <View className="bg-background rounded-full h-3 overflow-hidden mb-3">
                      <View className="flex-row h-full">
                        <View className="flex-[9] bg-gradient-to-r from-secondary to-secondary-foreground/50" />
                        <View className="flex-1 bg-primary" />
                      </View>
                    </View>
                    <View className="flex-row justify-between">
                      <View>
                        <Text className="text-xs text-muted-foreground mb-1">You Keep</Text>
                        <Text className="text-lg font-bold text-secondary">90%</Text>
                      </View>
                      <View className="items-end">
                        <Text className="text-xs text-muted-foreground mb-1">Platform Fee</Text>
                        <Text className="text-lg font-bold text-primary">10%</Text>
                      </View>
                    </View>
                  </View>

                  {/* Info Cards */}
                  <View className="gap-3">
                    {[
                      {
                        icon: DollarSign,
                        color: 'secondary',
                        title: '90% You Keep',
                        desc: 'Every booking goes directly to your account',
                        tag: 'Highest Rate'
                      },
                      {
                        icon: Percent,
                        color: 'primary',
                        title: '10% Platform Fee',
                        desc: 'Payment processing, support & maintenance',
                        tag: 'Lowest Fee'
                      },
                      {
                        icon: Calendar,
                        color: 'accent',
                        title: 'Weekly Payouts',
                        desc: 'Processed automatically every Monday',
                        tag: 'Every Monday'
                      },
                      {
                        icon: Wallet,
                        color: 'destructive',
                        title: '£20 Minimum',
                        desc: 'Payouts process when you reach threshold',
                        tag: 'Low Threshold'
                      }
                    ].map((item, idx) => (
                      <View key={idx} className="flex-row items-start gap-3 p-3 bg-muted/50 rounded-xl border border-border/30">
                        <View className={`w-10 h-10 rounded-xl items-center justify-center flex-shrink-0 ${
                          item.color === 'secondary' ? 'bg-secondary/20' :
                          item.color === 'primary' ? 'bg-primary/20' :
                          item.color === 'accent' ? 'bg-accent/20' :
                          'bg-destructive/20'
                        }`}>
                          <Icon
                            as={item.icon}
                            size={18}
                            className={
                              item.color === 'secondary' ? 'text-secondary' :
                              item.color === 'primary' ? 'text-primary' :
                              item.color === 'accent' ? 'text-accent-foreground' :
                              'text-destructive'
                            }
                          />
                        </View>
                        <View className="flex-1 min-w-0">
                          <View className="flex-row items-center justify-between mb-1">
                            <Text className="text-foreground font-semibold text-sm">
                              {item.title}
                            </Text>
                            <Badge className="bg-muted border-0 px-2 py-0.5">
                              <Text className="text-muted-foreground text-xs font-medium">{item.tag}</Text>
                            </Badge>
                          </View>
                          <Text className="text-muted-foreground text-xs leading-relaxed">
                            {item.desc}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>

                  {/* Trust Badge */}
                  <View className="bg-primary/5 border border-primary/20 rounded-xl p-3 flex-row items-center gap-2">
                    <Icon as={CheckCircle} size={16} className="text-primary" />
                    <Text className="text-primary text-xs font-semibold">100% Transparent • Zero Hidden Fees</Text>
                  </View>
                </CardContent>
              </Card>
            </>
          )}
        </View>
      </ScrollView>
        </>
      )}
    </SafeAreaView>
  );
}
import React from 'react';
import { View, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/stores/auth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useColorScheme } from '@/lib/core/useColorScheme';
import { cn } from '@/lib/utils';
import { THEME } from '@/lib/theme';
import { useProviderPremiumStatus } from '@/hooks/shared/useSubscription';
import { Icon } from '@/components/ui/icon';
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  CheckCircle,
  Star,
  DollarSign,
  BarChart3,
  Lock,
  Eye,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  Crown,
  MessageCircle,
  XCircle,
  Users,
  Target,
  ArrowLeft,
  ArrowRight
} from 'lucide-react-native';

interface AnalyticsData {
  totalBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  totalEarnings: number; // Changed from totalRevenue to totalEarnings
  averageRating: number;
  totalReviews: number;
  monthlyEarnings: { month: string; earnings: number }[]; // Added monthly earnings
  monthlyBookings: { month: string; count: number }[];
  topServices: { service_title: string; count: number }[];
  profileViews: number; // Added profile views
  serviceViews: number; // Added service views
  profileViewsThisMonth: number; // Added this month profile views
  serviceViewsThisMonth: number; // Added this month service views
  topViewedServices: { service_title: string; service_id: string; category_name: string; subcategory_name: string; view_count: number; base_price: number; price_type: string }[]; // Added top viewed services
}

interface AnalyticsData {
  totalBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  totalEarnings: number;
  averageRating: number;
  totalReviews: number;
  monthlyEarnings: { month: string; earnings: number }[];
  monthlyBookings: { month: string; count: number }[];
  topServices: { service_title: string; count: number }[];
  profileViews: number;
  serviceViews: number;
  profileViewsThisMonth: number;
  serviceViewsThisMonth: number;
  topViewedServices: { service_title: string; service_id: string; category_name: string; subcategory_name: string; view_count: number; base_price: number; price_type: string }[];
}

export default function ProviderAnalyticsScreen() {
  const user = useAuthStore((state) => state.user);
  const { colorScheme } = useColorScheme();
  const colors = THEME[colorScheme];
  const [activeTab, setActiveTab] = React.useState<'overview' | 'performance' | 'visibility'>('overview');
  const screenWidth = Dimensions.get('window').width;

  // Check premium subscription
  const { hasSubscription: premiumSubscription, isLoading: subscriptionLoading } = useProviderPremiumStatus();

  // Always call the analytics query hook (Rules of Hooks)
  const {
    data: analytics,
    isLoading: analyticsLoading,
    refetch
  } = useQuery({
    queryKey: ['providerAnalytics', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('User not authenticated');

      // Get booking statistics
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          id,
          status,
          total_amount,
          service_id,
          created_at,
          provider_services!inner(title)
        `)
        .eq('provider_id', user.id);

      if (bookingsError) throw bookingsError;

      // Get provider payouts for accurate earnings calculation
      const { data: payouts, error: payoutsError } = await supabase
        .from('provider_payouts')
        .select('amount, status, created_at')
        .eq('provider_id', user.id);

      if (payoutsError) throw payoutsError;

      // Get reviews statistics
      const { data: reviews, error: reviewsError } = await supabase
        .from('reviews')
        .select('rating')
        .eq('provider_id', user.id);

      if (reviewsError) throw reviewsError;

      // Calculate metrics
      const totalBookings = bookings?.length || 0;
      const completedBookings = bookings?.filter(b => b.status === 'completed').length || 0;
      const cancelledBookings = bookings?.filter(b => b.status === 'cancelled').length || 0;
      
      // Use processed payouts for accurate earnings (industry standard)
      const totalEarnings = payouts?.filter(p => 
        p.status === 'paid' || p.status === 'completed' || p.status === 'pending' || p.status === 'processing'
      ).reduce((sum, payout) => sum + parseFloat(payout.amount || '0'), 0) || 0;
      
      const averageRating = reviews && reviews.length > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        : 0;

      // Monthly earnings from payouts (last 6 months)
      const monthlyEarnings = [];
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthName = month.toLocaleDateString('en-US', { month: 'short' });
        const earnings = payouts?.filter(p => {
          const payoutDate = new Date(p.created_at);
          return payoutDate.getMonth() === month.getMonth() &&
                 payoutDate.getFullYear() === month.getFullYear() &&
                 (p.status === 'paid' || p.status === 'completed' || p.status === 'pending' || p.status === 'processing');
        }).reduce((sum, p) => sum + parseFloat(p.amount || '0'), 0) || 0;
        monthlyEarnings.push({ month: monthName, earnings });
      }

      // Monthly bookings (last 6 months)
      const monthlyBookings = [];
      for (let i = 5; i >= 0; i--) {
        const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthName = month.toLocaleDateString('en-US', { month: 'short' });
        const count = bookings?.filter(b => {
          const bookingDate = new Date(b.created_at);
          return bookingDate.getMonth() === month.getMonth() &&
                 bookingDate.getFullYear() === month.getFullYear();
        }).length || 0;
        monthlyBookings.push({ month: monthName, count });
      }

      // Top services
      const serviceCounts: Record<string, number> = {};
      bookings?.forEach(booking => {
        if (booking.provider_services?.[0]?.title) {
          const serviceTitle = booking.provider_services[0].title;
          serviceCounts[serviceTitle] = (serviceCounts[serviceTitle] || 0) + 1;
        }
      });
      const topServices = Object.entries(serviceCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([service_title, count]) => ({ service_title, count }));

      // Get profile views statistics
      const { data: profileViews, error: profileViewsError } = await supabase
        .from('profile_views')
        .select('id, viewed_at')
        .eq('provider_id', user.id);

      if (profileViewsError) throw profileViewsError;

      // Get service views statistics with service details
      const { data: serviceViews, error: serviceViewsError } = await supabase
        .from('service_views')
        .select(`
          id,
          viewed_at,
          service_id,
          provider_services(
            id,
            title,
            description,
            base_price,
            price_type,
            service_subcategories:subcategory_id(
              name,
              service_categories:category_id(name)
            ),
            service_categories:category_id(name)
          )
        `)
        .eq('provider_id', user.id);

      if (serviceViewsError) throw serviceViewsError;

      // Calculate view metrics
      const totalProfileViews = profileViews?.length || 0;
      const totalServiceViews = serviceViews?.length || 0;

      // Profile views this month
      const thisMonth = new Date();
      thisMonth.setDate(1); // Start of current month
      const profileViewsThisMonth = profileViews?.filter(view => {
        const viewDate = new Date(view.viewed_at);
        return viewDate >= thisMonth;
      }).length || 0;

      // Service views this month
      const serviceViewsThisMonth = serviceViews?.filter(view => {
        const viewDate = new Date(view.viewed_at);
        return viewDate >= thisMonth;
      }).length || 0;

      // Calculate top viewed services
      const serviceViewCounts: Record<string, { count: number; service: any }> = {};
      serviceViews?.forEach(view => {
        const serviceId = view.service_id;
        if (!serviceViewCounts[serviceId]) {
          serviceViewCounts[serviceId] = {
            count: 0,
            service: view.provider_services
          };
        }
        serviceViewCounts[serviceId].count += 1;
      });

      const topViewedServices = Object.entries(serviceViewCounts)
        .sort(([,a], [,b]) => b.count - a.count)
        .slice(0, 10)
        .map(([service_id, { count, service }]) => {
          const subcategory = service.service_subcategories;
          const categoryFromSubcategory = subcategory?.service_categories;
          const directCategory = service.service_categories;
          
          return {
            service_title: service.title,
            service_id,
            category_name: categoryFromSubcategory?.name || directCategory?.name || 'Uncategorized',
            subcategory_name: subcategory?.name || 'General',
            view_count: count,
            base_price: service.base_price,
            price_type: service.price_type
          };
        });

      return {
        totalBookings,
        completedBookings,
        cancelledBookings,
        totalEarnings, // Changed from totalRevenue to totalEarnings
        averageRating,
        totalReviews: reviews?.length || 0,
        monthlyEarnings, // Added monthly earnings data
        monthlyBookings,
        topServices,
        profileViews: totalProfileViews,
        serviceViews: totalServiceViews,
        profileViewsThisMonth,
        serviceViewsThisMonth,
        topViewedServices,
      } as AnalyticsData;
    },
    enabled: !!user?.id && !!premiumSubscription, // Only fetch if user exists and has premium
  });

  // Premium upgrade component - Modern Design
  const PremiumUpgradePrompt = () => (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      {/* Modern Header with Gradient Background */}
      <View className="px-4 py-4 border-b border-border/20 bg-gradient-to-r from-primary/10 to-primary/5 backdrop-blur-sm">
        <View className="flex-row items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onPress={() => router.back()}
            className="w-10 h-10 p-0"
          >
            <Icon as={ArrowLeft} size={24} className="text-primary" />
          </Button>
          <Text className="text-lg font-bold text-foreground">
            Premium Analytics
          </Text>
          <View className="w-10" />
        </View>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} bounces={false}>
        <View className="px-4 py-8 gap-6">
          {/* Hero Card with Premium Badge */}
          <View>
            <Card className="bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border-2 border-primary/30 overflow-hidden">
              <View className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full opacity-50" style={{ marginRight: -12, marginTop: -12 }} />
              <CardContent className="p-6 relative z-10">
                <View className="items-center mb-6">
                  <View className="w-20 h-20 bg-gradient-to-br from-primary/30 to-primary/10 rounded-2xl items-center justify-center mb-4">
                    <Icon as={Crown} size={44} className="text-primary" />
                  </View>
                  <Badge className="bg-primary/20 border-primary/40 mb-4">
                    <Text className="text-xs font-bold text-primary">EXCLUSIVE OFFER</Text>
                  </Badge>
                </View>

                <Text className="text-2xl font-bold text-foreground text-center mb-2">
                  Unlock Full Potential
                </Text>
                <Text className="text-sm text-muted-foreground text-center leading-5">
                  Get deep insights into your business performance and dominate your market
                </Text>
              </CardContent>
            </Card>
          </View>

          {/* Premium Features Grid */}
          <View>
            <View className="gap-3">
              <Text className="text-lg font-bold text-foreground px-1">What You'll Get</Text>
              
              {[
                { icon: BarChart3, title: 'Advanced Metrics', desc: 'Real-time performance tracking' },
                { icon: DollarSign, title: 'Earnings Insights', desc: 'Detailed financial analytics' },
                { icon: TrendingUp, title: 'Growth Trends', desc: 'Business recommendations' },
                { icon: Eye, title: 'Visibility Boost', desc: 'Enhanced search placement' },
              ].map((feature, i) => (
                <Card key={i} className="bg-card border-border/50 hover:border-primary/50 transition-colors">
                  <CardContent className="p-4 flex-row items-center gap-4">
                    <View className="w-12 h-12 bg-primary/10 rounded-xl items-center justify-center flex-shrink-0">
                      <Icon as={feature.icon} size={20} className="text-primary" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-sm font-bold text-foreground mb-0.5">
                        {feature.title}
                      </Text>
                      <Text className="text-xs text-muted-foreground">
                        {feature.desc}
                      </Text>
                    </View>
                    <Icon as={CheckCircle} size={18} className="text-success" />
                  </CardContent>
                </Card>
              ))}
            </View>
          </View>

          {/* Pricing Card - Hero Style */}
          <View>
            <Card className="bg-gradient-to-br from-primary/15 to-primary/5 border-2 border-primary/20">
              <CardContent className="p-8 items-center">
                <Text className="text-sm font-semibold text-primary mb-2 uppercase tracking-wide">
                  SPECIAL PRICE
                </Text>
                <View className="flex-row items-baseline gap-1 mb-2">
                  <Text className="text-5xl font-bold text-primary">£5.99</Text>
                  <Text className="text-lg text-muted-foreground">/month</Text>
                </View>
                <Text className="text-xs text-muted-foreground text-center mb-4">
                  7 days free • Cancel anytime
                </Text>
                <View className="border-t border-primary/20 pt-4 w-full">
                  <View className="flex-row items-center justify-center gap-4">
                    <View className="items-center">
                      <Icon as={Lock} size={16} className="text-primary mb-1" />
                      <Text className="text-xs text-muted-foreground">Secure</Text>
                    </View>
                    <View className="w-px h-8 bg-border" />
                    <View className="items-center">
                      <Icon as={Zap} size={16} className="text-primary mb-1" />
                      <Text className="text-xs text-muted-foreground">Instant</Text>
                    </View>
                    <View className="w-px h-8 bg-border" />
                    <View className="items-center">
                      <Icon as={CheckCircle} size={16} className="text-primary mb-1" />
                      <Text className="text-xs text-muted-foreground">No Risk</Text>
                    </View>
                  </View>
                </View>
              </CardContent>
            </Card>
          </View>

          {/* Call-to-Action Section */}
          <View className="gap-3">
            <Button 
              onPress={() => router.push('/(provider)/profile/subscriptions')}
              className="h-14 flex-row items-center justify-center gap-2"
            >
              <Icon as={Sparkles} size={18} className="text-primary-foreground" />
              <Text className="font-bold text-base text-primary-foreground">Start Free Trial</Text>
              <Icon as={ArrowRight} size={18} className="text-primary-foreground" />
            </Button>

            <Button
              variant="outline"
              onPress={() => router.back()}
              className="h-12"
            >
              <Text className="font-semibold">Maybe Later</Text>
            </Button>
          </View>

          {/* Trust Footer */}
          <View className="items-center pt-2">
            <Text className="text-xs text-muted-foreground text-center leading-4">
              <Text className="font-semibold text-success">✓ Trusted by 1,000+</Text> service providers • <Text className="font-semibold text-primary">30-day money-back</Text> guarantee
            </Text>
          </View>

          <View className="h-4" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );

  // Show loading while checking subscription
  if (subscriptionLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={['top']}>
        <View className="px-4 py-4 border-b border-border">
          <View className="flex-row items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onPress={() => router.back()}
              className="w-8 h-8 p-0"
            >
              <Icon as={ArrowLeft} size={24} className="text-primary" />
            </Button>
            <Text className="text-xl font-bold text-foreground">
              Business Analytics
            </Text>
            <View className="w-8" />
          </View>
        </View>
        <View className="flex-1 items-center justify-center">
          <Skeleton className="w-12 h-12 rounded-full mb-4" />
          <Skeleton className="w-48 h-6" />
        </View>
      </SafeAreaView>
    );
  }

  // Show upgrade prompt if no premium subscription
  if (!premiumSubscription) {
    return <PremiumUpgradePrompt />;
  }

  // Modern Stats Component with gradient background
  const StatCard = React.memo(({
    label,
    value,
    IconComponent,
    trend,
    isLoading = false,
    variant = 'default',
    animated = false
  }: {
    label: string;
    value: string;
    IconComponent: any;
    trend?: 'up' | 'down' | 'neutral';
    isLoading?: boolean;
    variant?: 'default' | 'primary' | 'success' | 'warning' | 'destructive';
    animated?: boolean;
  }) => {
    const getVariantStyles = () => {
      switch(variant) {
        case 'primary': return {
          bg: 'bg-gradient-to-br from-primary/15 to-primary/5',
          border: 'border-primary/20',
          icon: 'text-primary'
        };
        case 'success': return {
          bg: 'bg-gradient-to-br from-success/15 to-success/5',
          border: 'border-success/20',
          icon: 'text-success'
        };
        case 'warning': return {
          bg: 'bg-gradient-to-br from-warning/15 to-warning/5',
          border: 'border-warning/20',
          icon: 'text-warning'
        };
        case 'destructive': return {
          bg: 'bg-gradient-to-br from-destructive/15 to-destructive/5',
          border: 'border-destructive/20',
          icon: 'text-destructive'
        };
        default: return {
          bg: 'bg-gradient-to-br from-secondary/15 to-secondary/5',
          border: 'border-secondary/20',
          icon: 'text-foreground'
        };
      }
    };

    const styles = getVariantStyles();
    const AnimationWrapper = View;
    const animationProps = {};

    return (
      <AnimationWrapper
        {...animationProps}
        className={cn(
          "flex-1 rounded-2xl p-4 border",
          styles.bg,
          styles.border
        )}
        accessibilityLabel={`${label}: ${value}`}
      >
        <View className="gap-3">
          {/* Icon Background */}
          <View className={cn(
            "w-12 h-12 rounded-xl items-center justify-center",
            variant === 'primary' && 'bg-primary/10',
            variant === 'success' && 'bg-success/10',
            variant === 'warning' && 'bg-warning/10',
            variant === 'destructive' && 'bg-destructive/10',
            variant === 'default' && 'bg-secondary/10'
          )}>
            <Icon as={IconComponent} size={24} className={styles.icon} />
          </View>

          {/* Value & Label */}
          <View>
            {isLoading ? (
              <Skeleton className="w-16 h-7 mb-2 rounded" />
            ) : (
              <Text className="text-2xl font-bold text-foreground mb-1">
                {value}
              </Text>
            )}
            <Text className="text-muted-foreground text-xs font-medium leading-4">
              {label}
            </Text>
          </View>

          {/* Trend Indicator */}
          {trend && !isLoading && (
            <View className="flex-row items-center gap-1">
              <Icon
                as={trend === 'up' ? ArrowUpRight : ArrowDownRight}
                size={12}
                className={cn(
                  trend === 'up' && 'text-success',
                  trend === 'down' && 'text-destructive',
                  trend === 'neutral' && 'text-muted-foreground'
                )}
              />
              <Text className={cn(
                'text-xs font-semibold',
                trend === 'up' && 'text-success',
                trend === 'down' && 'text-destructive',
                trend === 'neutral' && 'text-muted-foreground'
              )}>
                {trend === 'up' ? 'Trending up' : trend === 'down' ? 'Trending down' : 'Stable'}
              </Text>
            </View>
          )}
        </View>
      </AnimationWrapper>
    );
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(amount);
  };

  // Tab Component
  const TabButton = ({ tab, label, icon: IconComponent }: { tab: 'overview' | 'performance' | 'visibility'; label: string; icon: any }) => (
    <TouchableOpacity
      onPress={() => setActiveTab(tab)}
      className={cn(
        "flex-1 py-3 px-2 rounded-lg items-center",
        activeTab === tab ? "bg-primary" : "bg-transparent"
      )}
    >
      <Icon
        as={IconComponent}
        size={20}
        className={cn(
          "mb-1",
          activeTab === tab ? "text-primary-foreground" : "text-muted-foreground"
        )}
      />
      <Text
        className={cn(
          "text-xs font-medium text-center",
          activeTab === tab ? "text-primary-foreground" : "text-muted-foreground"
        )}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  if (analyticsLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={['top']}>
        {/* Header */}
        <View className="px-4 py-4 border-b border-border">
          <View className="flex-row items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onPress={() => router.back()}
              className="w-8 h-8 p-0"
            >
              <Icon as={ArrowLeft} size={24} className="text-primary" />
            </Button>
            <Text className="text-xl font-bold text-foreground">
              Business Analytics
            </Text>
            <View className="w-8" />
          </View>
        </View>

        {/* Loading Tab Bar */}
        <View className="px-4 py-3 border-b border-border bg-card">
          <View className="flex-row gap-2">
            <View className="flex-1 py-3 px-2 rounded-lg items-center bg-primary/20">
              <Skeleton className="w-6 h-6 rounded mb-1" />
              <Skeleton className="w-16 h-3 rounded" />
            </View>
            <View className="flex-1 py-3 px-2 rounded-lg items-center">
              <Skeleton className="w-6 h-6 rounded mb-1" />
              <Skeleton className="w-20 h-3 rounded" />
            </View>
            <View className="flex-1 py-3 px-2 rounded-lg items-center">
              <Skeleton className="w-6 h-6 rounded mb-1" />
              <Skeleton className="w-16 h-3 rounded" />
            </View>
          </View>
        </View>

        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          <View className="px-4 py-6 gap-6">
            {/* Loading skeleton for main stats */}
            <View className="bg-card border border-border rounded-xl p-6">
              <Skeleton className="w-48 h-6 rounded mb-4" />
              <View className="flex-row gap-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <View key={i} className="flex-1 rounded-xl p-4 border border-border items-center">
                    <View className="w-10 h-10 bg-muted rounded-full items-center justify-center mb-3">
                      <Skeleton className="w-6 h-6 rounded" />
                    </View>
                    <Skeleton className="w-12 h-6 rounded mb-1" />
                    <Skeleton className="w-16 h-3 rounded" />
                  </View>
                ))}
              </View>
            </View>

            {/* Loading skeleton for charts */}
            <View className="bg-card border border-border rounded-xl p-6">
              <Skeleton className="w-32 h-6 rounded mb-4" />
              <View className="gap-6">
                <View>
                  <Skeleton className="w-28 h-5 rounded mb-3" />
                  <View className="flex-row justify-between items-end mb-2 h-20">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <View key={i} className="items-center flex-1">
                        <Skeleton className={`w-6 rounded-t mb-2`} style={{ height: 20 + (i * 10) }} />
                        <Skeleton className="w-8 h-3 rounded" />
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            </View>

            {/* Loading skeleton for service list */}
            <View className="bg-card border border-border rounded-xl p-6">
              <Skeleton className="w-40 h-6 rounded mb-4" />
              <View className="gap-4">
                {[1, 2, 3].map((i) => (
                  <View key={i} className="flex-row items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <View className="flex-row items-center flex-1">
                      <View className="w-10 h-10 bg-muted rounded-full items-center justify-center mr-3">
                        <Skeleton className="w-6 h-6 rounded" />
                      </View>
                      <View className="flex-1">
                        <Skeleton className="w-24 h-4 rounded mb-1" />
                        <Skeleton className="w-16 h-3 rounded" />
                      </View>
                    </View>
                    <Skeleton className="w-8 h-6 rounded" />
                  </View>
                ))}
              </View>
            </View>

            {/* Loading skeleton for insights */}
            <View className="bg-primary/5 border border-primary/20 rounded-xl p-6">
              <View className="flex-row items-start">
                <View className="w-10 h-10 bg-primary/10 rounded-full items-center justify-center mr-4">
                  <Skeleton className="w-6 h-6 rounded" />
                </View>
                <View className="flex-1">
                  <Skeleton className="w-32 h-5 rounded mb-2" />
                  <Skeleton className="w-full h-4 rounded mb-1" />
                  <Skeleton className="w-3/4 h-4 rounded" />
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      {/* Modern Header - Clean, no animation */}
      <View className="px-4 py-4 border-b border-border/50 bg-background">
        <View className="flex-row items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onPress={() => router.back()}
            className="w-10 h-10 p-0"
          >
            <Icon as={ArrowLeft} size={24} className="text-primary" />
          </Button>
          <Text className="text-xl font-bold text-foreground flex-1 ml-3">
            Analytics
          </Text>
          <Button
            variant="ghost"
            size="sm"
            className="w-10 h-10 p-0"
          >
            <Icon as={Sparkles} size={20} className="text-primary" />
          </Button>
        </View>
      </View>

      {/* Modern Tab Bar - No animation */}
      <View className="px-4 py-3 border-b border-border/30 bg-background">
        <View className="flex-row gap-2 bg-card border border-border/50 rounded-xl p-1">
          {[
            { tab: 'overview' as const, label: 'Overview', icon: BarChart3 },
            { tab: 'performance' as const, label: 'Performance', icon: TrendingUp },
            { tab: 'visibility' as const, label: 'Visibility', icon: Eye }
          ].map((item) => (
            <TouchableOpacity
              key={item.tab}
              onPress={() => setActiveTab(item.tab)}
              className={cn(
                "flex-1 flex-row items-center justify-center gap-2 py-2.5 px-3 rounded-lg transition-all",
                activeTab === item.tab
                  ? 'bg-primary/15 border border-primary/30'
                  : 'bg-transparent'
              )}
            >
              <Icon
                as={item.icon}
                size={16}
                className={cn(
                  activeTab === item.tab ? 'text-primary' : 'text-muted-foreground'
                )}
              />
              <Text
                className={cn(
                  "text-xs font-bold",
                  activeTab === item.tab ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-4 py-6 gap-6">
          {analytics ? (
            <>
              {activeTab === 'overview' && (
                <>
                  {/* Overview Stats */}
                  <View>
                    <View className="bg-gradient-to-br from-primary/5 to-transparent border border-primary/10 rounded-2xl p-5 mb-2">
                      <View className="flex-row items-center justify-between mb-4">
                        <View>
                          <Text className="text-sm text-muted-foreground font-medium">Total Bookings</Text>
                          <Text className="text-3xl font-bold text-foreground mt-1">
                            {analytics.totalBookings}
                          </Text>
                        </View>
                        <View className="w-16 h-16 bg-primary/10 rounded-xl items-center justify-center">
                          <Icon as={Calendar} size={32} className="text-primary" />
                        </View>
                      </View>
                      <View className="flex-row items-center gap-2">
                        <Icon as={ArrowUpRight} size={14} className="text-success" />
                        <Text className="text-sm text-success font-semibold">+12% vs last month</Text>
                      </View>
                    </View>
                  </View>

                  {/* Stats Grid */}
                  <View>
                    <View className="gap-3">
                      <View className="flex-row gap-3">
                        <StatCard
                          label="Completed"
                          value={analytics.completedBookings.toString()}
                          IconComponent={CheckCircle}
                          variant="success"
                          trend="up"
                          animated
                        />
                        <StatCard
                          label="Earnings"
                          value={formatCurrency(analytics.totalEarnings)}
                          IconComponent={DollarSign}
                          variant="primary"
                          trend="up"
                          animated
                        />
                      </View>
                      <View className="flex-row gap-3">
                        <StatCard
                          label="Profile Views"
                          value={analytics.profileViews.toString()}
                          IconComponent={Eye}
                          variant="default"
                          trend="up"
                          animated
                        />
                        <StatCard
                          label="Service Views"
                          value={analytics.serviceViews.toString()}
                          IconComponent={Eye}
                          variant="default"
                          trend="neutral"
                          animated
                        />
                      </View>
                    </View>
                  </View>

                  {/* Monthly Trends - Enhanced */}
                  <View>
                    <View className="bg-card border border-border/50 rounded-2xl p-5">
                      <View className="flex-row items-center justify-between mb-5">
                        <Text className="text-lg font-bold text-foreground">Monthly Performance</Text>
                        <Badge className="bg-primary/10 border-primary/20">
                          <Text className="text-xs font-semibold text-primary">Last 6 months</Text>
                        </Badge>
                      </View>

                      {/* Earnings Chart */}
                      <View className="mb-8">
                        <Text className="text-sm font-semibold text-foreground mb-4">Earnings Trend</Text>
                        <View className="flex-row justify-between items-end mb-3 h-24">
                          {analytics.monthlyEarnings.map((month) => {
                            const maxEarnings = Math.max(...analytics.monthlyEarnings.map(m => m.earnings));
                            const height = maxEarnings > 0 ? (month.earnings / maxEarnings) * 80 : 20;
                            return (
                              <View key={month.month} className="items-center flex-1 gap-2">
                                <View
                                  className="bg-gradient-to-t from-primary to-primary/60 rounded-t-lg w-6"
                                  style={{ height }}
                                />
                                <Text className="text-xs text-muted-foreground font-medium">{month.month}</Text>
                              </View>
                            );
                          })}
                        </View>
                      </View>

                      {/* Bookings Chart */}
                      <View>
                        <Text className="text-sm font-semibold text-foreground mb-4">Bookings Trend</Text>
                        <View className="flex-row justify-between items-end h-20">
                          {analytics.monthlyBookings.map((month) => {
                            const maxCount = Math.max(...analytics.monthlyBookings.map(m => m.count));
                            const height = maxCount > 0 ? (month.count / maxCount) * 60 : 15;
                            return (
                              <View key={month.month} className="items-center flex-1 gap-2">
                                <View
                                  className="bg-gradient-to-t from-success to-success/60 rounded-t-lg w-6"
                                  style={{ height }}
                                />
                                <Text className="text-xs text-muted-foreground">{month.month}</Text>
                              </View>
                            );
                          })}
                        </View>
                      </View>
                    </View>
                  </View>
                </>
              )}

              {activeTab === 'performance' && (
                <>
                  {/* Performance Metrics */}
                  <View className="bg-card border border-border rounded-xl p-6">
                    <Text className="text-xl font-semibold text-foreground mb-4">Performance Metrics</Text>
                    <View className="flex-col sm:flex-row gap-4">
                      <StatCard
                        label="Avg Rating"
                        value={analytics.averageRating.toFixed(1)}
                        IconComponent={Star}
                        variant="warning"
                      />
                      <StatCard
                        label="Total Reviews"
                        value={analytics.totalReviews.toString()}
                        IconComponent={MessageCircle}
                        variant="default"
                      />
                      <StatCard
                        label="Cancelled"
                        value={analytics.cancelledBookings.toString()}
                        IconComponent={XCircle}
                        variant="destructive"
                      />
                    </View>
                  </View>

                  {/* Top Performing Services */}
                  {analytics.topServices.length > 0 && (
                    <View className="bg-card border border-border rounded-xl p-6">
                      <Text className="text-xl font-semibold text-foreground mb-4">Top Performing Services</Text>
                      <View className="gap-4">
                        {analytics.topServices.map((service, index) => (
                          <View key={service.service_title} className="flex-row items-center justify-between p-3 bg-muted/50 rounded-lg">
                            <View className="flex-row items-center flex-1">
                              <Badge variant="secondary" className="mr-3 w-8 h-8 rounded-full items-center justify-center">
                                <Text className="text-xs font-bold">{index + 1}</Text>
                              </Badge>
                              <Text className="font-medium text-foreground flex-1">
                                {service.service_title}
                              </Text>
                            </View>
                            <View className="items-end">
                              <Text className="text-muted-foreground text-sm">
                                {service.count} booking{service.count !== 1 ? 's' : ''}
                              </Text>
                            </View>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}
                </>
              )}

              {activeTab === 'visibility' && (
                <>
                  {/* Visibility Overview */}
                  <View className="bg-card border border-border rounded-xl p-6">
                    <Text className="text-xl font-semibold text-foreground mb-4">Customer Visibility</Text>
                    <View className="flex-col sm:flex-row gap-4">
                      <StatCard
                        label="Profile Views"
                        value={analytics.profileViews.toString()}
                        IconComponent={Users}
                        variant="primary"
                      />
                      <StatCard
                        label="Service Views"
                        value={analytics.serviceViews.toString()}
                        IconComponent={Target}
                        variant="success"
                      />
                      <StatCard
                        label="Profile Views (This Month)"
                        value={analytics.profileViewsThisMonth.toString()}
                        IconComponent={Eye}
                        variant="default"
                      />
                      <StatCard
                        label="Service Views (This Month)"
                        value={analytics.serviceViewsThisMonth.toString()}
                        IconComponent={Eye}
                        variant="default"
                      />
                    </View>
                  </View>

                  {/* Top Viewed Services */}
                  {analytics.topViewedServices.length > 0 && (
                    <View className="bg-card border border-border rounded-xl p-6">
                      <Text className="text-xl font-semibold text-foreground mb-4">Most Viewed Services</Text>
                      <View className="gap-3">
                        {analytics.topViewedServices.map((service, index) => (
                          <View key={service.service_id} className="bg-muted/30 border border-border rounded-xl p-4">
                            <View className="flex-row items-start">
                              <View className="flex-1 mr-4">
                                <View className="flex-row items-center mb-2">
                                  <Badge variant="secondary" className="bg-primary/10 border-primary/20 mr-3 w-8 h-8 rounded-full items-center justify-center">
                                    <Text className="text-xs font-bold text-primary">{index + 1}</Text>
                                  </Badge>
                                  <Text className="text-lg font-bold text-foreground flex-1" numberOfLines={1}>
                                    {service.service_title.trim()}
                                  </Text>
                                </View>
                                
                                <View className="flex-row flex-wrap gap-2 mb-3">
                                  {service.category_name && service.category_name !== 'Uncategorized' && (
                                    <Badge variant="secondary" className="bg-primary/10 border-primary/20">
                                      <Text className="text-xs font-medium text-primary">{service.category_name}</Text>
                                    </Badge>
                                  )}
                                  {service.subcategory_name && service.subcategory_name !== 'General' && (
                                    <Badge variant="outline" className="border-muted-foreground/30">
                                      <Text className="text-xs text-muted-foreground">{service.subcategory_name}</Text>
                                    </Badge>
                                  )}
                                </View>
                                
                                <Text className="text-primary font-bold text-base">
                                  £{service.base_price}{service.price_type === 'hourly' ? ' per hour' : ' fixed'}
                                </Text>
                              </View>
                              
                              <View className="items-end justify-center">
                                <Badge variant="default" className="bg-success/10 border-success/20 flex-row items-center mb-1">
                                  <Icon as={Eye} size={14} className="text-success mr-1" />
                                  <Text className="text-sm font-bold text-success">{service.view_count}</Text>
                                </Badge>
                                <Text className="text-xs text-muted-foreground text-center">
                                  views
                                </Text>
                              </View>
                            </View>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                  {/* Visibility Insights */}
                  <View className="bg-primary/5 border border-primary/20 rounded-xl p-6">
                    <View className="flex-row items-start">
                      <View className="w-10 h-10 bg-primary/10 rounded-full items-center justify-center mr-4">
                        <Icon as={Target} size={20} className="text-primary" />
                      </View>
                      <View className="flex-1">
                        <Text className="text-primary font-semibold mb-2">Visibility Insights</Text>
                        <Text className="text-primary/80 text-sm leading-6">
                          {analytics.serviceViews > 0
                            ? `Your services have been viewed ${analytics.serviceViews} times. Focus on your top-performing services to maximize customer engagement and bookings.`
                            : 'Start optimizing your service listings to increase visibility and attract more customers.'
                          }
                        </Text>
                      </View>
                    </View>
                  </View>
                </>
              )}

              {/* Business Insights - Show on all tabs */}
              <View className="bg-primary/5 border border-primary/20 rounded-xl p-6">
                <View className="flex-row items-start">
                  <View className="w-10 h-10 bg-primary/10 rounded-full items-center justify-center mr-4">
                    <Icon as={BarChart3} size={20} className="text-primary" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-primary font-semibold mb-2">Business Insights</Text>
                    <Text className="text-primary/80 text-sm leading-6">
                      {analytics.completedBookings > 0
                        ? `You've successfully completed ${analytics.completedBookings} bookings with an average rating of ${analytics.averageRating.toFixed(1)} stars. ${analytics.totalEarnings > 0 ? `Your total processed earnings are ${formatCurrency(analytics.totalEarnings)}.` : 'Start processing payments to see your earnings here.'}`
                        : 'Start completing bookings to see detailed analytics and insights about your business performance.'
                      }
                    </Text>
                  </View>
                </View>
              </View>
            </>
          ) : (
            <View className="items-center justify-center py-12">
              <View className="w-16 h-16 bg-muted rounded-full items-center justify-center mb-4">
                <Icon as={BarChart3} size={32} className="text-muted-foreground" />
              </View>
              <Text className="text-xl font-bold text-foreground mb-2">No Data Available</Text>
              <Text className="text-muted-foreground text-center mb-6 px-4">
                Analytics will appear here once you start receiving bookings and processing payments.
              </Text>
              <Button onPress={() => router.push('/(provider)/calendar')} className="w-full max-w-xs">
                <Text>View Calendar</Text>
              </Button>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
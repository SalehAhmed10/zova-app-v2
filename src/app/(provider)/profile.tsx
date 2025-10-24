/**
 * Provider Profile Screen - Modern UI Design
 *
 * Features:
 * - Clean header with profile information
 * - Key performance metrics in organized cards
 * - Quick action buttons for common tasks
 * - Well-organized menu sections by priority
 * - Professional spacing and visual hierarchy
 *
 * Design Principles:
 * - Uses theme colors exclusively (no hardcoded colors)
 * - Lucide icons for consistency
 * - Proper contrast and accessibility
 * - No gradients or shadows (NativeWind compatibility)
 * - Professional spacing and typography
 */

import React, { Suspense } from 'react';
import { View, ScrollView, Platform, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import type { LucideIcon } from 'lucide-react-native';
import {
  Calendar,
  User,
  Clock,
  Star,
  CheckCircle,
  Settings,
  CreditCard,
  BarChart3,
  Diamond,
  ChevronRight,
  TrendingUp,
  Store,
  DollarSign,
  Crown
} from 'lucide-react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { LogoutButton } from '@/components/ui/logout-button';
import { useAuthStore } from '@/stores/auth';
import { useProfileModalStore } from '@/stores/ui/profileModal';
import {
  useProfile,
  useProviderStats
} from '@/hooks/shared/useProfileData';
import { cn, formatCurrency } from '@/lib/utils';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { Icon } from '@/components/ui/icon';

// Loading Skeleton Component
function ProfileSkeleton() {
  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScrollView className="flex-1">
        <View className="px-4 pt-6 pb-8">
          <View className="items-center">
            <Skeleton className="w-32 h-32 rounded-full mb-6" />
            <Skeleton className="w-40 h-8 mb-2" />
            <Skeleton className="w-48 h-4 mb-2" />
            <Skeleton className="w-24 h-6 rounded-full" />
          </View>
        </View>

        <View className="px-4 mb-6">
          <Card>
            <CardContent className="p-0">
              <View className="flex-row">
                <View className="items-center flex-1 py-4">
                  <Skeleton className="w-8 h-6 mb-1" />
                  <Skeleton className="w-16 h-4" />
                </View>
                <View className="w-px bg-border" />
                <View className="items-center flex-1 py-4">
                  <Skeleton className="w-8 h-6 mb-1" />
                  <Skeleton className="w-12 h-4" />
                </View>
                <View className="w-px bg-border" />
                <View className="items-center flex-1 py-4">
                  <Skeleton className="w-8 h-6 mb-1" />
                  <Skeleton className="w-14 h-4" />
                </View>
              </View>
            </CardContent>
          </Card>
        </View>

        <View className="px-4 gap-6">
          <View>
            <Skeleton className="w-32 h-6 mb-4" />
            <Card>
              <CardContent className="p-4 gap-2">
                {[1, 2, 3].map((i) => (
                  <View key={i} className="flex-row items-center py-2">
                    <Skeleton className="w-10 h-10 rounded-xl mr-4" />
                    <View className="flex-1">
                      <Skeleton className="w-32 h-4 mb-1" />
                      <Skeleton className="w-48 h-3" />
                    </View>
                  </View>
                ))}
              </CardContent>
            </Card>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// Error Boundary Component
function ProfileError({ error, refetch }: { error: Error; refetch?: () => void }) {
  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="flex-1 items-center justify-center px-4">
        <Text className="text-4xl mb-4">⚠️</Text>
        <Text variant="h3" className="text-foreground font-bold mb-2 text-center">
          Unable to Load Profile
        </Text>
        <Text variant="p" className="text-muted-foreground text-center mb-6">
          Please check your connection and try again.
        </Text>
        {refetch && (
          <Button onPress={refetch}>
            <Text>Retry</Text>
          </Button>
        )}
      </View>
    </SafeAreaView>
  );
}

// Profile Content Component (wrapped in Suspense)
function ProfileContent() {
  const user = useAuthStore((state) => state.user);
  const userRole = useAuthStore((state) => state.userRole);
  const shouldFetchData = !!user?.id && userRole === 'provider';

  // React Query hooks - will suspend if data not ready
  const { data: profileData, error: profileError, refetch } = useProfile(shouldFetchData ? user?.id : undefined);
  const { data: statsData, isLoading: statsLoading } = useProviderStats(shouldFetchData ? user?.id : undefined);

  // Handle errors
  if (profileError) {
    return <ProfileError error={profileError as Error} refetch={refetch} />;
  }

  // Ensure we have profile data
  if (!profileData) {
    return <ProfileSkeleton />;
  }

  const getDisplayName = () => {
    if (profileData?.first_name && profileData?.last_name) {
      return `${profileData.first_name} ${profileData.last_name}`;
    }
    if (profileData?.first_name) {
      return profileData.first_name;
    }
    return profileData?.email?.split('@')[0] || user?.email?.split('@')[0] || 'Provider';
  };

  type MenuItem = {
    id: string;
    icon: LucideIcon;
    title: string;
    subtitle: string;
    badge?: string;
    onPress: () => void;
  };

  // Build business management menu based on stripe account
  const buildBusinessMenu = (): MenuItem[] => {
    const menu: MenuItem[] = [
      {
        id: 'calendar',
        icon: Calendar,
        title: 'Calendar & Bookings',
        subtitle: 'Manage your schedule and appointments',
        onPress: () => router.push('/(provider)/calendar'),
      },
      {
        id: 'services',
        icon: Settings,
        title: 'Services & Pricing',
        subtitle: 'Update your service offerings and rates',
        onPress: () => router.push('/(provider)/profile/services'),
      },
    ];

    if (!profileData?.stripe_account_id) {
      menu.push({
        id: 'setup-payment',
        icon: CreditCard,
        title: '⚡ Setup Payments',
        subtitle: 'Required: Connect Stripe to start earning',
        badge: 'Required',
        onPress: () => router.push('/(provider)/setup-payment'),
      } as MenuItem);
    } else {
      menu.push({
        id: 'payments',
        icon: CreditCard,
        title: 'Payment Integration',
        subtitle: 'Manage your Stripe account settings',
        onPress: () => router.push('/(provider)/profile/payments'),
      } as MenuItem);
    }

    menu.push(
      {
        id: 'analytics',
        icon: BarChart3,
        title: 'Business Analytics',
        subtitle: 'Track performance and earnings',
        onPress: () => router.push('/(provider)/profile/analytics'),
      } as MenuItem,
      {
        id: 'subscriptions',
        icon: Diamond,
        title: 'Premium Subscription',
        subtitle: 'Unlock advanced business features',
        onPress: () => router.push('/(provider)/profile/subscriptions'),
      } as MenuItem
    );

    return menu;
  };

  const businessManagementMenu = buildBusinessMenu();

  const customerRelationsMenu: MenuItem[] = [
    {
      id: 'reviews',
      icon: Star,
      title: 'Reviews & Ratings',
      subtitle: statsData?.avg_rating ? `${statsData.avg_rating.toFixed(1)}★ average rating` : 'No reviews yet',
      onPress: () => router.push('/(provider)/profile/reviews'),
    },
  ];

  const accountSettingsMenu: MenuItem[] = [
    {
      id: 'profile',
      icon: User,
      title: 'Business Profile',
      subtitle: 'Update your business information',
      onPress: () => router.push('/(provider)/profile/personal-info'),
    },
    {
      id: 'hours',
      icon: Clock,
      title: 'Business Hours',
      subtitle: 'Set your availability schedule',
      onPress: () => router.push('/(provider)/calendar'),
    },
  ];

  const MenuItemComponent = React.memo(({ item }: { item: MenuItem }) => (
    <TouchableOpacity
      className="bg-card rounded-xl p-4 border border-border active:scale-[0.98] transition-transform"
      onPress={item.onPress}
      accessibilityRole="button"
      accessibilityLabel={`${item.title}: ${item.subtitle}`}
    >
      <View className="flex-row items-center">
        <View className="w-12 h-12 bg-accent rounded-xl items-center justify-center mr-4">
          <Icon as={item.icon} size={24} className="text-foreground" />
        </View>
        <View className="flex-1">
          <View className="flex-row items-center justify-between">
            <Text className="font-semibold text-foreground text-base">{item.title}</Text>
            {item.badge && (
              <Badge variant="secondary" className="ml-2">
                <Text className="text-xs font-medium">{item.badge}</Text>
              </Badge>
            )}
          </View>
          <Text className="text-muted-foreground text-sm mt-1">{item.subtitle}</Text>
        </View>
        <Icon as={ChevronRight} size={20} className="text-muted-foreground" />
      </View>
    </TouchableOpacity>
  ));

  if (profileError) {
    return <ProfileError error={profileError as Error} refetch={refetch} />;
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="bg-card border-b border-border px-6 pt-6 pb-8">
          <View className="items-center">
            <Avatar className="w-20 h-20 border-2 border-border mb-4" alt="Provider avatar">
              <AvatarFallback className="bg-muted">
                <Icon as={Store} size={32} className="text-muted-foreground" />
              </AvatarFallback>
            </Avatar>
            <Text className="text-xl font-bold text-foreground mb-2">
              {user?.email?.split('@')[0] || 'Provider'}
            </Text>
            <Text className="text-muted-foreground mb-4">ZOVA Service Provider</Text>
            <View className="bg-primary/10 px-4 py-2 rounded-full border border-primary/20">
              <Text className="text-primary font-semibold text-sm">🏆 Pro Provider</Text>
            </View>
          </View>
        </View>

        {/* Quick Stats */}
        <View className="px-6 pt-6 mb-8">
          <View className="flex-row gap-3">
            <View className="flex-1 bg-card rounded-xl p-4 border border-border">
              <View className="items-center">
                <Icon as={Calendar} size={20} className="text-info mb-2" />
                <Text className="text-xl font-bold text-foreground">
                  {statsLoading ? '...' : (statsData?.total_bookings || 0)}
                </Text>
                <Text className="text-muted-foreground text-xs">Bookings</Text>
              </View>
            </View>
            <View className="flex-1 bg-card rounded-xl p-4 border border-border">
              <View className="items-center">
                <Icon as={DollarSign} size={20} className="text-success mb-2" />
                <Text className="text-xl font-bold text-foreground">
                  {statsLoading ? '...' : `$${statsData?.this_month_earnings?.toFixed(0) || 0}`}
                </Text>
                <Text className="text-muted-foreground text-xs">Revenue</Text>
              </View>
            </View>
            <View className="flex-1 bg-card rounded-xl p-4 border border-border">
              <View className="items-center">
                <Icon as={Star} size={20} className="text-primary mb-2" />
                <Text className="text-xl font-bold text-foreground">
                  {statsLoading ? '...' : (statsData?.avg_rating?.toFixed(1) || 'N/A')}
                </Text>
                <Text className="text-muted-foreground text-xs">Rating</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Business Management */}
        <View className="px-6 gap-3">
          <TouchableOpacity
            onPress={() => router.push('/(provider)/profile/personal-info')}
            className="active:opacity-80"
          >
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <View className="flex-row items-center">
                  <View className="w-12 h-12 bg-accent rounded-xl items-center justify-center mr-4">
                    <Icon as={Store} size={20} className="text-foreground" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-foreground font-medium">Business Information</Text>
                    <Text className="text-muted-foreground text-sm">Manage business profile</Text>
                  </View>
                </View>
              </CardContent>
            </Card>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/(provider)/profile/personal-info')}
            className="active:opacity-80"
          >
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <View className="flex-row items-center">
                  <View className="w-12 h-12 bg-accent rounded-xl items-center justify-center mr-4">
                    <Icon as={User} size={20} className="text-foreground" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-foreground font-medium">Personal Information</Text>
                    <Text className="text-muted-foreground text-sm">Manage personal details</Text>
                  </View>
                </View>
              </CardContent>
            </Card>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/(provider)/profile/payments')}
            className="active:opacity-80"
          >
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <View className="flex-row items-center">
                  <View className="w-12 h-12 bg-accent rounded-xl items-center justify-center mr-4">
                    <Icon as={CreditCard} size={20} className="text-foreground" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-foreground font-medium">Payment Integration</Text>
                    <Text className="text-muted-foreground text-sm">Connect payment methods</Text>
                  </View>
                </View>
              </CardContent>
            </Card>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/(provider)/profile/services')}
            className="active:opacity-80"
          >
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <View className="flex-row items-center">
                  <View className="w-12 h-12 bg-accent rounded-xl items-center justify-center mr-4">
                    <Icon as={Calendar} size={20} className="text-foreground" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-foreground font-medium">Services</Text>
                    <Text className="text-muted-foreground text-sm">Manage your services</Text>
                  </View>
                </View>
              </CardContent>
            </Card>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/(provider)/profile/analytics')}
            className="active:opacity-80"
          >
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <View className="flex-row items-center">
                  <View className="w-12 h-12 bg-accent rounded-xl items-center justify-center mr-4">
                    <Icon as={BarChart3} size={20} className="text-foreground" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-foreground font-medium">Analytics</Text>
                    <Text className="text-muted-foreground text-sm">View performance data</Text>
                  </View>
                </View>
              </CardContent>
            </Card>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/(provider)/profile/reviews')}
            className="active:opacity-80"
          >
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <View className="flex-row items-center">
                  <View className="w-12 h-12 bg-accent rounded-xl items-center justify-center mr-4">
                    <Icon as={Star} size={20} className="text-foreground" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-foreground font-medium">Reviews</Text>
                    <Text className="text-muted-foreground text-sm">Manage customer reviews</Text>
                  </View>
                </View>
              </CardContent>
            </Card>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/(provider)/profile/notifications')}
            className="active:opacity-80"
          >
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <View className="flex-row items-center">
                  <View className="w-12 h-12 bg-accent rounded-xl items-center justify-center mr-4">
                    <Icon as={Settings} size={20} className="text-foreground" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-foreground font-medium">Notification Settings</Text>
                    <Text className="text-muted-foreground text-sm">Manage notifications</Text>
                  </View>
                </View>
              </CardContent>
            </Card>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/(provider)/profile/subscriptions')}
            className="active:opacity-80"
          >
            <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20">
              <CardContent className="p-4">
                <View className="flex-row items-center">
                  <View className="w-12 h-12 bg-primary/15 rounded-xl items-center justify-center mr-4">
                    <Icon as={Crown} size={20} className="text-primary" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-foreground font-medium">Manage Subscription</Text>
                    <Text className="text-muted-foreground text-sm">View and manage premium features</Text>
                  </View>
                </View>
              </CardContent>
            </Card>
          </TouchableOpacity>
        </View>

        {/* Theme Toggle */}
        <View className="px-6 mt-6 mb-6">
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <ThemeToggle />
            </CardContent>
          </Card>
        </View>

        {/* Logout */}
        <View className="px-6 mb-8">
          <LogoutButton variant="modern" fullWidth />
        </View>

        {/* Footer */}
        <View className="items-center pb-6">
          <Text className="text-muted-foreground text-sm mb-2">ZOVA - Version 1.0.0</Text>
          <Text className="text-muted-foreground text-xs">
            Empowering service providers
          </Text>
        </View>

        <View className={cn("h-6", Platform.OS === 'ios' && "h-24")} />
      </ScrollView>
    </SafeAreaView>
  );
}

// Main Component with Suspense Wrapper
export default function ProviderProfile() {
  const { _hasHydrated } = useProfileModalStore();

  // Wait for Zustand hydration
  if (!_hasHydrated) {
    return null;
  }

  return (
    <Suspense fallback={<ProfileSkeleton />}>
      <ProfileContent />
    </Suspense>
  );
}

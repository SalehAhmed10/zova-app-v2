import React from 'react';
import { View, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LogoutButton } from '@/components/ui/logout-button';
import { useAppStore } from '@/stores/app';
import { cn } from '@/lib/utils';

// Modern profile section component
const ProfileSection = ({ 
  title, 
  children, 
  className 
}: { 
  title: string; 
  children: React.ReactNode; 
  className?: string; 
}) => (
  <View className={cn('mb-6', className)}>
    <Text variant="h4" className="text-foreground font-bold mb-3 px-1">
      {title}
    </Text>
    {children}
  </View>
);

// Business stats item
const BusinessStat = ({ 
  label, 
  value, 
  icon,
  trend,
  trendValue 
}: { 
  label: string; 
  value: string; 
  icon: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
}) => (
  <View className="items-center flex-1 py-4">
    <Text className="text-2xl mb-1">{icon}</Text>
    <Text variant="h3" className="text-foreground font-bold mb-1">
      {value}
    </Text>
    <Text variant="small" className="text-muted-foreground text-center mb-1">
      {label}
    </Text>
    {trend && trendValue && (
      <View className="flex-row items-center">
        <Text className={cn(
          'text-xs font-medium',
          trend === 'up' && 'text-green-500',
          trend === 'down' && 'text-red-500',
          trend === 'neutral' && 'text-muted-foreground'
        )}>
          {trend === 'up' ? '↗' : trend === 'down' ? '↘' : '→'} {trendValue}
        </Text>
      </View>
    )}
  </View>
);

// Provider menu item
const ProviderMenuItem = ({ 
  title, 
  subtitle, 
  icon, 
  onPress,
  showArrow = true,
  badge 
}: { 
  title: string; 
  subtitle?: string; 
  icon: string; 
  onPress?: () => void;
  showArrow?: boolean;
  badge?: string;
}) => (
  <Button
    variant="ghost"
    className="w-full justify-start px-0 py-4 h-auto"
    onPress={onPress}
  >
    <View className="flex-row items-center w-full">
      <View className="w-10 h-10 bg-muted rounded-full items-center justify-center mr-4">
        <Text className="text-lg">{icon}</Text>
      </View>
      <View className="flex-1">
        <View className="flex-row items-center gap-2">
          <Text variant="p" className="text-foreground font-medium text-left">
            {title}
          </Text>
          {badge && (
            <View className="bg-primary/10 px-2 py-0.5 rounded-full">
              <Text variant="small" className="text-primary font-medium text-xs">
                {badge}
              </Text>
            </View>
          )}
        </View>
        {subtitle && (
          <Text variant="small" className="text-muted-foreground text-left">
            {subtitle}
          </Text>
        )}
      </View>
      {showArrow && (
        <Text className="text-muted-foreground text-lg">›</Text>
      )}
    </View>
  </Button>
);

export default function ProfileScreen() {
  const { userRole } = useAppStore();

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScrollView 
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
      >
        {/* Header Section */}
        <View className="px-6 pt-6 pb-8">
          <View className="items-center">
            {/* Avatar */}
            <View className="w-24 h-24 bg-primary/20 rounded-full items-center justify-center mb-4 border-4 border-background shadow-lg">
              <Text className="text-3xl">💼</Text>
            </View>
            
            {/* Provider Info */}
            <Text variant="h2" className="text-foreground font-bold mb-1">
              Welcome Back, Pro
            </Text>
            <Text variant="p" className="text-muted-foreground mb-1">
              provider@zova.app
            </Text>
            <View className="bg-secondary/10 px-3 py-1 rounded-full">
              <Text variant="small" className="text-secondary font-medium">
                {userRole === 'provider' ? 'Service Provider' : 'Provider'}
              </Text>
            </View>
          </View>
        </View>

        {/* Business Stats Section */}
        <ProfileSection title="Business Overview" className="px-6">
          <Card>
            <CardContent className="p-0">
              <View className="flex-row">
                <BusinessStat 
                  icon="💰" 
                  value="$3.2k" 
                  label="This Month"
                  trend="up"
                  trendValue="+12%"
                />
                <View className="w-px bg-border" />
                <BusinessStat 
                  icon="⭐" 
                  value="4.9" 
                  label="Rating"
                  trend="up"
                  trendValue="+0.1"
                />
                <View className="w-px bg-border" />
                <BusinessStat 
                  icon="👥" 
                  value="48" 
                  label="Clients"
                  trend="up"
                  trendValue="+8"
                />
              </View>
            </CardContent>
          </Card>
        </ProfileSection>

        {/* Quick Business Actions */}
        <ProfileSection title="Business Management" className="px-6">
          <Card>
            <CardContent className="p-4 gap-0">
              <ProviderMenuItem 
                icon="📅" 
                title="Calendar & Bookings" 
                subtitle="Manage your schedule and appointments"
                badge="3 today"
                onPress={() => {}}
              />
              <View className="h-px bg-border ml-14" />
              <ProviderMenuItem 
                icon="⚙️" 
                title="Services & Pricing" 
                subtitle="Update your service offerings"
                onPress={() => {}}
              />
              <View className="h-px bg-border ml-14" />
              <ProviderMenuItem 
                icon="💳" 
                title="Earnings & Payouts" 
                subtitle="Track income and payment history"
                badge="$248 pending"
                onPress={() => {}}
              />
              <View className="h-px bg-border ml-14" />
              <ProviderMenuItem 
                icon="📊" 
                title="Analytics" 
                subtitle="View detailed business insights"
                onPress={() => {}}
              />
            </CardContent>
          </Card>
        </ProfileSection>

        {/* Customer Relations */}
        <ProfileSection title="Customer Relations" className="px-6">
          <Card>
            <CardContent className="p-4 gap-0">
              <ProviderMenuItem 
                icon="⭐" 
                title="Reviews & Ratings" 
                subtitle="Manage customer feedback"
                badge="2 new"
                onPress={() => {}}
              />
              <View className="h-px bg-border ml-14" />
              <ProviderMenuItem 
                icon="💬" 
                title="Messages" 
                subtitle="Communicate with clients"
                onPress={() => {}}
              />
              <View className="h-px bg-border ml-14" />
              <ProviderMenuItem 
                icon="🎯" 
                title="Marketing Tools" 
                subtitle="Promote your services"
                onPress={() => {}}
              />
            </CardContent>
          </Card>
        </ProfileSection>

        {/* Account Settings */}
        <ProfileSection title="Account Settings" className="px-6">
          <Card>
            <CardContent className="p-4 gap-0">
              <ProviderMenuItem 
                icon="👤" 
                title="Business Profile" 
                subtitle="Update your business information"
                onPress={() => {}}
              />
              <View className="h-px bg-border ml-14" />
              <ProviderMenuItem 
                icon="🏪" 
                title="Business Hours" 
                subtitle="Set your availability"
                onPress={() => {}}
              />
              <View className="h-px bg-border ml-14" />
              <ProviderMenuItem 
                icon="🔔" 
                title="Notifications" 
                subtitle="Customize business alerts"
                onPress={() => {}}
              />
              <View className="h-px bg-border ml-14" />
              <ProviderMenuItem 
                icon="🔒" 
                title="Privacy & Security" 
                subtitle="Manage account security"
                onPress={() => {}}
              />
            </CardContent>
          </Card>
        </ProfileSection>

        {/* Support Section */}
        <ProfileSection title="Support & Resources" className="px-6">
          <Card>
            <CardContent className="p-4 gap-0">
              <ProviderMenuItem 
                icon="📚" 
                title="Provider Resources" 
                subtitle="Tips and best practices"
                onPress={() => {}}
              />
              <View className="h-px bg-border ml-14" />
              <ProviderMenuItem 
                icon="❓" 
                title="Help Center" 
                subtitle="Find answers to your questions"
                onPress={() => {}}
              />
              <View className="h-px bg-border ml-14" />
              <ProviderMenuItem 
                icon="💬" 
                title="Contact Support" 
                subtitle="Get help from our business team"
                onPress={() => {}}
              />
              <View className="h-px bg-border ml-14" />
              <ProviderMenuItem 
                icon="📱" 
                title="About ZOVA Business" 
                subtitle="App version and provider info"
                onPress={() => {}}
              />
            </CardContent>
          </Card>
        </ProfileSection>

        {/* Logout Section */}
        <View className="px-6 mt-4">
          <LogoutButton 
            variant="modern" 
            fullWidth 
            className="mb-4"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
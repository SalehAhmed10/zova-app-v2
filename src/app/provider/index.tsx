import React, { useState } from 'react';
import { View, ScrollView, Platform, TouchableOpacity, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useColorScheme } from '@/lib/core/useColorScheme';
import { THEME } from '@/lib/core/theme';
import {
  useAuth,
  useProfile,
  useProviderStats,
  useUserBookings,
  useBusinessAvailability,
  useUpdateBusinessAvailability,
  usePaymentSetupNudge
} from '@/hooks';
import { cn } from '@/lib/core/utils';
import { PaymentSetupStatusCard } from '@/components/providers/PaymentSetupStatusCard';
import { StorageDebugPanel } from '@/components/debug/StorageDebugPanel';
import DateTimePicker from '@react-native-community/datetimepicker';

// Today's Stats Component  
const TodaysStat = ({
  label,
  value,
  icon,
  trend,
  isLoading = false
}: {
  label: string;
  value: string;
  icon: string;
  trend?: 'up' | 'down' | 'neutral';
  isLoading?: boolean;
}) => (
  <View className="flex-1 bg-muted/50 rounded-2xl p-5 min-w-[110px]">
    <View className="items-center">
      <Text className="text-xl mb-2">{icon}</Text>
      {isLoading ? (
        <Skeleton className="w-12 h-7 mb-2" />
      ) : (
        <Text className="text-2xl font-bold text-foreground mb-2">
          {value}
        </Text>
      )}
      <Text className="text-muted-foreground text-xs text-center leading-4">
        {label}
      </Text>
      {trend && !isLoading && (
        <Text className={cn(
          'text-xs font-medium mt-1',
          trend === 'up' && 'text-muted-foreground',
          trend === 'down' && 'text-destructive',
          trend === 'neutral' && 'text-muted-foreground'
        )}>
          {trend === 'up' ? '↗' : trend === 'down' ? '↘' : '→'}
        </Text>
      )}
    </View>
  </View>
);

export default function ProviderDashboard() {
  const { user } = useAuth();
  const { colorScheme } = useColorScheme();
  const { data: profileData, isLoading: profileLoading } = useProfile(user?.id);
  const { data: statsData, isLoading: statsLoading } = useProviderStats(user?.id);
  const { data: bookingsData, isLoading: bookingsLoading } = useUserBookings(user?.id);
  const { data: availabilityData, isLoading: availabilityLoading } = useBusinessAvailability(user?.id);
  const updateAvailability = useUpdateBusinessAvailability();

  // Business pause state
  const [showPauseModal, setShowPauseModal] = React.useState(false);
  const [pauseMessage, setPauseMessage] = React.useState('');
  const [pauseUntil, setPauseUntil] = React.useState('');
  const [showDatePicker, setShowDatePicker] = React.useState(false);
  const [selectedDate, setSelectedDate] = React.useState(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)); // Default to 1 week from now
  const [isIndefinitePause, setIsIndefinitePause] = React.useState(false);

  // Payment setup nudge functionality
  const { 
    shouldShowNudge, 
    isPaymentComplete, 
    showPaymentNudge,
    checkNudgeStatus 
  } = usePaymentSetupNudge();

  // Show payment nudge if needed
  React.useEffect(() => {
    if (shouldShowNudge && !isPaymentComplete) {
      // Small delay to ensure dashboard has loaded
      const timer = setTimeout(() => {
        showPaymentNudge();
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [shouldShowNudge, isPaymentComplete, showPaymentNudge]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const getDisplayName = () => {
    if (profileData?.first_name || profileData?.last_name) {
      return `${profileData.first_name || ''} ${profileData.last_name || ''}`.trim();
    }
    return profileData?.email?.split('@')[0] || 'Provider';
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView className="flex-1">
        {/* Header with Gradient */}
        <LinearGradient
          colors={[THEME[colorScheme].gradientStart, THEME[colorScheme].gradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 24 }}
        >
          <View className="flex-row items-center justify-between mb-6">
            <View className="flex-1">
              <Text className="text-white/80 text-sm mb-1">
                {getGreeting()} 👋
              </Text>
              {profileLoading ? (
                <View className="bg-muted/30 rounded p-1">
                  <Skeleton className="w-32 h-6" />
                </View>
              ) : (
                <Text className="text-white text-xl font-bold">
                  {getDisplayName()}
                </Text>
              )}
              <Text className="text-white/70 text-sm mt-1">
                Ready to serve your clients today?
              </Text>
            </View>

            {/* Profile Avatar */}
            <View>
              <Avatar className="w-16 h-16 border-2 border-white/30" alt="Provider avatar">
                {profileData?.avatar_url ? (
                  <AvatarImage source={{ uri: profileData.avatar_url }} />
                ) : null}
                <AvatarFallback className="bg-muted/50">
                  <Text className="text-2xl text-primary font-bold">
                    {profileData?.first_name?.[0]?.toUpperCase() ||
                      profileData?.email?.[0]?.toUpperCase() || '💼'}
                  </Text>
                </AvatarFallback>
              </Avatar>
            </View>
          </View>

          {/* Business Status Badge */}
          <TouchableOpacity
            onPress={() => setShowPauseModal(true)}
            className="bg-muted/30 dark:bg-muted/50 px-4 py-2 rounded-full self-start"
          >
            {availabilityLoading ? (
              <Skeleton className="w-32 h-5" />
            ) : (
              <Text className="text-primary-foreground font-medium text-sm">
                {availabilityData?.isPaused ? '⏸️ Paused' : '🟢 Available for bookings'}
              </Text>
            )}
          </TouchableOpacity>
        </LinearGradient>

        {/* Today's Overview */}
        <View className="px-4 -mt-4 mb-6">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-foreground">Today's Overview</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View className="flex-row gap-3">
                  <TodaysStat
                    icon="📅"
                    value={statsLoading ? '-' : (statsData?.todays_bookings || 0).toString()}
                    label="Today's Appointments"
                    trend="up"
                    isLoading={statsLoading}
                  />
                  <TodaysStat
                    icon="💰"
                    value={statsLoading ? '-' : `£${(statsData?.this_month_earnings || 0).toFixed(0)}`}
                    label="This Month"
                    trend="up"
                    isLoading={statsLoading}
                  />
                  <TodaysStat
                    icon="⭐"
                    value={statsLoading ? '-' : (statsData?.avg_rating || 0).toString()}
                    label="Rating"
                    trend="neutral"
                    isLoading={statsLoading}
                  />
                </View>
              </ScrollView>
            </CardContent>
          </Card>
        </View>

        {/* Business Management Controls */}
        <View className="px-4 mb-6">
          <Text className="text-lg font-bold text-foreground mb-4">Business Controls</Text>
          <View className="gap-3">
            {/* Service Management Quick Access */}
            <Card className="bg-card">
              <CardContent className="p-4">
                <TouchableOpacity
                  onPress={() => router.push('/provider/profile')}
                  className="flex-row items-center justify-between"
                >
                  <View className="flex-row items-center">
                    <Text className="text-xl mr-3">⚙️</Text>
                    <View>
                      <Text className="font-semibold text-foreground">
                        Service Management
                      </Text>
                      <Text className="text-muted-foreground text-sm">
                        Enable/disable services quickly
                      </Text>
                    </View>
                  </View>
                  <Text className="text-muted-foreground text-lg">›</Text>
                </TouchableOpacity>
              </CardContent>
            </Card>

            {/* Availability Settings */}
            <Card className="bg-card">
              <CardContent className="p-4">
                <TouchableOpacity
                  onPress={() => router.push('/provider/calendar')}
                  className="flex-row items-center justify-between"
                >
                  <View className="flex-row items-center">
                    <Text className="text-xl mr-3">🕒</Text>
                    <View>
                      <Text className="font-semibold text-foreground">
                        Availability Settings
                      </Text>
                      <Text className="text-muted-foreground text-sm">
                        Set working hours & breaks
                      </Text>
                    </View>
                  </View>
                  <Text className="text-muted-foreground text-lg">›</Text>
                </TouchableOpacity>
              </CardContent>
            </Card>
          </View>
        </View>

        {/* Quick Actions */}
        <View className="px-4 mb-6">
          <Text className="text-lg font-bold text-foreground mb-4">Quick Actions</Text>
          <View className="gap-3">
            <View className="flex-row gap-3">
              <TouchableOpacity className="flex-1" onPress={() => router.push('/provider/calendar')}>
                <Card className='bg-card'>
                  <CardContent className=" p-4 items-center">
                    <Text className="text-xl mb-2">📅</Text>
                    <Text className="font-semibold text-foreground text-center text-xs">
                      View Calendar
                    </Text>
                    <Text className="text-muted-foreground text-xs text-center mt-1">
                      Today's schedule
                    </Text>
                  </CardContent>
                </Card>
              </TouchableOpacity>
              
              <TouchableOpacity className="flex-1" onPress={() => router.push('/provider/profile')}>
                <Card className='bg-card'>
                  <CardContent className=" p-4 items-center">
                    <Text className="text-xl mb-2">➕</Text>
                    <Text className="font-semibold text-foreground text-center text-xs">
                      New Service
                    </Text>
                    <Text className="text-muted-foreground text-xs text-center mt-1">
                      Add offering
                    </Text>
                  </CardContent>
                </Card>
              </TouchableOpacity>
            </View>
            
            <View className="flex-row gap-3">
              <TouchableOpacity className="flex-1">
                <Card className='bg-card'>
                  <CardContent className=" p-4 items-center">
                    <Text className="text-xl mb-2">💬</Text>
                    <Text className="font-semibold text-foreground text-center text-xs">
                      Messages
                    </Text>
                    <Text className="text-muted-foreground text-xs text-center mt-1">
                      2 unread
                    </Text>
                  </CardContent>
                </Card>
              </TouchableOpacity>
              
              <TouchableOpacity className="flex-1" onPress={() => router.push('/provider/earnings')}>
                <Card className='bg-card'>
                  <CardContent className=" p-4 items-center">
                    <Text className="text-xl mb-2">📊</Text>
                    <Text className="font-semibold text-foreground text-center text-xs">
                      Analytics
                    </Text>
                    <Text className="text-muted-foreground text-xs text-center mt-1">
                      View insights
                    </Text>
                  </CardContent>
                </Card>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Development Tools - Only show in development */}
        {(() => {
          return __DEV__ && (
            <View className="px-4 mb-6">
              <Text className="text-lg font-bold text-foreground mb-4">🔧 Development Tools</Text>
              <View className="gap-3">
                <TouchableOpacity onPress={() => {
                  router.push('/stripe-test');
                }}>
                  <Card className='bg-card border-yellow-200'>
                    <CardContent className="p-4 flex-row items-center">
                      <Text className="text-xl mr-3">🧪</Text>
                      <View className="flex-1">
                        <Text className="font-semibold text-foreground">
                          Stripe Integration Test
                        </Text>
                        <Text className="text-muted-foreground text-xs">
                          Test payment system functionality
                        </Text>
                      </View>
                      <Text className="text-primary text-xs">→</Text>
                    </CardContent>
                  </Card>
                </TouchableOpacity>
              </View>
            </View>
          );
        })()}

        {/* Recent Activity */}
        <View className="px-4 mb-6">
          <Text className="text-lg font-bold text-foreground mb-4">Recent Activity</Text>
          <Card>
            <CardContent className="p-4">
              <View className="gap-4">
                <View className="flex-row items-center">
                  <View className="w-10 h-10 bg-accent/50 rounded-full items-center justify-center mr-3">
                    <Text className="text-lg">✅</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="font-semibold text-foreground">Service completed</Text>
                    <Text className="text-muted-foreground text-sm">Hair styling for Sarah M. • 2h ago</Text>
                  </View>
                  <Text className="text-primary font-bold">+$85</Text>
                </View>

                <View className="flex-row items-center">
                  <View className="w-10 h-10 bg-primary/10 rounded-full items-center justify-center mr-3">
                    <Text className="text-lg">📅</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="font-semibold text-foreground">New booking</Text>
                    <Text className="text-muted-foreground text-sm">Makeup session • Tomorrow 2:00 PM</Text>
                  </View>
                  <Text className="text-primary font-bold">$120</Text>
                </View>

                <View className="flex-row items-center">
                  <View className="w-10 h-10 bg-accent/50 rounded-full items-center justify-center mr-3">
                    <Text className="text-lg">⭐</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="font-semibold text-foreground">New review</Text>
                    <Text className="text-muted-foreground text-sm">5 stars from Michael T. • 1h ago</Text>
                  </View>
                  <Text className="text-primary font-bold">⭐ 5.0</Text>
                </View>
              </View>
            </CardContent>
          </Card>
        </View>

        {/* Business Insights */}
        <View className="px-4 mb-6">
          <Text className="text-lg font-bold text-foreground mb-4">This Week</Text>
          <Card>
            <CardContent className="p-4">
              <View className="flex-row justify-between items-center mb-4">
                <View>
                  <Text className="text-2xl font-bold text-foreground">
                    {statsLoading ? '-' : (statsData?.total_bookings || 12)}
                  </Text>
                  <Text className="text-muted-foreground text-sm">Total bookings</Text>
                </View>
                <View>
                  <Text className="text-2xl font-bold  text-foreground">
                    {statsLoading ? '-' : '$1,240'}
                  </Text>
                  <Text className="text-muted-foreground text-sm">Revenue</Text>
                </View>
                <View>
                  <Text className="text-2xl font-bold text-foreground">
                    {statsLoading ? '-' : (statsData?.completed_bookings || 10)}
                  </Text>
                  <Text className="text-muted-foreground text-sm">Completed</Text>
                </View>
              </View>

              <View className="bg-accent/30 rounded-lg p-3">
                <Text className="text-sm text-muted-foreground">
                  📈 Revenue up 15% from last week
                </Text>
              </View>
            </CardContent>
          </Card>
        </View>

        {/* Service Management */}
        <View className="px-4 mb-6">
          <Text className="text-lg font-bold text-foreground mb-4">Service Management</Text>
          <Card>
            <CardContent className="p-4">
              <View className="gap-4">
                <TouchableOpacity className="flex-row items-center" onPress={() => router.push('/provider/profile')}>
                  <View className="w-10 h-10 bg-primary/10 rounded-full items-center justify-center mr-3">
                    <Text className="text-lg">✏️</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="font-semibold text-foreground">Update Services</Text>
                    <Text className="text-muted-foreground text-sm">Manage pricing and descriptions</Text>
                  </View>
                  <Text className="text-muted-foreground">→</Text>
                </TouchableOpacity>

                <TouchableOpacity className="flex-row items-center" onPress={() => router.push('/provider/profile')}>
                  <View className="w-10 h-10 bg-accent/50 rounded-full items-center justify-center mr-3">
                    <Text className="text-lg">📋</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="font-semibold text-foreground">Service Templates</Text>
                    <Text className="text-muted-foreground text-sm">Pre-built service packages</Text>
                  </View>
                  <Text className="text-muted-foreground">→</Text>
                </TouchableOpacity>

                <TouchableOpacity className="flex-row items-center" onPress={() => router.push('/provider/calendar')}>
                  <View className="w-10 h-10 bg-secondary/20 rounded-full items-center justify-center mr-3">
                    <Text className="text-lg">🕒</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="font-semibold text-foreground">Availability Settings</Text>
                    <Text className="text-muted-foreground text-sm">Set working hours and breaks</Text>
                  </View>
                  <Text className="text-muted-foreground">→</Text>
                </TouchableOpacity>
              </View>
            </CardContent>
          </Card>
        </View>

        {/* Next Appointment */}
        <View className="px-4 mb-6">
          <Text className="text-lg font-bold text-foreground mb-4">Next Appointment</Text>
          <Card>
            <CardContent className="p-4">
              <View className="flex-row items-center gap-3 mb-4">
                <Avatar className="w-14 h-14" alt="Client avatar">
                  <AvatarFallback className="bg-primary/10">
                    <Text className="text-lg font-bold text-primary">JD</Text>
                  </AvatarFallback>
                </Avatar>
                <View className="flex-1">
                  <Text className="font-semibold text-foreground text-base">Jane Doe</Text>
                  <Text className="text-muted-foreground text-sm mt-1">Haircut & Styling</Text>
                  <View className="flex-row items-center gap-2 mt-1">
                    <Text className="text-xs">📅</Text>
                    <Text className="text-muted-foreground text-xs">Tomorrow • 10:00 AM</Text>
                  </View>
                </View>
                <View className="items-center">
                  <Text className="text-primary font-bold text-lg">$85</Text>
                  <Text className="text-muted-foreground text-xs">1.5hr</Text>
                </View>
              </View>
              
              <View className="bg-accent/20 rounded-lg p-3 mb-4">
                <Text className="text-muted-foreground text-xs">
                  📍 Location: 123 Beauty Street, Downtown
                </Text>
              </View>
              
              <View className="gap-3">
                {/* Primary Action - Start Service */}
                <TouchableOpacity>
                  <View className="bg-primary rounded-lg py-4 items-center">
                    <Text className="text-primary-foreground font-bold text-sm">Start Service</Text>
                  </View>
                </TouchableOpacity>
                
                {/* Secondary Actions */}
                <View className="flex-row gap-3">
                  <TouchableOpacity className="flex-1">
                    <View className="bg-secondary/10 border border-secondary/20 rounded-lg py-3 items-center">
                      <Text className="text-muted-foreground font-medium text-xs">Reschedule</Text>
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity className="flex-1">
                    <View className="bg-secondary/10 border border-secondary/20 rounded-lg py-3 items-center">
                      <Text className="text-muted-foreground font-medium text-xs">Contact Client</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </View>
            </CardContent>
          </Card>
        </View>

        {/* Bottom spacing for tab bar */}
        <View className={cn("h-6", Platform.OS === 'ios' && "h-24")} />
      </ScrollView>
      
      {/* Debug Panel - Only in development */}
      {/* {__DEV__ && <StorageDebugPanel />} */}

      {/* Business Pause Modal */}
      {showPauseModal && (
        <View className="absolute inset-0 bg-black/50 justify-center items-center p-4">
          <View className="bg-background rounded-lg p-6 w-full max-w-sm">
            <Text className="text-lg font-bold text-foreground mb-4">
              {availabilityData?.isPaused ? 'Resume Business' : 'Pause Business'}
            </Text>
            
            {!availabilityData?.isPaused && (
              <View className="mb-4 gap-4">
                <View>
                  <Text className="text-sm text-muted-foreground mb-2">
                    Pause duration
                  </Text>
                  <View className="gap-3">
                    <TouchableOpacity
                      onPress={() => setIsIndefinitePause(!isIndefinitePause)}
                      className="flex-row items-center p-2 -m-2"
                      activeOpacity={0.7}
                    >
                      <View className={cn(
                        'w-5 h-5 border-2 rounded mr-3 items-center justify-center',
                        isIndefinitePause ? 'bg-primary border-primary' : 'border-muted-foreground'
                      )}>
                        {isIndefinitePause && <Text className="text-primary-foreground text-xs">✓</Text>}
                      </View>
                      <Text className="text-foreground">Pause indefinitely</Text>
                    </TouchableOpacity>

                    {!isIndefinitePause && (
                      <TouchableOpacity
                        onPress={() => setShowDatePicker(true)}
                        className="bg-card border border-border rounded-lg p-3"
                        activeOpacity={0.7}
                      >
                        <Text className="text-foreground">
                          Resume on: {selectedDate.toLocaleDateString('en-GB', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                <View>
                  <Text className="text-sm text-muted-foreground mb-2">
                    Custom message (optional)
                  </Text>
                  <Textarea
                    placeholder="e.g., On vacation until next week"
                    value={pauseMessage}
                    onChangeText={setPauseMessage}
                    className="min-h-20"
                  />
                </View>
              </View>
            )}

            <View className="flex-row gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onPress={() => {
                  setShowPauseModal(false);
                  setPauseMessage('');
                  setPauseUntil('');
                  setIsIndefinitePause(false);
                  setSelectedDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)); // Reset to default
                }}
              >
                <Text>Cancel</Text>
              </Button>
              <Button
                className="flex-1"
                onPress={async () => {
                  if (user?.id) {
                    try {
                      await updateAvailability.mutateAsync({
                        providerId: user.id,
                        isPaused: !availabilityData?.isPaused,
                        availabilityMessage: pauseMessage || undefined,
                        pauseUntil: availabilityData?.isPaused ? undefined : 
                          (isIndefinitePause ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() : selectedDate.toISOString()),
                      });
                      setShowPauseModal(false);
                      setPauseMessage('');
                      setPauseUntil('');
                      setIsIndefinitePause(false);
                      setSelectedDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
                    } catch (error) {
                      console.error('Error updating availability:', error);
                    }
                  }
                }}
                disabled={updateAvailability.isPending}
              >
                <Text>{availabilityData?.isPaused ? 'Resume' : 'Pause'}</Text>
              </Button>
            </View>
          </View>
        </View>
      )}

      {/* Date Picker Modal */}
      {showDatePicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display="default"
          minimumDate={new Date()}
          onChange={(event, date) => {
            setShowDatePicker(false);
            if (date) {
              setSelectedDate(date);
            }
          }}
        />
      )}
    </SafeAreaView>
  );
}

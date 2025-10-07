import React, { useState, useEffect } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useAuthOptimized } from '@/hooks';
import {
  useNotificationSettings,
  useUpdateNotificationSettings
} from '@/hooks/shared/useProfileData';
import type { NotificationSettings } from '@/hooks/shared/useProfileData';
import { cn } from '@/lib/utils';
import { useColorScheme } from '@/lib/core/useColorScheme';
import { THEME } from '@/lib/core/theme';

export default function NotificationsScreen() {
  const { user } = useAuthOptimized();
  const { colorScheme } = useColorScheme();

  // Data fetching hooks
  const { data: settings, isLoading } = useNotificationSettings(user?.id);
  const updateSettingsMutation = useUpdateNotificationSettings();

  const [localSettings, setLocalSettings] = useState<NotificationSettings>({
    user_id: user?.id || '',
    push_notifications: true,
    email_notifications: true,
    booking_reminders: true,
    marketing_notifications: false,
  });

  // Update local settings when data loads
  useEffect(() => {
    if (settings) {
      setLocalSettings(settings);
    }
  }, [settings]);

  const handleToggle = (key: keyof Omit<NotificationSettings, 'user_id'>) => {
    setLocalSettings(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSave = async () => {
    try {
      await updateSettingsMutation.mutateAsync(localSettings);
      router.back();
    } catch (error) {
      console.error('Failed to update notification settings:', error);
    }
  };

  const hasChanges = () => {
    if (!settings) return true;
    return (
      localSettings.push_notifications !== settings.push_notifications ||
      localSettings.email_notifications !== settings.email_notifications ||
      localSettings.booking_reminders !== settings.booking_reminders ||
      localSettings.marketing_notifications !== settings.marketing_notifications
    );
  };

  const SettingRow = ({
    title,
    description,
    value,
    onToggle,
    icon
  }: {
    title: string;
    description: string;
    value: boolean;
    onToggle: () => void;
    icon: string;
  }) => (
    <View className="flex-row items-center justify-between py-4">
      <View className="flex-1 flex-row items-center">
        <View className="w-10 h-10 bg-muted rounded-full items-center justify-center mr-4">
          <Text className="text-lg">{icon}</Text>
        </View>
        <View className="flex-1">
          <Text variant="p" className="text-foreground font-medium">
            {title}
          </Text>
          <Text variant="small" className="text-muted-foreground">
            {description}
          </Text>
        </View>
      </View>
      <Switch
        checked={value}
        onCheckedChange={onToggle}
      />
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={['top']}>
        <View className="flex-row items-center justify-between p-4 border-b border-border">
          <Pressable onPress={() => router.back()} className="p-2">
            <Ionicons name="arrow-back" size={24} color={THEME[colorScheme].foreground} />
          </Pressable>
          <Text variant="h4" className="text-foreground font-bold">
            Notifications
          </Text>
          <View className="w-10" />
        </View>
        <View className="flex-1 items-center justify-center">
          <Text className="text-muted-foreground">Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      <View className="flex-row items-center justify-between p-4 border-b border-border">
        <Pressable onPress={() => router.back()} className="p-2">
          <Ionicons name="arrow-back" size={24} color={THEME[colorScheme].foreground} />
        </Pressable>
        <Text variant="h4" className="text-foreground font-bold">
          Notifications
        </Text>
        <View className="w-10" />
      </View>

      <ScrollView className="flex-1 p-4" showsVerticalScrollIndicator={false}>
        <Card>
          <CardHeader>
            <CardTitle>Push Notifications</CardTitle>
            <Text variant="small" className="text-muted-foreground">
              Manage how you receive notifications on your device
            </Text>
          </CardHeader>
          <CardContent className="gap-0">
            <SettingRow
              icon="🔔"
              title="Push Notifications"
              description="Receive notifications on your device"
              value={localSettings.push_notifications}
              onToggle={() => handleToggle('push_notifications')}
            />

            <View className="h-px bg-border ml-14" />

            <SettingRow
              icon="📅"
              title="Booking Reminders"
              description="Get reminded about upcoming appointments"
              value={localSettings.booking_reminders}
              onToggle={() => handleToggle('booking_reminders')}
            />
          </CardContent>
        </Card>

        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Email Notifications</CardTitle>
            <Text variant="small" className="text-muted-foreground">
              Choose what emails you want to receive
            </Text>
          </CardHeader>
          <CardContent className="gap-0">
            <SettingRow
              icon="📧"
              title="Email Notifications"
              description="Receive important updates via email"
              value={localSettings.email_notifications}
              onToggle={() => handleToggle('email_notifications')}
            />

            <View className="h-px bg-border ml-14" />

            <SettingRow
              icon="📈"
              title="Marketing Emails"
              description="Get updates about new features and promotions"
              value={localSettings.marketing_notifications}
              onToggle={() => handleToggle('marketing_notifications')}
            />
          </CardContent>
        </Card>

        {/* Info Section */}
        <Card className="mt-4 bg-muted/30">
          <CardContent className="p-4">
            <View className="flex-row items-start">
              <Text className="text-lg mr-3">ℹ️</Text>
              <View className="flex-1">
                <Text variant="small" className="text-muted-foreground leading-relaxed">
                  You can change these settings anytime. Some notifications may still be sent for security and account-related purposes.
                </Text>
              </View>
            </View>
          </CardContent>
        </Card>

        {/* Save Button */}
        <View className="mt-6 mb-8">
          <Button
            onPress={handleSave}
            disabled={!hasChanges() || updateSettingsMutation.isPending}
            className={cn(
              'h-12',
              (!hasChanges() || updateSettingsMutation.isPending) && 'opacity-50'
            )}
          >
            <Text className="text-primary-foreground font-semibold text-base">
              {updateSettingsMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Text>
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
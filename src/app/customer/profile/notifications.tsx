import React, { useState, useEffect } from 'react';
import { View, ScrollView, Pressable, TouchableOpacity } from 'react-native';
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
import { THEME } from '@/lib/theme';

export default function CustomerNotificationsScreen() {
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
    if (!user?.id) return;

    try {
      await updateSettingsMutation.mutateAsync(localSettings);
      router.back();
    } catch (error) {
      console.error('Failed to update notification settings:', error);
    }
  };

  const notificationOptions = [
    {
      key: 'push_notifications' as const,
      title: 'Push Notifications',
      subtitle: 'Receive push notifications on your device',
      icon: 'notifications-outline' as keyof typeof Ionicons.glyphMap,
    },
    {
      key: 'email_notifications' as const,
      title: 'Email Notifications',
      subtitle: 'Receive notifications via email',
      icon: 'mail-outline' as keyof typeof Ionicons.glyphMap,
    },
    {
      key: 'booking_reminders' as const,
      title: 'Booking Reminders',
      subtitle: 'Get reminded about upcoming bookings and appointments',
      icon: 'calendar-outline' as keyof typeof Ionicons.glyphMap,
    },
    {
      key: 'marketing_notifications' as const,
      title: 'Marketing & Updates',
      subtitle: 'Receive promotional offers and app updates',
      icon: 'megaphone-outline' as keyof typeof Ionicons.glyphMap,
    },
  ];

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={['top']}>
        <View className="flex-row items-center px-6 py-4 border-b border-border">
          <TouchableOpacity
            onPress={() => router.back()}
            className="mr-4 p-2 rounded-full bg-secondary"
          >
            <Ionicons name="arrow-back" size={20} className="text-secondary-foreground" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-foreground">Notification Settings</Text>
        </View>
        <View className="flex-1 items-center justify-center">
          <Text className="text-muted-foreground">Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center px-6 py-4 border-b border-border">
        <TouchableOpacity
          onPress={() => router.back()}
          className="mr-4 p-2 rounded-full bg-secondary"
        >
          <Ionicons name="arrow-back" size={20} className="text-secondary-foreground" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-foreground">Notification Settings</Text>
      </View>

      <ScrollView className="flex-1">
        <View className="px-6 py-6">
          {/* Info Card */}
          <Card className="mb-6 bg-primary/5 border-primary/20">
            <CardContent className="p-4">
              <View className="flex-row items-start">
                <Ionicons name="information-circle" size={20} className="text-primary mr-3 mt-0.5" />
                <View className="flex-1">
                  <Text className="text-primary font-semibold mb-1">Stay Connected</Text>
                  <Text className="text-primary/80 text-sm">
                    Customize how you receive notifications about your bookings, offers, and updates.
                  </Text>
                </View>
              </View>
            </CardContent>
          </Card>

          {/* Notification Options */}
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {notificationOptions.map((option, index) => (
                <View key={option.key}>
                  <View className="flex-row items-center px-6 py-4">
                    <View className="w-10 h-10 bg-primary/10 rounded-full items-center justify-center mr-4">
                      <Ionicons name={option.icon} size={20} className="text-primary" />
                    </View>
                    <View className="flex-1">
                      <Text className="font-semibold text-foreground mb-1">
                        {option.title}
                      </Text>
                      <Text className="text-sm text-muted-foreground">
                        {option.subtitle}
                      </Text>
                    </View>
                    <Switch
                      checked={localSettings[option.key]}
                      onCheckedChange={() => handleToggle(option.key)}
                    />
                  </View>
                  {index < notificationOptions.length - 1 && (
                    <View className="h-px bg-border mx-6" />
                  )}
                </View>
              ))}
            </CardContent>
          </Card>

          {/* Save Button */}
          <View className="mt-8">
            <Button
              onPress={handleSave}
              disabled={updateSettingsMutation.isPending}
              className="w-full"
            >
              <Text className="font-semibold">
                {updateSettingsMutation.isPending ? 'Saving...' : 'Save Settings'}
              </Text>
            </Button>
          </View>

          {/* Additional Info */}
          <View className="mt-6 p-4 bg-muted/50 rounded-lg">
            <Text className="text-sm text-muted-foreground text-center">
              You can change these settings anytime. Push notifications require device permissions.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
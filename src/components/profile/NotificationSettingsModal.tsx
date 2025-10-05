import React, { useState } from 'react';
import { View, Modal, ScrollView, Pressable, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useUpdateNotificationSettings } from '@/hooks';
import type { NotificationSettings } from '@/hooks';
import { cn } from '@/lib/utils';
import { useColorScheme } from '@/lib/core/useColorScheme';
import { THEME } from '@/lib/core/theme';

interface NotificationSettingsModalProps {
  visible: boolean;
  onClose: () => void;
  settings?: NotificationSettings;
  userId: string;
}

export function NotificationSettingsModal({ 
  visible, 
  onClose, 
  settings, 
  userId 
}: NotificationSettingsModalProps) {
  const updateSettingsMutation = useUpdateNotificationSettings();
  const { colorScheme } = useColorScheme();
  
  const [localSettings, setLocalSettings] = useState<NotificationSettings>({
    user_id: userId,
    push_notifications: settings?.push_notifications ?? true,
    email_notifications: settings?.email_notifications ?? true,
    booking_reminders: settings?.booking_reminders ?? true,
    marketing_notifications: settings?.marketing_notifications ?? false,
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleToggle = (key: keyof Omit<NotificationSettings, 'user_id'>) => {
    setLocalSettings(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSave = async () => {
    try {
      setIsSubmitting(true);
      await updateSettingsMutation.mutateAsync(localSettings);
      onClose();
    } catch (error) {
      console.error('Failed to update notification settings:', error);
    } finally {
      setIsSubmitting(false);
    }
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
        value={value}
        onValueChange={onToggle}
        trackColor={{ 
          false: 'rgba(120, 113, 108, 0.3)', 
          true: THEME[colorScheme].primary
        }}
        thumbColor={value ? '#fff' : '#f4f3f4'}
      />
    </View>
  );

  const hasChanges = () => {
    if (!settings) return true;
    return (
      localSettings.push_notifications !== settings.push_notifications ||
      localSettings.email_notifications !== settings.email_notifications ||
      localSettings.booking_reminders !== settings.booking_reminders ||
      localSettings.marketing_notifications !== settings.marketing_notifications
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
        <View className="flex-row items-center justify-between p-4 border-b border-border">
          <Pressable onPress={onClose} className="p-2">
            <Text className="text-primary text-base">Cancel</Text>
          </Pressable>
          <Text variant="h4" className="text-foreground font-bold">
            Notifications
          </Text>
          <View className="w-16" /> 
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
              disabled={!hasChanges() || isSubmitting}
              className={cn(
                'h-12',
                (!hasChanges() || isSubmitting) && 'opacity-50'
              )}
            >
              <Text className="text-primary-foreground font-semibold text-base">
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </Text>
            </Button>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
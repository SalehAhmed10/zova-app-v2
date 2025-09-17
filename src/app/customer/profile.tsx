import React from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { router } from 'expo-router';
import { useAppStore } from '@/stores/app';

export default function ProfileScreen() {
  const { logout } = useAppStore();

  const handleLogout = () => {
    logout();
    router.replace('/');
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="flex-1 justify-center items-center px-6">
        <Text variant="h2" className="text-center mb-4">
          Profile
        </Text>
        <Text variant="p" className="text-muted-foreground text-center mb-8">
          Manage your account settings and preferences. Coming soon!
        </Text>
        
        <Button variant="outline" onPress={handleLogout} className="w-full max-w-sm">
          <Text>Sign Out</Text>
        </Button>
      </View>
    </SafeAreaView>
  );
}
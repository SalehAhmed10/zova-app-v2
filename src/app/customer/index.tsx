import React from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/text';

export default function CustomerDashboard() {
  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="flex-1 justify-center items-center px-6">
        <Text variant="h1" className="text-center mb-4">
          Welcome to ZOVA Customer
        </Text>
        <Text variant="p" className="text-muted-foreground text-center">
          Find and book trusted service providers in your area. Coming soon!
        </Text>
      </View>
    </SafeAreaView>
  );
}

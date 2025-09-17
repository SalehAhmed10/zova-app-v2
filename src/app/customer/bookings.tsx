import React from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/text';

export default function BookingsScreen() {
  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="flex-1 justify-center items-center px-6">
        <Text variant="h2" className="text-center mb-4">
          My Bookings
        </Text>
        <Text variant="p" className="text-muted-foreground text-center">
          Track your upcoming and past service appointments. Coming soon!
        </Text>
      </View>
    </SafeAreaView>
  );
}
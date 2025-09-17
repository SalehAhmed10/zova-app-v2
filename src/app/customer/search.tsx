import React from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/text';

export default function SearchScreen() {
  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="flex-1 justify-center items-center px-6">
        <Text variant="h2" className="text-center mb-4">
          Search Services
        </Text>
        <Text variant="p" className="text-muted-foreground text-center">
          Find the perfect service provider for your needs. Coming soon!
        </Text>
      </View>
    </SafeAreaView>
  );
}
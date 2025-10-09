import React from 'react';
import { View } from '@/components/ui/view';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { useResolvedTheme, useThemePreference, useSetTheme } from '@/stores/ui/theme';
import { useStableCallback } from '@/lib/monitoring/performance';

export const ThemeToggle = React.memo(() => {
  const resolvedTheme = useResolvedTheme();
  const preference = useThemePreference();
  const setTheme = useSetTheme();

  const handleLightPress = useStableCallback(() => setTheme('light'), [setTheme]);
  const handleDarkPress = useStableCallback(() => setTheme('dark'), [setTheme]);
  const handleSystemPress = useStableCallback(() => setTheme('system'), [setTheme]);

  return (
    <View className="flex-row items-center justify-between p-4 bg-card rounded-xl ">
      <View className="flex-1">
        <Text className="text-base font-semibold text-foreground mb-1">Theme</Text>
        <Text className="text-sm text-muted-foreground capitalize">
          {preference} mode
        </Text>
      </View>

      <View className="flex-row bg-muted/50 rounded-full p-1 gap-1">
        <Button
          variant={preference === 'light' ? 'default' : 'ghost'}
          size="sm"
          className={`rounded-full px-4 ${preference === 'light' ? 'bg-background ' : ''}`}
          onPress={handleLightPress}
        >
          <Text className="text-lg">☀️</Text>
        </Button>

        <Button
          variant={preference === 'dark' ? 'default' : 'ghost'}
          size="sm"
          className={`rounded-full px-4 ${preference === 'dark' ? 'bg-background ' : ''}`}
          onPress={handleDarkPress}
        >
          <Text className="text-lg">🌙</Text>
        </Button>

        <Button
          variant={preference === 'system' ? 'default' : 'ghost'}
          size="sm"
          className={`rounded-full px-4 ${preference === 'system' ? 'bg-background ' : ''}`}
          onPress={handleSystemPress}
        >
          <Text className="text-lg">🖥️</Text>
        </Button>
      </View>
    </View>
  );
});

ThemeToggle.displayName = 'ThemeToggle';
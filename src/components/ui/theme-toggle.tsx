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
    <View className="p-4 bg-card rounded-lg border">
      <Text className="text-lg font-semibold mb-2">Theme Settings</Text>
      <Text className="text-sm text-muted-foreground mb-4">
        Current: {resolvedTheme} ({preference})
      </Text>

      <View className="flex-row gap-2">
        <Button
          variant={preference === 'light' ? 'default' : 'outline'}
          size="sm"
          onPress={handleLightPress}
        >
          <Text>Light</Text>
        </Button>

        <Button
          variant={preference === 'dark' ? 'default' : 'outline'}
          size="sm"
          onPress={handleDarkPress}
        >
          <Text>Dark</Text>
        </Button>

        <Button
          variant={preference === 'system' ? 'default' : 'outline'}
          size="sm"
          onPress={handleSystemPress}
        >
          <Text>System</Text>
        </Button>
      </View>
    </View>
  );
});

ThemeToggle.displayName = 'ThemeToggle';
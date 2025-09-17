import React from 'react';
import { View } from '@/components/ui/view';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { useThemeStore } from '@/stores/theme';

export function ThemeToggle() {
  const { resolvedTheme, preference, setTheme } = useThemeStore();

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
          onPress={() => setTheme('light')}
        >
          <Text>Light</Text>
        </Button>

        <Button
          variant={preference === 'dark' ? 'default' : 'outline'}
          size="sm"
          onPress={() => setTheme('dark')}
        >
          <Text>Dark</Text>
        </Button>

        <Button
          variant={preference === 'system' ? 'default' : 'outline'}
          size="sm"
          onPress={() => setTheme('system')}
        >
          <Text>System</Text>
        </Button>
      </View>
    </View>
  );
}
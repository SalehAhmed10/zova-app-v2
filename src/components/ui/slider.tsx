import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Text } from '@/components/ui/text';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/lib/core/useColorScheme';
import { THEME } from '@/lib/theme';

interface SliderProps {
  value: number[];
  onValueChange: (value: number[]) => void;
  minimumValue?: number;
  maximumValue?: number;
  step?: number;
  className?: string;
}

export function SliderComponent({
  value,
  onValueChange,
  minimumValue = 0,
  maximumValue = 100,
  step = 1,
  className,
}: SliderProps) {
  const { isDarkColorScheme } = useColorScheme();
  const currentValue = value[0];

  const decreaseValue = () => {
    const newValue = Math.max(minimumValue, currentValue - step);
    onValueChange([newValue]);
  };

  const increaseValue = () => {
    const newValue = Math.min(maximumValue, currentValue + step);
    onValueChange([newValue]);
  };

  const disabledColor = isDarkColorScheme ? THEME.dark.mutedForeground : THEME.light.mutedForeground;
  const enabledColor = isDarkColorScheme ? THEME.dark.foreground : THEME.light.foreground;

  return (
    <View className={`flex-row items-center gap-4 ${className}`}>
      <TouchableOpacity
        onPress={decreaseValue}
        className="w-10 h-10 bg-muted rounded-full items-center justify-center"
        disabled={currentValue <= minimumValue}
      >
        <Ionicons name="remove" size={20} color={currentValue <= minimumValue ? disabledColor : enabledColor} />
      </TouchableOpacity>

      <View className="flex-1 items-center">
        <Text className="text-foreground font-medium">{currentValue}</Text>
      </View>

      <TouchableOpacity
        onPress={increaseValue}
        className="w-10 h-10 bg-muted rounded-full items-center justify-center"
        disabled={currentValue >= maximumValue}
      >
        <Ionicons name="add" size={20} color={currentValue >= maximumValue ? disabledColor : enabledColor} />
      </TouchableOpacity>
    </View>
  );
}
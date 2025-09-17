import React from 'react';
import { ScrollView, View, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ScreenWrapperProps {
  children: React.ReactNode;
  scrollable?: boolean;
  className?: string;
  showsVerticalScrollIndicator?: boolean;
  keyboardShouldPersistTaps?: 'always' | 'never' | 'handled';
  edges?: readonly ('top' | 'bottom' | 'left' | 'right')[];
  contentContainerClassName?: string;
  style?: any;
}

export const ScreenWrapper: React.FC<ScreenWrapperProps> = ({
  children,
  scrollable = true,
  className = 'flex-1 bg-background',
  showsVerticalScrollIndicator = false,
  keyboardShouldPersistTaps = 'handled',
  edges = ['top'],
  contentContainerClassName = 'px-6 py-4',
  style,
}) => {
  const insets = useSafeAreaInsets();
  
  // Calculate proper bottom padding based on platform and safe area
  const getBottomPadding = () => {
    const basePadding = 20;
    const extraPadding = Math.max(insets.bottom, Platform.OS === 'ios' ? 34 : 16);
    return basePadding + extraPadding;
  };

  if (scrollable) {
    return (
      <SafeAreaView className={className} edges={edges} style={style}>
        <ScrollView 
          className="flex-1"
          showsVerticalScrollIndicator={showsVerticalScrollIndicator}
          keyboardShouldPersistTaps={keyboardShouldPersistTaps}
          contentContainerStyle={{ 
            paddingBottom: getBottomPadding(),
          }}
          contentContainerClassName={contentContainerClassName}
        >
          {children}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className={className} edges={edges} style={style}>
      <View 
        className={`flex-1 ${contentContainerClassName}`}
        style={{ paddingBottom: getBottomPadding() }}
      >
        {children}
      </View>
    </SafeAreaView>
  );
};
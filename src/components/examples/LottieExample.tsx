import React from 'react';
import { View } from '@/components/ui/view';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import LottieView from 'lottie-react-native';
import { useSharedValue, useAnimatedStyle, withSpring, runOnJS } from 'react-native-reanimated';
import Animated from 'react-native-reanimated';

interface LottieExampleProps {
  title?: string;
  description?: string;
}

export function LottieExample({
  title = "Lottie Animation",
  description = "Beautiful animations powered by Lottie"
}: LottieExampleProps) {
  const [isPlaying, setIsPlaying] = React.useState(false);
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }), []);

  // Handle scale animation when isPlaying changes
  React.useEffect(() => {
    scale.value = withSpring(isPlaying ? 1.1 : 1);
  }, [isPlaying, scale]);

  const handlePlayPause = React.useCallback(() => {
    const newPlayingState = !isPlaying;
    setIsPlaying(newPlayingState);
    
    // Update shared value without 'worklet' directive since this is a regular function
    scale.value = withSpring(newPlayingState ? 1.1 : 1);
  }, [isPlaying, scale]);

  const handleReset = React.useCallback(() => {
    setIsPlaying(false);
    
    // Update shared value without 'worklet' directive since this is a regular function
    scale.value = withSpring(1);
  }, [scale]);

  return (
    <View className="items-center p-6">
      <Text variant="h3" className="mb-2 text-center">
        {title}
      </Text>
      <Text variant="muted" className="mb-6 text-center">
        {description}
      </Text>

      {/* Lottie Animation Container */}
      <Animated.View style={animatedStyle} className="mb-6">
        <View className="w-64 h-64 bg-muted/20 rounded-2xl overflow-hidden">
          <LottieView
            source={{
              uri: 'https://assets2.lottiefiles.com/packages/lf20_usmfx6bp.json' // Celebration animation URL
            }}
            autoPlay={isPlaying}
            loop={true}
            style={{ width: '100%', height: '100%' }}
            onAnimationFinish={() => {
              if (isPlaying) {
                setIsPlaying(false);
              }
            }}
          />
        </View>
      </Animated.View>

      {/* Controls */}
      <View className="flex-row gap-3">
        <Button
          onPress={handlePlayPause}
          variant={isPlaying ? "secondary" : "default"}
        >
          <Text>{isPlaying ? 'Pause' : 'Play'}</Text>
        </Button>
        <Button
          onPress={handleReset}
          variant="outline"
        >
          <Text>Reset</Text>
        </Button>
      </View>

      {/* Instructions */}
      <View className="mt-6 p-4 bg-muted/50 rounded-lg max-w-sm">
        <Text variant="small" className="text-center text-muted-foreground">
          Lottie animations can be loaded from URLs or local files
        </Text>
      </View>
    </View>
  );
}

// Alternative: Simple loading animation without external file
export function LottieLoadingExample() {
  return (
    <View className="items-center justify-center p-8">
      <View className="w-24 h-24">
        <LottieView
          source={{
            uri: 'https://assets2.lottiefiles.com/packages/lf20_usmfx6bp.json' // Loading animation URL
          }}
          autoPlay
          loop
          style={{ width: '100%', height: '100%' }}
        />
      </View>
      <Text variant="muted" className="mt-4">
        Loading...
      </Text>
    </View>
  );
}

// Success animation
export function LottieSuccessExample({ onComplete }: { onComplete?: () => void }) {
  return (
    <View className="items-center justify-center p-8">
      <View className="w-32 h-32">
        <LottieView
          source={{
            uri: 'https://assets1.lottiefiles.com/packages/lf20_lk80fpsm.json' // Success checkmark
          }}
          autoPlay
          loop={false}
          style={{ width: '100%', height: '100%' }}
          onAnimationFinish={onComplete}
        />
      </View>
      <Text variant="h4" className="mt-4 text-center">
        Success!
      </Text>
    </View>
  );
}
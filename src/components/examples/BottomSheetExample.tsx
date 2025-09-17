import React from 'react';
import { View } from '@/components/ui/view';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { useCallback, useRef } from 'react';

interface BottomSheetExampleProps {
  title?: string;
  snapPoints?: string[];
}

export function BottomSheetExample({
  title = "Bottom Sheet Example",
  snapPoints = ['25%', '50%', '90%']
}: BottomSheetExampleProps) {
  const bottomSheetRef = useRef<BottomSheet>(null);

  const handleSnapPress = useCallback((index: number) => {
    bottomSheetRef.current?.snapToIndex(index);
  }, []);

  const handleClosePress = useCallback(() => {
    bottomSheetRef.current?.close();
  }, []);

  return (
    <View className="flex-1">
      {/* Main Content */}
      <View className="flex-1 items-center justify-center p-6">
        <Text variant="h2" className="mb-4 text-center">
          {title}
        </Text>
        <Text variant="muted" className="mb-8 text-center max-w-sm">
          Tap the buttons below to open the bottom sheet at different snap points.
        </Text>

        <View className="gap-3 w-full max-w-sm">
          {snapPoints.map((point, index) => (
            <Button
              key={index}
              onPress={() => handleSnapPress(index)}
              variant={index === 0 ? "default" : "outline"}
            >
              <Text>Open at {point}</Text>
            </Button>
          ))}

          <Button
            onPress={handleClosePress}
            variant="secondary"
          >
            <Text>Close Sheet</Text>
          </Button>
        </View>
      </View>

      {/* Bottom Sheet */}
      <BottomSheet
        ref={bottomSheetRef}
        snapPoints={snapPoints}
        enablePanDownToClose
        index={-1} // Start closed
        backgroundStyle={{
          backgroundColor: 'hsl(var(--background))',
        }}
        handleIndicatorStyle={{
          backgroundColor: 'hsl(var(--muted-foreground))',
        }}
      >
        <BottomSheetView className="flex-1 p-6">
          <View className="gap-6">
            <View>
              <Text variant="h3" className="mb-2">
                Bottom Sheet Content
              </Text>
              <Text variant="muted">
                This is a customizable bottom sheet with smooth animations.
                You can add any content here - forms, lists, settings, etc.
              </Text>
            </View>

            <Card>
              <CardHeader>
                <CardTitle>Features</CardTitle>
              </CardHeader>
              <CardContent className="gap-3">
                <View className="flex-row items-center gap-3">
                  <View className="w-2 h-2 bg-primary rounded-full" />
                  <Text>Smooth animations</Text>
                </View>
                <View className="flex-row items-center gap-3">
                  <View className="w-2 h-2 bg-primary rounded-full" />
                  <Text>Multiple snap points</Text>
                </View>
                <View className="flex-row items-center gap-3">
                  <View className="w-2 h-2 bg-primary rounded-full" />
                  <Text>Gesture support</Text>
                </View>
                <View className="flex-row items-center gap-3">
                  <View className="w-2 h-2 bg-primary rounded-full" />
                  <Text>Customizable styling</Text>
                </View>
              </CardContent>
            </Card>

            <View className="gap-3">
              <Button onPress={handleClosePress} className="w-full">
                <Text>Close</Text>
              </Button>
            </View>
          </View>
        </BottomSheetView>
      </BottomSheet>
    </View>
  );
}

// Advanced example with form in bottom sheet
export function BottomSheetFormExample() {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const [formData, setFormData] = React.useState({
    name: '',
    email: '',
    message: '',
  });

  const handleOpen = useCallback(() => {
    bottomSheetRef.current?.snapToIndex(1);
  }, []);

  const handleSubmit = () => {
    console.log('Form submitted:', formData);
    bottomSheetRef.current?.close();
    // Reset form
    setFormData({ name: '', email: '', message: '' });
  };

  return (
    <View className="flex-1">
      {/* Trigger Button */}
      <View className="flex-1 items-center justify-center p-6">
        <Button onPress={handleOpen}>
          <Text>Open Form</Text>
        </Button>
      </View>

      {/* Form Bottom Sheet */}
      <BottomSheet
        ref={bottomSheetRef}
        snapPoints={['50%', '90%']}
        enablePanDownToClose
        index={-1}
      >
        <BottomSheetView className="flex-1 p-6">
          <View className="gap-6">
            <View>
              <Text variant="h3" className="mb-2">
                Contact Form
              </Text>
              <Text variant="muted">
                Fill out the form below and we'll get back to you.
              </Text>
            </View>

            <View className="gap-4">
              <View>
                <Text variant="small" className="mb-2 font-medium">
                  Name
                </Text>
                <View className="h-10 px-3 py-2 border border-input rounded-md bg-background">
                  <Text
                    className="text-foreground"
                    onPress={() => {/* Focus input */}}
                  >
                    {formData.name || 'Enter your name'}
                  </Text>
                </View>
              </View>

              <View>
                <Text variant="small" className="mb-2 font-medium">
                  Email
                </Text>
                <View className="h-10 px-3 py-2 border border-input rounded-md bg-background">
                  <Text
                    className="text-foreground"
                    onPress={() => {/* Focus input */}}
                  >
                    {formData.email || 'Enter your email'}
                  </Text>
                </View>
              </View>

              <View>
                <Text variant="small" className="mb-2 font-medium">
                  Message
                </Text>
                <View className="min-h-20 px-3 py-2 border border-input rounded-md bg-background">
                  <Text
                    className="text-foreground"
                    onPress={() => {/* Focus textarea */}}
                  >
                    {formData.message || 'Enter your message'}
                  </Text>
                </View>
              </View>
            </View>

            <View className="gap-3">
              <Button onPress={handleSubmit} className="w-full">
                <Text>Send Message</Text>
              </Button>
              <Button
                onPress={() => bottomSheetRef.current?.close()}
                variant="outline"
                className="w-full"
              >
                <Text>Cancel</Text>
              </Button>
            </View>
          </View>
        </BottomSheetView>
      </BottomSheet>
    </View>
  );
}
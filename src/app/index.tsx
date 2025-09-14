import { Link } from "expo-router";
import React from "react";
import { Text as RNText, View as RNView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Link as UILink } from "@/components/ui/link";
import { Text } from "@/components/ui/text";
import { View } from "@/components/ui/view";
import { useColorScheme } from "@/lib/useColorScheme";

export default function Page() {
  return (
    <View className="flex flex-1">
      <Header />
      <Content />
      <Footer />
    </View>
  );
}

function Content() {
  const { colorScheme } = useColorScheme();

  return (
    <View className="flex-1">
      <View className="py-12 md:py-24 lg:py-32 xl:py-48">
        <View className="px-4 md:px-6">
          <View className="flex flex-col items-center gap-4 text-center">
            <Text
              variant="h1"
              className="text-3xl text-center native:text-5xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl"
            >
              Welcome to Project ACME
            </Text>
            <Text variant="lead" className="mx-auto max-w-[700px] text-lg text-center text-gray-500 md:text-xl dark:text-gray-400">
              Discover and collaborate on acme. Explore our services now.
            </Text>

            <View className="bg-card border rounded-lg p-4 mb-4">
              <Text variant="small" className="text-muted-foreground mb-2">
                Current Theme: <Text className="font-semibold text-foreground">
                  {colorScheme === 'dark' ? '🌙 Dark Mode' : '☀️ Light Mode'}
                </Text>
              </Text>
              <Text variant="muted" className="text-xs text-muted-foreground">
                Toggle theme using the button in the header
              </Text>
            </View>

            <View className="gap-4">
              <UILink
                className="flex h-9 items-center justify-center overflow-hidden rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground web:shadow ios:shadow transition-colors hover:bg-primary/90 active:bg-primary/90 web:focus-visible:outline-none web:focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
                href="/"
              >
                Explore
              </UILink>
              <Button onPress={() => console.log('Button pressed!')}>
                <Text className="text-primary-foreground">Get Started</Text>
              </Button>
            </View>

            <Card className="w-full max-w-sm mt-8">
              <CardHeader>
                <CardTitle asChild>
                  <Text variant="h3">React Native Reusables</Text>
                </CardTitle>
                <CardDescription asChild>
                  <Text variant="muted">Test the components below</Text>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Input placeholder="Enter your name" />
              </CardContent>
              <CardFooter>
                <Button className="w-full">
                  <RNText className="text-primary-foreground">Submit</RNText>
                </Button>
              </CardFooter>
            </Card>
          </View>
        </View>
      </View>
    </View>
  );
}

function Header() {
  const { top } = useSafeAreaInsets();
  const { colorScheme, toggleColorScheme } = useColorScheme();

  return (
    <View style={{ paddingTop: top }}>
      <View className="px-4 lg:px-6 h-14 flex items-center flex-row justify-between ">
        <UILink className="font-bold flex-1 items-center justify-center" href="/">
          ACME
        </UILink>
        <View className="flex flex-row gap-4 sm:gap-6 items-center">
          <UILink
            className="text-md font-medium hover:underline web:underline-offset-4 transition-colors"
            href="/"
          >
            About
          </UILink>
          <UILink
            className="text-md font-medium hover:underline web:underline-offset-4 transition-colors"
            href="/"
          >
            Product
          </UILink>
          <UILink
            className="text-md font-medium hover:underline web:underline-offset-4 transition-colors"
            href="/"
          >
            Pricing
          </UILink>

          <View className="flex flex-row items-center gap-2">
            <Text variant="small" className="text-foreground">
              {colorScheme === 'dark' ? '🌙' : '☀️'} {colorScheme}
            </Text>
            <Button
              variant="outline"
              size="sm"
              onPress={toggleColorScheme}
              className="px-3 py-1"
            >
              <Text className="text-sm text-foreground">
                {colorScheme === 'dark' ? '☀️ Light' : '🌙 Dark'}
              </Text>
            </Button>
          </View>
        </View>
      </View>
    </View>
  );
}

function Footer() {
  const { bottom } = useSafeAreaInsets();
  return (
    <View
      className="flex shrink-0 bg-muted native:hidden"
      style={{ paddingBottom: bottom }}
    >
      <View className="py-6 flex-1 items-start px-4 md:px-6 ">
        <Text variant="small" className="text-center text-muted-foreground">
          © {new Date().getFullYear()} Me
        </Text>
      </View>
    </View>
  );
}

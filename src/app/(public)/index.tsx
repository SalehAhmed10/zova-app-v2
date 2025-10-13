import { Redirect } from 'expo-router';
import { useAuthStore } from '@/stores/auth';
import { View } from 'react-native';
import { Logo } from '@/components/branding';

/**
 * Index Screen - Smart Redirect
 * 
 * Routing Logic:
 * 1. No session + no onboarding → /onboarding
 * 2. No session + onboarding done → /auth
 * 3. Authenticated + customer → /customer
 * 4. Authenticated + provider → /provider (verification check handled in provider layout)
 */
export default function IndexScreen() {
  const session = useAuthStore((state) => state.session);
  const userRole = useAuthStore((state) => state.userRole);
  const isOnboardingComplete = useAuthStore((state) => state.isOnboardingComplete);

  console.log('[Index] 🧭 Routing...', {
    hasSession: !!session,
    userRole,
    isOnboardingComplete,
  });

  // Route 1: New user → Onboarding
  if (!session && !isOnboardingComplete) {
    return <Redirect href="/(public)/onboarding" />;
  }

  // Route 2: Not authenticated → Auth
  if (!session) {
    return <Redirect href="/(auth)" />;
  }

  // Route 3: Customer → Customer Dashboard
  if (userRole === 'customer') {
    return <Redirect href="/(customer)" />;
  }

  // Route 4: Provider → Provider Dashboard (verification check handled in layout)
  if (userRole === 'provider') {
    return <Redirect href="/(provider)" />;
  }

  // Fallback: Show loading while determining role
  return (
    <View className="flex-1 bg-background items-center justify-center px-6">
      <Logo size={140} />
      
      {/* Simple loading indicator */}
      <View className="flex-row gap-2 mt-8">
        <View className="w-2 h-2 bg-primary rounded-full animate-pulse" />
        <View className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
        <View className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
      </View>
    </View>
  );
}

import { Redirect, Stack } from 'expo-router';
import { useAuthStore } from '@/stores/auth';
import { useProfile } from '@/hooks/auth/useProfile';

/**
 * (public) Route Group Layout
 * 
 * Contains routes accessible without authentication:
 * - / (index) - Redirect to appropriate dashboard
 * - /onboarding - First-time user onboarding
 */
export default function PublicLayout() {
  console.log('[PublicLayout] 🏗️ Rendering public route group');
  
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="onboarding" />
    </Stack>
  );
}

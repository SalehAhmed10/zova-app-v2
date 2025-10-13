# Clean Auth & Routing Architecture Refactor

## 🎯 Problem Analysis

### Current Issues

Your `_layout.tsx` and auth/routing architecture has become **too complex and unmaintainable**:

#### 1. **Too Many Hooks** (8+ hooks in _layout.tsx)
```tsx
// Current _layout.tsx - TOO COMPLEX
useAuthListener();                    // Auth state changes
useAuthStateNavigation();             // Auto-navigation on auth changes
useAuthNavigation();                  // Navigation decision logic
useReviewPrompt();                    // Review modal logic
useColorScheme();                     // Theme logic
useThemeHydration();                  // Theme loading
useAppStore();                        // App state
// ... and more
```

#### 2. **Scattered Navigation Logic** (1500+ lines across 8 files)
- `useAuthNavigation.ts` - 700+ lines of complex navigation logic
- `useAuthStateNavigation` - Duplicate navigation logic
- `useNavigationState.ts` - More navigation state
- `RootNavigator` - Manual `router.replace()` calls
- Multiple `useEffect` hooks managing navigation

#### 3. **Multiple Sources of Truth**
- AppStore (Zustand)
- Supabase session
- React Query cache
- AsyncStorage
- Each has different state, causing sync issues

#### 4. **Manual Navigation Anti-Pattern**
```tsx
// ❌ Current approach - Manual navigation in useEffect
React.useEffect(() => {
  if (shouldRedirectToOnboarding) {
    router.replace('/onboarding');
  }
}, [shouldRedirectToOnboarding]);

React.useEffect(() => {
  if (isAuthenticated && isReady && navigationDecision?.shouldNavigate) {
    router.replace(navigationDecision.destination);
  }
}, [isAuthenticated, isReady, navigationDecision]);
```

#### 5. **React Query for Navigation** (Wrong Tool)
```tsx
// ❌ Using React Query to compute navigation decisions
const { data: navigationDecision } = useQuery({
  queryKey: ['navigation-decision', ...],
  queryFn: async () => {
    // 300+ lines of navigation logic
  }
});
```
React Query is for **server state**, not client-side navigation logic!

---

## ✅ Solution: Modern Expo Router Architecture

Based on [Expo Router Authentication Docs](https://docs.expo.dev/router/advanced/authentication/), here's the clean solution:

### Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    SessionProvider                       │
│  Single source of truth for auth state                  │
│  • isLoading, session, user, userRole                   │
│  • isOnboardingComplete, isVerified                     │
│  • signIn(), signOut(), completeOnboarding()            │
│  • Integrates Supabase auth listener                    │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│                  SplashController                        │
│  Manages splash screen visibility                       │
│  • Shows while SessionProvider.isLoading                │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│                   RootNavigator                          │
│  Declarative routing with Stack.Protected               │
│  • No manual navigation logic                           │
│  • No useEffect                                         │
│  • Automatic redirects                                  │
└─────────────────────────────────────────────────────────┘
```

### Key Principles

1. **Single Source of Truth**: SessionProvider manages ALL auth state
2. **Declarative Routing**: Stack.Protected handles route protection
3. **Separation of Concerns**: Each component has ONE responsibility
4. **No Manual Navigation**: Expo Router handles redirects automatically
5. **Performance**: Less re-renders, simpler dependency tracking

---

## 📁 New File Structure

### BEFORE (Complex - 1500+ lines)
```
src/
├── app/_layout.tsx                    (200+ lines, complex)
├── hooks/shared/
│   ├── useAuthNavigation.ts           (700+ lines!)
│   ├── useAuthStateNavigation.ts      (100+ lines, duplicate logic)
│   ├── useAuthListener.ts             (80+ lines)
│   ├── useAuthPure.ts                 (150+ lines)
│   ├── useAppInitialization.ts        (100+ lines)
│   ├── useNavigationState.ts          (50+ lines)
│   ├── usePendingRegistration.ts      (60+ lines)
│   └── useProfileSync.ts              (80+ lines)
└── stores/auth/
    └── app.ts                         (170+ lines)
```

### AFTER (Clean - 300 lines)
```
src/
├── app/
│   ├── _layout.tsx                    (100 lines - providers only)
│   ├── ctx.tsx                        (200 lines - SessionProvider)
│   └── splash.tsx                     (20 lines - SplashController)
├── hooks/shared/
│   ├── useSession.ts                  (re-export from ctx.tsx)
│   └── usePendingRegistration.ts      (keep for registration)
└── stores/
    └── verification/                   (keep existing verification stores)
```

**Result**: 80% reduction in auth/routing code!

---

## 🏗️ Implementation Plan

### Phase 1: Create SessionProvider (New File)

**File**: `src/app/ctx.tsx`

```typescript
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useStorageState } from '@/hooks/shared/useStorageState';
import { supabase } from '@/lib/supabase';
import { Session, User } from '@supabase/supabase-js';

interface SessionContextValue {
  // State
  isLoading: boolean;
  session: Session | null;
  user: User | null;
  userRole: 'customer' | 'provider' | null;
  isOnboardingComplete: boolean;
  isVerified: boolean;
  
  // Actions
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  completeOnboarding: () => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function useSession() {
  const value = useContext(SessionContext);
  if (!value) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return value;
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useStorageState('user_role');
  const [isOnboardingComplete, setIsOnboardingComplete] = useStorageState('onboarding_complete');
  const [isVerified, setIsVerified] = useState(false);

  // Initialize session on mount
  useEffect(() => {
    const initSession = async () => {
      console.log('[SessionProvider] Initializing...');
      
      try {
        // Get current session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          console.log('[SessionProvider] Session found:', session.user.email);
          setSession(session);
          setUser(session.user);
          
          // Load user role and verification status
          const { data: profile } = await supabase
            .from('profiles')
            .select('role, verification_status')
            .eq('id', session.user.id)
            .single();
          
          if (profile) {
            setUserRole(profile.role);
            setIsVerified(profile.verification_status === 'approved');
          }
        }
      } catch (error) {
        console.error('[SessionProvider] Init error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initSession();

    // Set up auth listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        console.log('[SessionProvider] Auth state changed:', _event);
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session) {
          // Load profile data
          const { data: profile } = await supabase
            .from('profiles')
            .select('role, verification_status')
            .eq('id', session.user.id)
            .single();
          
          if (profile) {
            setUserRole(profile.role);
            setIsVerified(profile.verification_status === 'approved');
          }
        } else {
          // Clear state on logout
          setUserRole(null);
          setIsVerified(false);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  };

  const signOut = async () => {
    console.log('[SessionProvider] Signing out...');
    await supabase.auth.signOut();
    setUserRole(null);
    setIsVerified(false);
  };

  const completeOnboarding = () => {
    console.log('[SessionProvider] Onboarding completed');
    setIsOnboardingComplete('true');
  };

  return (
    <SessionContext.Provider
      value={{
        isLoading,
        session,
        user,
        userRole,
        isOnboardingComplete: isOnboardingComplete === 'true',
        isVerified,
        signIn,
        signOut,
        completeOnboarding,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}
```

### Phase 2: Create SplashController

**File**: `src/app/splash.tsx`

```typescript
import { SplashScreen } from 'expo-router';
import { useSession } from './ctx';
import { useThemeHydration } from '@/stores/ui/theme';

// Prevent auto-hide
SplashScreen.preventAutoHideAsync();

export function SplashController() {
  const { isLoading: isAuthLoading } = useSession();
  const isThemeHydrated = useThemeHydration();

  // Hide splash when both auth and theme are ready
  const isReady = !isAuthLoading && isThemeHydrated;

  if (isReady) {
    console.log('[SplashController] App ready, hiding splash screen');
    SplashScreen.hideAsync();
  }

  return null;
}
```

### Phase 3: Create useStorageState Hook

**File**: `src/hooks/shared/useStorageState.ts`

```typescript
import { useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export function useStorageState(key: string): [
  string | null,
  (value: string | null) => void
] {
  const [state, setState] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load initial value
  useEffect(() => {
    AsyncStorage.getItem(key).then((value) => {
      setState(value);
      setIsHydrated(true);
    });
  }, [key]);

  // Update function
  const updateState = useCallback(
    (value: string | null) => {
      setState(value);
      if (value === null) {
        AsyncStorage.removeItem(key);
      } else {
        AsyncStorage.setItem(key, value);
      }
    },
    [key]
  );

  return [isHydrated ? state : null, updateState];
}
```

### Phase 4: Refactor _layout.tsx

**File**: `src/app/_layout.tsx`

```typescript
import "~/global.css";

import { Theme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as React from 'react';
import { Platform, LogBox } from 'react-native';

// ... (keep all LogBox.ignoreLogs and cssInterop code)

import { NAV_THEME } from '@/lib/theme';
import { useColorScheme } from '@/lib/core/useColorScheme';
import { PortalHost } from '@rn-primitives/portal';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { colorScheme } from 'nativewind';
import { useThemeHydration } from '@/stores/ui/theme';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { StripeProvider } from '@/app-providers/stripe-provider';
import { SessionProvider, useSession } from './ctx';
import { SplashController } from './splash';

// ... (keep LIGHT_THEME, DARK_THEME, queryClient)

export default function RootLayout() {
  const { colorScheme: scheme, isDarkColorScheme } = useColorScheme();
  const isThemeHydrated = useThemeHydration();

  // Set color scheme when hydrated
  if (isThemeHydrated && colorScheme.get() !== scheme) {
    colorScheme.set(scheme);
  }

  // Wait for theme hydration
  if (!isThemeHydrated) {
    return null;
  }

  return (
    <ErrorBoundary level="app">
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <StripeProvider>
            <QueryClientProvider client={queryClient}>
              <SessionProvider>
                <SplashController />
                <ThemeProvider value={isDarkColorScheme ? DARK_THEME : LIGHT_THEME}>
                  <StatusBar style={isDarkColorScheme ? 'light' : 'dark'} />
                  <BottomSheetModalProvider>
                    <RootNavigator />
                  </BottomSheetModalProvider>
                  <PortalHost />
                </ThemeProvider>
              </SessionProvider>
            </QueryClientProvider>
          </StripeProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

function RootNavigator() {
  const { isOnboardingComplete, session, userRole, isVerified } = useSession();
  const isAuthenticated = !!session;

  console.log('[RootNavigator] State:', { 
    isOnboardingComplete, 
    isAuthenticated, 
    userRole, 
    isVerified 
  });

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Public Routes - Onboarding */}
      <Stack.Protected guard={!isOnboardingComplete}>
        <Stack.Screen name="onboarding/index" />
      </Stack.Protected>

      {/* Public Routes - Auth */}
      <Stack.Protected guard={!isAuthenticated && isOnboardingComplete}>
        <Stack.Screen name="auth" />
      </Stack.Protected>

      {/* Protected Routes - Customer */}
      <Stack.Protected guard={isAuthenticated && userRole === 'customer'}>
        <Stack.Screen name="customer" />
      </Stack.Protected>

      {/* Protected Routes - Provider (Verified) */}
      <Stack.Protected guard={isAuthenticated && userRole === 'provider' && isVerified}>
        <Stack.Screen name="provider" />
      </Stack.Protected>

      {/* Protected Routes - Provider Verification */}
      <Stack.Protected guard={isAuthenticated && userRole === 'provider' && !isVerified}>
        <Stack.Screen name="provider-verification" />
      </Stack.Protected>

      {/* Shared Routes */}
      <Stack.Screen name="subscriptions" />
    </Stack>
  );
}
```

---

## 🎯 Benefits of New Architecture

### 1. **Massive Code Reduction**
- Before: 1500+ lines across 8 files
- After: 300 lines across 3 files
- **80% reduction!**

### 2. **Single Source of Truth**
- SessionProvider is THE source for auth state
- No sync issues between Zustand, React Query, Supabase
- Predictable state updates

### 3. **Declarative Routing**
- No manual `router.replace()` calls
- No `useEffect` for navigation
- Expo Router handles redirects automatically

### 4. **Better Performance**
- Less re-renders (fewer hooks)
- No React Query for navigation decisions
- Simpler dependency tracking

### 5. **Maintainability**
- Clear separation of concerns
- Easy to understand flow
- Easy to test
- Follows Expo Router best practices

### 6. **Type Safety**
- SessionContext is fully typed
- No `any` types
- Better autocomplete

---

## 🚀 Migration Steps

### Step 1: Create New Files (No Breaking Changes)
```bash
# Create new files
touch src/app/ctx.tsx
touch src/app/splash.tsx
touch src/hooks/shared/useStorageState.ts
```

Implement SessionProvider, SplashController, and useStorageState as shown above.

### Step 2: Update _layout.tsx (Gradual Transition)
1. Import SessionProvider and SplashController
2. Wrap app with SessionProvider
3. Add SplashController
4. Keep old navigation logic temporarily (parallel systems)
5. Test everything still works

### Step 3: Switch to Stack.Protected (Big Change)
1. Replace RootNavigator with Stack.Protected pattern
2. Test all user flows:
   - First-time user → Onboarding → Auth
   - Returning user → Auth → Login
   - Customer → Customer dashboard
   - Provider (unverified) → Provider verification
   - Provider (verified) → Provider dashboard

### Step 4: Cleanup (Remove Old Code)
Delete these files:
```bash
rm src/hooks/shared/useAuthNavigation.ts
rm src/hooks/shared/useAuthStateNavigation.ts
rm src/hooks/shared/useNavigationState.ts
rm src/hooks/shared/useAppInitialization.ts
rm src/stores/auth/app.ts
```

Update all imports to use `useSession` from `@/app/ctx`.

---

## 📊 Code Comparison

### Navigation Logic

#### BEFORE (Complex)
```tsx
// 700+ lines in useAuthNavigation.ts
const { data: navigationDecision } = useQuery({
  queryKey: ['navigation-decision', ...20 dependencies],
  queryFn: async () => {
    if (!isOnboardingComplete) return { destination: '/onboarding', ... };
    if (!isAuthenticated) return { destination: '/auth', ... };
    if (userRole === 'customer') return { destination: '/customer', ... };
    if (userRole === 'provider') {
      const profile = await supabase.from('profiles').select(...);
      if (profile.verification_status === 'approved') return { destination: '/provider', ... };
      // ... 200+ more lines
    }
  }
});

// In _layout.tsx
React.useEffect(() => {
  if (navigationDecision?.shouldNavigate) {
    router.replace(navigationDecision.destination);
  }
}, [navigationDecision]);
```

#### AFTER (Simple)
```tsx
// In _layout.tsx - 20 lines total!
<Stack>
  <Stack.Protected guard={!isOnboardingComplete}>
    <Stack.Screen name="onboarding/index" />
  </Stack.Protected>

  <Stack.Protected guard={!isAuthenticated && isOnboardingComplete}>
    <Stack.Screen name="auth" />
  </Stack.Protected>

  <Stack.Protected guard={isAuthenticated && userRole === 'customer'}>
    <Stack.Screen name="customer" />
  </Stack.Protected>

  <Stack.Protected guard={isAuthenticated && userRole === 'provider' && isVerified}>
    <Stack.Screen name="provider" />
  </Stack.Protected>

  <Stack.Protected guard={isAuthenticated && userRole === 'provider' && !isVerified}>
    <Stack.Screen name="provider-verification" />
  </Stack.Protected>
</Stack>
```

---

## ⚠️ Important Notes

### 1. **Provider Verification Flow**
The new architecture handles provider verification elegantly:
- Unverified provider logs in → `Stack.Protected` automatically shows `/provider-verification`
- Provider completes verification → SessionProvider updates `isVerified` → `Stack.Protected` automatically switches to `/provider`
- No manual navigation needed!

### 2. **Deep Links**
Deep links work automatically:
- User clicks link to `/customer/booking/123`
- If not authenticated → Stack.Protected redirects to `/auth`
- After login → SessionProvider updates → Stack.Protected grants access
- User sees `/customer/booking/123` (deep link preserved!)

### 3. **Logout Flow**
```typescript
// In any component
const { signOut } = useSession();

await signOut();
// SessionProvider updates session → Stack.Protected redirects to /auth automatically
```

### 4. **React Query Still Used For**
- ✅ Server data fetching (bookings, services, profiles)
- ✅ Mutations (create booking, update profile)
- ✅ Cache management
- ❌ **NOT for navigation logic** (that's Stack.Protected's job)

---

## 🧪 Testing Checklist

After migration, test these flows:

- [ ] First-time user: App start → Onboarding → Auth → Register → Dashboard
- [ ] Returning user (onboarding done): App start → Auth → Login → Dashboard
- [ ] Customer login: Auth → Customer dashboard
- [ ] Customer logout: Customer dashboard → Auth
- [ ] Provider login (unverified): Auth → Provider verification flow
- [ ] Provider login (verified): Auth → Provider dashboard
- [ ] Provider complete verification: Verification → Provider dashboard (auto)
- [ ] Deep link (unauthenticated): Deep link → Auth → Login → Deep link target
- [ ] Deep link (authenticated): Deep link → Target screen (direct)
- [ ] App restart (authenticated): App start → Dashboard (skip onboarding/auth)

---

## 📚 Resources

- [Expo Router Authentication](https://docs.expo.dev/router/advanced/authentication/)
- [Expo Router Protected Routes](https://docs.expo.dev/router/advanced/protected/)
- [React Context Best Practices](https://react.dev/learn/passing-data-deeply-with-context)
- [Expo SplashScreen](https://docs.expo.dev/versions/latest/sdk/splash-screen/)

---

## 🎉 Summary

**From**: 1500+ lines of complex navigation logic scattered across 8 files with multiple sources of truth

**To**: 300 lines of clean, declarative routing with a single source of truth (SessionProvider)

**Result**: 
- ✅ 80% less code
- ✅ Easier to maintain
- ✅ Better performance
- ✅ Follows Expo Router best practices
- ✅ No more infinite loops
- ✅ Type-safe
- ✅ Testable

**Status**: Ready to implement! 🚀

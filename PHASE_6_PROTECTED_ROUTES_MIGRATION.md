# Phase 6: Protected Routes Migration - Complete Refactor

## Overview

**Goal**: Migrate from custom `SessionProvider` + manual navigation to **Expo Router Protected Routes** pattern (SDK 53+)

**Why**: 
- ✅ Native support for route protection
- ✅ Cleaner, more declarative code
- ✅ Better performance (no manual useEffect navigation)
- ✅ Role-based access control built-in
- ✅ Automatic redirects handled by Expo Router
- ✅ Follows React Query + Zustand architecture from `copilot-rules.md`

---

## Current Architecture Issues

### ❌ Problems with Current Setup

1. **Manual Navigation in useEffect** - Anti-pattern
2. **Complex Navigation Logic** - Hard to maintain
3. **Multiple Navigation Sources** - Can cause conflicts
4. **No Native Route Protection** - Custom implementation
5. **useState + useEffect Hell** - Violates architecture rules
6. **Hard to Test** - Tightly coupled logic

### Current Flow (Bad)
```
User navigates → useEffect fires → Calculate target route → router.replace() → Hope it works
```

### New Flow (Good)
```
User navigates → Expo Router checks guard → Allow/Deny → Automatic redirect
```

---

## Files to DELETE (Old Auth Logic)

### 🗑️ Delete These Files

```bash
# Manual navigation hooks (replaced by Protected Routes)
src/hooks/shared/useAuthNavigation.ts
src/hooks/shared/useDeepLinkHandler.ts
src/hooks/shared/usePendingRegistration.ts

# Old route guards (replaced by Stack.Protected)
src/app/auth/_layout.tsx  # Move logic to root _layout.tsx
src/app/customer/_layout.tsx  # Move logic to root _layout.tsx
src/app/provider/_layout.tsx  # Move logic to root _layout.tsx
src/app/provider-verification/_layout.tsx  # Move logic to root _layout.tsx
```

### 📝 Keep and Refactor

```bash
# Core auth logic (migrate to Zustand + React Query)
src/app/ctx.tsx → src/stores/auth/index.ts (Zustand store)
src/app/splash.tsx → Keep but simplify

# Root layout (major refactor to use Protected Routes)
src/app/_layout.tsx → Complete rewrite with Stack.Protected
```

---

## New Architecture: Zustand + React Query + Protected Routes

### 📁 New File Structure

```
src/
├── stores/
│   └── auth/
│       ├── index.ts              # Zustand auth store (session, role, onboarding)
│       └── types.ts              # Auth types
│
├── hooks/
│   └── auth/
│       ├── useProfile.ts         # React Query: fetch profile
│       ├── useVerificationStatus.ts  # React Query: verification status
│       ├── useSignIn.ts          # React Query: sign in mutation
│       └── useSignOut.ts         # React Query: sign out mutation
│
├── app/
│   ├── _layout.tsx               # Root layout with Protected Routes
│   ├── splash.tsx                # Splash screen controller
│   │
│   ├── (public)/                 # Public routes (no auth required)
│   │   ├── _layout.tsx
│   │   ├── index.tsx             # Landing/redirect screen
│   │   └── onboarding/
│   │       └── index.tsx
│   │
│   ├── (auth)/                   # Auth routes (not authenticated)
│   │   ├── _layout.tsx
│   │   ├── sign-in.tsx
│   │   ├── register.tsx
│   │   └── otp-verification.tsx
│   │
│   ├── (customer)/               # Customer routes (authenticated + role)
│   │   ├── _layout.tsx
│   │   ├── index.tsx
│   │   ├── search.tsx
│   │   └── ...
│   │
│   ├── (provider)/               # Provider routes (verified providers)
│   │   ├── _layout.tsx
│   │   ├── index.tsx
│   │   └── ...
│   │
│   └── (provider-verification)/  # Verification routes (unverified providers)
│       ├── _layout.tsx
│       ├── index.tsx
│       └── ...
```

---

## Step-by-Step Migration Plan

### 🚀 Step 1: Create Zustand Auth Store (2 hours)

**File**: `src/stores/auth/index.ts`

```typescript
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import type { Session, User } from '@supabase/supabase-js';

interface AuthState {
  // Session State
  session: Session | null;
  user: User | null;
  isInitialized: boolean;
  
  // App State (persisted)
  userRole: 'customer' | 'provider' | null;
  isOnboardingComplete: boolean;
  
  // Actions
  setSession: (session: Session | null) => void;
  setUserRole: (role: 'customer' | 'provider' | null) => void;
  completeOnboarding: () => void;
  initialize: () => Promise<void>;
  reset: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial State
      session: null,
      user: null,
      isInitialized: false,
      userRole: null,
      isOnboardingComplete: false,

      // Actions
      setSession: (session) => {
        console.log('[AuthStore] Setting session:', !!session);
        set({ 
          session, 
          user: session?.user ?? null 
        });
      },

      setUserRole: (role) => {
        console.log('[AuthStore] Setting role:', role);
        set({ userRole: role });
      },

      completeOnboarding: () => {
        const { isOnboardingComplete } = get();
        if (isOnboardingComplete) {
          console.log('[AuthStore] ⚠️ Onboarding already completed');
          return;
        }
        console.log('[AuthStore] 🎉 Onboarding completed');
        set({ isOnboardingComplete: true });
      },

      initialize: async () => {
        console.log('[AuthStore] 🚀 Initializing...');
        
        try {
          // Get current session
          const { data: { session } } = await supabase.auth.getSession();
          set({ 
            session, 
            user: session?.user ?? null,
            isInitialized: true 
          });

          // Set up auth listener
          supabase.auth.onAuthStateChange((event, session) => {
            console.log('[AuthStore] 🔔 Auth event:', event);
            set({ 
              session, 
              user: session?.user ?? null 
            });
            
            // Clear role on logout
            if (!session) {
              set({ userRole: null });
            }
          });

          console.log('[AuthStore] ✅ Initialized');
        } catch (error) {
          console.error('[AuthStore] ❌ Init error:', error);
          set({ isInitialized: true }); // Mark as initialized even on error
        }
      },

      reset: () => {
        console.log('[AuthStore] 🔄 Resetting...');
        set({
          session: null,
          user: null,
          userRole: null,
          // Keep onboarding state and isInitialized
        });
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist these fields
      partialize: (state) => ({
        userRole: state.userRole,
        isOnboardingComplete: state.isOnboardingComplete,
      }),
    }
  )
);

// Hydration hook
export const useAuthHydration = () => {
  const [hydrated, setHydrated] = React.useState(false);
  
  React.useEffect(() => {
    const unsubscribe = useAuthStore.persist.onFinishHydration(() => {
      setHydrated(true);
    });
    
    // Check if already hydrated
    if (useAuthStore.persist.hasHydrated()) {
      setHydrated(true);
    }
    
    return unsubscribe;
  }, []);
  
  return hydrated;
};
```

**File**: `src/stores/auth/types.ts`

```typescript
export type UserRole = 'customer' | 'provider';
export type VerificationStatus = 'pending' | 'approved' | 'rejected';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
}

export interface AuthSession {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}
```

---

### 🔄 Step 2: Create React Query Auth Hooks (2 hours)

**File**: `src/hooks/auth/useProfile.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth';

interface Profile {
  id: string;
  role: 'customer' | 'provider';
  verification_status: 'pending' | 'approved' | 'rejected';
  email: string;
  full_name: string;
  avatar_url: string | null;
}

export function useProfile(userId?: string) {
  const setUserRole = useAuthStore((state) => state.setUserRole);

  return useQuery({
    queryKey: ['profile', userId],
    queryFn: async () => {
      if (!userId) return null;

      console.log('[useProfile] Fetching profile for:', userId);

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('[useProfile] Error:', error);
        throw error;
      }

      // Sync role to Zustand store
      if (data) {
        setUserRole(data.role);
      }

      return data as Profile;
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: Partial<Profile> & { id: string }) => {
      console.log('[useUpdateProfile] Updating:', updates.id);

      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', updates.id)
        .select()
        .single();

      if (error) throw error;
      return data as Profile;
    },
    onSuccess: (data) => {
      console.log('[useUpdateProfile] Success');
      queryClient.invalidateQueries({ queryKey: ['profile', data.id] });
    },
  });
}
```

**File**: `src/hooks/auth/useSignIn.ts`

```typescript
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth';

interface SignInParams {
  email: string;
  password: string;
}

export function useSignIn() {
  const setSession = useAuthStore((state) => state.setSession);

  return useMutation({
    mutationFn: async ({ email, password }: SignInParams) => {
      console.log('[useSignIn] Signing in:', email);

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      console.log('[useSignIn] Success');
      setSession(data.session);
    },
    onError: (error) => {
      console.error('[useSignIn] Error:', error);
    },
  });
}
```

**File**: `src/hooks/auth/useSignOut.ts`

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth';

export function useSignOut() {
  const queryClient = useQueryClient();
  const reset = useAuthStore((state) => state.reset);

  return useMutation({
    mutationFn: async () => {
      console.log('[useSignOut] Signing out...');
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    },
    onSuccess: () => {
      console.log('[useSignOut] Success');
      reset();
      queryClient.clear(); // Clear all React Query caches
    },
    onError: (error) => {
      console.error('[useSignOut] Error:', error);
    },
  });
}
```

---

### 🛡️ Step 3: Refactor Root Layout with Protected Routes (3 hours)

**File**: `src/app/_layout.tsx` (COMPLETE REWRITE)

```typescript
import "~/global.css";

import { Theme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as React from 'react';
import { LogBox } from 'react-native';

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

import { useAuthStore, useAuthHydration } from '@/stores/auth';
import { useProfile } from '@/hooks/auth/useProfile';
import { SplashController } from './splash';

// Ignore warnings
LogBox.ignoreLogs([
  'SafeAreaView has been deprecated',
  /\[Reanimated\]/,
  /expo-image-picker.*deprecated/i,
]);

const LIGHT_THEME: Theme = NAV_THEME.light;
const DARK_THEME: Theme = NAV_THEME.dark;

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes
      retry: (failureCount, error: any) => {
        return error?.status >= 500 && failureCount < 2;
      },
    },
  },
});

export default function RootLayout() {
  const { colorScheme: scheme, isDarkColorScheme } = useColorScheme();
  const isThemeHydrated = useThemeHydration();
  const isAuthHydrated = useAuthHydration();

  // Set NativeWind color scheme
  React.useEffect(() => {
    if (isThemeHydrated) {
      colorScheme.set(scheme);
    }
  }, [isThemeHydrated, scheme]);

  // Initialize auth store
  React.useEffect(() => {
    if (isAuthHydrated) {
      useAuthStore.getState().initialize();
    }
  }, [isAuthHydrated]);

  // Wait for hydration
  if (!isThemeHydrated || !isAuthHydrated) {
    return null;
  }

  return (
    <ErrorBoundary level="app">
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <StripeProvider>
            <QueryClientProvider client={queryClient}>
              <SplashController />
              
              <ThemeProvider value={isDarkColorScheme ? DARK_THEME : LIGHT_THEME}>
                <StatusBar style={isDarkColorScheme ? 'light' : 'dark'} />
                <BottomSheetModalProvider>
                  <RootNavigator />
                </BottomSheetModalProvider>
                <PortalHost />
              </ThemeProvider>
            </QueryClientProvider>
          </StripeProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

/**
 * RootNavigator - Protected Routes Pattern
 * 
 * Uses Expo Router's Stack.Protected for declarative route protection
 */
function RootNavigator() {
  const session = useAuthStore((state) => state.session);
  const userRole = useAuthStore((state) => state.userRole);
  const isOnboardingComplete = useAuthStore((state) => state.isOnboardingComplete);
  const isInitialized = useAuthStore((state) => state.isInitialized);

  // Fetch profile (React Query)
  const { data: profile, isLoading: isProfileLoading } = useProfile(session?.user.id);

  const isVerified = profile?.verification_status === 'approved';
  const isLoading = !isInitialized || (!!session && isProfileLoading);

  // Auth checks
  const isAuthenticated = !!session;
  const isCustomer = isAuthenticated && userRole === 'customer';
  const isProvider = isAuthenticated && userRole === 'provider';
  const isUnverifiedProvider = isProvider && !isVerified;
  const isVerifiedProvider = isProvider && isVerified;

  console.log('[RootNavigator] State:', {
    isAuthenticated,
    userRole,
    isVerified,
    isOnboardingComplete,
    isLoading
  });

  if (isLoading) {
    return null; // Splash screen handles loading UI
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* 🔓 PUBLIC ROUTES - Always accessible */}
      <Stack.Screen name="(public)" />

      {/* 🚫 AUTH ROUTES - Only when NOT authenticated */}
      <Stack.Protected guard={!isAuthenticated && isOnboardingComplete}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>

      {/* 👤 CUSTOMER ROUTES - Authenticated + Customer role */}
      <Stack.Protected guard={isCustomer}>
        <Stack.Screen name="(customer)" />
      </Stack.Protected>

      {/* 🔧 VERIFICATION ROUTES - Unverified providers only */}
      <Stack.Protected guard={isUnverifiedProvider}>
        <Stack.Screen name="(provider-verification)" />
      </Stack.Protected>

      {/* ✅ PROVIDER ROUTES - Verified providers only */}
      <Stack.Protected guard={isVerifiedProvider}>
        <Stack.Screen name="(provider)" />
      </Stack.Protected>

      {/* 💳 SUBSCRIPTION ROUTES - Authenticated users */}
      <Stack.Protected guard={isAuthenticated}>
        <Stack.Screen name="subscriptions" />
      </Stack.Protected>
    </Stack>
  );
}
```

---

### 📱 Step 4: Update Splash Screen (30 minutes)

**File**: `src/app/splash.tsx`

```typescript
import { SplashScreen } from 'expo-router';
import { useEffect } from 'react';
import { useAuthStore } from '@/stores/auth';
import { useThemeHydration } from '@/stores/ui/theme';

// Prevent auto-hide
SplashScreen.preventAutoHideAsync();

/**
 * SplashController - Manages splash screen
 * Hides when: Auth initialized + Theme hydrated
 */
export function SplashController() {
  const isAuthInitialized = useAuthStore((state) => state.isInitialized);
  const isThemeHydrated = useThemeHydration();

  const isReady = isAuthInitialized && isThemeHydrated;

  useEffect(() => {
    if (isReady) {
      console.log('[SplashController] ✅ App ready');
      SplashScreen.hideAsync().catch(console.warn);
    }
  }, [isReady]);

  return null;
}

// Dummy export for Expo Router
export default function SplashRoute() {
  return null;
}
```

---

### 🗂️ Step 5: Create Route Group Layouts (1 hour each)

**File**: `src/app/(public)/_layout.tsx`

```typescript
import { Stack } from 'expo-router';

export const unstable_settings = {
  initialRouteName: 'index',
};

export default function PublicLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="onboarding" />
    </Stack>
  );
}
```

**File**: `src/app/(public)/index.tsx`

```typescript
import { Redirect } from 'expo-router';
import { useAuthStore } from '@/stores/auth';
import { useProfile } from '@/hooks/auth/useProfile';

export default function RootRedirect() {
  const session = useAuthStore((state) => state.session);
  const userRole = useAuthStore((state) => state.userRole);
  const isOnboardingComplete = useAuthStore((state) => state.isOnboardingComplete);

  const { data: profile } = useProfile(session?.user.id);
  const isVerified = profile?.verification_status === 'approved';

  // Not authenticated
  if (!session) {
    return isOnboardingComplete ? (
      <Redirect href="/(auth)/sign-in" />
    ) : (
      <Redirect href="/(public)/onboarding" />
    );
  }

  // Authenticated - route by role
  if (userRole === 'customer') {
    return <Redirect href="/(customer)" />;
  }

  if (userRole === 'provider') {
    return isVerified ? (
      <Redirect href="/(provider)" />
    ) : (
      <Redirect href="/(provider-verification)" />
    );
  }

  // Fallback
  return <Redirect href="/(auth)/sign-in" />;
}
```

**File**: `src/app/(auth)/_layout.tsx`

```typescript
import { Stack } from 'expo-router';

export const unstable_settings = {
  initialRouteName: 'sign-in',
};

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="sign-in" />
      <Stack.Screen name="register" />
      <Stack.Screen name="otp-verification" />
    </Stack>
  );
}
```

---

## Migration Checklist

### Phase 6.1: Setup (Day 1)
- [ ] Create `src/stores/auth/index.ts` (Zustand store)
- [ ] Create `src/stores/auth/types.ts`
- [ ] Create `src/hooks/auth/useProfile.ts`
- [ ] Create `src/hooks/auth/useSignIn.ts`
- [ ] Create `src/hooks/auth/useSignOut.ts`
- [ ] Update `src/app/splash.tsx`

### Phase 6.2: Protected Routes (Day 2)
- [ ] Rewrite `src/app/_layout.tsx` with Stack.Protected
- [ ] Create route group folders: (public), (auth), (customer), (provider), (provider-verification)
- [ ] Create group layouts: (public)/_layout.tsx, etc.
- [ ] Create (public)/index.tsx redirect logic
- [ ] Move existing screens into correct groups

### Phase 6.3: Screen Migration (Day 3-4)
- [ ] Update all auth screens to use new hooks
- [ ] Update customer screens to use new hooks
- [ ] Update provider screens to use new hooks
- [ ] Update verification screens to use new hooks

### Phase 6.4: Cleanup (Day 5)
- [ ] Delete old files (useAuthNavigation, useDeepLinkHandler, etc.)
- [ ] Delete old ctx.tsx (replaced by auth store)
- [ ] Remove manual navigation logic
- [ ] Update imports across codebase
- [ ] Test all flows thoroughly

### Phase 6.5: Testing (Day 6)
- [ ] Test onboarding → auth flow
- [ ] Test customer login → dashboard
- [ ] Test provider login → verification/dashboard
- [ ] Test role changes
- [ ] Test sign out
- [ ] Test deep links
- [ ] Test back navigation

---

## Benefits of New Architecture

| Aspect | Before (Manual) | After (Protected Routes) |
|--------|----------------|--------------------------|
| **Code Lines** | ~300 lines navigation logic | ~150 lines declarative |
| **Navigation** | Manual useEffect + router.replace() | Automatic by Expo Router |
| **Route Protection** | Custom checks everywhere | Declarative Stack.Protected |
| **State Management** | Context API + useEffect | Zustand + React Query |
| **Testing** | Hard (context wrappers needed) | Easy (test stores/hooks) |
| **Performance** | useEffect re-renders | Selector optimization |
| **Maintainability** | Complex, error-prone | Simple, clear |
| **Debugging** | Console logs | Devtools |

---

## Next Steps

1. **Read this document thoroughly**
2. **Create a feature branch**: `git checkout -b phase-6-protected-routes`
3. **Follow migration checklist step by step**
4. **Test each step before moving to next**
5. **Commit frequently**: `git commit -m "feat: step X complete"`
6. **Create PR when done**: Comprehensive testing before merge

---

**Status**: 📋 **READY TO START**  
**Estimated Time**: 5-6 days  
**Priority**: HIGH (major architecture improvement)  
**Dependencies**: None (can start immediately)

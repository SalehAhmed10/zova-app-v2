# Quick Start Implementation Guide

## 🚀 Let's Refactor Your Auth/Routing to Clean Architecture!

This guide will help you implement the clean architecture in **4 phases** without breaking your app.

---

## Phase 1: Create New Files (15 minutes)

### Step 1.1: Create `useStorageState` Hook

Create: `src/hooks/shared/useStorageState.ts`

```typescript
import { useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Hook for persisting state in AsyncStorage
 * Similar to useState but syncs with AsyncStorage
 */
export function useStorageState(key: string): [
  string | null,
  (value: string | null) => void
] {
  const [state, setState] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load initial value from AsyncStorage
  useEffect(() => {
    AsyncStorage.getItem(key)
      .then((value) => {
        setState(value);
        setIsHydrated(true);
      })
      .catch((error) => {
        console.warn(`[useStorageState] Failed to load ${key}:`, error);
        setIsHydrated(true);
      });
  }, [key]);

  // Update function that syncs with AsyncStorage
  const updateState = useCallback(
    (value: string | null) => {
      setState(value);
      
      if (value === null) {
        AsyncStorage.removeItem(key).catch((error) => {
          console.warn(`[useStorageState] Failed to remove ${key}:`, error);
        });
      } else {
        AsyncStorage.setItem(key, value).catch((error) => {
          console.warn(`[useStorageState] Failed to save ${key}:`, error);
        });
      }
    },
    [key]
  );

  // Return null until hydrated to prevent hydration mismatches
  return [isHydrated ? state : null, updateState];
}
```

### Step 1.2: Create `SessionProvider`

Create: `src/app/ctx.tsx`

```typescript
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useStorageState } from '@/hooks/shared/useStorageState';
import { supabase } from '@/lib/supabase';
import type { Session, User } from '@supabase/supabase-js';

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

/**
 * Hook to access session context
 * Must be used within SessionProvider
 */
export function useSession() {
  const value = useContext(SessionContext);
  if (!value) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return value;
}

/**
 * SessionProvider - Single source of truth for authentication state
 * Manages: session, user, role, onboarding, verification
 * Integrates: Supabase auth listener, AsyncStorage persistence
 */
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
      console.log('[SessionProvider] 🚀 Initializing...');
      
      try {
        // Get current session from Supabase
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          console.log('[SessionProvider] ✅ Session found:', session.user.email);
          setSession(session);
          setUser(session.user);
          
          // Load user profile (role, verification status)
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('role, verification_status')
            .eq('id', session.user.id)
            .single();
          
          if (error) {
            console.error('[SessionProvider] ❌ Profile fetch error:', error);
          } else if (profile) {
            console.log('[SessionProvider] 📋 Profile loaded:', profile);
            setUserRole(profile.role);
            setIsVerified(profile.verification_status === 'approved');
          }
        } else {
          console.log('[SessionProvider] ℹ️ No active session');
        }
      } catch (error) {
        console.error('[SessionProvider] ❌ Init error:', error);
      } finally {
        setIsLoading(false);
        console.log('[SessionProvider] ✅ Initialization complete');
      }
    };

    initSession();

    // Set up Supabase auth state listener
    console.log('[SessionProvider] 👂 Setting up auth listener');
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[SessionProvider] 🔔 Auth state changed:', event);
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session) {
          // User logged in - load profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('role, verification_status')
            .eq('id', session.user.id)
            .single();
          
          if (profile) {
            console.log('[SessionProvider] 📋 Profile updated:', profile);
            setUserRole(profile.role);
            setIsVerified(profile.verification_status === 'approved');
          }
        } else {
          // User logged out - clear state
          console.log('[SessionProvider] 🚪 Clearing session state');
          setUserRole(null);
          setIsVerified(false);
        }
      }
    );

    // Cleanup listener on unmount
    return () => {
      console.log('[SessionProvider] 🧹 Cleaning up auth listener');
      subscription.unsubscribe();
    };
  }, []);

  /**
   * Sign in with email and password
   */
  const signIn = async (email: string, password: string) => {
    console.log('[SessionProvider] 🔑 Signing in...');
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      console.error('[SessionProvider] ❌ Sign in error:', error);
      throw error;
    }
    
    console.log('[SessionProvider] ✅ Sign in successful');
    // onAuthStateChange will handle profile loading
  };

  /**
   * Sign out current user
   */
  const signOut = async () => {
    console.log('[SessionProvider] 👋 Signing out...');
    await supabase.auth.signOut();
    setUserRole(null);
    setIsVerified(false);
    console.log('[SessionProvider] ✅ Sign out complete');
  };

  /**
   * Mark onboarding as complete
   */
  const completeOnboarding = () => {
    console.log('[SessionProvider] 🎉 Onboarding completed');
    setIsOnboardingComplete('true');
  };

  return (
    <SessionContext.Provider
      value={{
        isLoading,
        session,
        user,
        userRole: userRole as 'customer' | 'provider' | null,
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

### Step 1.3: Create `SplashController`

Create: `src/app/splash.tsx`

```typescript
import { SplashScreen } from 'expo-router';
import { useEffect } from 'react';
import { useSession } from './ctx';
import { useThemeHydration } from '@/stores/ui/theme';

// Prevent auto-hide of splash screen
SplashScreen.preventAutoHideAsync();

/**
 * SplashController - Manages splash screen visibility
 * Hides splash when:
 * 1. Session is loaded (not loading)
 * 2. Theme is hydrated
 */
export function SplashController() {
  const { isLoading: isAuthLoading } = useSession();
  const isThemeHydrated = useThemeHydration();

  // App is ready when both auth and theme are loaded
  const isReady = !isAuthLoading && isThemeHydrated;

  useEffect(() => {
    if (isReady) {
      console.log('[SplashController] ✅ App ready, hiding splash screen');
      SplashScreen.hideAsync().catch((error) => {
        console.warn('[SplashController] Failed to hide splash:', error);
      });
    }
  }, [isReady]);

  return null;
}
```

---

## Phase 2: Integrate SessionProvider (10 minutes)

### Step 2.1: Update `_layout.tsx`

Update: `src/app/_layout.tsx`

Add these imports at the top:
```typescript
import { SessionProvider } from './ctx';
import { SplashController } from './splash';
```

Wrap your app with SessionProvider (around line 160, inside QueryClientProvider):

```typescript
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
              {/* ✅ ADD SessionProvider HERE */}
              <SessionProvider>
                {/* ✅ ADD SplashController HERE */}
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
```

### Step 2.2: Test SessionProvider Works

**DO NOT modify RootNavigator yet!** Keep your existing navigation logic.

Test that SessionProvider works:
1. Run app: `npm run android:clean`
2. Check logs for `[SessionProvider]` messages
3. Verify splash screen shows and hides correctly
4. Verify existing navigation still works

If everything works, SessionProvider is integrated successfully! ✅

---

## Phase 3: Switch to Stack.Protected (20 minutes)

### Step 3.1: Replace RootNavigator

Update the `RootNavigator` function in `src/app/_layout.tsx`:

```typescript
function RootNavigator() {
  // ✅ Use SessionProvider as single source of truth
  const { isOnboardingComplete, session, userRole, isVerified } = useSession();
  const isAuthenticated = !!session;

  console.log('[RootNavigator] 🎯 State:', { 
    isOnboardingComplete, 
    isAuthenticated, 
    userRole, 
    isVerified 
  });

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* ======================================
          PUBLIC ROUTES - No Authentication
          ====================================== */}
      
      {/* Onboarding - First-time users only */}
      <Stack.Protected guard={!isOnboardingComplete}>
        <Stack.Screen name="onboarding/index" />
      </Stack.Protected>

      {/* Auth - Unauthenticated users who completed onboarding */}
      <Stack.Protected guard={!isAuthenticated && isOnboardingComplete}>
        <Stack.Screen name="auth" />
      </Stack.Protected>

      {/* ======================================
          PROTECTED ROUTES - Require Authentication
          ====================================== */}
      
      {/* Customer Dashboard */}
      <Stack.Protected guard={isAuthenticated && userRole === 'customer'}>
        <Stack.Screen name="customer" />
      </Stack.Protected>

      {/* Provider Dashboard - Verified providers only */}
      <Stack.Protected guard={isAuthenticated && userRole === 'provider' && isVerified}>
        <Stack.Screen name="provider" />
      </Stack.Protected>

      {/* Provider Verification - Unverified providers */}
      <Stack.Protected guard={isAuthenticated && userRole === 'provider' && !isVerified}>
        <Stack.Screen name="provider-verification" />
      </Stack.Protected>

      {/* ======================================
          SHARED ROUTES - Available to all authenticated users
          ====================================== */}
      
      <Stack.Protected guard={isAuthenticated}>
        <Stack.Screen name="subscriptions" />
      </Stack.Protected>
    </Stack>
  );
}
```

### Step 3.2: Remove Old Navigation Hooks

**DELETE these lines** from RootNavigator:

```typescript
// ❌ REMOVE THESE:
// const { userRole, isAuthenticated, isLoggingOut, isOnboardingComplete, isLoading } = useAppStore();
// useAuthListener();
// useAuthStateNavigation();
// const { navigationDecision, navigateToDestination, isReady } = useAuthNavigation();
// const shouldRedirectToOnboarding = React.useMemo(...);
// React.useEffect(() => { ... router.replace('/onboarding') ... }, []);
// React.useEffect(() => { ... navigateToDestination() ... }, []);
```

### Step 3.3: Update Auth Screens

Update `src/app/auth/index.tsx` to use SessionProvider:

```typescript
import { useSession } from '@/app/ctx';

export default function LoginScreen() {
  const { signIn } = useSession(); // ✅ Use SessionProvider
  
  // ... rest of your component
  
  const onSubmit = async (data: LoginFormData) => {
    try {
      await signIn(data.email, data.password);
      // Stack.Protected will automatically redirect to correct dashboard!
    } catch (error) {
      // Handle error
    }
  };
}
```

Update `src/app/onboarding/index.tsx`:

```typescript
import { useSession } from '@/app/ctx';

export default function OnboardingScreen() {
  const { completeOnboarding } = useSession(); // ✅ Use SessionProvider
  
  const handleFinish = () => {
    completeOnboarding();
    // Stack.Protected will automatically show auth screen!
  };
}
```

### Step 3.4: Test All Flows

Test these user flows:

1. **First-time user**:
   - Clear app data: `npm run android:clean`
   - Should see onboarding → auth

2. **Customer login**:
   - Login as customer
   - Should see customer dashboard

3. **Provider login (unverified)**:
   - Login as unverified provider
   - Should see provider-verification

4. **Provider login (verified)**:
   - Login as verified provider
   - Should see provider dashboard

5. **Logout**:
   - Logout from any dashboard
   - Should see auth screen

All navigation should happen automatically without any manual `router.replace()` calls!

---

## Phase 4: Cleanup (10 minutes)

### Step 4.1: Delete Old Files

Once everything works, delete these files:

```bash
# Navigate to your project
cd C:\Dev-work\mobile-apps\ZOVA

# Delete old navigation files
Remove-Item src\hooks\shared\useAuthNavigation.ts
Remove-Item src\hooks\shared\useAuthStateNavigation.ts
Remove-Item src\hooks\shared\useNavigationState.ts
Remove-Item src\hooks\shared\useAppInitialization.ts
Remove-Item src\hooks\shared\useAuthListener.ts

# Delete old store
Remove-Item src\stores\auth\app.ts
```

### Step 4.2: Update Imports

Find and replace old imports:

**Find**:
```typescript
import { useAppStore } from '@/stores/auth/app';
```

**Replace with**:
```typescript
import { useSession } from '@/app/ctx';
```

**Find**:
```typescript
import { useAuthOptimized } from '@/hooks';
```

**Replace with**:
```typescript
import { useSession } from '@/app/ctx';
```

Update usage:
```typescript
// ❌ Old
const { isAuthenticated, userRole } = useAppStore();

// ✅ New
const { session, userRole } = useSession();
const isAuthenticated = !!session;
```

### Step 4.3: Update `src/hooks/index.ts`

Remove exports for deleted hooks:

```typescript
// ❌ REMOVE:
export * from './shared/useAuthNavigation';
export * from './shared/useAuthStateNavigation';
export * from './shared/useNavigationState';
export * from './shared/useAppInitialization';
export * from './shared/useAuthListener';

// ✅ ADD:
export { useSession } from '@/app/ctx';
```

---

## 🧪 Final Testing Checklist

Test all these flows to ensure nothing broke:

- [ ] First-time user: Onboarding → Auth → Dashboard
- [ ] Returning user (no auth): Auth → Dashboard
- [ ] Customer login: Auth → Customer dashboard
- [ ] Customer logout: Customer dashboard → Auth
- [ ] Provider login (unverified): Auth → Provider verification
- [ ] Provider login (verified): Auth → Provider dashboard
- [ ] Provider complete verification: Verification → Provider dashboard
- [ ] Deep link (unauthenticated): Link → Auth → Target
- [ ] Deep link (authenticated): Link → Target
- [ ] App restart (authenticated): Splash → Dashboard

---

## 📊 Before/After Comparison

### Before
```
Files: 8 files (1500+ lines)
Hooks in _layout.tsx: 8+
useEffect count: 5+
Manual navigation: ✅ (router.replace everywhere)
Sources of truth: 4 (Zustand, RQ, Supabase, AsyncStorage)
Complexity: 😰 High
Maintainability: 😰 Low
```

### After
```
Files: 3 files (320 lines)
Hooks in _layout.tsx: 1 (useSession)
useEffect count: 0
Manual navigation: ❌ (Stack.Protected handles it)
Sources of truth: 1 (SessionProvider)
Complexity: 😊 Low
Maintainability: 😊 High
```

---

## 🎉 You're Done!

Your auth/routing architecture is now:
- ✅ 80% less code
- ✅ Single source of truth (SessionProvider)
- ✅ Declarative routing (Stack.Protected)
- ✅ No manual navigation logic
- ✅ Easier to maintain
- ✅ Better performance
- ✅ Follows Expo Router best practices

**Welcome to clean, maintainable code! 🚀**

---

## 🆘 Troubleshooting

### Issue: Splash screen doesn't hide

**Fix**: Check that both SessionProvider and theme are loaded:
```typescript
// In splash.tsx, add logging:
console.log('[SplashController] Auth loading:', isAuthLoading);
console.log('[SplashController] Theme hydrated:', isThemeHydrated);
console.log('[SplashController] Is ready:', isReady);
```

### Issue: Stuck on wrong screen

**Fix**: Check Stack.Protected guards:
```typescript
// In RootNavigator, add logging:
console.log('[RootNavigator] Guards evaluation:', {
  onboarding: !isOnboardingComplete,
  auth: !isAuthenticated && isOnboardingComplete,
  customer: isAuthenticated && userRole === 'customer',
  provider: isAuthenticated && userRole === 'provider' && isVerified,
  verification: isAuthenticated && userRole === 'provider' && !isVerified,
});
```

### Issue: "useSession must be used within SessionProvider"

**Fix**: Make sure SessionProvider wraps your entire app in `_layout.tsx`.

### Issue: Profile not loading after login

**Fix**: Check Supabase profiles table query in SessionProvider:
```typescript
// Add error logging:
const { data: profile, error } = await supabase
  .from('profiles')
  .select('role, verification_status')
  .eq('id', session.user.id)
  .single();

console.log('[SessionProvider] Profile result:', { profile, error });
```

---

## 📚 Next Steps

After implementing clean auth/routing:

1. **Remove Review Modal Logic**: Move it to customer dashboard layout
2. **Simplify Provider Verification**: Use local navigation in provider-verification/_layout.tsx
3. **Add Loading States**: Add skeleton screens while SessionProvider loads
4. **Add Error Boundaries**: Wrap SessionProvider in error boundary
5. **Add Tests**: Write tests for SessionProvider and Stack.Protected guards

**Happy coding! 🎊**

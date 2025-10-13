# Auth & Routing Architecture - Visual Comparison

## 🔴 BEFORE: Complex & Unmaintainable

```
┌─────────────────────────────────────────────────────────────────────┐
│                          _layout.tsx                                 │
│                    (200+ lines, 8+ hooks)                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  useAuthListener() ────────┐                                        │
│  useAuthStateNavigation() ─┤                                        │
│  useAuthNavigation() ──────┤─→ Complex navigation logic             │
│  useNavigationState() ─────┤   with React Query                     │
│  useAppStore() ────────────┤                                        │
│  useThemeHydration() ──────┤                                        │
│  useReviewPrompt() ────────┘                                        │
│                                                                       │
│  Multiple useEffect hooks:                                           │
│  • useEffect(() => router.replace('/onboarding'), [...])            │
│  • useEffect(() => router.replace(destination), [...])              │
│  • useEffect(() => navigateToDestination(), [...])                  │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────────┐
│                   useAuthNavigation.ts                               │
│                     (700+ lines!)                                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  useQuery({                                                          │
│    queryKey: ['navigation-decision', ...20 dependencies],            │
│    queryFn: async () => {                                           │
│      // Check onboarding                                            │
│      if (!isOnboardingComplete) return '/onboarding';               │
│                                                                       │
│      // Check auth                                                   │
│      if (!isAuthenticated) return '/auth';                          │
│                                                                       │
│      // Check customer                                               │
│      if (userRole === 'customer') return '/customer';               │
│                                                                       │
│      // Check provider + verification (200+ lines)                  │
│      if (userRole === 'provider') {                                 │
│        const profile = await supabase.from('profiles').select();    │
│        if (profile.verification_status === 'approved') {            │
│          return '/provider';                                         │
│        } else if (profile.verification_status === 'in_review') {    │
│          return '/provider-verification/verification-status';       │
│        } else if (profile.verification_status === 'in_progress') {  │
│          const firstIncompleteStep = findFirstIncompleteStep();     │
│          return getRouteForStep(firstIncompleteStep);               │
│        }                                                             │
│        // ... 150 more lines                                         │
│      }                                                               │
│    }                                                                 │
│  });                                                                 │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────────┐
│              Multiple Sources of Truth (Sync Issues)                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  AppStore (Zustand) ──┐                                             │
│  Supabase Session ────┤──→ Which is correct?                        │
│  React Query Cache ───┤    Sync problems!                           │
│  AsyncStorage ────────┘                                             │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘

Problems:
❌ 1500+ lines of navigation code across 8 files
❌ Multiple sources of truth (sync issues)
❌ Manual router.replace() calls everywhere
❌ Complex useEffect chains
❌ React Query misused for navigation
❌ Hard to maintain and debug
❌ Performance issues (unnecessary re-renders)
```

---

## 🟢 AFTER: Clean & Maintainable

```
┌─────────────────────────────────────────────────────────────────────┐
│                          _layout.tsx                                 │
│                     (100 lines, clean)                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  Providers Setup Only:                                               │
│  • ErrorBoundary                                                     │
│  • GestureHandlerRootView                                           │
│  • SafeAreaProvider                                                  │
│  • StripeProvider                                                    │
│  • QueryClientProvider                                               │
│  • SessionProvider ◄─── Single source of truth!                     │
│  • SplashController                                                  │
│  • ThemeProvider                                                     │
│  • RootNavigator ◄───── Declarative routing with Stack.Protected    │
│                                                                       │
│  NO navigation logic! NO useEffect! NO manual router.replace()!     │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────────┐
│                      SessionProvider                                 │
│                    (ctx.tsx - 200 lines)                             │
│                 SINGLE SOURCE OF TRUTH                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  State:                                                              │
│  • isLoading: boolean                                               │
│  • session: Session | null                                          │
│  • user: User | null                                                │
│  • userRole: 'customer' | 'provider' | null                         │
│  • isOnboardingComplete: boolean                                    │
│  • isVerified: boolean                                              │
│                                                                       │
│  Actions:                                                            │
│  • signIn(email, password)                                          │
│  • signOut()                                                         │
│  • completeOnboarding()                                             │
│                                                                       │
│  Integrations:                                                       │
│  • Supabase auth listener (onAuthStateChange)                       │
│  • AsyncStorage (useStorageState hook)                              │
│  • Profile fetching (role, verification_status)                     │
│                                                                       │
│  NO navigation logic! Just state management.                         │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────────┐
│                    SplashController                                  │
│                  (splash.tsx - 20 lines)                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  const { isLoading } = useSession();                                │
│  const isThemeHydrated = useThemeHydration();                       │
│                                                                       │
│  if (!isLoading && isThemeHydrated) {                               │
│    SplashScreen.hideAsync();                                        │
│  }                                                                   │
│                                                                       │
│  Simple, focused responsibility!                                     │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────────┐
│                      RootNavigator                                   │
│              (in _layout.tsx - 30 lines)                             │
│           DECLARATIVE ROUTING WITH STACK.PROTECTED                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  const { isOnboardingComplete, session, userRole, isVerified }      │
│    = useSession();                                                   │
│  const isAuthenticated = !!session;                                 │
│                                                                       │
│  return (                                                            │
│    <Stack>                                                           │
│      {/* Onboarding - First-time users */}                          │
│      <Stack.Protected guard={!isOnboardingComplete}>                │
│        <Stack.Screen name="onboarding/index" />                     │
│      </Stack.Protected>                                              │
│                                                                       │
│      {/* Auth - Unauthenticated users */}                           │
│      <Stack.Protected guard={!isAuthenticated && isOnboardingComplete}>│
│        <Stack.Screen name="auth" />                                 │
│      </Stack.Protected>                                              │
│                                                                       │
│      {/* Customer Dashboard */}                                      │
│      <Stack.Protected guard={isAuthenticated && userRole === 'customer'}>│
│        <Stack.Screen name="customer" />                             │
│      </Stack.Protected>                                              │
│                                                                       │
│      {/* Provider Dashboard (Verified) */}                          │
│      <Stack.Protected guard={isAuthenticated && userRole === 'provider' && isVerified}>│
│        <Stack.Screen name="provider" />                             │
│      </Stack.Protected>                                              │
│                                                                       │
│      {/* Provider Verification (Unverified) */}                     │
│      <Stack.Protected guard={isAuthenticated && userRole === 'provider' && !isVerified}>│
│        <Stack.Screen name="provider-verification" />                │
│      </Stack.Protected>                                              │
│    </Stack>                                                          │
│  );                                                                  │
│                                                                       │
│  Expo Router handles all navigation automatically!                   │
│  NO router.replace()! NO useEffect! NO manual logic!                │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘

Benefits:
✅ 300 lines total (80% reduction)
✅ Single source of truth (SessionProvider)
✅ Declarative routing (Stack.Protected)
✅ NO manual navigation logic
✅ NO useEffect for navigation
✅ Clean separation of concerns
✅ Easy to maintain and test
✅ Better performance
```

---

## 🎯 User Flow Comparison

### First-Time User (Onboarding)

#### BEFORE
```
App Start
  ↓
_layout.tsx renders
  ↓
useAppStore initializes from AsyncStorage
  ↓
isOnboardingComplete = false detected
  ↓
useEffect runs: router.replace('/onboarding')
  ↓
[Onboarding] User completes onboarding
  ↓
appStore.completeOnboarding() updates Zustand
  ↓
AsyncStorage.setItem('onboarding_complete', 'true')
  ↓
useAuthNavigation detects change
  ↓
React Query re-runs queryFn
  ↓
navigationDecision updates to '/auth'
  ↓
useEffect runs: router.replace('/auth')
  ↓
[Auth] User sees login screen
```

#### AFTER
```
App Start
  ↓
_layout.tsx renders
  ↓
SessionProvider initializes
  ↓
isOnboardingComplete = false from AsyncStorage
  ↓
Stack.Protected evaluates guards
  ↓
guard={!isOnboardingComplete} is TRUE
  ↓
[Onboarding] Renders automatically (no manual navigation!)
  ↓
User completes onboarding
  ↓
completeOnboarding() updates SessionProvider
  ↓
Stack.Protected re-evaluates guards
  ↓
guard={!isOnboardingComplete} is now FALSE
  ↓
guard={!isAuthenticated && isOnboardingComplete} is TRUE
  ↓
[Auth] Renders automatically (Expo Router handles it!)
```

**Result**: No manual navigation, cleaner, more predictable!

---

### Customer Login

#### BEFORE
```
[Auth] User enters email/password
  ↓
useAuthOptimized().signIn()
  ↓
Supabase session created
  ↓
useAuthListener detects auth state change
  ↓
AppStore.setAuthenticated(true, 'customer')
  ↓
useAuthNavigation detects change (via React Query dependencies)
  ↓
React Query re-runs queryFn (queries Supabase again)
  ↓
navigationDecision = { destination: '/customer', shouldNavigate: true }
  ↓
useEffect detects navigationDecision change
  ↓
setTimeout(() => router.replace('/customer'), 100)
  ↓
[Customer Dashboard] Renders after 100ms delay
```

#### AFTER
```
[Auth] User enters email/password
  ↓
signIn() from SessionProvider
  ↓
Supabase session created
  ↓
SessionProvider.onAuthStateChange fires
  ↓
SessionProvider loads profile: { role: 'customer' }
  ↓
SessionProvider updates: session, user, userRole
  ↓
Stack.Protected re-evaluates guards
  ↓
guard={isAuthenticated && userRole === 'customer'} is TRUE
  ↓
[Customer Dashboard] Renders instantly (Expo Router handles it!)
```

**Result**: Faster, simpler, no delays!

---

### Provider Verification Flow

#### BEFORE
```
[Auth] Provider logs in (unverified)
  ↓
useAuthListener → AppStore → useAuthNavigation
  ↓
React Query queryFn: Check verification_status from Supabase
  ↓
if (verification_status === 'in_progress') {
  findFirstIncompleteStep(verificationData)
  ↓
  getRouteForStep(firstIncompleteStep)
  ↓
  navigationDecision = { destination: '/provider-verification/business-info' }
}
  ↓
useEffect: router.replace('/provider-verification/business-info')
  ↓
[Provider Verification] User completes steps
  ↓
On last step completion: verification_status = 'submitted'
  ↓
React Query re-fetches, navigationDecision updates
  ↓
useEffect: router.replace('/provider-verification/verification-status')
  ↓
Admin approves → verification_status = 'approved'
  ↓
React Query re-fetches, navigationDecision updates
  ↓
useEffect: router.replace('/provider')
  ↓
[Provider Dashboard] Finally accessible
```

#### AFTER
```
[Auth] Provider logs in (unverified)
  ↓
SessionProvider.onAuthStateChange
  ↓
Loads profile: { role: 'provider', verification_status: 'in_progress' }
  ↓
SessionProvider updates: isVerified = false
  ↓
Stack.Protected evaluates:
  guard={isAuthenticated && userRole === 'provider' && !isVerified} = TRUE
  ↓
[Provider Verification] Renders automatically
  ↓
User completes verification steps
  ↓
On last step: verification_status → 'submitted' (no navigation)
  ↓
Admin approves: verification_status → 'approved'
  ↓
SessionProvider re-fetches on next app open
  ↓
isVerified = true
  ↓
Stack.Protected re-evaluates:
  guard={isAuthenticated && userRole === 'provider' && isVerified} = TRUE
  ↓
[Provider Dashboard] Renders automatically
```

**Result**: Much cleaner! Verification step navigation handled by provider-verification/_layout.tsx, not root!

---

## 📊 Code Size Comparison

### Files to Delete
```bash
✂️ DELETE (1200+ lines total):
├── hooks/shared/useAuthNavigation.ts          (700 lines)
├── hooks/shared/useAuthStateNavigation.ts     (100 lines)
├── hooks/shared/useNavigationState.ts         (50 lines)
├── hooks/shared/useAppInitialization.ts       (100 lines)
├── hooks/shared/useAuthListener.ts            (80 lines - integrated into SessionProvider)
└── stores/auth/app.ts                         (170 lines - replaced by SessionProvider)
```

### Files to Create
```bash
✨ CREATE (320 lines total):
├── app/ctx.tsx                                (200 lines - SessionProvider)
├── app/splash.tsx                             (20 lines - SplashController)
└── hooks/shared/useStorageState.ts            (40 lines - Storage hook)

📝 MODIFY:
└── app/_layout.tsx                            (reduce from 200 to 100 lines)
```

### Net Result
```
BEFORE: 1500+ lines of auth/navigation code
AFTER:  320 lines of clean, focused code

REDUCTION: 80% less code!
```

---

## 🧪 Testing Comparison

### BEFORE (Hard to Test)
```typescript
// How do you test useAuthNavigation? 
// Mock React Query, Zustand, Supabase, AsyncStorage...
describe('useAuthNavigation', () => {
  it('should navigate to correct route', async () => {
    // Setup: Mock 20+ dependencies
    const mockAppStore = { isOnboardingComplete: true, ... };
    const mockVerificationStore = { documentData: {...}, ... };
    const mockSupabase = { from: jest.fn().mockReturnValue({...}) };
    const mockQueryClient = createQueryClient();
    
    // Act: Wait for React Query to resolve
    const { result, waitFor } = renderHook(() => useAuthNavigation(), {
      wrapper: /* complex wrapper with all providers */
    });
    
    await waitFor(() => result.current.isReady);
    
    // Assert: Check navigationDecision
    expect(result.current.navigationDecision?.destination).toBe('/customer');
  });
});
```

### AFTER (Easy to Test)
```typescript
// Test SessionProvider in isolation
describe('SessionProvider', () => {
  it('should set isAuthenticated when user logs in', async () => {
    const { result } = renderHook(() => useSession(), {
      wrapper: SessionProvider
    });
    
    await act(async () => {
      await result.current.signIn('test@example.com', 'password');
    });
    
    expect(result.current.session).toBeTruthy();
    expect(result.current.user?.email).toBe('test@example.com');
  });
});

// Test Stack.Protected with mocked SessionProvider
describe('RootNavigator', () => {
  it('should show onboarding for new users', () => {
    const mockSession = {
      isOnboardingComplete: false,
      session: null,
      userRole: null,
      isVerified: false,
    };
    
    render(<RootNavigator />, {
      wrapper: ({ children }) => (
        <MockSessionProvider value={mockSession}>
          {children}
        </MockSessionProvider>
      )
    });
    
    expect(screen.getByText('Onboarding')).toBeInTheDocument();
  });
});
```

---

## 🎉 Summary

| Aspect | Before | After |
|--------|--------|-------|
| **Lines of Code** | 1500+ | 320 | 
| **Files** | 8 files | 3 files |
| **Hooks in _layout** | 8+ hooks | 1 hook (useSession) |
| **useEffect Count** | 5+ | 0 |
| **Navigation Logic** | Manual (router.replace) | Declarative (Stack.Protected) |
| **Sources of Truth** | 4 (Zustand, RQ, Supabase, AsyncStorage) | 1 (SessionProvider) |
| **React Query Usage** | Navigation decisions ❌ | Server data only ✅ |
| **Maintainability** | 😰 Complex | 😊 Simple |
| **Testability** | 😰 Hard | 😊 Easy |
| **Performance** | ⚠️ Many re-renders | ✅ Optimized |

**The new architecture is 80% less code, infinitely more maintainable, and follows Expo Router best practices!**

🚀 **Ready to implement!**

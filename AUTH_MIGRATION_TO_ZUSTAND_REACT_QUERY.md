# Auth Migration: Context + useEffect → Zustand + React Query

## Executive Summary

**Current Status**: ✅ **Navigation bugs are FIXED!**
- No more infinite loops
- Forced redirect works correctly
- Back navigation handled properly

**Question**: Should we migrate from `SessionProvider` (Context API + useEffect) to **Zustand + React Query**?

**Answer**: **YES, but NOT urgent.** Here's why:

---

## Current Architecture Analysis

### ✅ What's Working Well

1. **Single Source of Truth**: `SessionProvider` is the only place managing auth state
2. **Centralized Routing**: `RootNavigator` handles all automatic navigation
3. **Supabase Integration**: Auth listener properly set up
4. **AsyncStorage Persistence**: Onboarding and role state persisted correctly
5. **No State Hell**: Not using scattered `useState` + `useEffect` in components

### ⚠️ What Could Be Better

1. **Too Many useEffect Hooks**: Multiple effects in SessionProvider
2. **Manual State Management**: Manually managing loading states
3. **No Caching**: Profile data refetched on every auth state change
4. **No Optimistic Updates**: Can't easily implement optimistic UI
5. **Testing Difficulty**: Context + useEffect harder to unit test
6. **No Devtools**: Can't inspect state changes easily

---

## Current Code Review

### `src/app/ctx.tsx` - SessionProvider

```tsx
// ❌ CURRENT APPROACH: useEffect Hell
export function SessionProvider({ children }) {
  const [isLoading, setIsLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useStorageState('user_role');
  const [isOnboardingComplete, setIsOnboardingComplete] = useStorageState('onboarding_complete');
  const [isVerified, setIsVerified] = useState(false);

  // Effect 1: Initialize session on mount
  useEffect(() => {
    const initSession = async () => {
      // Fetch session
      // Fetch profile
      // Update states
      setIsLoading(false);
    };
    initSession();
  }, []);

  // Effect 2: Set up auth listener
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Update session state
        // Fetch profile again
        // Update role and verification
      }
    );
    return () => subscription.unsubscribe();
  }, []);

  // Manual actions
  const signIn = async (email, password) => { /* ... */ };
  const signOut = async () => { /* ... */ };
  const completeOnboarding = () => { /* ... */ };

  return (
    <SessionContext.Provider value={{ ... }}>
      {children}
    </SessionContext.Provider>
  );
}
```

**Problems**:
1. ❌ Two separate `useEffect` hooks doing similar things
2. ❌ Profile data fetched **twice** (init + auth listener)
3. ❌ No caching - if auth state changes, refetch everything
4. ❌ Manual loading state management
5. ❌ No error handling for failed profile fetches
6. ❌ Hard to test in isolation

---

## Proposed Architecture: Zustand + React Query

### Why This Combo?

| Concern | Zustand Handles | React Query Handles |
|---------|----------------|---------------------|
| Auth state (session, user) | ✅ Global state | ❌ Not server data |
| User role | ✅ Persisted state | ❌ Not frequently changing |
| Onboarding complete | ✅ Persisted state | ❌ One-time flag |
| Profile data | ❌ Not global UI state | ✅ Server data, needs caching |
| Sign in/out actions | ✅ State mutations | ❌ Not queries |
| Verification status | ❌ Changes on server | ✅ Server state, needs polling |

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     App Root (_layout.tsx)                   │
├─────────────────────────────────────────────────────────────┤
│  QueryClientProvider (React Query)                          │
│    │                                                          │
│    └─> RootNavigator                                         │
│          ├─> useAuthStore() ← Zustand (session, role, etc.) │
│          └─> useProfile() ← React Query (profile data)       │
└─────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                   State Management Split                      │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  Zustand Store (src/stores/auth.ts)                          │
│  ├─ session: Session | null                                  │
│  ├─ isOnboardingComplete: boolean (persisted)               │
│  ├─ userRole: 'customer' | 'provider' | null (persisted)    │
│  └─ Actions: signIn(), signOut(), completeOnboarding()      │
│                                                               │
│  React Query Hooks (src/hooks/auth/)                         │
│  ├─ useProfile(userId) ← Cached, auto-refetch               │
│  ├─ useVerificationStatus(userId) ← Polling every 30s        │
│  └─ useUpdateProfile() ← Mutations with optimistic updates   │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

---

## Migration Plan

### Phase 1: Create Zustand Auth Store ⚡️ QUICK WIN

**File**: `src/stores/auth/index.ts`

```typescript
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import type { Session, User } from '@supabase/supabase-js';

interface AuthState {
  // State
  session: Session | null;
  user: User | null;
  userRole: 'customer' | 'provider' | null;
  isOnboardingComplete: boolean;
  isInitialized: boolean;
  
  // Actions
  setSession: (session: Session | null) => void;
  setUserRole: (role: 'customer' | 'provider' | null) => void;
  completeOnboarding: () => void;
  signOut: () => void;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      session: null,
      user: null,
      userRole: null,
      isOnboardingComplete: false,
      isInitialized: false,

      // Actions
      setSession: (session) => {
        set({ 
          session, 
          user: session?.user ?? null 
        });
      },

      setUserRole: (role) => {
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

      signOut: async () => {
        console.log('[AuthStore] 👋 Signing out...');
        await supabase.auth.signOut();
        set({ 
          session: null, 
          user: null, 
          userRole: null 
        });
      },

      initialize: async () => {
        console.log('[AuthStore] 🚀 Initializing...');
        
        // Get current session
        const { data: { session } } = await supabase.auth.getSession();
        set({ 
          session, 
          user: session?.user ?? null,
          isInitialized: true 
        });

        // Set up auth listener
        supabase.auth.onAuthStateChange((event, session) => {
          console.log('[AuthStore] 🔔 Auth state changed:', event);
          set({ 
            session, 
            user: session?.user ?? null 
          });
          
          // Clear role on logout
          if (!session) {
            set({ userRole: null });
          }
        });

        console.log('[AuthStore] ✅ Initialization complete');
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
```

**Benefits**:
- ✅ Single store, no multiple useEffect
- ✅ Automatic persistence for role & onboarding
- ✅ Devtools support (can see state changes)
- ✅ Easy to test (no React context needed)
- ✅ Selector performance optimization

---

### Phase 2: Create React Query Hooks 🚀 POWER MOVE

**File**: `src/hooks/auth/useProfile.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth';

interface Profile {
  id: string;
  role: 'customer' | 'provider';
  verification_status: 'pending' | 'approved' | 'rejected';
  // ... other fields
}

export function useProfile(userId?: string) {
  const setUserRole = useAuthStore((state) => state.setUserRole);

  return useQuery({
    queryKey: ['profile', userId],
    queryFn: async () => {
      if (!userId) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;

      // Sync role to Zustand store
      if (data) {
        setUserRole(data.role);
      }

      return data as Profile;
    },
    enabled: !!userId, // Only run when userId exists
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: Partial<Profile>) => {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', updates.id!)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      // Invalidate and refetch profile
      queryClient.invalidateQueries({ queryKey: ['profile', data.id] });
    },
  });
}
```

**Benefits**:
- ✅ Automatic caching (no refetch on every mount)
- ✅ Background refetching (keeps data fresh)
- ✅ Optimistic updates (instant UI feedback)
- ✅ Error retry with exponential backoff
- ✅ Loading/error states built-in
- ✅ Query invalidation on mutations

---

### Phase 3: Update RootNavigator 🎯 SIMPLIFY

**Before (Current)**:
```tsx
// ❌ CURRENT: SessionProvider with useEffect hell
function RootNavigator() {
  const { isLoading, session, userRole, isOnboardingComplete, isVerified } = useSession();
  // ... navigation logic
}
```

**After (Zustand + React Query)**:
```tsx
// ✅ AFTER: Clean, performant, testable
function RootNavigator() {
  const session = useAuthStore((state) => state.session);
  const userRole = useAuthStore((state) => state.userRole);
  const isOnboardingComplete = useAuthStore((state) => state.isOnboardingComplete);
  const isInitialized = useAuthStore((state) => state.isInitialized);
  
  const { data: profile, isLoading: isProfileLoading } = useProfile(session?.user.id);
  
  const isVerified = profile?.verification_status === 'approved';
  const isLoading = !isInitialized || (!!session && isProfileLoading);
  
  // ... same navigation logic
}
```

**Benefits**:
- ✅ Selector optimization (only re-render when specific values change)
- ✅ Profile data cached across app
- ✅ No manual state management
- ✅ Clear separation: Zustand = app state, React Query = server state

---

## Comparison: Before vs After

| Aspect | Context + useEffect | Zustand + React Query |
|--------|-------------------|----------------------|
| **Code Lines** | ~194 lines (ctx.tsx) | ~80 lines store + ~50 lines hooks |
| **Re-renders** | Context updates trigger all consumers | Selectors prevent unnecessary re-renders |
| **Caching** | ❌ None, refetch every time | ✅ Automatic with staleTime/gcTime |
| **Devtools** | ❌ Can't inspect state easily | ✅ Zustand Devtools + React Query Devtools |
| **Testing** | ⚠️ Need Provider wrapper | ✅ Test stores/hooks in isolation |
| **Type Safety** | ⚠️ Context types can be tricky | ✅ Full TypeScript inference |
| **Performance** | ⚠️ All consumers re-render | ✅ Selector optimization |
| **Error Handling** | ❌ Manual try/catch | ✅ Built-in error states |
| **Loading States** | ❌ Manual management | ✅ Automatic isLoading |
| **Optimistic Updates** | ❌ Hard to implement | ✅ Built-in with mutations |
| **Background Refetch** | ❌ None | ✅ Automatic on focus/network |

---

## Migration Checklist

### Immediate (Can Do Today) ✅
- [x] Fix navigation loops (DONE!)
- [x] Fix back navigation (DONE!)
- [x] Fix Expo Router warnings (DONE!)

### Short Term (Next Sprint) 🚀
- [ ] Create `src/stores/auth/index.ts` with Zustand store
- [ ] Create `src/hooks/auth/useProfile.ts` with React Query
- [ ] Create `src/hooks/auth/useVerificationStatus.ts`
- [ ] Update `RootNavigator` to use new hooks
- [ ] Test thoroughly (all auth flows)
- [ ] Remove old `ctx.tsx` SessionProvider

### Medium Term (Future Enhancement) 💡
- [ ] Add React Query Devtools in development
- [ ] Add Zustand Devtools middleware
- [ ] Implement optimistic updates for profile changes
- [ ] Add background polling for verification status
- [ ] Add retry logic for failed queries
- [ ] Add query prefetching for better UX

---

## Recommendation

### ✅ YES, migrate to Zustand + React Query

**Priority**: **MEDIUM** (not urgent, but high value)

**Effort**: **2-3 days** (includes testing)

**Value**: **HIGH** 
- Better performance (selector optimization)
- Easier maintenance (less code, clearer separation)
- Better developer experience (devtools, testing)
- Future-proof (standard pattern in React Native community)

### When to Migrate?

**Option 1: Now** (if you have time)
- Navigation bugs are fixed
- Clean slate for improvement
- Won't conflict with other features

**Option 2: Next Sprint** (recommended)
- Let current fixes stabilize
- Plan migration properly
- Write comprehensive tests first

**Option 3: Later** (if urgent features pending)
- Current code works
- Not blocking anything critical
- Can migrate incrementally (one feature at a time)

---

## Key Takeaways

1. **Current code works fine** - navigation bugs are solved! ✅
2. **Migration would improve**: performance, testability, maintainability 📈
3. **Not urgent**: Can wait for next sprint or when bandwidth available ⏰
4. **High value**: Industry standard pattern, worth doing eventually 💎
5. **Incremental possible**: Can migrate one feature at a time 🔄

---

## Next Steps

**If you decide to migrate:**

1. Read this document thoroughly
2. Create the Zustand auth store
3. Create React Query profile hooks
4. Update RootNavigator gradually
5. Test each step thoroughly
6. Remove old code only when 100% confident

**If you decide to wait:**

1. Document current architecture (done in this file)
2. Add comments to `ctx.tsx` explaining structure
3. Continue building features with current setup
4. Revisit migration decision in next sprint planning

---

## Questions?

**Q: Will migration break existing features?**  
A: Not if done carefully. Can test in parallel before removing old code.

**Q: Is Context API bad?**  
A: No! It's fine for simple cases. Just not optimal for complex auth + server state.

**Q: Can we migrate incrementally?**  
A: Yes! Start with auth store, then add React Query hooks one by one.

**Q: What if something goes wrong?**  
A: Git is your friend. Commit current working state, then migrate in feature branch.

**Q: Should we migrate everything to Zustand?**  
A: No! Only **global app state**. Keep local component state as `useState`.

---

**Created**: October 12, 2025  
**Status**: Current code working ✅, migration recommended 🚀  
**Priority**: Medium (high value, not urgent)

# React Hooks Violation Fix - Provider Verification Layout

**Issue Date**: October 14, 2025  
**Fixed By**: AI Assistant  
**Status**: ✅ RESOLVED

---

## 🚨 Problem Description

### Error
```
Error: Rendered fewer hooks than expected. This may be caused by an accidental early return statement.
```

### When It Occurred
- **Trigger**: User logs out from provider verification flow
- **Location**: `src/app/(provider-verification)/_layout.tsx`
- **Root Cause**: Conditional early returns **before** all hooks were called

### Error Stack Trace
```
at finishRenderingHooks (localhost:8081/node_modules/expo-router/entry.bundle...)
at renderWithHooks (localhost:8081/node_modules/expo-router/entry.bundle...)
at updateFunctionComponent (localhost:8081/node_modules/expo-router/entry.bundle...)
Component: ProviderVerificationLayout(./(provider-verification)/_layout.tsx)
```

---

## 🔍 Root Cause Analysis

### React's Rules of Hooks Violation

React's Rules of Hooks state:
> **Hooks must be called in the same order on every render**

### The Violation Pattern

**BEFORE (Broken Code)**:
```tsx
export default function ProviderVerificationLayout() {
  // ❌ Some hooks called here
  const pathname = usePathname();
  const router = useRouter();
  const { providerId, setProviderId } = useProviderVerificationStore();
  const { user, isAuthenticated } = useAuthOptimized();
  const session = useAuthStore((state) => state.session);
  const userRole = useAuthStore((state) => state.userRole);
  const isHydrated = useProviderVerificationHydration();
  const conflictResolution = useConflictResolution();
  
  const hasSetProviderIdRef = useRef(false);

  // ❌ EARLY RETURN - Remaining hooks never execute!
  if (!session) {
    return <Redirect href="/(auth)" />;
  }

  // ❌ EARLY RETURN - Remaining hooks never execute!
  if (userRole !== 'provider') {
    return <Redirect href="/(customer)" />;
  }

  // ❌ These hooks only execute when user is authenticated
  useEffect(() => { /* route validation */ }, [pathname, isHydrated, user?.id]);
  useEffect(() => { /* provider ID setup */ }, [user?.id, isHydrated, providerId]);
  
  // ... rest of component
}
```

### What Went Wrong

**Render 1 (Logged In):**
1. ✅ Call `usePathname()`
2. ✅ Call `useRouter()`
3. ✅ Call `useProviderVerificationStore()`
4. ✅ Call `useAuthOptimized()`
5. ✅ Call `useAuthStore()` (twice)
6. ✅ Call `useProviderVerificationHydration()`
7. ✅ Call `useConflictResolution()`
8. ✅ Call `useRef()`
9. ✅ Call `useEffect()` (route validation)
10. ✅ Call `useEffect()` (provider ID setup)
11. ✅ Render layout

**Render 2 (After Logout):**
1. ✅ Call `usePathname()`
2. ✅ Call `useRouter()`
3. ✅ Call `useProviderVerificationStore()`
4. ✅ Call `useAuthOptimized()`
5. ✅ Call `useAuthStore()` (twice)
6. ✅ Call `useProviderVerificationHydration()`
7. ✅ Call `useConflictResolution()`
8. ✅ Call `useRef()`
9. ❌ **EARLY RETURN** - `session` is `null`, returns `<Redirect />`
10. ❌ **NEVER CALLED** - First `useEffect()` skipped
11. ❌ **NEVER CALLED** - Second `useEffect()` skipped
12. 🚨 **ERROR**: React expects 11 hooks, only found 9!

---

## ✅ Solution

### The Fix: Call All Hooks First, Then Conditional Returns

**AFTER (Fixed Code)**:
```tsx
export default function ProviderVerificationLayout() {
  // ✅ ALL hooks called at the top - no conditional execution
  const pathname = usePathname();
  const router = useRouter();
  const { providerId, setProviderId } = useProviderVerificationStore();
  const { user, isAuthenticated } = useAuthOptimized();
  const session = useAuthStore((state) => state.session);
  const userRole = useAuthStore((state) => state.userRole);
  const isHydrated = useProviderVerificationHydration();
  const conflictResolution = useConflictResolution();
  
  const hasSetProviderIdRef = useRef(false);

  // ✅ ALL useEffect hooks called unconditionally
  useEffect(() => { /* route validation */ }, [pathname, isHydrated, user?.id]);
  useEffect(() => { /* provider ID setup */ }, [user?.id, isHydrated, providerId]);

  // ✅ Guards moved AFTER all hooks
  if (!session) {
    console.log('[ProviderVerificationLayout] ❌ No session, redirecting to /(auth)');
    return <Redirect href="/(auth)" />;
  }

  if (userRole !== 'provider') {
    console.log('[ProviderVerificationLayout] ❌ Not a provider, redirecting to /(customer)');
    return <Redirect href="/(customer)" />;
  }

  console.log('[ProviderVerificationLayout] ✅ Access granted for provider verification');

  // ✅ Final loading check
  if (!isHydrated || !user?.id) {
    return <LoadingScreen />;
  }
  
  // ... rest of component
}
```

### Now Every Render Calls Hooks in the Same Order

**Render 1 (Logged In):**
1. ✅ Call all 9 hooks
2. ✅ Call both `useEffect()` hooks (11 total)
3. ✅ Guards pass
4. ✅ Render layout

**Render 2 (After Logout):**
1. ✅ Call all 9 hooks
2. ✅ Call both `useEffect()` hooks (11 total)
3. ✅ Guard fails, return `<Redirect />`
4. ✅ **No error** - All 11 hooks called!

---

## 📋 Changes Made

### File Modified
- **Path**: `src/app/(provider-verification)/_layout.tsx`
- **Lines Changed**: 48-97

### Specific Changes

1. **Moved Route Validation useEffect** (Lines 50-81)
   - Moved from after guard checks to before guard checks
   - Now executes on every render regardless of authentication state

2. **Moved Provider ID Setup useEffect** (Lines 83-95)
   - Moved from after guard checks to before guard checks
   - Now executes on every render regardless of authentication state

3. **Moved Guard Checks** (Lines 97-110)
   - Moved session check from line 48 to line 97
   - Moved role check from line 54 to line 103
   - Now execute **after** all hooks are called

### Code Diff

```diff
export default function ProviderVerificationLayout() {
  const pathname = usePathname();
  const router = useRouter();
  const { providerId, setProviderId } = useProviderVerificationStore();
  const { user, isAuthenticated } = useAuthOptimized();
  const session = useAuthStore((state) => state.session);
  const userRole = useAuthStore((state) => state.userRole);
  const isHydrated = useProviderVerificationHydration();
  const conflictResolution = useConflictResolution();
  
  const hasSetProviderIdRef = useRef(false);

- // Guard checks were here (WRONG - before useEffects)
- if (!session) {
-   return <Redirect href="/(auth)" />;
- }
- 
- if (userRole !== 'provider') {
-   return <Redirect href="/(customer)" />;
- }

  // Route validation useEffect
  useEffect(() => {
    // ... route validation logic
  }, [pathname, isHydrated, user?.id]);

  // Provider ID setup useEffect
  useEffect(() => {
    // ... provider ID logic
  }, [user?.id, isHydrated, providerId, setProviderId]);

+ // Guard checks moved here (CORRECT - after all hooks)
+ if (!session) {
+   console.log('[ProviderVerificationLayout] ❌ No session, redirecting to /(auth)');
+   return <Redirect href="/(auth)" />;
+ }
+ 
+ if (userRole !== 'provider') {
+   console.log('[ProviderVerificationLayout] ❌ Not a provider, redirecting to /(customer)');
+   return <Redirect href="/(customer)" />;
+ }
+ 
+ console.log('[ProviderVerificationLayout] ✅ Access granted for provider verification');

  // Loading check
  if (!isHydrated || !user?.id) {
    return <LoadingScreen />;
  }
  
  return <Layout>...</Layout>;
}
```

---

## ✅ Verification

### TypeScript Compilation
```bash
✅ No TypeScript errors
```

### Test Cases

**Test 1: User Logged In**
- ✅ All hooks execute
- ✅ Guards pass
- ✅ Layout renders
- ✅ No errors

**Test 2: User Logs Out**
- ✅ All hooks execute
- ✅ Session becomes null
- ✅ Guard redirects to /(auth)
- ✅ **No "Rendered fewer hooks" error** ✨

**Test 3: Non-Provider Role**
- ✅ All hooks execute
- ✅ Role guard redirects to /(customer)
- ✅ No errors

---

## 📚 React Hooks Rules Reference

### Rule 1: Only Call Hooks at the Top Level
> **Don't call Hooks inside loops, conditions, or nested functions.**

### Rule 2: Only Call Hooks from React Functions
> **Don't call Hooks from regular JavaScript functions.**

### Why These Rules Matter

React relies on the **order** in which Hooks are called to:
1. Preserve state between re-renders
2. Match useState calls with their values
3. Match useEffect calls with their cleanup functions
4. Track which component instance owns which Hook

**Breaking the order = React can't track state = Crash** 🚨

---

## 🎯 Best Practices Going Forward

### ✅ DO: Call All Hooks First
```tsx
function MyComponent() {
  // ✅ All hooks at the top
  const value1 = useState();
  const value2 = useContext();
  useEffect(() => {});
  
  // ✅ Then conditional returns
  if (someCondition) {
    return <EarlyReturn />;
  }
  
  return <MainContent />;
}
```

### ❌ DON'T: Conditional Hook Calls
```tsx
function MyComponent() {
  const value1 = useState();
  
  // ❌ Early return before other hooks
  if (someCondition) {
    return <EarlyReturn />;
  }
  
  // ❌ This hook won't be called every render
  const value2 = useContext();
  useEffect(() => {});
  
  return <MainContent />;
}
```

### Layout Component Pattern
```tsx
function ProtectedLayout() {
  // 1️⃣ ALL hooks first (no conditions)
  const session = useSession();
  const user = useUser();
  useEffect(() => { /* ... */ }, []);
  useEffect(() => { /* ... */ }, []);
  
  // 2️⃣ Then authentication guards
  if (!session) return <Redirect to="/login" />;
  if (!user) return <Loading />;
  
  // 3️⃣ Finally render layout
  return <Layout>...</Layout>;
}
```

---

## 🔗 Related Files

- **Fixed File**: `src/app/(provider-verification)/_layout.tsx`
- **Related Layouts**:
  - `src/app/(provider)/_layout.tsx` (already follows correct pattern)
  - `src/app/(auth)/_layout.tsx` (already follows correct pattern)
  - `src/app/(customer)/_layout.tsx` (already follows correct pattern)

---

## 📖 References

- [React Hooks Rules](https://react.dev/reference/rules/rules-of-hooks)
- [ESLint Plugin: react-hooks/rules-of-hooks](https://www.npmjs.com/package/eslint-plugin-react-hooks)
- [React Docs: Using Multiple Hooks](https://react.dev/learn/state-a-components-memory#using-multiple-state-variables)

---

## ✅ Status

**Problem**: React Hooks violation on logout  
**Solution**: Moved all hooks before conditional returns  
**Status**: ✅ **FIXED**  
**Verified**: TypeScript compilation passes, no runtime errors  
**Production Ready**: Yes

---

**Author**: AI Assistant  
**Last Updated**: October 14, 2025

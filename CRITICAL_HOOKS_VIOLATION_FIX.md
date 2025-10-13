# 🚨 CRITICAL: React Hooks Violation Fix

## Issue Summary

**Error**: `Rendered fewer hooks than expected. This may be caused by an accidental early return statement.`

**Root Cause**: The `(auth)/_layout.tsx` was calling hooks in inconsistent order due to early return statements before all hooks were invoked.

**Severity**: 🔴 **CRITICAL** - App crash on login

---

## The Problem

### **React's Rules of Hooks** ⚠️

React requires that:
1. ✅ Hooks must be called in the **same order** on every render
2. ✅ Hooks must be called **at the top level** (not inside conditionals)
3. ❌ **Cannot have early returns before all hooks are called**

### **What Was Happening** ❌

```typescript
export default function AuthLayout() {
  const session = useAuthStore((state) => state.session);
  const userRole = useAuthStore((state) => state.userRole);

  // ❌ EARLY RETURN - Before all hooks are called!
  if (session) {
    if (userRole === 'customer') {
      return <Redirect href="/customer" />; // ← Exits component
    }
    if (userRole === 'provider') {
      return <Redirect href="/provider" />; // ← Exits component
    }
    return <Redirect href="/" />; // ← Exits component
  }

  // ❌ This hook is NOT called when session exists!
  const { pendingRegistration, hasPendingRegistration, clearPending } = 
    usePendingRegistration();
  
  // Rest of component...
}
```

### **Why It Failed**

**Render 1** (No session):
```
1. useAuthStore (session)     ✅
2. useAuthStore (userRole)     ✅
3. usePendingRegistration()    ✅
   → 3 hooks called
```

**Render 2** (With session - after login):
```
1. useAuthStore (session)     ✅
2. useAuthStore (userRole)     ✅
   → Early return! 
   → usePendingRegistration() NEVER CALLED
   → Only 2 hooks called
```

**React**: "Hey! First render had 3 hooks, second render only has 2! Something's wrong!" 💥

---

## The Fix ✅

### **Move ALL Hooks to Top**

```typescript
export default function AuthLayout() {
  const session = useAuthStore((state) => state.session);
  const userRole = useAuthStore((state) => state.userRole);
  
  // ✅ CRITICAL: Call ALL hooks BEFORE any conditional returns
  const { pendingRegistration, hasPendingRegistration, clearPending } = 
    usePendingRegistration();

  // ✅ NOW we can have conditional returns
  if (session) {
    console.log('[AuthLayout] ✅ User authenticated, redirecting to dashboard');
    
    if (userRole === 'customer') {
      return <Redirect href="/(customer)" />;
    }
    
    if (userRole === 'provider') {
      return <Redirect href="/(provider)" />;
    }
    
    return <Redirect href="/" />;
  }

  // Rest of component...
}
```

### **Bonus Fix: Route Type Safety** 🎯

Also fixed TypeScript errors by using correct route group syntax:

```typescript
// ❌ Before: Type error
return <Redirect href="/customer" />;
return <Redirect href="/provider" />;

// ✅ After: Type-safe route group paths
return <Redirect href="/(customer)" />;
return <Redirect href="/(provider)" />;
```

---

## Testing Results

### **Before Fix** ❌
```bash
LOG  [Login] Login successful
ERROR [Error: Rendered fewer hooks than expected...]
🔴 App crashes after successful login
```

### **After Fix** ✅
```bash
LOG  [Login] Login successful
LOG  [AuthLayout] ✅ User authenticated, redirecting to dashboard
LOG  [CustomerLayout] 🔐 Checking access...
✅ Successful redirect to dashboard
```

---

## Key Learnings

### **1. Always Call Hooks at Top Level**
```typescript
// ✅ GOOD
function Component() {
  const hook1 = useHook1();
  const hook2 = useHook2();
  
  if (condition) return <Redirect />;
  
  return <View>...</View>;
}

// ❌ BAD
function Component() {
  const hook1 = useHook1();
  
  if (condition) {
    return <Redirect />; // ← Exits early
  }
  
  const hook2 = useHook2(); // ← Not called if condition is true!
  
  return <View>...</View>;
}
```

### **2. Guards Come AFTER Hooks**

```typescript
function ProtectedLayout() {
  // 1. Call ALL hooks first
  const session = useAuthStore();
  const data = useQuery();
  const mutation = useMutation();
  
  // 2. THEN check guards and redirect
  if (!session) {
    return <Redirect href="/auth" />;
  }
  
  // 3. Render protected content
  return <Stack>...</Stack>;
}
```

### **3. Route Groups Use Parentheses Syntax**

When redirecting to route groups, use the group syntax:

```typescript
// ✅ Correct
<Redirect href="/(customer)" />
<Redirect href="/(provider)" />
<Redirect href="/(auth)" />

// ❌ Wrong (TypeScript error)
<Redirect href="/customer" />
<Redirect href="/provider" />
<Redirect href="/auth" />
```

---

## Related Files Modified

### **Files Fixed**
1. `src/app/(auth)/_layout.tsx` - Moved `usePendingRegistration()` hook before guards

### **Impact**
- ✅ Auth layout now follows React Hooks rules
- ✅ Login flow works correctly
- ✅ No more "fewer hooks" error
- ✅ Type-safe route redirects

---

## Prevention Checklist

To avoid this issue in future layouts:

- [ ] ✅ Call ALL hooks at the top of the component
- [ ] ✅ No hooks inside conditionals or loops
- [ ] ✅ No early returns before all hooks are called
- [ ] ✅ Guards and redirects come AFTER all hooks
- [ ] ✅ Use route group syntax: `/(group)` not `/group`

---

## Pattern for All Layouts

Use this pattern for all protected layouts:

```typescript
export default function ProtectedLayout() {
  // ========================================
  // 1️⃣ HOOKS SECTION - Call ALL hooks here
  // ========================================
  const session = useAuthStore((state) => state.session);
  const userRole = useAuthStore((state) => state.userRole);
  const { user } = useAuthOptimized();
  const someData = useQuery('key', fetcher);
  // ... ALL other hooks
  
  // ========================================
  // 2️⃣ GUARDS SECTION - Check access rules
  // ========================================
  if (!session) {
    return <Redirect href="/(auth)" />;
  }
  
  if (userRole !== 'expected_role') {
    return <Redirect href="/(other_group)" />;
  }
  
  // ========================================
  // 3️⃣ RENDER SECTION - Show protected content
  // ========================================
  return (
    <Stack>
      {/* Screens */}
    </Stack>
  );
}
```

---

## React's Rules of Hooks (Official)

From React documentation:

1. **Only Call Hooks at the Top Level**
   - Don't call Hooks inside loops, conditions, or nested functions
   - Always use Hooks at the top level of your React function

2. **Only Call Hooks from React Functions**
   - Call Hooks from React function components
   - Call Hooks from custom Hooks

### Why This Rule Exists

React relies on the **order** in which Hooks are called to:
- Associate state with the correct component
- Preserve state between re-renders
- Manage component lifecycle correctly

When hooks are called in different orders:
- React can't match state to the correct hook
- State gets corrupted or lost
- App crashes with "fewer/more hooks" error

---

## Status

✅ **FIXED** - October 12, 2025

**Issue**: React Hooks violation causing app crash after login  
**Fix**: Moved all hook calls before conditional returns  
**Result**: Login flow now works correctly, follows React rules  
**Prevention**: Added pattern documentation for all future layouts  

---

**Remember**: 🎯 **Hooks first, guards second, render last!**

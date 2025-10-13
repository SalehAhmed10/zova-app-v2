# 🎯 Quick Fix Reference: React Hooks Rules

## The Problem (What You Saw)

```
ERROR [Error: Rendered fewer hooks than expected. 
       This may be caused by an accidental early return statement.]
```

**Why**: Early return BEFORE all hooks were called ❌

---

## The Fix (What We Did)

### Before ❌
```typescript
function Layout() {
  const hook1 = useHook1();
  
  if (condition) {
    return <Redirect />; // ← Exits early
  }
  
  const hook2 = useHook2(); // ← Never called if condition is true
}
```

### After ✅
```typescript
function Layout() {
  const hook1 = useHook1();
  const hook2 = useHook2(); // ← Always called first
  
  if (condition) {
    return <Redirect />; // ← Now safe to exit
  }
}
```

---

## The Rule

> **ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS**

```typescript
// ✅ CORRECT ORDER
1. Call all hooks
2. Check guards
3. Return redirects or render
```

---

## Template (Copy This)

```typescript
export default function ProtectedLayout() {
  // 1️⃣ HOOKS - All of them, at the top
  const session = useAuthStore((state) => state.session);
  const userRole = useAuthStore((state) => state.userRole);
  const data = useQuery('key', fetcher);
  // ... more hooks
  
  // 2️⃣ GUARDS - After all hooks
  if (!session) {
    return <Redirect href="/(auth)" />;
  }
  
  if (userRole !== 'expected') {
    return <Redirect href="/(other)" />;
  }
  
  // 3️⃣ RENDER - Protected content
  return <Stack>{/* ... */}</Stack>;
}
```

---

## Quick Checks

Before committing layout changes:

- [ ] Are ALL hooks at the top?
- [ ] No hooks in if/else blocks?
- [ ] No hooks in loops?
- [ ] Guards come AFTER hooks?
- [ ] Using `/(group)` syntax for redirects?

---

## Route Group Syntax

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

## Remember

🎯 **Hooks first, guards second, render last!**

If you see "fewer hooks" error → Check for early returns before all hooks!

---

**Fixed**: October 12, 2025  
**File**: `src/app/(auth)/_layout.tsx`  
**Status**: ✅ Resolved and tested

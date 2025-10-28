# 🏗️ ZOVA Routing Architecture Guide

## Overview

This document describes the new centralized routing architecture for the ZOVA app. It replaces duplicated guard logic with reusable, testable, type-safe systems.

---

## 🎯 Core Principles

1. **DRY (Don't Repeat Yourself)**: Guard logic defined once in `guards.ts`
2. **Type-Safe**: Full TypeScript support with compile-time validation
3. **Testable**: Pure functions that don't depend on React hooks
4. **Reusable**: Common patterns extracted into hooks and utilities
5. **Maintainable**: Single source of truth for routing rules

---

## 📁 File Structure

```
src/lib/routing/
├── guards.ts                  # Core guard functions (pure, testable)
├── types.ts                   # Type-safe route definitions
└── ROUTING_ARCHITECTURE.md    # This file

src/hooks/routing/
└── useLayoutGuards.ts         # React hooks wrapper for guards

src/stores/
└── access-control.ts          # Centralized access/permission management

src/app/
├── (auth)/_layout.tsx         # Uses useAuthLayoutGuards()
├── (customer)/_layout.tsx     # Uses useCustomerLayoutGuards()
├── (provider)/_layout.tsx     # Uses useProviderLayoutGuards()
└── (provider-verification)/   # Verification flow management
```

---

## 🔐 Guard System

### What is a Guard?

A guard is a pure function that validates a condition and returns a result:

```typescript
// ✅ Guard pattern
function checkVerification(status, isLoading, hasCache): GuardResult {
  if (isLoading && !hasCache) return { type: 'loading' };
  if (status === 'approved' || hasCache) return { type: 'allow' };
  if (status === 'rejected') return { type: 'redirect', href: '/rejected' };
  return { type: 'redirect', href: '/pending' };
}
```

### Guard Result Types

```typescript
type GuardResult =
  | { type: 'allow' }                    // Access granted
  | { type: 'loading' }                  // Still loading
  | { type: 'redirect'; href: string }   // Redirect to URL
  | { type: 'error'; message: string }   // Error occurred
```

### Available Guards

| Guard | Purpose | Returns |
|-------|---------|---------|
| `checkHydration()` | Waits for store hydration | loading/allow |
| `checkAuthentication()` | Verifies session exists | allow/redirect |
| `checkRole()` | Validates user role | allow/redirect |
| `checkVerification()` | Checks provider verification | allow/loading/redirect |
| `checkProfileCompletion()` | Validates required fields | allow/redirect |
| `executeGuards()` | Chains multiple guards | First non-allow result |

### Using Guards Directly

```typescript
// In utility functions or outside React
import { checkRole, checkVerification } from '@/lib/routing/guards';

const roleResult = checkRole(userRole, 'provider');
const verResult = checkVerification(status, isLoading, hasCache);
```

---

## 🪝 Layout Guards Hook

### Quick Start

Use `useLayoutGuards()` in your layout files:

```typescript
// src/app/(provider)/_layout.tsx
import { useLayoutGuards } from '@/hooks/routing/useLayoutGuards';

export default function ProviderLayout() {
  const { guardResult, isLoading, state } = useLayoutGuards({
    requireAuth: true,
    requireRole: 'provider',
    requireVerification: true,
  });

  // Handle loading
  if (isLoading) return <MinimalLoadingScreen />;

  // Handle redirect
  if (guardResult.type === 'redirect') {
    return <Redirect href={guardResult.href} />;
  }

  // Access granted - render layout
  return (
    <SafeAreaView>
      <Stack screenOptions={...} />
    </SafeAreaView>
  );
}
```

### Convenience Hooks

```typescript
// For providers
const { guardResult } = useProviderLayoutGuards();

// For customers
const { guardResult } = useCustomerLayoutGuards();

// For auth routes
const { guardResult } = useAuthLayoutGuards();
```

### Configuration Options

```typescript
interface UseLayoutGuardsOptions {
  requireAuth?: boolean;              // Check session exists
  requireRole?: 'customer' | 'provider'; // Validate role
  requireVerification?: boolean;      // Check provider verification
  requireProfileCompletion?: boolean; // Validate profile fields
  requiredFields?: string[];          // Which fields must be filled
}
```

### Return Object

```typescript
interface UseLayoutGuardsResult {
  guardResult: GuardResult;           // What should happen next
  isLoading: boolean;                 // Are we waiting for data?
  isAllowed: boolean;                 // Can user access?
  isRedirecting: boolean;             // Should redirect?
  redirectHref?: string;              // Where to redirect?
  state: {                            // Raw state (for debugging)
    session: any;
    userRole: string | null;
    isHydrated: boolean;
    verificationStatus: string;
    profile: any;
  };
}
```

---

## 🔑 Access Control Store

### Purpose

Centralized management of user permissions, roles, and feature access.

### Usage

```typescript
import { useAccessControlStore, useProviderAccess, useCustomerAccess } from '@/stores/access-control';

// Direct store access
const role = useAccessControlStore((state) => state.role);
const canAccess = useAccessControlStore((state) => state.canAccessRoute('provider/earnings'));

// Provider helpers
const { isVerified, canAcceptBookings, canWithdraw } = useProviderAccess();

// Customer helpers
const { isCustomer, canBook, canRate } = useCustomerAccess();
```

### Methods

| Method | Purpose |
|--------|---------|
| `setRole(role)` | Update user role |
| `setVerificationStatus(status)` | Update verification status |
| `enableFeature(feature)` | Enable a feature flag |
| `disableFeature(feature)` | Disable a feature flag |
| `hasFeature(feature)` | Check if feature enabled |
| `canAccessRoute(route)` | Check route access |
| `canPerformAction(action)` | Check action permission |
| `setProfileCompleted(completed)` | Mark profile as complete |
| `reset()` | Clear all state (on logout) |

### Feature Flags

Access control supports feature flags for gradual rollouts:

```typescript
const store = useAccessControlStore();

// Enable new feature for user
store.enableFeature('NEW_BOOKING_FLOW');

// Check before using feature
if (store.hasFeature('NEW_BOOKING_FLOW')) {
  // Show new UI
}

// Or via actions
if (store.canPerformAction('feature:NEW_BOOKING_FLOW')) {
  // Use feature
}
```

### Persistence

Access control state persists to AsyncStorage automatically. On app relaunch:
- State is restored from storage
- `_hasHydrated` flag is set to true
- Access checks work offline

---

## 🛣️ Type-Safe Routing

### Route Constants

All valid routes are defined as constants with full TypeScript support:

```typescript
import { AUTH_ROUTES, CUSTOMER_ROUTES, PROVIDER_ROUTES } from '@/lib/routing/types';

// ✅ IDE autocomplete and type checking
navigate(AUTH_ROUTES.LOGIN);
navigate(CUSTOMER_ROUTES.HOME);
navigate(PROVIDER_ROUTES.DASHBOARD);

// ❌ Won't compile - typo caught at build time
navigate(AUTH_ROUTES.LOGN);  // Error!
```

### Route Categories

```typescript
// Auth routes
AUTH_ROUTES.LOGIN
AUTH_ROUTES.REGISTER
AUTH_ROUTES.PHONE_VERIFICATION

// Onboarding routes
ONBOARDING_ROUTES.SELECT_ROLE
ONBOARDING_ROUTES.CUSTOMER_PROFILE
ONBOARDING_ROUTES.PROVIDER_DOCUMENTS

// Customer routes
CUSTOMER_ROUTES.HOME
CUSTOMER_ROUTES.BOOKINGS
CUSTOMER_ROUTES.PROFILE

// Provider routes
PROVIDER_ROUTES.DASHBOARD
PROVIDER_ROUTES.EARNINGS
PROVIDER_ROUTES.VERIFICATION_STATUS

// Verification routes
PROVIDER_VERIFICATION_ROUTES.PENDING
PROVIDER_VERIFICATION_ROUTES.APPROVED
PROVIDER_VERIFICATION_ROUTES.REJECTED
```

### Helper Functions

```typescript
import {
  getCustomerRoute,
  getProviderRoute,
  isValidAppRoute,
  getRouteCategory,
  isPublicRoute,
  requiresVerification,
} from '@/lib/routing/types';

// Get typed route
const homeRoute = getCustomerRoute('HOME');  // ✅ Type-safe

// Validate routes
if (isValidAppRoute(someString)) {
  // It's definitely a valid route
}

// Check route properties
getRouteCategory('/(customer)/home');  // Returns 'customer'
isPublicRoute('/(auth)/login');        // Returns true
requiresVerification('/(provider)/earnings'); // Returns true
```

---

## 📋 Implementation Checklist

### Phase 1: Foundation (✅ Complete)
- [x] Create guard functions (`guards.ts`)
- [x] Create layout guards hook (`useLayoutGuards.ts`)
- [x] Create access control store (`access-control.ts`)
- [x] Create type-safe routes (`types.ts`)
- [x] Create documentation (this file)

### Phase 2: Layout Migration (Starting)
- [ ] Update `src/app/(auth)/_layout.tsx` to use hooks
- [ ] Update `src/app/(customer)/_layout.tsx` to use hooks
- [ ] Update `src/app/(provider)/_layout.tsx` to use hooks
- [ ] Update `src/app/(provider-verification)/_layout.tsx` to use hooks
- [ ] Verify all TypeScript errors resolve

### Phase 3: Testing & Validation
- [ ] Test auth flow (login/logout)
- [ ] Test customer access to customer routes
- [ ] Test provider access to provider routes
- [ ] Test verification blocking
- [ ] Test offline persistence

### Phase 4: Documentation & Cleanup
- [ ] Remove duplicate guard logic from layouts
- [ ] Add JSDoc comments to new files
- [ ] Create routing troubleshooting guide
- [ ] Archive old patterns documentation

---

## 🔄 Migration Example

### Before (Duplicated Logic)

```typescript
// ❌ Each layout has its own guard logic (duplicated)
export default function ProviderLayout() {
  const { isDarkColorScheme } = useColorScheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuthOptimized();
  const session = useAuthStore((state) => state.session);
  const userRole = useAuthStore((state) => state.userRole);
  const isHydrated = useProfileHydration();
  useProfileSync(user?.id);
  const { data: verificationData } = useVerificationData(user?.id);
  const verificationStatus = verificationData?.progress?.verification_status;
  const cachedStatus = useProfileStore((state) => state.verificationStatus);
  const hasCache = cachedStatus === 'approved';

  if (!isHydrated) return <MinimalLoadingScreen />;
  if (!session) return <Redirect href="/(auth)" />;
  if (userRole !== 'provider') return <Redirect href="/(customer)" />;
  // ... more duplication
}
```

### After (Centralized Logic)

```typescript
// ✅ Clean, centralized logic
import { useProviderLayoutGuards } from '@/hooks/routing/useLayoutGuards';

export default function ProviderLayout() {
  const { guardResult, isLoading } = useProviderLayoutGuards();

  if (isLoading) return <MinimalLoadingScreen />;
  if (guardResult.type === 'redirect') {
    return <Redirect href={guardResult.href} />;
  }

  return (
    <SafeAreaView>
      <Stack screenOptions={...} />
    </SafeAreaView>
  );
}
```

**Benefits:**
- 60% less code
- Single source of truth for rules
- Easier to maintain and modify
- Type-safe route constants
- Reusable across multiple layouts

---

## 🐛 Debugging

### Common Issues

**Issue: "Rendered fewer hooks than expected"**
- ❌ Don't call hooks after early returns
- ✅ Move ALL hooks to top of component
- See: `useLayoutGuards` hook for correct pattern

**Issue: Store not hydrated**
- ✅ Always check `_hasHydrated` before using access control
- Use: `useAccessControlHydration()` hook
- Pattern: `if (!isHydrated) return <LoadingScreen />`

**Issue: Route typo causes crash**
- ✅ Use route constants: `PROVIDER_ROUTES.DASHBOARD`
- ❌ Never hardcode strings: `'/(provider)/dashboard'`
- TypeScript will catch typos at compile time

### Debug Mode

```typescript
// In your component
const { guardResult, state } = useLayoutGuards({
  requireAuth: true,
  requireRole: 'provider',
});

// Check state
console.log('Guard State:', {
  session: state.session ? 'exists' : 'missing',
  role: state.userRole,
  hydrated: state.isHydrated,
  verification: state.verificationStatus,
});

console.log('Guard Result:', guardResult);
```

---

## 📚 Related Documentation

- **[React Hooks Rules](https://react.dev/reference/rules/rules-of-hooks)** - Why hooks must be called consistently
- **[Expo Router Docs](https://expo.dev/docs/routing/)** - File-based routing guide
- **[Zustand Docs](https://github.com/pmndrs/zustand)** - State management patterns
- **[ZOVA Copilot Instructions](.copilot-instructions.md)** - Project guidelines

---

## 🚀 Next Steps

1. **Review** this architecture with team
2. **Implement** layout migrations (Phase 2)
3. **Test** all access flows thoroughly
4. **Document** any customizations
5. **Monitor** performance and error rates

---

## 📞 Support

For questions or issues with the routing architecture:
1. Check the **Debug Mode** section above
2. Review the **Examples** in each file's JSDoc
3. Check **Related Documentation** links
4. Create an issue with detailed logs

---

**Last Updated:** $(date)
**Architecture Version:** 2.0
**Status:** Ready for Layout Migration

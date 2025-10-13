# Quick Start: Protected Routes Implementation

## 🚀 START HERE

This guide helps you implement Phase 6 in the correct order.

---

## Step 1: Create Zustand Auth Store (START HERE)

Run these commands:

```bash
# Create directories
mkdir -p src/stores/auth
mkdir -p src/hooks/auth

# Create files
touch src/stores/auth/index.ts
touch src/stores/auth/types.ts
touch src/hooks/auth/useProfile.ts
touch src/hooks/auth/useSignIn.ts
touch src/hooks/auth/useSignOut.ts
```

Then copy the code from `PHASE_6_PROTECTED_ROUTES_MIGRATION.md` Step 1 into:
- `src/stores/auth/index.ts`
- `src/stores/auth/types.ts`

---

## Step 2: Create React Query Hooks

Copy code from `PHASE_6_PROTECTED_ROUTES_MIGRATION.md` Step 2 into:
- `src/hooks/auth/useProfile.ts`
- `src/hooks/auth/useSignIn.ts`
- `src/hooks/auth/useSignOut.ts`

---

## Step 3: Update Root Layout

**BACKUP FIRST!**

```bash
cp src/app/_layout.tsx src/app/_layout.tsx.backup
```

Then replace `src/app/_layout.tsx` with code from Step 3.

---

## Step 4: Update Splash Screen

Replace `src/app/splash.tsx` with code from Step 4.

---

## Step 5: Create Route Groups

```bash
# Create route group directories
mkdir -p src/app/\(public\)
mkdir -p src/app/\(auth\)
mkdir -p src/app/\(customer\)
mkdir -p src/app/\(provider\)
mkdir -p src/app/\(provider-verification\)

# Create layout files
touch src/app/\(public\)/_layout.tsx
touch src/app/\(public\)/index.tsx
touch src/app/\(auth\)/_layout.tsx
```

Copy layouts from Step 5.

---

## Step 6: Move Existing Screens

```bash
# Move auth screens
mv src/app/auth/* src/app/\(auth\)/

# Move customer screens
mv src/app/customer/* src/app/\(customer\)/

# Move provider screens
mv src/app/provider/* src/app/\(provider\)/

# Move verification screens
mv src/app/provider-verification/* src/app/\(provider-verification\)/

# Move onboarding
mv src/app/onboarding src/app/\(public\)/
```

---

## Step 7: Delete Old Files

```bash
# Delete old navigation hooks
rm src/hooks/shared/useAuthNavigation.ts
rm src/hooks/shared/useDeepLinkHandler.ts
rm src/hooks/shared/usePendingRegistration.ts

# Delete old ctx.tsx (replaced by auth store)
rm src/app/ctx.tsx

# Delete empty directories
rmdir src/app/auth
rmdir src/app/customer
rmdir src/app/provider
rmdir src/app/provider-verification
```

---

## Step 8: Update Imports

Find and replace across codebase:

```bash
# Replace old imports
Find:    from './ctx'
Replace: from '@/stores/auth'

Find:    from '../ctx'
Replace: from '@/stores/auth'

Find:    useSession()
Replace: useAuthStore()
```

---

## Step 9: Test

```bash
# Clean build
npm run android:clean

# Or
npm run ios
```

Test these flows:
1. ✅ Fresh user → Onboarding → Sign in → Dashboard
2. ✅ Returning user → Direct to dashboard
3. ✅ Provider → Verification flow
4. ✅ Sign out → Back to sign in
5. ✅ Back navigation works correctly

---

## Step 10: Commit

```bash
git add .
git commit -m "feat: migrate to Protected Routes pattern

- Implemented Zustand + React Query architecture
- Added Expo Router Protected Routes
- Removed manual navigation logic
- Follows copilot-rules.md architecture
"
```

---

## Troubleshooting

### Issue: "Cannot find module '@/stores/auth'"

**Fix**: Check TypeScript paths in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

### Issue: "RootNavigator is not defined"

**Fix**: Make sure you imported useAuthStore:

```typescript
import { useAuthStore } from '@/stores/auth';
```

### Issue: "Protected is not a function"

**Fix**: Update Expo Router to SDK 53+:

```bash
npx expo install expo-router@latest
```

### Issue: Routes not protecting

**Fix**: Check guard conditions in RootNavigator:

```typescript
// Should be BOOLEAN, not string
<Stack.Protected guard={!!session}>  // ✅ Good
<Stack.Protected guard={session}>    // ❌ Bad
```

---

## Quick Reference: Where Things Are

| What | Old Location | New Location |
|------|-------------|--------------|
| Auth state | `src/app/ctx.tsx` | `src/stores/auth/index.ts` |
| Profile data | Context API | `src/hooks/auth/useProfile.ts` |
| Navigation logic | `src/app/_layout.tsx` (useEffect) | `src/app/_layout.tsx` (Stack.Protected) |
| Sign in/out | Context methods | React Query mutations |
| Auth screens | `src/app/auth/` | `src/app/(auth)/` |
| Customer screens | `src/app/customer/` | `src/app/(customer)/` |
| Provider screens | `src/app/provider/` | `src/app/(provider)/` |

---

## Architecture Summary

```
┌─────────────────────────────────────────────────────────┐
│                   Root Layout                            │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Zustand Auth Store                               │  │
│  │  - session, user, role, onboarding               │  │
│  │  - Persisted to AsyncStorage                     │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │  React Query                                      │  │
│  │  - useProfile(userId)                            │  │
│  │  - useSignIn(), useSignOut()                     │  │
│  │  - Automatic caching & refetching                │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Stack.Protected (Expo Router)                   │  │
│  │  - Declarative route protection                  │  │
│  │  - Automatic redirects                           │  │
│  │  - Role-based access control                     │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                   Route Groups                           │
├─────────────────────────────────────────────────────────┤
│  (public)      → Always accessible                      │
│  (auth)        → Not authenticated + onboarding done    │
│  (customer)    → Authenticated + customer role          │
│  (provider)    → Authenticated + provider + verified    │
│  (verification)→ Authenticated + provider + unverified  │
└─────────────────────────────────────────────────────────┘
```

---

## Ready to Start?

1. Read `PHASE_6_PROTECTED_ROUTES_MIGRATION.md` for full details
2. Follow this Quick Start guide step by step
3. Test thoroughly after each step
4. Ask for help if stuck!

**Estimated Time**: 5-6 days  
**Difficulty**: Medium  
**Impact**: High (major architecture improvement)

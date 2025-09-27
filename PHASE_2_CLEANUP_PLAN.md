# Phase 2: Advanced Architecture Cleanup & Migration Plan

## Overview
This document outlines the remaining files that need migration from old patterns (useEffect + useState) to the new React Query + Zustand architecture mandated by `copilot-rules.md`.

## ✅ Completed Cleanups
- ✅ Removed `src/app/auth/register.tsx` (old register file)
- ✅ Removed duplicate `src/lib/auth-context.tsx`
- ✅ Main authentication flows optimized (splash, auth layout, login)
- ✅ React Hook Form + Zod validation implemented
- ✅ Architecture hooks created (useAppInitialization, useAuthNavigation, usePendingRegistration)

## 🔧 Files Requiring Migration (Priority Order)

### **CRITICAL: Main App Flows**
1. **`src/app/provider/_layout.tsx`** - HIGH PRIORITY
   - Has 2 useEffect patterns for verification status
   - Needs React Query for verification data
   - Used in core provider flow

2. **`src/app/customer/search.tsx`** - HIGH PRIORITY  
   - Has useEffect for search logic
   - Large useState pattern for search/filters
   - Core customer feature - needs Zustand store

3. **`src/app/provider/earnings.tsx`** - HIGH PRIORITY
   - Has useEffect for Stripe status
   - Uses useState for server data
   - Needs React Query migration

### **IMPORTANT: Provider Features**
4. **`src/app/provider-verification/_layout.tsx`** - MEDIUM PRIORITY
   - Multiple useEffect patterns for progress tracking
   - Complex state management needs Zustand

5. **`src/app/provider-verification/services.tsx`** - MEDIUM PRIORITY
   - useEffect for service loading
   - Multiple useState for service management
   - Needs React Query + form validation

6. **`src/app/provider-verification/verification-status.tsx`** - MEDIUM PRIORITY
   - Multiple useEffect patterns
   - Status polling logic needs React Query

### **COMPONENT FIXES**
7. **`src/components/providers/StripeOnboardingComplete.tsx`** - LOW PRIORITY
   - Has useEffect for navigation logic
   - Simple fix - use immediate logic

8. **`src/components/providers/PaymentSetupStatusCard.tsx`** - LOW PRIORITY
   - Already has React Query hook but still uses useEffect
   - Remove remaining useEffect pattern

9. **`src/components/profile/StripeIntegrationModal.tsx`** - LOW PRIORITY
   - Has useEffect patterns for status checking
   - Needs React Query migration

### **MINOR FIXES**
10. **`src/app/provider/index.tsx`** - LOW PRIORITY
    - Has one useEffect for analytics
    - Simple removal

11. **`src/app/customer/profile.tsx`** - LOW PRIORITY
    - Has 2 useEffect patterns for UI state
    - Simple removal

## 🏗️ Architecture Patterns to Apply

### **1. Search & Filters (customer/search.tsx)**
```tsx
// ❌ CURRENT: useState + useEffect hell
const [searchQuery, setSearchQuery] = useState('');
const [filters, setFilters] = useState<SearchFilters>({...});
useEffect(() => { /* search logic */ }, [searchQuery]);

// ✅ TARGET: Zustand + React Query
const { searchQuery, filters, setSearchQuery, setFilters } = useSearchStore();
const { data: searchResults, isLoading } = useSearchProviders(searchQuery, filters);
```

### **2. Provider Verification (_layout.tsx)**
```tsx
// ❌ CURRENT: useEffect for status checks
useEffect(() => {
  checkVerificationStatus();
}, []);

// ✅ TARGET: React Query with polling
const { data: verificationStatus } = useVerificationStatus(userId, {
  refetchInterval: 30000, // Poll every 30s
});
```

### **3. Earnings Page (earnings.tsx)**
```tsx
// ❌ CURRENT: useState + useEffect
const [stripeStatus, setStripeStatus] = useState<any>(null);
useEffect(() => { fetchStripeStatus(); }, []);

// ✅ TARGET: React Query
const { data: stripeStatus } = useStripeAccountStatus();
const { data: earnings } = useEarnings();
```

## 🎯 Migration Strategy

### **Step 1: Create Zustand Stores**
```bash
# Create specialized stores
src/stores/customer/search-store.ts      # Search state management
src/stores/provider/verification-store.ts # Verification progress
src/stores/provider/earnings-store.ts     # Earnings preferences
```

### **Step 2: Create React Query Hooks**
```bash
# Create data fetching hooks
src/hooks/customer/useSearchProviders.ts    # Provider search with filters
src/hooks/provider/useVerificationStatus.ts # Verification status polling
src/hooks/provider/useEarnings.ts           # Earnings data
src/hooks/provider/useStripeAccountStatus.ts # Stripe account status
```

### **Step 3: Create Form Validation Schemas**
```bash
# Add to existing validation system
src/lib/validation/providerSchemas.ts    # Provider verification forms
src/lib/validation/searchSchemas.ts      # Search filter validation
```

### **Step 4: Migration Order (Execute in Sequence)**
1. **customer/search.tsx** - Biggest impact, core customer feature
2. **provider/_layout.tsx** - Core provider flow guard
3. **provider/earnings.tsx** - Important provider feature
4. **provider-verification/_layout.tsx** - Verification flow
5. **provider-verification/services.tsx** - Service selection
6. **verification-status.tsx** - Status monitoring
7. **Component cleanup** - Remove remaining useEffect patterns

## 🚀 Benefits After Migration

### **Performance Improvements**
- ✅ Automatic background refetching with React Query
- ✅ Optimized re-renders with proper Zustand selectors  
- ✅ Cached data reduces API calls
- ✅ Eliminated unnecessary useEffect reruns

### **Developer Experience**
- ✅ Consistent patterns across entire codebase
- ✅ Type-safe forms with React Hook Form + Zod
- ✅ Predictable state management with Zustand
- ✅ Automatic loading/error states from React Query

### **Code Quality**
- ✅ No more useState + useEffect anti-patterns
- ✅ Follows copilot-rules.md requirements
- ✅ Better separation of concerns
- ✅ Easier testing and debugging

## 📊 Current Status

**Files with useEffect patterns remaining:** 12
**Critical path files:** 3 (provider layout, customer search, provider earnings)
**Component fixes:** 3
**Minor cleanups:** 6

**Estimated effort:** 2-3 development sessions for complete migration

## 🎪 Next Steps

1. **Run this cleanup first:**
   ```bash
   # Remove any remaining duplicate files
   Remove-Item "src\utils\storage-test.ts" -Force -ErrorAction SilentlyContinue
   Remove-Item "src\utils\clear-app-data.ts" -Force -ErrorAction SilentlyContinue
   ```

2. **Start with customer/search.tsx migration** (highest impact)
3. **Migrate provider/_layout.tsx** (core provider flow)
4. **Complete remaining files in priority order**
5. **Final verification with TypeScript compilation**
6. **Update documentation for team**

This plan ensures the complete elimination of all useEffect + useState anti-patterns while maintaining the app's functionality and improving performance.
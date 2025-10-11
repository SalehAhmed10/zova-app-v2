# 📋 AUTH & ROUTING FILES - QUICK REFERENCE

## 🗂️ Complete File Listing

### 🔵 **AUTHENTICATION CORE**

```
📁 src/hooks/shared/
  ├── ✅ useAuthPure.ts (Main auth hook - React Query)
  ├── ✅ useAuthListener.ts (Supabase listener - useEffect OK)
  ├── ⚠️ useAuthNavigation.ts (Navigation logic - NEEDS REFACTOR)
  ├── ⚠️ useNavigationDecision.ts (Duplicate logic - MERGE)
  ├── ✅ usePendingRegistration.ts (Registration completion)
  └── ✅ useProfileData.ts (Profile queries)

📁 src/lib/auth/
  ├── ✅ profile.ts (Database operations)
  ├── ⚠️ auth-context.tsx (REDUNDANT - consider removing)
  ├── ⚠️ app-auth-manager.ts (UNUSED? - investigate)
  └── ✅ index.ts (Exports)

📁 src/stores/auth/
  ├── ✅ app.ts (Global auth store - Zustand)
  └── ✅ index.ts (Exports)

📁 src/stores/verification/
  ├── ✅ useProfileStore.ts (Profile verification status)
  ├── ✅ provider-verification.ts (Verification flow data)
  ├── ✅ useVerificationStatusStore.ts (Status sync)
  └── ✅ usePaymentSetupStore.ts (Payment onboarding)
```

---

### 🟢 **ROUTING & NAVIGATION**

```
📁 src/app/
  ├── 🔴 _layout.tsx (ROOT LAYOUT - complex, needs cleanup)
  └── ✅ index.tsx (Entry point)

📁 src/app/auth/
  ├── ✅ _layout.tsx (Auth layout guard)
  ├── ✅ index.tsx (Login screen)
  ├── ✅ register.tsx (Registration)
  └── ✅ otp-verification.tsx (Email verification)

📁 src/app/customer/
  ├── ✅ _layout.tsx (Customer layout guard)
  ├── ✅ index.tsx (Customer dashboard)
  ├── ✅ search.tsx (Provider search)
  ├── ✅ bookings.tsx (Booking history)
  ├── ✅ profile.tsx (Customer profile)
  ├── ✅ messages.tsx (Chat)
  └── ✅ subscriptions.tsx (Subscription management)

📁 src/app/provider/
  ├── ✅ _layout.tsx (Provider layout guard)
  ├── ✅ index.tsx (Provider dashboard)
  ├── ✅ bookings.tsx (Booking management)
  ├── ✅ calendar.tsx (Availability calendar)
  ├── ✅ earnings.tsx (Earnings overview)
  └── ✅ profile.tsx (Provider profile)

📁 src/app/provider-verification/
  ├── ⚠️ _layout.tsx (Verification guard - complex)
  ├── ✅ index.tsx (Document upload)
  ├── ✅ selfie.tsx (Selfie verification)
  ├── ✅ business-info.tsx (Business details)
  ├── ✅ category.tsx (Service category)
  ├── ✅ services.tsx (Service offerings)
  ├── ✅ portfolio.tsx (Portfolio images)
  ├── ✅ bio.tsx (Business description)
  ├── ✅ terms.tsx (Terms acceptance)
  ├── ✅ complete.tsx (Completion screen)
  └── 🔴 verification-status.tsx (Status dashboard - recently redesigned)

📁 src/app/onboarding/
  ├── ✅ _layout.tsx (Onboarding layout)
  └── ✅ index.tsx (Role selection)
```

---

### 🟡 **PROVIDER-SPECIFIC HOOKS**

```
📁 src/hooks/provider/
  ├── ✅ useProviderAccess.ts (Access control)
  ├── ✅ useProviderProfile.ts (Profile queries)
  ├── ✅ useProviderVerificationQueries.ts (Verification data)
  ├── ✅ useVerificationStatusPure.ts (Status queries)
  ├── ✅ useStatusChangeMonitor.ts (Real-time updates)
  ├── ✅ useBookings.ts (Booking management)
  ├── ✅ usePendingBookings.ts (Pending requests)
  ├── ✅ useAcceptBooking.ts (Accept mutation)
  ├── ✅ useDeclineBooking.ts (Decline mutation)
  ├── ✅ useProviderBookingDetail.ts (Booking details)
  ├── ✅ usePaymentStatus.ts (Stripe status)
  └── ✅ useStripeAccountStatus.ts (Stripe onboarding)
```

---

### 🟠 **CUSTOMER-SPECIFIC HOOKS**

```
📁 src/hooks/customer/
  ├── ✅ useSearch.ts (Provider/service search)
  ├── ✅ useSearchOptimized.ts (Optimized search)
  ├── ✅ useProviderDetails.ts (Provider profile)
  ├── ✅ useServiceDetails.ts (Service details)
  ├── ✅ useProviderAvailability.ts (Availability check)
  ├── ✅ useBookings.ts (Booking history)
  ├── ✅ useCancelBooking.ts (Cancel mutation)
  ├── ✅ useCreateSOSBooking.ts (Emergency booking)
  ├── ✅ useFavorites.ts (Favorite providers)
  ├── ✅ useUserReviews.ts (Review management)
  └── ✅ useReviewPrompt.ts (Review prompts)
```

---

### 🔧 **VERIFICATION SYSTEM**

```
📁 src/hooks/verification/
  ├── ✅ useVerificationNavigation.ts (Verification routing)
  ├── ✅ useVerificationSessionRecovery.ts (Session recovery)
  ├── ✅ useVerificationStateInitializer.ts (State init)
  ├── ✅ useConflictResolution.ts (Conflict handling)
  ├── ✅ server-queries.ts (Database queries)
  └── ✅ verification-flow.ts (Flow logic)

📁 src/lib/verification/
  ├── ✅ verification-flow-manager.ts (Flow control)
  └── ✅ admin-status-management.ts (Admin functions)

📁 src/components/verification/
  ├── ✅ SessionRecoveryBanner.tsx (Recovery UI)
  ├── ✅ ConflictResolutionModal.tsx (Conflict UI)
  └── ✅ VerificationHeader.tsx (Header component)
```

---

## 🎯 File Categories by Purpose

### **Authentication**
| File | Purpose | Status |
|------|---------|--------|
| useAuthPure.ts | Main auth hook | ✅ Clean |
| useAuthListener.ts | Auth state listener | ✅ Fixed |
| profile.ts | Profile CRUD | ✅ Clean |
| app.ts | Global auth store | ✅ Clean |

### **Navigation**
| File | Purpose | Status |
|------|---------|--------|
| useAuthNavigation.ts | Route computation | 🔴 Complex |
| useNavigationDecision.ts | Route decisions | ⚠️ Redundant |
| _layout.tsx (root) | App layout | 🔴 Complex |
| NavigationManager (proposed) | Single source | 🆕 Needed |

### **Layout Guards**
| File | Purpose | Status |
|------|---------|--------|
| auth/_layout.tsx | Auth guard | ✅ Clean |
| customer/_layout.tsx | Customer guard | ✅ Clean |
| provider/_layout.tsx | Provider guard | ✅ Clean |
| provider-verification/_layout.tsx | Verification guard | ⚠️ Complex |

### **User Management**
| File | Purpose | Status |
|------|---------|--------|
| useProfileData.ts | Profile queries | ✅ Clean |
| useProfileStore.ts | Profile store | ✅ Clean |
| usePendingRegistration.ts | Registration flow | ✅ Clean |

---

## 🚦 Status Legend

- ✅ **Clean** - Well-structured, no changes needed
- ⚠️ **Needs Attention** - Works but could be improved
- 🔴 **Urgent Refactor** - High complexity, technical debt
- 🆕 **To Be Created** - Proposed new file
- ❌ **Remove** - Dead code or redundant

---

## 📊 Statistics

### Current State
- **Total Auth Files**: 25+
- **Total LOC**: ~3,000+
- **useEffect Count**: 8+
- **React Query Hooks**: 15+
- **Zustand Stores**: 3
- **Navigation Decision Points**: 5+

### Complexity Breakdown
| Category | Files | Complexity |
|----------|-------|------------|
| Core Auth | 8 | Medium (6/10) |
| Navigation | 4 | High (8/10) |
| Layout Guards | 6 | Medium (6/10) |
| Provider Hooks | 15 | Low-Medium (4/10) |
| Customer Hooks | 11 | Low (3/10) |
| Verification | 10 | Medium-High (7/10) |

---

## 🔄 Migration Path

### Phase 1: Critical Fixes ✅
- [x] Fix provider role mismatch
- [x] Add defensive role verification
- [x] Database migration for consistency
- [ ] Test provider login flow

### Phase 2: Consolidation 🔄
- [ ] Create NavigationManager class
- [ ] Merge useAuthNavigation + useNavigationDecision
- [ ] Remove SessionContext redundancy
- [ ] Clean _layout.tsx useEffect patterns

### Phase 3: Optimization 📈
- [ ] Lazy load verification data
- [ ] Reduce React Query key complexity
- [ ] Memoize expensive computations
- [ ] Remove unused app-auth-manager.ts

### Phase 4: Documentation 📚
- [ ] Add architecture diagrams
- [ ] Write integration tests
- [ ] Create developer guide
- [ ] Performance benchmarks

---

## 🎓 Best Practices Checklist

### ✅ **DO**
- Use React Query for server state (auth, profiles, bookings)
- Use Zustand for global client state (UI, settings, auth status)
- Use useMemo/useCallback for expensive computations
- Keep components pure and focused
- Test navigation flows thoroughly

### ❌ **DON'T**
- Use useState for server data (use React Query)
- Use useEffect for data fetching (use React Query)
- Duplicate navigation logic across files
- Hardcode role checks in multiple places
- Mix auth logic with UI components

### 🎯 **FOLLOW**
- copilot-rules.md patterns (React Query + Zustand)
- Single source of truth principle
- Defensive programming (role verification)
- Self-healing systems (auto-fix inconsistencies)
- Pure functions over side effects

---

## 📞 Quick Commands

### Find Auth Usage
```bash
# Find all auth-related imports
rg "useAuth" --type ts --type tsx

# Find navigation logic
rg "router\.(push|replace)" --type ts --type tsx

# Find role checks
rg "userRole.*===.*'(customer|provider)'" --type ts --type tsx
```

### Check for useEffect
```bash
# Find all useEffect usage (should be minimal)
rg "useEffect\(" --type ts --type tsx -A 2
```

### Find Zustand Stores
```bash
# Find all store definitions
rg "create<.*Store>" --type ts
```

---

## 🏁 Summary

**Total Files Analyzed**: 50+  
**Critical Issues**: 2 (Navigation scatter, useEffect overuse)  
**Medium Issues**: 3 (Redundancy, complexity, optimization)  
**Minor Issues**: 5 (Dead code, documentation)  

**Recommendation**: Proceed with **Phase 1 Consolidation** after testing current provider login fix.

**Estimated Refactor**: 2-3 days for Phase 1, 1 week total

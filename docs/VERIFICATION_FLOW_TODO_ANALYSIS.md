# Verification Flow TODO Items Analysis

**Date**: October 11, 2025  
**File**: `src/hooks/verification/verification-flow.ts`  
**Status**: 🟡 3 TODO items requiring server sync implementation

---

## 📋 Overview

The verification flow has **3 TODO items** related to server synchronization. These are intentional placeholders for server-side operations that were designed but not yet implemented.

**Current State:**
- ✅ Local Zustand state management - **Working**
- ✅ React Query hooks for server operations - **Already exist**
- ❌ Integration between local actions and server sync - **TODO items**

---

## 🎯 The 3 TODO Items

### 1. **TODO: Create server session and sync** (Line 92)

**Location:**
```typescript
// File: src/hooks/verification/verification-flow.ts
initializeSession: async (deviceFingerprint?: string) => {
  await store.initializeSession(deviceFingerprint);
  // TODO: Create server session and sync
},
```

**What's Missing:**
```typescript
// Currently: Only updates local Zustand store
// Needed: Create server session record

// SOLUTION:
initializeSession: async (deviceFingerprint?: string) => {
  // 1. Initialize local session
  await store.initializeSession(deviceFingerprint);
  
  // 2. Create server session
  const createSessionMutation = useCreateVerificationSession();
  const session = await createSessionMutation.mutateAsync({
    providerId: store.providerId,
    deviceFingerprint,
    ipAddress: await getDeviceIpAddress(),
    userAgent: navigator.userAgent,
  });
  
  // 3. Update local store with server session ID
  if (session) {
    store.updateSessionId(session.session_id);
  }
},
```

**Why It Matters:**
- Server needs to track active verification sessions
- Enables session recovery across devices
- Required for admin monitoring and support
- Currently: Sessions only exist in local app state

**Server Hook Already Exists:** ✅
```typescript
// src/hooks/verification/server-queries.ts (Line 15)
export const useCreateVerificationSession = () => {
  return useMutation({
    mutationFn: async (data: {
      providerId: string;
      deviceFingerprint?: string;
      ipAddress?: string;
      userAgent?: string;
    }) => {
      const { data: session, error } = await supabase
        .from('provider_verification_sessions')
        .insert({ ...data })
        .select()
        .single();
      // ... error handling
    },
  });
};
```

---

### 2. **TODO: Sync completion with server** (Line 97)

**Location:**
```typescript
// File: src/hooks/verification/verification-flow.ts
completeStep: (stepNumber: number, data?: any) => {
  store.completeStep(stepNumber, data);
  // TODO: Sync completion with server
},
```

**What's Missing:**
```typescript
// Currently: Only updates local Zustand store
// Needed: Persist step completion to database

// SOLUTION:
completeStep: async (stepNumber: number, data?: any) => {
  // 1. Complete step locally
  store.completeStep(stepNumber, data);
  
  // 2. Sync to server
  const updateStepMutation = useUpdateStepProgress();
  await updateStepMutation.mutateAsync({
    sessionId: store.sessionId,
    stepNumber,
    status: 'completed',
    data,
    validationErrors: [],
  });
  
  // 3. Update onboarding progress
  const updateOnboardingMutation = useUpdateOnboardingProgress();
  await updateOnboardingMutation.mutateAsync({
    providerId: store.providerId,
    currentStep: stepNumber + 1, // Move to next step
    completedSteps: [...store.completedSteps, stepNumber],
  });
},
```

**Why It Matters:**
- Step completion must persist to database
- Enables progress recovery if app closes
- Required for admin verification status tracking
- Allows resuming from any device
- Currently: Progress lost if app is closed before full completion

**Server Hooks Already Exist:** ✅
```typescript
// src/hooks/verification/server-queries.ts

// Hook 1: Update step progress (Line 145)
export const useUpdateStepProgress = () => {
  return useMutation({
    mutationFn: async (data: {
      sessionId: string;
      stepNumber: number;
      status?: string;
      data?: any;
      validationErrors?: string[];
    }) => {
      const { data: result, error } = await supabase
        .from('provider_verification_step_progress')
        .upsert({ ...data })
        .select()
        .single();
      // ...
    },
  });
};

// Hook 2: Update onboarding progress (Line 193)
export const useUpdateOnboardingProgress = () => {
  return useMutation({
    mutationFn: async (data: {
      providerId: string;
      currentStep?: number;
      completedSteps?: number[];
      // ... other fields
    }) => {
      const { data: result, error } = await supabase
        .from('provider_onboarding_progress')
        .update({ ...data })
        .eq('provider_id', data.providerId);
      // ...
    },
  });
};
```

---

### 3. **TODO: Acquire server lock** (Line 103)

**Location:**
```typescript
// File: src/hooks/verification/verification-flow.ts
acquireStepLock: async (stepNumber: number) => {
  const localLock = await store.acquireStepLock(stepNumber);
  if (localLock) {
    // TODO: Acquire server lock
    return true;
  }
  return false;
},
```

**What's Missing:**
```typescript
// Currently: Only locks step in local Zustand store
// Needed: Distributed lock in database to prevent concurrent editing

// SOLUTION:
acquireStepLock: async (stepNumber: number) => {
  // 1. Try to acquire local lock
  const localLock = await store.acquireStepLock(stepNumber);
  if (!localLock) {
    return false; // Already locked locally
  }
  
  // 2. Try to acquire server lock
  const acquireLockMutation = useAcquireStepLock();
  const serverLock = await acquireLockMutation.mutateAsync({
    sessionId: store.sessionId,
    stepNumber,
    lockDuration: 30, // 30 minutes
  });
  
  // 3. If server lock fails, release local lock
  if (!serverLock) {
    store.releaseStepLock(stepNumber);
    return false;
  }
  
  return true;
},
```

**Why It Matters:**
- Prevents data corruption from concurrent edits
- Critical for multi-device scenarios
- Protects against race conditions
- Required for admin intervention workflows
- Currently: Two devices could edit the same step simultaneously

**Example Scenario Without Server Lock:**
```
Device A: User starts editing step 3 on phone
Device B: User opens same step on tablet
Both save simultaneously → Data corruption!
```

**Server Hooks Already Exist:** ✅
```typescript
// src/hooks/verification/server-queries.ts

// Hook 1: Acquire lock (Line 100)
export const useAcquireStepLock = () => {
  return useMutation({
    mutationFn: async (data: { 
      sessionId: string; 
      stepNumber: number; 
      lockDuration?: number 
    }) => {
      const { data: result, error } = await supabase.rpc('acquire_step_lock', {
        p_session_id: data.sessionId,
        p_step_number: data.stepNumber,
        p_lock_duration_minutes: data.lockDuration || 30,
      });
      // ...
    },
  });
};

// Hook 2: Release lock (Line 125)
export const useReleaseStepLock = () => {
  return useMutation({
    mutationFn: async (data: { sessionId: string; stepNumber: number }) => {
      const { data: result, error } = await supabase.rpc('release_step_lock', {
        p_session_id: data.sessionId,
        p_step_number: data.stepNumber,
      });
      // ...
    },
  });
};
```

---

## 📊 Impact Assessment

### Current Behavior (Without TODOs Implemented):

| Feature | Works Locally? | Persists? | Multi-Device? | Risk Level |
|---------|---------------|-----------|---------------|------------|
| **Session Creation** | ✅ Yes | ❌ No | ❌ No | 🟡 Medium |
| **Step Completion** | ✅ Yes | ❌ No | ❌ No | 🔴 High |
| **Step Locking** | ✅ Yes | ❌ No | ❌ No | 🟡 Medium |

### With TODOs Implemented:

| Feature | Works Locally? | Persists? | Multi-Device? | Risk Level |
|---------|---------------|-----------|---------------|------------|
| **Session Creation** | ✅ Yes | ✅ Yes | ✅ Yes | 🟢 Low |
| **Step Completion** | ✅ Yes | ✅ Yes | ✅ Yes | 🟢 Low |
| **Step Locking** | ✅ Yes | ✅ Yes | ✅ Yes | 🟢 Low |

---

## 🚨 Critical User Impact

### **Issue 1: Lost Progress on App Close**
```
User Flow WITHOUT Server Sync:
1. User completes steps 1-5 ✅
2. App crashes or user closes app ❌
3. User reopens app 🔄
4. Progress shows step 1 again ❌❌❌

Result: User must redo all steps!
```

### **Issue 2: Multi-Device Chaos**
```
User Flow WITHOUT Server Lock:
1. User starts verification on phone 📱
2. User opens same step on tablet 📲
3. Both devices save different data ⚠️
4. Database has inconsistent state ❌

Result: Corrupted verification data!
```

### **Issue 3: No Admin Visibility**
```
Admin Dashboard WITHOUT Server Sessions:
- Cannot see active verification sessions ❌
- Cannot track step-by-step progress ❌
- Cannot help stuck users ❌
- No verification analytics ❌

Result: Poor support experience!
```

---

## 🎯 Implementation Priority

### **Priority Level: 🔴 HIGH** 

**Why?**
1. **Data Loss Risk**: Users lose progress if app closes
2. **Corruption Risk**: Concurrent edits cause data conflicts
3. **Support Impact**: Admins can't help stuck users
4. **User Experience**: Forces users to redo completed steps

### **Suggested Implementation Order:**

#### **Phase 1: Step Completion Sync (Most Critical)** 🔴
**Estimated Time:** 2-3 hours  
**Impact:** HIGH - Prevents data loss

```typescript
// Implementation Steps:
1. Update completeStep function to use useUpdateStepProgress mutation
2. Add error handling for server sync failures
3. Implement optimistic updates in React Query
4. Add retry logic for failed syncs
5. Test with network interruptions
```

#### **Phase 2: Session Creation** 🟡
**Estimated Time:** 1-2 hours  
**Impact:** MEDIUM - Enables tracking and recovery

```typescript
// Implementation Steps:
1. Update initializeSession to use useCreateVerificationSession mutation
2. Store server session ID in Zustand store
3. Update session activity every 30 seconds
4. Handle session expiration gracefully
5. Test multi-device scenarios
```

#### **Phase 3: Step Locking** 🟡
**Estimated Time:** 2-3 hours  
**Impact:** MEDIUM - Prevents concurrent edit conflicts

```typescript
// Implementation Steps:
1. Update acquireStepLock to use useAcquireStepLock mutation
2. Update releaseStepLock to use useReleaseStepLock mutation
3. Add lock expiration handling (30 min timeout)
4. Implement automatic lock renewal for active users
5. Add UI indicators for locked steps
6. Test lock acquisition failures
```

---

## 🛠️ Implementation Code Samples

### Complete Implementation for TODO #2 (Step Completion)

```typescript
// File: src/hooks/verification/verification-flow.ts

import { useUpdateStepProgress, useUpdateOnboardingProgress } from './server-queries';

export const useVerificationFlow = () => {
  const store = useProviderVerificationStore();
  const serverState = useVerificationSync();
  
  // Get mutation hooks
  const updateStepMutation = useUpdateStepProgress();
  const updateOnboardingMutation = useUpdateOnboardingProgress();

  // ... existing code ...

  return {
    // ... existing returns ...

    // ✅ FIXED: Complete step with server sync
    completeStep: async (stepNumber: number, data?: any) => {
      try {
        // 1. Optimistic update: Update local state immediately
        store.completeStep(stepNumber, data);

        // 2. Sync to server: Update step progress
        await updateStepMutation.mutateAsync({
          sessionId: store.sessionId!,
          stepNumber,
          status: 'completed',
          data,
          validationErrors: [],
        });

        // 3. Update onboarding progress
        const nextStep = stepNumber + 1;
        const completedSteps = [...(store.completedSteps || []), stepNumber];
        
        await updateOnboardingMutation.mutateAsync({
          providerId: store.providerId!,
          currentStep: nextStep,
          completedSteps,
          lastCompletedAt: new Date().toISOString(),
        });

        // 4. Success! Progress is now persisted
        return { success: true };

      } catch (error) {
        // 5. Rollback on error
        console.error('Failed to sync step completion:', error);
        
        // Optionally: Revert local state or queue for retry
        // For now, we keep optimistic update and let React Query retry
        
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        };
      }
    },
  };
};
```

### Complete Implementation for TODO #1 (Session Creation)

```typescript
// File: src/hooks/verification/verification-flow.ts

import { useCreateVerificationSession, useUpdateSessionActivity } from './server-queries';

export const useVerificationFlow = () => {
  const store = useProviderVerificationStore();
  const createSessionMutation = useCreateVerificationSession();
  const updateActivityMutation = useUpdateSessionActivity();

  return {
    // ... existing returns ...

    // ✅ FIXED: Initialize session with server sync
    initializeSession: async (deviceFingerprint?: string) => {
      try {
        // 1. Initialize local session first
        await store.initializeSession(deviceFingerprint);

        // 2. Create server session
        const session = await createSessionMutation.mutateAsync({
          providerId: store.providerId!,
          deviceFingerprint,
          ipAddress: await getDeviceIpAddress(), // Helper function
          userAgent: getDeviceUserAgent(), // Helper function
        });

        // 3. Update local store with server session ID
        if (session) {
          store.setSessionId(session.session_id);
          
          // 4. Set up periodic activity updates
          const intervalId = setInterval(async () => {
            if (store.sessionId && store.currentSession?.isActive) {
              await updateActivityMutation.mutateAsync(store.sessionId);
            }
          }, 30000); // Every 30 seconds

          // Store interval ID for cleanup
          store.setActivityUpdateInterval(intervalId);
        }

        return { success: true, sessionId: session.session_id };

      } catch (error) {
        console.error('Failed to create server session:', error);
        // Keep local session active even if server fails
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error',
          sessionId: store.sessionId // Return local session ID
        };
      }
    },
  };
};

// Helper functions
const getDeviceIpAddress = async (): Promise<string | undefined> => {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
  } catch {
    return undefined;
  }
};

const getDeviceUserAgent = (): string => {
  return navigator.userAgent || 'Unknown';
};
```

### Complete Implementation for TODO #3 (Step Locking)

```typescript
// File: src/hooks/verification/verification-flow.ts

import { useAcquireStepLock, useReleaseStepLock } from './server-queries';

export const useVerificationFlow = () => {
  const store = useProviderVerificationStore();
  const acquireLockMutation = useAcquireStepLock();
  const releaseLockMutation = useReleaseStepLock();

  return {
    // ... existing returns ...

    // ✅ FIXED: Acquire step lock with server sync
    acquireStepLock: async (stepNumber: number) => {
      try {
        // 1. Try to acquire local lock first (fast check)
        const localLock = await store.acquireStepLock(stepNumber);
        if (!localLock) {
          return { 
            success: false, 
            reason: 'already_locked_locally' 
          };
        }

        // 2. Try to acquire server lock (distributed lock)
        const serverLock = await acquireLockMutation.mutateAsync({
          sessionId: store.sessionId!,
          stepNumber,
          lockDuration: 30, // 30 minutes
        });

        // 3. If server lock fails, release local lock and abort
        if (!serverLock) {
          store.releaseStepLock(stepNumber);
          return { 
            success: false, 
            reason: 'already_locked_by_other_session' 
          };
        }

        // 4. Success! Step is locked on both client and server
        return { success: true };

      } catch (error) {
        console.error('Failed to acquire step lock:', error);
        // Release local lock on error
        store.releaseStepLock(stepNumber);
        
        return { 
          success: false, 
          reason: 'lock_error',
          error: error instanceof Error ? error.message : 'Unknown error' 
        };
      }
    },

    // Release step lock (also needs server sync)
    releaseStepLock: async (stepNumber: number) => {
      try {
        // 1. Release local lock
        store.releaseStepLock(stepNumber);

        // 2. Release server lock
        await releaseLockMutation.mutateAsync({
          sessionId: store.sessionId!,
          stepNumber,
        });

        return { success: true };

      } catch (error) {
        console.error('Failed to release step lock:', error);
        // Local lock is already released, server lock will expire
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        };
      }
    },
  };
};
```

---

## 🧪 Testing Requirements

### Unit Tests Needed:

```typescript
// tests/verification-flow.test.ts

describe('Verification Flow - Server Sync', () => {
  test('completeStep syncs to server and updates onboarding progress', async () => {
    // Test TODO #2
  });

  test('initializeSession creates server session record', async () => {
    // Test TODO #1
  });

  test('acquireStepLock prevents concurrent edits', async () => {
    // Test TODO #3
  });

  test('handles network failures gracefully', async () => {
    // Test offline scenarios
  });
});
```

### Integration Tests Needed:

1. **Multi-device scenario**: Verify two devices can't edit same step
2. **Network interruption**: Ensure retry logic works
3. **Session recovery**: Close app and verify progress persists
4. **Lock expiration**: Test 30-minute timeout behavior

---

## 📝 Additional TODOs Found

While analyzing, I found **1 more TODO** in a different file:

### **TODO #4: Add yearsOfExperience field to Edge function**

**Location:**
```typescript
// File: src/hooks/customer/useSearchOptimized.ts (Line 57)
yearsOfExperience: 0, // TODO: Add this field to Edge function
```

**What's Missing:**
The `find-sos-providers` Edge function doesn't return `yearsOfExperience` field, so it's hardcoded to 0.

**Fix Required:**
```typescript
// Update supabase/functions/find-sos-providers/index.ts
// Add years_of_experience to SELECT statement
```

**Impact:** 🟡 Medium - Search results show all providers with 0 years experience

---

## 🎯 Summary

### Total TODOs: **4 items**

| # | Item | File | Priority | Estimated Time |
|---|------|------|----------|----------------|
| 1 | Create server session | verification-flow.ts | 🟡 Medium | 1-2 hours |
| 2 | Sync step completion | verification-flow.ts | 🔴 **HIGH** | 2-3 hours |
| 3 | Acquire server lock | verification-flow.ts | 🟡 Medium | 2-3 hours |
| 4 | Add yearsOfExperience | useSearchOptimized.ts | 🟢 Low | 30 mins |

### Total Implementation Time: **~6-9 hours**

---

## ✅ Ready to Implement?

All the infrastructure is already in place:
- ✅ Database tables exist
- ✅ React Query hooks exist
- ✅ Supabase RPC functions exist
- ✅ Error handling patterns established

**Just need to wire them together!**

Would you like me to implement these TODOs now? I can do them one at a time with full testing. 🚀

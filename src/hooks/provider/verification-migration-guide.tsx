/**
 * ✅ MIGRATION GUIDE: From Dual-Tracking to Single-Source Verification
 *
 * PROBLEM SOLVED: Eliminates sync issues between Zustand store and database
 * SOLUTION: Database as Single Source of Truth with React Query + Real-time
 *
 * MIGRATION STEPS:
 * 1. Replace Zustand store usage with React Query hooks
 * 2. Update components to use new data structure
 * 3. Enable real-time subscriptions
 * 4. Remove old Zustand store (after migration complete)
 */

import React from 'react';
import { useVerificationData, useUpdateStepCompletion, useVerificationRealtime } from './useVerificationSingleSource';

/**
 * ✅ BEFORE: Old dual-tracking approach (PROBLEMATIC)
 */
const OldVerificationComponent = () => {
  // const { user } = useUserStore();
  // const { currentStep, steps, updateStep } = useProviderVerificationStore();

  // ❌ Race conditions, sync issues, manual polling
  const handleStepComplete = async (stepNumber: number) => {
    // await updateStep(stepNumber, true); // Updates store
    // Database update happens separately - potential sync issues!
  };

  return <div>Current step: currentStep</div>;
};

/**
 * ✅ AFTER: New single-source approach (SOLUTION)
 */
const NewVerificationComponent = () => {
  // const { user } = useUserStore();
  const { data, isLoading, error } = useVerificationData('user-id');
  const updateStepMutation = useUpdateStepCompletion();

  // ✅ Real-time subscriptions automatically update UI
  useVerificationRealtime('user-id');

  const handleStepComplete = async (stepNumber: number, stepData?: any) => {
    await updateStepMutation.mutateAsync({
      providerId: 'user-id',
      stepNumber,
      completed: true,
      data: stepData
    });
    // ✅ Database is updated atomically, UI updates automatically
  };

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <div>Current step: {data?.progress?.current_step}</div>
      <div>Status: {data?.progress?.verification_status}</div>
      {/* ✅ All data is consistent and real-time */}
    </div>
  );
};

/**
 * COMPONENT MIGRATION MAPPING
 * Replace old Zustand hooks with new React Query hooks
 */

// ❌ OLD: Zustand store hooks
// import { useProviderVerificationStore } from '@/stores/provider-verification';
// const { currentStep, steps, updateStep, verificationStatus } = useProviderVerificationStore();

// ✅ NEW: React Query hooks
// import { useVerificationData, useUpdateStepCompletion, useVerificationRealtime } from '@/hooks/provider/useVerificationSingleSource';
// const { data, isLoading, error } = useVerificationData(user?.id);
// const updateMutation = useUpdateStepCompletion();
// useVerificationRealtime(user?.id);

/**
 * DATA STRUCTURE CHANGES
 */

// ❌ OLD: Zustand store structure
interface OldStoreState {
  currentStep: number;
  steps: Record<string, { isCompleted: boolean; data: any }>;
  verificationStatus: string;
  updateStep: (step: number, completed: boolean) => Promise<void>;
}

// ✅ NEW: React Query data structure
interface NewDataStructure {
  progress: {
    id: string;
    provider_id: string;
    current_step: number;
    steps_completed: Record<string, boolean>; // Simplified boolean structure
    verification_status: 'pending' | 'in_progress' | 'in_review' | 'approved' | 'rejected';
    started_at: string;
    completed_at?: string;
    approved_at?: string;
    rejected_at?: string;
    rejection_reason?: string;
    created_at: string;
    updated_at: string;
  };
  documents: any[];
  portfolio: any[];
  services: any[];
  businessTerms: any;
  profile: any;
}

/**
 * MIGRATION CHECKLIST
 *
 * Phase 1: Core Components (High Priority)
 * - [ ] verification-status.tsx - Replace Zustand with React Query
 * - [ ] onboarding-step-* components - Update data access patterns
 * - [ ] provider-dashboard.tsx - Use new verification status
 *
 * Phase 2: Supporting Components (Medium Priority)
 * - [ ] admin-status-management.ts - Update to use new mutations
 * - [ ] provider-onboarding-flow.tsx - Replace store subscriptions
 * - [ ] verification-guard.tsx - Update status checking
 *
 * Phase 3: Cleanup (Low Priority)
 * - [ ] Remove old Zustand store files
 * - [ ] Update all imports
 * - [ ] Remove old mutation hooks
 * - [ ] Test all verification flows
 */

/**
 * TESTING THE MIGRATION
 *
 * 1. Test Data Consistency:
 *    - Complete steps and verify database updates immediately
 *    - Check that UI updates without manual refresh
 *    - Verify real-time updates work across multiple devices
 *
 * 2. Test Error Handling:
 *    - Network failures should rollback optimistic updates
 *    - Invalid data should be rejected with clear errors
 *    - Reconciliation should fix any inconsistencies
 *
 * 3. Test Performance:
 *    - UI should update immediately (optimistic updates)
 *    - No more loading states for step completion
 *    - Real-time subscriptions should be efficient
 */

/**
 * BACKWARD COMPATIBILITY ADAPTERS
 *
 * During migration, use these adapters to maintain compatibility:
 */

// Adapter hook that provides Zustand-like API during migration
export const useVerificationAdapter = (providerId: string | undefined) => {
  const { data, isLoading, error } = useVerificationData(providerId);
  const updateMutation = useUpdateStepCompletion();

  // Provide Zustand-like interface for gradual migration
  return {
    currentStep: data?.progress?.current_step || 1,
    steps: Object.fromEntries(
      Object.entries(data?.progress?.steps_completed || {}).map(([step, completed]) => [
        step,
        { isCompleted: completed, data: null }
      ])
    ),
    verificationStatus: data?.progress?.verification_status || 'in_progress',
    _hasHydrated: !isLoading,
    isLoading,
    error,

    // Adapter methods
    updateStep: async (stepNumber: number, completed: boolean, stepData?: any) => {
      await updateMutation.mutateAsync({
        providerId: providerId!,
        stepNumber,
        completed,
        data: stepData
      });
    },

    getFirstIncompleteStep: () => {
      if (!data?.progress?.steps_completed) return 1;
      for (let i = 1; i <= 8; i++) {
        if (!data.progress.steps_completed[i.toString()]) {
          return i;
        }
      }
      return 9; // All complete
    }
  };
};

/**
 * ROLLBACK PLAN
 *
 * If issues arise during migration:
 * 1. Revert components to use old Zustand store
 * 2. Keep new hooks available for future migration
 * 3. Document issues found during migration attempt
 * 4. Plan improved migration strategy based on learnings
 */

/**
 * SUCCESS METRICS
 *
 * Migration is successful when:
 * - ✅ No more sync issues between store and database
 * - ✅ UI updates immediately on step completion
 * - ✅ Real-time updates work across devices
 * - ✅ Error handling is robust with automatic rollback
 * - ✅ Performance is improved (no more manual polling)
 * - ✅ Code is simpler and more maintainable
 */
/**
 * ✅ VERIFICATION STATE INITIALIZER COMPONENT
 * 
 * PURPOSE: Encapsulates verification state initialization logic
 * PATTERN: Isolated useEffect for initialization side effects
 * EXTRACTED FROM: useVerificationStatusPure.ts
 * 
 * RESPONSIBILITIES:
 * - Determine correct initial step based on store state
 * - Initialize current step when needed
 * - Handle hydration timing
 * - Centralized location for initialization logic
 * 
 * USAGE:
 * <VerificationStateInitializer userId={userId} />
 * 
 * This component automatically handles:
 * 1. Waits for store hydration
 * 2. Loads verification data
 * 3. Finds first incomplete step
 * 4. Updates store with correct step
 */

import React, { useEffect, useMemo, useCallback } from 'react';
import { useVerificationData } from '@/hooks/provider/useVerificationSingleSource';
import { useProviderVerificationStore } from '@/stores/verification/provider-verification';
import { VerificationFlowManager } from '@/lib/verification/verification-flow-manager';

export interface VerificationStateInitializerProps {
  userId: string | undefined;
}

/**
 * Hook: Compute verification initialization state
 * Determines if initialization is needed and what step to set
 */
export const useVerificationStateInitializer = (userId: string | undefined) => {
  const { data: verificationData, isLoading } = useVerificationData(userId);
  const store = useProviderVerificationStore();

  // ✅ PURE COMPUTATION: Determine correct initial step
  const correctInitialStep = useMemo(() => {
    if (!store._hasHydrated || isLoading) return null;

    // Use VerificationFlowManager to find first incomplete step
    const firstIncompleteStep = VerificationFlowManager.findFirstIncompleteStep({
      bioData: store.bioData,
      businessData: store.businessData,
      categoryData: store.categoryData,
      documentData: store.documentData,
      portfolioData: store.portfolioData,
      selfieData: store.selfieData,
      servicesData: store.servicesData,
      termsData: store.termsData
      // ✅ REMOVED: paymentData (step 9 removed - now handled in dashboard)
    });

    return firstIncompleteStep;
  }, [store, isLoading]);

  // ✅ PURE COMPUTATION: Check if initialization is needed
  const needsInitialization = useMemo(() => {
    return correctInitialStep !== null &&
           store.currentStep !== correctInitialStep &&
           store._hasHydrated &&
           !isLoading;
  }, [correctInitialStep, store.currentStep, store._hasHydrated, isLoading]);

  return {
    correctInitialStep,
    needsInitialization,
    initialize: useCallback(() => {
      if (needsInitialization && correctInitialStep !== null) {
        console.log('[VerificationStateInitializer] Setting current step to:', correctInitialStep);
        store.setCurrentStep(correctInitialStep);
      }
    }, [needsInitialization, correctInitialStep, store])
  };
};

/**
 * Component: Encapsulates verification state initialization useEffect
 * Handles verification state initialization without cluttering main components
 */
export const VerificationStateInitializer: React.FC<VerificationStateInitializerProps> = ({
  userId,
}) => {
  const { needsInitialization, initialize } = useVerificationStateInitializer(userId);

  // ✅ ENCAPSULATED useEffect: Initialization side effect isolated here
  useEffect(() => {
    if (needsInitialization) {
      initialize();
    }
  }, [needsInitialization, initialize]);

  // This component renders nothing - it only handles initialization
  return null;
};

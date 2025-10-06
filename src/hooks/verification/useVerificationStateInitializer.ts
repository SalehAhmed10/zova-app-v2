/**
 * ✅ VERIFICATION STATE INITIALIZER
 * Ensures verification state is consistent on app start
 * 
 * Following copilot-instructions.md:
 * - React Query + Zustand architecture
 * - No useEffect in components
 * - Centralized state management
 */

import { useEffect } from 'react';
import { useProviderVerificationStore } from '@/stores/verification/provider-verification';
import { VerificationFlowManager } from '@/lib/verification/verification-flow-manager';

/**
 * ✅ INITIALIZE VERIFICATION STATE
 * Called once on app start to ensure state consistency
 * - Validates current step against actual data
 * - Corrects any inconsistencies
 * - Sets up proper routing state
 */
export const useVerificationStateInitializer = () => {
  const { 
    validateAndResetState, 
    setCurrentStep,
    _hasHydrated,
    documentData,
    selfieData,
    businessData,
    categoryData,
    servicesData,
    portfolioData,
    bioData,
    termsData
  } = useProviderVerificationStore();

  useEffect(() => {
    if (!_hasHydrated) return; // Wait for hydration
    
    console.log('[VerificationStateInitializer] Initializing verification state...');
    
    // First, validate and reset any inconsistent state
    validateAndResetState();
    
    // Get current step from store
    const currentStep = useProviderVerificationStore.getState().currentStep;
    
    // Then, use flow manager to determine correct starting step
    const verificationData = {
      documentData,
      selfieData,
      businessData,
      categoryData,
      servicesData,
      portfolioData,
      bioData,
      termsData
    };
    
    const correctStep = VerificationFlowManager.findFirstIncompleteStep(verificationData);
    
    // ✅ ONLY SET STEP IF:
    // 1. No current step is set (initial load), OR
    // 2. Current step is trying to skip ahead to incomplete steps
    // ❌ DO NOT override if user is on a completed step (allows backward navigation)
    if (!currentStep || currentStep > correctStep) {
      console.log(`[VerificationStateInitializer] Setting current step to: ${correctStep} (was: ${currentStep})`);
      setCurrentStep(correctStep);
    } else {
      console.log(`[VerificationStateInitializer] Keeping current step: ${currentStep} (correct step: ${correctStep})`);
    }
    
  }, [_hasHydrated, validateAndResetState, setCurrentStep, documentData, selfieData, businessData, categoryData, servicesData, portfolioData, bioData, termsData]);

  return {
    isInitialized: _hasHydrated
  };
};
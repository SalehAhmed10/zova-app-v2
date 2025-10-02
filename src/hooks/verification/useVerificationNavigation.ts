/**
 * ✅ VERIFICATION NAVIGATION HOOK
 * Uses centralized VerificationFlowManager as single source of truth
 * Following copilot-instructions.md - React Query + Zustand architecture
 */

import { useMemo } from 'react';
import { useSegments } from 'expo-router';
import { useProviderVerificationStore } from '@/stores/verification/provider-verification';
import { VerificationFlowManager } from '@/lib/verification/verification-flow-manager';

/**
 * ✅ CENTRALIZED: Verification navigation using flow manager
 * All routing logic delegated to single source of truth
 */
export const useVerificationNavigation = () => {
  const segments = useSegments();
  const { 
    completeStepSimple,
    documentData,
    selfieData,
    businessData,
    categoryData,
    servicesData,
    portfolioData,
    bioData,
    termsData
  } = useProviderVerificationStore();

  const navigationInfo = useMemo(() => {
    // ✅ Build current route from segments
    const pathname = '/' + segments.join('/');
    // ✅ Determine current step from current route, not store
    const currentStep = VerificationFlowManager.getStepFromRoute(pathname);
    const currentRoute = VerificationFlowManager.getRouteForStep(currentStep as any);
    const nextStep = VerificationFlowManager.getNextStep(currentStep);
    const previousStep = VerificationFlowManager.getPreviousStep(currentStep);
    
    const nextRoute = nextStep ? VerificationFlowManager.getRouteForStep(nextStep as any) : null;
    const previousRoute = previousStep ? VerificationFlowManager.getRouteForStep(previousStep as any) : null;

    return {
      currentStep,
      currentRoute,
      nextStep,
      nextRoute,
      previousStep, 
      previousRoute,
      canGoNext: nextRoute !== null,
      canGoBack: previousRoute !== null,
    };
  }, [segments]);

  /**
   * ✅ PURE SEQUENTIAL: Navigate to next step (currentStep + 1)
   */
  const navigateNext = () => {
    const nextStep = VerificationFlowManager.getNextStep(navigationInfo.currentStep);
    if (nextStep) {
      VerificationFlowManager.navigateToStep(nextStep, 'user-navigation-next');
    } else {
      console.log('[VerificationNavigation] Verification complete');
      VerificationFlowManager.navigateToStep(9, 'verification-complete');
    }
  };

  /**
   * Navigate to previous step
   */
  const navigateBack = () => {
    const previousStep = VerificationFlowManager.getPreviousStep(navigationInfo.currentStep);
    if (previousStep) {
      VerificationFlowManager.navigateToStep(previousStep, 'user-navigation-back');
    } else {
      console.log('[VerificationNavigation] Already at first step');
    }
  };

  /**
   * Navigate to specific step
   */
  const navigateToStep = (step: number) => {
    VerificationFlowManager.navigateToStep(step, 'user-navigation-direct');
  };

  /**
   * ✅ COMPLETE STEP AND NAVIGATE
   * Uses centralized completion and navigation logic
   */
  const completeCurrentStepAndNavigate = (stepData: any) => {
    return VerificationFlowManager.completeStepAndNavigate(
      navigationInfo.currentStep,
      stepData,
      (step, data) => {
        // Update Zustand store
        completeStepSimple(step, data);
      }
    );
  };

  return {
    ...navigationInfo,
    navigateNext,
    navigateBack,
    navigateToStep,
    completeCurrentStepAndNavigate,
  };
};
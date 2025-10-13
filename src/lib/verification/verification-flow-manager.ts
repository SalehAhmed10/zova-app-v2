/**
 * ✅ VERIFICATION FLOW MANAGER
 * Single source of truth for verification routing and step management
 * 
 * This manager handles:
 * - Step progression logic
 * - Route mapping
 * - State validation
 * - Sequential navigation
 * 
 * Following copilot-instructions.md:
 * - React Query + Zustand architecture
 * - Single responsibility principle  
 * - Centralized state management
 */

import { router } from 'expo-router';

/**
 * Verification step definitions - SINGLE SOURCE OF TRUTH
 */
export const VERIFICATION_STEPS = {
  1: {
    id: 1,
    title: 'Document Verification',
    route: '/(provider-verification)',
    required: true,
    description: 'Upload government-issued ID document'
  },
  2: {
    id: 2,
    title: 'Identity Selfie',
    route: '/(provider-verification)/selfie',
    required: true,
    description: 'Take a selfie for identity verification'
  },
  3: {
    id: 3,
    title: 'Business Information',
    route: '/(provider-verification)/business-info',
    required: true,
    description: 'Provide business contact details'
  },
  4: {
    id: 4,
    title: 'Service Category',
    route: '/(provider-verification)/category',
    required: true,
    description: 'Select your service category'
  },
  5: {
    id: 5,
    title: 'Service Details',
    route: '/(provider-verification)/services',
    required: true,
    description: 'Define your specific services'
  },
  6: {
    id: 6,
    title: 'Portfolio',
    route: '/(provider-verification)/portfolio',
    required: true,
    description: 'Showcase your work examples'
  },
  7: {
    id: 7,
    title: 'Business Bio',
    route: '/(provider-verification)/bio',
    required: true,
    description: 'Describe your business'
  },
  8: {
    id: 8,
    title: 'Terms & Policies',
    route: '/(provider-verification)/terms',
    required: true,
    description: 'Set booking terms and policies'
  }
} as const;

export type VerificationStepId = keyof typeof VERIFICATION_STEPS;

/**
 * Step completion validation interface
 */
export interface StepValidationResult {
  isComplete: boolean;
  hasRequiredData: boolean;
  missingFields: string[];
  canProceed: boolean;
}

/**
 * Navigation result interface  
 */
export interface NavigationResult {
  success: boolean;
  fromStep: number;
  toStep: number;
  route: string;
  reason: string;
}

/**
 * ✅ VERIFICATION FLOW MANAGER CLASS
 * Centralized management of verification flow
 */
export class VerificationFlowManager {
  /**
   * Get step definition by ID
   */
  static getStep(stepId: VerificationStepId) {
    return VERIFICATION_STEPS[stepId];
  }

  /**
   * Get all step definitions
   */
  static getAllSteps() {
    return Object.values(VERIFICATION_STEPS);
  }

  /**
   * Get route for step
   */
  static getRouteForStep(stepId: VerificationStepId): string {
    return VERIFICATION_STEPS[stepId]?.route || '/(provider-verification)';
  }

  /**
   * Get step ID from route
   */
  static getStepFromRoute(route: string): VerificationStepId {
    const step = Object.entries(VERIFICATION_STEPS).find(([_, def]) => def.route === route);
    return step ? (parseInt(step[0]) as VerificationStepId) : 1;
  }

  /**
   * ✅ PURE SEQUENTIAL NAVIGATION
   * Always advances to the next step (stepNumber + 1)
   * No complex logic - just sequential progression
   */
  static getNextStep(currentStep: number): number | null {
    const nextStep = currentStep + 1;
    return nextStep <= 8 ? nextStep : null; // Step 8 is now the final step
  }

  /**
   * Get previous step  
   */
  static getPreviousStep(currentStep: number): number | null {
    const previousStep = currentStep - 1;
    return previousStep >= 1 ? previousStep : null;
  }

  /**
   * ✅ VALIDATE STEP COMPLETION
   * Check if a step has all required data
   */
  static validateStepCompletion(stepId: VerificationStepId, stepData: any): StepValidationResult {
    const step = VERIFICATION_STEPS[stepId];
    if (!step) {
      return {
        isComplete: false,
        hasRequiredData: false,
        missingFields: ['Invalid step'],
        canProceed: false
      };
    }

    // Step-specific validation logic
    switch (stepId) {
      case 1: // Document verification
        const hasDocument = stepData?.documentType && stepData?.documentUrl;
        return {
          isComplete: !!hasDocument,
          hasRequiredData: !!hasDocument,
          missingFields: hasDocument ? [] : ['documentType', 'documentUrl'],
          canProceed: !!hasDocument
        };

      case 2: // Selfie verification  
        const hasSelfie = stepData?.selfieUrl;
        return {
          isComplete: !!hasSelfie,
          hasRequiredData: !!hasSelfie,
          missingFields: hasSelfie ? [] : ['selfieUrl'],
          canProceed: !!hasSelfie
        };

      case 3: // Business information
        const hasBusinessInfo = stepData?.businessName && stepData?.phoneNumber && stepData?.address;
        return {
          isComplete: !!hasBusinessInfo,
          hasRequiredData: !!hasBusinessInfo,
          missingFields: hasBusinessInfo ? [] : ['businessName', 'phoneNumber', 'address'],
          canProceed: !!hasBusinessInfo
        };

      case 4: // Category selection
        const hasCategory = stepData?.selectedCategoryId;
        return {
          isComplete: !!hasCategory,
          hasRequiredData: !!hasCategory,
          missingFields: hasCategory ? [] : ['selectedCategoryId'],
          canProceed: !!hasCategory
        };

      case 5: // Services (required)
        const hasServices = stepData?.selectedServices?.length > 0;
        return {
          isComplete: !!hasServices,
          hasRequiredData: !!hasServices,
          missingFields: hasServices ? [] : ['selectedServices'],
          canProceed: !!hasServices
        };

      case 6: // Portfolio
        const hasPortfolio = stepData?.images?.length > 0;
        return {
          isComplete: !!hasPortfolio,
          hasRequiredData: !!hasPortfolio,
          missingFields: hasPortfolio ? [] : ['images'],
          canProceed: !!hasPortfolio
        };

      case 7: // Bio
        const hasBio = stepData?.businessDescription && stepData?.yearsOfExperience;
        return {
          isComplete: !!hasBio,
          hasRequiredData: !!hasBio,
          missingFields: hasBio ? [] : ['businessDescription', 'yearsOfExperience'],
          canProceed: !!hasBio
        };

      case 8: // Terms
        const hasTerms = stepData?.termsAccepted;
        return {
          isComplete: !!hasTerms,
          hasRequiredData: !!hasTerms,
          missingFields: hasTerms ? [] : ['termsAccepted'],
          canProceed: !!hasTerms
        };
      
      // Step 9 (payment) removed - now handled in dashboard

      default:
        return {
          isComplete: false,
          hasRequiredData: false,
          missingFields: ['Unknown step'],
          canProceed: false
        };
    }
  }

  /**
   * ✅ FIND FIRST INCOMPLETE STEP
   * Validates actual data instead of relying on completion flags
   */
  static findFirstIncompleteStep(verificationData: any): number {
    // Temporarily disabled verbose logging to reduce console noise during form input
    // console.log('[VerificationFlowManager] Finding first incomplete step with data:', verificationData);
    
    // Check each step sequentially using actual data validation (steps 1-8 only)
    for (let stepId = 1; stepId <= 8; stepId++) {
      let stepData: any = null;
      
      // Map step to data
      switch (stepId) {
        case 1:
          stepData = verificationData.documentData;
          break;
        case 2:
          stepData = verificationData.selfieData;
          break;
        case 3:
          stepData = verificationData.businessData;
          break;
        case 4:
          stepData = verificationData.categoryData;
          break;
        case 5:
          stepData = verificationData.servicesData;
          break;
        case 6:
          stepData = verificationData.portfolioData;
          break;
        case 7:
          stepData = verificationData.bioData;
          break;
        case 8:
          stepData = verificationData.termsData;
          break;
        // Step 9 (payment) removed - now handled in dashboard
      }
      
      const validation = this.validateStepCompletion(stepId as VerificationStepId, stepData);
      // Temporarily disabled verbose logging to reduce console noise during form input
      // console.log(`[VerificationFlowManager] Step ${stepId} validation:`, validation);
      
      if (!validation.isComplete) {
        // console.log(`[VerificationFlowManager] First incomplete step: ${stepId}`);
        return stepId;
      }
    }
    
    // All steps (1-8) complete - ready for submission
    return 8; // Return final step
  }

  /**
   * ✅ EXECUTE NAVIGATION
   * Centralized navigation with logging and error handling
   */
  static navigateToStep(targetStep: number, reason: string = 'navigation'): NavigationResult {
    const route = this.getRouteForStep(targetStep as VerificationStepId);
    
    // Temporarily disabled verbose logging to reduce console noise during form input
    // console.log(`[VerificationFlowManager] Navigating to step ${targetStep} (${route}) - ${reason}`);
    
    try {
      // Use push instead of replace to maintain navigation history for back buttons
      router.push(route as any);
      
      return {
        success: true,
        fromStep: -1, // Unknown since this is centralized
        toStep: targetStep,
        route,
        reason
      };
    } catch (error) {
      console.error('[VerificationFlowManager] Navigation failed:', error);
      return {
        success: false,
        fromStep: -1,
        toStep: targetStep,
        route,
        reason: `Failed: ${error}`
      };
    }
  }

  /**
   * ✅ COMPLETE STEP AND NAVIGATE
   * Simplified step completion with sequential navigation
   */
  static completeStepAndNavigate(
    currentStep: number, 
    stepData: any,
    updateStoreCallback: (step: number, data: any) => void
  ): NavigationResult {
    // Temporarily disabled verbose logging to reduce console noise during form input
    // console.log(`[VerificationFlowManager] Completing step ${currentStep} with data:`, stepData);
    
    // Update store with completion
    updateStoreCallback(currentStep, stepData);
    
    // Navigate to next step (always sequential)
    const nextStep = this.getNextStep(currentStep);
    
    if (nextStep) {
      return this.navigateToStep(nextStep, `completed-step-${currentStep}`);
    } else {
      // Verification complete
      // Temporarily disabled verbose logging to reduce console noise during form input
      // console.log('[VerificationFlowManager] Verification complete, navigating to complete screen');
      router.replace('/(provider-verification)/complete');
      return {
        success: true,
        fromStep: currentStep,
        toStep: -1,
        route: '/(provider-verification)/complete',
        reason: 'verification-complete'
      };
    }
  }
}
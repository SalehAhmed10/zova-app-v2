import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Enhanced interfaces for Phase 1
export interface VerificationSession {
  id: string;
  sessionId: string;
  deviceFingerprint?: string;
  startedAt: Date;
  lastActivityAt: Date;
  expiresAt: Date;
  isActive: boolean;
}

export interface StepLock {
  lockedBySession: string;
  lockedAt: Date;
  lockExpiresAt: Date;
}

export interface StepProgress {
  stepNumber: number;
  status: 'not_started' | 'in_progress' | 'completed' | 'locked' | 'failed';
  data?: any;
  validationErrors: string[];
  lock?: StepLock;
  startedAt?: Date;
  completedAt?: Date;
  failedAt?: Date;
  retryCount: number;
  maxRetries: number;
}

export interface StripeValidationStatus {
  status: 'pending' | 'validating' | 'valid' | 'invalid' | 'requires_action';
  errors: string[];
  lastValidatedAt?: Date;
}

export interface VerificationNotification {
  id: string;
  type: 'step_completed' | 'step_failed' | 'verification_submitted' | 'verification_approved' | 'verification_rejected' | 'payment_required' | 'session_expired' | 'cross_device_access';
  channel: 'email' | 'push' | 'sms';
  title: string;
  message: string;
  data?: any;
  sentAt?: Date;
  readAt?: Date;
}

export interface VerificationStep {
  stepNumber: number;
  title: string;
  description: string;
  isCompleted: boolean;
  isRequired: boolean;
  data?: any;
}

interface ProviderVerificationState {
  // Session Management
  currentSession: VerificationSession | null;
  sessionId: string | null;
  deviceFingerprint: string | null;
  
  // Enhanced Step Tracking
  stepProgress: Record<number, StepProgress>;
  
  // Cross-device tracking
  totalSessionsCount: number;
  crossDeviceAccessCount: number;
  lastSessionActivity: Date | null;
  
  // Stripe Integration
  stripeValidation: StripeValidationStatus;
  
  // Notification preferences
  notificationPreferences: {
    email: boolean;
    push: boolean;
    stepCompletion: boolean;
    paymentReminders: boolean;
  };
  
  // Smart features
  smartRetryEnabled: boolean;
  autoResumeEnabled: boolean;
  
  // Legacy fields (keeping for backward compatibility)
  currentStep: number;
  steps: Record<number, VerificationStep>;
  providerId: string | null;
  verificationStatus: 'pending' | 'in_progress' | 'in_review' | 'approved' | 'rejected';
  _hasHydrated: boolean;
  
  // Step Data (keeping existing structure)
  documentData: {
    documentType: 'passport' | 'driving_license' | 'id_card' | null;
    documentUrl: string | null;
    verificationStatus: 'pending' | 'in_progress' | 'approved' | 'rejected';
  };
  
  selfieData: {
    selfieUrl: string | null;
    verificationStatus: 'pending' | 'in_progress' | 'approved' | 'rejected';
  };
  
  businessData: {
    businessName: string;
    phoneNumber: string;
    countryCode: string;
    address: string;
    city: string;
    postalCode: string;
  };
  
  categoryData: {
    selectedCategoryId: string | null;
    categoryName: string | null;
  };
  
  servicesData: {
    selectedServices: string[];
    serviceDetails: Record<string, any>;
  };
  
  portfolioData: {
    images: Array<{
      id: string;
      url: string;
      altText?: string;
      sortOrder: number;
    }>;
    maxImages: number;
  };
  
  bioData: {
    businessDescription: string;
    yearsOfExperience: number;
    maxDescriptionLength: number;
  };
  
  termsData: {
    depositPercentage: number | null;
    cancellationFeePercentage: number | null;
    cancellationPolicy: string;
    houseCallAvailable: boolean;
    houseCallExtraFee: number;
    termsAccepted: boolean;
  };
}

interface ProviderVerificationActions {
  // Session Management
  initializeSession: (deviceFingerprint?: string) => Promise<void>;
  updateSessionActivity: () => void;
  endSession: () => void;
  
  // Step Locking
  acquireStepLock: (stepNumber: number) => Promise<boolean>;
  releaseStepLock: (stepNumber: number) => void;
  isStepLockedByOther: (stepNumber: number) => boolean;
  
  // Enhanced Step Management
  updateStepProgress: (stepNumber: number, progress: Partial<StepProgress>) => void;
  validateStepData: (stepNumber: number) => Promise<boolean>;
  retryStep: (stepNumber: number) => Promise<void>;
  
  // Stripe Integration
  validateStripeAccount: () => Promise<void>;
  updateStripeValidation: (status: StripeValidationStatus) => void;
  
  // Cross-device sync
  syncWithServer: () => Promise<void>;
  handleCrossDeviceConflict: (serverData: any) => void;
  
  // Notifications
  updateNotificationPreferences: (preferences: Partial<ProviderVerificationState['notificationPreferences']>) => void;
  markNotificationRead: (notificationId: string) => void;
  
  // Legacy Navigation (keeping for backward compatibility)
  setCurrentStep: (step: number) => void;
  previousStep: () => void;
  goToStep: (step: number) => void;
  
  // Legacy Step completion (keeping for backward compatibility)
  completeStep: (stepNumber: number, data?: any) => void;
  completeStepSimple: (stepNumber: number, data?: any) => void;
  markStepIncomplete: (stepNumber: number) => void;
  
  // Legacy Data updates (keeping for backward compatibility)
  updateDocumentData: (data: Partial<ProviderVerificationState['documentData']>) => void;
  updateSelfieData: (data: Partial<ProviderVerificationState['selfieData']>) => void;
  updateBusinessData: (data: Partial<ProviderVerificationState['businessData']>) => void;
  updateCategoryData: (data: Partial<ProviderVerificationState['categoryData']>) => void;
  updateServicesData: (data: Partial<ProviderVerificationState['servicesData']>) => void;
  updatePortfolioData: (data: Partial<ProviderVerificationState['portfolioData']>) => void;
  updateBioData: (data: Partial<ProviderVerificationState['bioData']>) => void;
  updateTermsData: (data: Partial<ProviderVerificationState['termsData']>) => void;
  
  // Legacy Status management (keeping for backward compatibility)
  setVerificationStatus: (status: ProviderVerificationState['verificationStatus']) => void;
  setProviderId: (id: string) => void;
  setHasHydrated: (hasHydrated: boolean) => void;
  
  // Legacy Reset
  resetVerification: () => void;
  validateAndResetState: () => void;
  
  // Legacy Utilities
  canProceedToNextStep: () => boolean;
  getCompletionPercentage: () => number;
  isStepCompleted: (stepNumber: number) => boolean;
  getFirstIncompleteStep: () => number;
}

type ProviderVerificationStore = ProviderVerificationState & ProviderVerificationActions;

const initialSteps: Record<number, VerificationStep> = {
  1: {
    stepNumber: 1,
    title: 'Document Upload',
    description: 'Upload a valid ID document',
    isCompleted: false,
    isRequired: true,
  },
  2: {
    stepNumber: 2,
    title: 'Identity Verification',
    description: 'Take a selfie for verification',
    isCompleted: false,
    isRequired: true,
  },
  3: {
    stepNumber: 3,
    title: 'Business Information',
    description: 'Add your business details',
    isCompleted: false,
    isRequired: true,
  },
  4: {
    stepNumber: 4,
    title: 'Service Category',
    description: 'Choose your main service category',
    isCompleted: false,
    isRequired: true,
  },
  5: {
    stepNumber: 5,
    title: 'Service Selection',
    description: 'Select specific services you offer',
    isCompleted: false,
    isRequired: true,
  },
  6: {
    stepNumber: 6,
    title: 'Portfolio Upload',
    description: 'Showcase your work with portfolio images',
    isCompleted: false,
    isRequired: true,
  },
  7: {
    stepNumber: 7,
    title: 'Business Bio',
    description: 'Write a professional description',
    isCompleted: false,
    isRequired: true,
  },
  8: {
    stepNumber: 8,
    title: 'Terms & Conditions',
    description: 'Set your business terms',
    isCompleted: false,
    isRequired: true,
  },
};

export const useProviderVerificationStore = create<ProviderVerificationStore>()(
  persist(
    (set, get) => ({
      // Enhanced Initial State
      currentSession: null,
      sessionId: null,
      deviceFingerprint: null,
      stepProgress: {},
      totalSessionsCount: 1,
      crossDeviceAccessCount: 0,
      lastSessionActivity: null,
      stripeValidation: {
        status: 'pending',
        errors: [],
      },
      notificationPreferences: {
        email: true,
        push: true,
        stepCompletion: true,
        paymentReminders: true,
      },
      smartRetryEnabled: true,
      autoResumeEnabled: true,
      
      // Legacy Initial State (keeping for backward compatibility)
      currentStep: 1,
      steps: initialSteps,
      providerId: null,
      verificationStatus: 'in_progress',
      _hasHydrated: false,
      _isNavigating: false,
      
      documentData: {
        documentType: null,
        documentUrl: null,
        verificationStatus: 'in_progress',
      },
      
      selfieData: {
        selfieUrl: null,
        verificationStatus: 'in_progress',
      },
      
      businessData: {
        businessName: '',
        phoneNumber: '',
        countryCode: '+44',
        address: '',
        city: '',
        postalCode: '',
      },
      
      categoryData: {
        selectedCategoryId: null,
        categoryName: null,
      },
      
      servicesData: {
        selectedServices: [],
        serviceDetails: {},
      },
      
      portfolioData: {
        images: [],
        maxImages: 5,
      },
      
      bioData: {
        businessDescription: '',
        yearsOfExperience: 0,
        maxDescriptionLength: 150,
      },
      
      termsData: {
        depositPercentage: null,
        cancellationFeePercentage: null,
        cancellationPolicy: '',
        houseCallAvailable: false,
        houseCallExtraFee: 0,
        termsAccepted: false,
      },
      
      // Enhanced Actions - Phase 1
      
      // Session Management
      initializeSession: async (deviceFingerprint) => {
        const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const now = new Date();
        const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
        
        const session: VerificationSession = {
          id: '', // Will be set by server
          sessionId,
          deviceFingerprint: deviceFingerprint || `device_${Math.random().toString(36).substr(2, 9)}`,
          startedAt: now,
          lastActivityAt: now,
          expiresAt,
          isActive: true,
        };
        
        set({
          currentSession: session,
          sessionId,
          deviceFingerprint: session.deviceFingerprint,
          lastSessionActivity: now,
        });
        
        // TODO: Sync with server when API is ready
        console.log('[Verification] Session initialized:', sessionId);
      },
      
      updateSessionActivity: () => {
        const now = new Date();
        set({ lastSessionActivity: now });
        
        const { currentSession } = get();
        if (currentSession) {
          set({
            currentSession: {
              ...currentSession,
              lastActivityAt: now,
            },
          });
        }
        
        // TODO: Update server session activity
      },
      
      endSession: () => {
        const { sessionId } = get();
        set({
          currentSession: null,
          sessionId: null,
          lastSessionActivity: null,
        });
        
        // TODO: End server session
        console.log('[Verification] Session ended:', sessionId);
      },
      
      // Step Locking
      acquireStepLock: async (stepNumber) => {
        const { sessionId, stepProgress } = get();
        if (!sessionId) return false;
        
        // Check if step is already locked by another session
        const existingProgress = stepProgress[stepNumber];
        if (existingProgress?.lock && existingProgress.lock.lockedBySession !== sessionId) {
          const now = new Date();
          if (existingProgress.lock.lockExpiresAt > now) {
            return false; // Locked by another session
          }
        }
        
        // Acquire lock
        const lockExpiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
        const lock: StepLock = {
          lockedBySession: sessionId,
          lockedAt: new Date(),
          lockExpiresAt,
        };
        
        const updatedProgress: StepProgress = {
          ...existingProgress,
          stepNumber,
          status: 'in_progress',
          lock,
          startedAt: existingProgress?.startedAt || new Date(),
          retryCount: existingProgress?.retryCount || 0,
          maxRetries: 3,
          validationErrors: existingProgress?.validationErrors || [],
        };
        
        set({
          stepProgress: {
            ...stepProgress,
            [stepNumber]: updatedProgress,
          },
        });
        
        // TODO: Sync lock with server
        console.log(`[Verification] Acquired lock for step ${stepNumber}`);
        return true;
      },
      
      releaseStepLock: (stepNumber) => {
        const { stepProgress } = get();
        const existingProgress = stepProgress[stepNumber];
        
        if (existingProgress?.lock) {
          const updatedProgress = {
            ...existingProgress,
            lock: undefined,
            status: existingProgress.status === 'in_progress' ? 'not_started' : existingProgress.status,
          };
          
          set({
            stepProgress: {
              ...stepProgress,
              [stepNumber]: updatedProgress,
            },
          });
          
          // TODO: Release server lock
          console.log(`[Verification] Released lock for step ${stepNumber}`);
        }
      },
      
      isStepLockedByOther: (stepNumber) => {
        const { sessionId, stepProgress } = get();
        const progress = stepProgress[stepNumber];
        
        if (!progress?.lock || !sessionId) return false;
        
        return progress.lock.lockedBySession !== sessionId && 
               progress.lock.lockExpiresAt > new Date();
      },
      
      // Enhanced Step Management
      updateStepProgress: (stepNumber, progressUpdate) => {
        const { stepProgress } = get();
        const existingProgress = stepProgress[stepNumber] || {
          stepNumber,
          status: 'not_started',
          validationErrors: [],
          retryCount: 0,
          maxRetries: 3,
        };
        
        const updatedProgress = {
          ...existingProgress,
          ...progressUpdate,
        };
        
        set({
          stepProgress: {
            ...stepProgress,
            [stepNumber]: updatedProgress,
          },
        });
        
        // Update legacy step completion for backward compatibility
        if (progressUpdate.status === 'completed') {
          get().completeStep(stepNumber, progressUpdate.data);
        }
      },
      
      validateStepData: async (stepNumber) => {
        // TODO: Implement step-specific validation logic
        // For now, return true
        console.log(`[Verification] Validating step ${stepNumber}`);
        return true;
      },
      
      retryStep: async (stepNumber) => {
        const { stepProgress } = get();
        const progress = stepProgress[stepNumber];
        
        if (!progress || progress.retryCount >= progress.maxRetries) {
          throw new Error('Max retries exceeded');
        }
        
        const updatedProgress = {
          ...progress,
          retryCount: progress.retryCount + 1,
          status: 'in_progress' as const,
          failedAt: undefined,
        };
        
        set({
          stepProgress: {
            ...stepProgress,
            [stepNumber]: updatedProgress,
          },
        });
        
        console.log(`[Verification] Retrying step ${stepNumber}, attempt ${updatedProgress.retryCount}`);
      },
      
      // Stripe Integration
      validateStripeAccount: async () => {
        set({
          stripeValidation: {
            ...get().stripeValidation,
            status: 'validating',
          },
        });
        
        try {
          // TODO: Implement actual Stripe validation
          // For now, simulate validation
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          set({
            stripeValidation: {
              status: 'valid',
              errors: [],
              lastValidatedAt: new Date(),
            },
          });
          
          console.log('[Verification] Stripe account validated successfully');
        } catch (error) {
          set({
            stripeValidation: {
              status: 'invalid',
              errors: [error instanceof Error ? error.message : 'Validation failed'],
              lastValidatedAt: new Date(),
            },
          });
          
          console.error('[Verification] Stripe validation failed:', error);
        }
      },
      
      updateStripeValidation: (validation) => {
        set({ stripeValidation: validation });
      },
      
      // Cross-device sync
      syncWithServer: async () => {
        // TODO: Implement server sync
        console.log('[Verification] Syncing with server...');
      },
      
      handleCrossDeviceConflict: (serverData) => {
        // TODO: Implement conflict resolution
        console.log('[Verification] Handling cross-device conflict:', serverData);
        set({ crossDeviceAccessCount: get().crossDeviceAccessCount + 1 });
      },
      
      // Notifications
      updateNotificationPreferences: (preferences) => {
        set({
          notificationPreferences: {
            ...get().notificationPreferences,
            ...preferences,
          },
        });
      },
      
      markNotificationRead: (notificationId) => {
        // TODO: Mark notification as read on server
        console.log('[Verification] Marked notification as read:', notificationId);
      },
      setCurrentStep: (step) => {
        if (step >= 1 && step <= 8) {
          set({ currentStep: step });
        }
      },
      
      previousStep: () => {
        const { currentStep } = get();
        
        if (currentStep > 1) {
          set({ currentStep: currentStep - 1 });
        }
      },
      
      goToStep: (step) => {
        if (step >= 1 && step <= 9) {
          set({ currentStep: step });
        }
      },
      
      completeStep: (stepNumber, data) => {
        const { steps } = get();
        set({
          steps: {
            ...steps,
            [stepNumber]: {
              ...steps[stepNumber],
              isCompleted: true,
              data,
            },
          },
        });
      },
      
      markStepIncomplete: (stepNumber) => {
        const { steps } = get();
        set({
          steps: {
            ...steps,
            [stepNumber]: {
              ...steps[stepNumber],
              isCompleted: false,
            },
          },
        });
      },
      
      // Data updates
      updateDocumentData: (data) => {
        set(state => ({
          documentData: { ...state.documentData, ...data }
        }));
      },
      
      updateSelfieData: (data) => {
        set(state => ({
          selfieData: { ...state.selfieData, ...data }
        }));
      },
      
      updateBusinessData: (data) => {
        set(state => ({
          businessData: { ...state.businessData, ...data }
        }));
      },
      
      updateCategoryData: (data) => {
        set(state => ({
          categoryData: { ...state.categoryData, ...data }
        }));
      },
      
      updateServicesData: (data) => {
        set(state => ({
          servicesData: { ...state.servicesData, ...data }
        }));
      },
      
      updatePortfolioData: (data) => {
        set(state => ({
          portfolioData: { ...state.portfolioData, ...data }
        }));
      },
      
      updateBioData: (data) => {
        set(state => ({
          bioData: { ...state.bioData, ...data }
        }));
      },
      
      updateTermsData: (data) => {
        set(state => ({
          termsData: { ...state.termsData, ...data }
        }));
      },
      
      setVerificationStatus: (status) => {
        set({ verificationStatus: status });
      },
      
      setProviderId: (id) => {
        const currentId = get().providerId;
        if (currentId !== id) {
          console.log('[ProviderVerificationStore] Setting provider ID:', id, 'from:', currentId);
          set({ providerId: id });
        }
      },
      
      // ✅ SIMPLIFIED: Pure sequential step completion
      completeStepSimple: (stepNumber, data) => {
        const { steps, currentStep } = get();
        console.log(`[Store] completeStepSimple called for step ${stepNumber}`, data);
        
        // Mark step as completed
        const updatedSteps = {
          ...steps,
          [stepNumber]: {
            ...steps[stepNumber],
            isCompleted: true,
            data,
          },
        };
        
        // ✅ PURE SEQUENTIAL: Always advance to next step (stepNumber + 1)
        const nextStep = Math.min(stepNumber + 1, 9);
        
        console.log(`[Store] Step ${stepNumber} completed, advancing from step ${currentStep} to step ${nextStep}`);
        
        set({
          steps: updatedSteps,
          currentStep: nextStep,
        });
        
        // ✅ UPDATE STEP DATA: Map step data to appropriate fields
        if (stepNumber === 1 && data) {
          get().updateDocumentData(data);
        } else if (stepNumber === 2 && data) {
          get().updateSelfieData(data);
        } else if (stepNumber === 3 && data) {
          get().updateBusinessData(data);
        } else if (stepNumber === 4 && data) {
          get().updateCategoryData(data);
        } else if (stepNumber === 5 && data) {
          get().updateServicesData(data);
        } else if (stepNumber === 6 && data) {
          get().updatePortfolioData(data);
        } else if (stepNumber === 7 && data) {
          get().updateBioData(data);
        } else if (stepNumber === 8 && data) {
          get().updateTermsData(data);
        }
        // Step 9 (payment) has been removed - now handled in dashboard
      },
      
      setHasHydrated: (hasHydrated) => {
        set({ _hasHydrated: hasHydrated });
      },
      
      resetVerification: () => {
        console.log('[Store] Resetting verification and clearing persisted storage');
        
        // Clear persisted storage first
        AsyncStorage.removeItem('provider-verification-storage').catch((error) => {
          console.warn('[Store] Failed to clear persisted storage:', error);
        });
        
        // Then reset the state
        set({
          currentStep: 1,
          steps: initialSteps,
          verificationStatus: 'in_progress',
          documentData: {
            documentType: null,
            documentUrl: null,
            verificationStatus: 'in_progress',
          },
          selfieData: {
            selfieUrl: null,
            verificationStatus: 'in_progress',
          },
          businessData: {
            businessName: '',
            phoneNumber: '',
            countryCode: '+44',
            address: '',
            city: '',
            postalCode: '',
          },
          categoryData: {
            selectedCategoryId: null,
            categoryName: null,
          },
          servicesData: {
            selectedServices: [],
            serviceDetails: {},
          },
          portfolioData: {
            images: [],
            maxImages: 5,
          },
          bioData: {
            businessDescription: '',
            yearsOfExperience: 0,
            maxDescriptionLength: 150,
          },
          termsData: {
            depositPercentage: null,
            cancellationFeePercentage: null,
            cancellationPolicy: '',
            houseCallAvailable: false,
            houseCallExtraFee: 0,
            termsAccepted: false,
          },
        });
      },
      
      /**
       * ✅ VALIDATE AND RESET STATE
       * Ensures verification state is consistent with actual data
       * Called on app start to fix any inconsistencies
       */
      validateAndResetState: () => {
        const state = get();
        console.log('[Store] Validating verification state...');
        
        // Import VerificationFlowManager for proper validation
        const { VerificationFlowManager } = require('@/lib/verification/verification-flow-manager');
        
        // Use VerificationFlowManager to find first incomplete step based on actual data
        const actualFirstIncompleteStep = VerificationFlowManager.findFirstIncompleteStep({
          documentData: state.documentData,
          selfieData: state.selfieData,
          businessData: state.businessData,
          categoryData: state.categoryData,
          servicesData: state.servicesData,
          portfolioData: state.portfolioData,
          bioData: state.bioData,
          termsData: state.termsData,
        });
        
        console.log('[Store] Validation result:', {
          currentStep: state.currentStep,
          actualFirstIncompleteStep,
          hasBusinessData: state.businessData.phoneNumber,
          hasCategoryData: state.categoryData.selectedCategoryId,
          hasDocumentData: state.documentData.documentUrl,
          hasSelfieData: state.selfieData.selfieUrl
        });
        
        // If currentStep is inconsistent, reset to actual first incomplete step
        if (state.currentStep !== actualFirstIncompleteStep) {
          console.log(`[Store] Correcting currentStep from ${state.currentStep} to ${actualFirstIncompleteStep}`);
          set({ currentStep: actualFirstIncompleteStep });
          
          // Update step completion flags to match actual data
          const updatedSteps = { ...state.steps };
          for (let i = 1; i < actualFirstIncompleteStep; i++) {
            updatedSteps[i] = { ...updatedSteps[i], isCompleted: true };
          }
          for (let i = actualFirstIncompleteStep; i <= 9; i++) {
            updatedSteps[i] = { ...updatedSteps[i], isCompleted: false };
          }
          set({ steps: updatedSteps });
        }
      },
      
      canProceedToNextStep: () => {
        const { currentStep, steps } = get();
        return steps[currentStep]?.isCompleted || false;
      },
      
      getCompletionPercentage: () => {
        const { steps } = get();
        const completedSteps = Object.values(steps).filter(step => step.isCompleted).length;
        return Math.round((completedSteps / 9) * 100); // Fixed: divide by 9, not 8
      },
      
      isStepCompleted: (stepNumber) => {
        const state = get();
        const { VerificationFlowManager } = require('@/lib/verification/verification-flow-manager');
        
        // Use VerificationFlowManager for accurate validation
        let stepData: any = null;
        
        switch (stepNumber) {
          case 1:
            stepData = state.documentData;
            break;
          case 2:
            stepData = state.selfieData;
            break;
          case 3:
            stepData = state.businessData;
            break;
          case 4:
            stepData = state.categoryData;
            break;
          case 5:
            stepData = state.servicesData;
            break;
          case 6:
            stepData = state.portfolioData;
            break;
          case 7:
            stepData = state.bioData;
            break;
          case 8:
            stepData = state.termsData;
            break;
          // Step 9 (payment) removed - now handled in dashboard
          default:
            return false;
        }
        
        try {
          const validation = VerificationFlowManager.validateStepCompletion(stepNumber, stepData);
          return validation.isComplete;
        } catch (error) {
          console.warn(`[Store] Error validating step ${stepNumber}:`, error);
          // Fall back to stored flag if validation fails
          return state.steps[stepNumber]?.isCompleted || false;
        }
      },

      getFirstIncompleteStep: () => {
        const { steps } = get();
        // Find the first step that is not completed
        for (let stepNumber = 1; stepNumber <= 9; stepNumber++) {
          if (!steps[stepNumber]?.isCompleted) {
            return stepNumber;
          }
        }
        return 1; // Default to step 1 if all steps are somehow completed
      },
    }),
    {
      name: 'provider-verification-storage',
      storage: createJSONStorage(() => AsyncStorage),
      version: 3,
      migrate: (persistedState: any, version: number) => {
        if (version === 0) {
          // Migration from version 0: Reset currentStep if it's 9 (removed payment step)
          if (persistedState.currentStep === 9) {
            persistedState.currentStep = 8;
          }
          // Remove paymentData if it exists
          if (persistedState.paymentData) {
            delete persistedState.paymentData;
          }
        }

        if (version < 3) {
          // Migration from version < 3: Update verification status from 'pending' to 'in_progress' for active sessions
          if (persistedState.verificationStatus === 'pending') {
            persistedState.verificationStatus = 'in_progress';
          }
          
          if (persistedState.documentData?.verificationStatus === 'pending') {
            persistedState.documentData.verificationStatus = 'in_progress';
          }
          
          if (persistedState.selfieData?.verificationStatus === 'pending') {
            persistedState.selfieData.verificationStatus = 'in_progress';
          }
        }

        // Version 1: No changes needed, step 9 is now valid
        return persistedState;
      },
      partialize: (state) => ({
        // Enhanced fields
        currentSession: state.currentSession,
        sessionId: state.sessionId,
        deviceFingerprint: state.deviceFingerprint,
        stepProgress: state.stepProgress,
        totalSessionsCount: state.totalSessionsCount,
        crossDeviceAccessCount: state.crossDeviceAccessCount,
        lastSessionActivity: state.lastSessionActivity,
        stripeValidation: state.stripeValidation,
        notificationPreferences: state.notificationPreferences,
        smartRetryEnabled: state.smartRetryEnabled,
        autoResumeEnabled: state.autoResumeEnabled,
        
        // Legacy fields
        currentStep: state.currentStep,
        steps: state.steps,
        providerId: state.providerId,
        verificationStatus: state.verificationStatus,
        documentData: state.documentData,
        selfieData: state.selfieData,
        businessData: state.businessData,
        categoryData: state.categoryData,
        servicesData: state.servicesData,
        portfolioData: state.portfolioData,
        bioData: state.bioData,
        termsData: state.termsData,
      }),
      onRehydrateStorage: () => {
        return (state, error) => {
          if (error) {
            console.error('[Provider Verification] Rehydration error:', error);
          } else if (state) {
            // Migration: Update version to support step 9 (payment setup)
            // No longer resetting currentStep from 9 to 8 since step 9 is now valid
            state.setHasHydrated(true);
          }
        };
      },
    }
  )
);

// Selectors for computed values
export const useProviderVerificationSelectors = () => {
  const currentStep = useProviderVerificationStore((state) => state.currentStep);
  const steps = useProviderVerificationStore((state) => state.steps);
  const canProceedToNextStep = useProviderVerificationStore((state) => state.canProceedToNextStep);
  const getCompletionPercentage = useProviderVerificationStore((state) => state.getCompletionPercentage);
  const isStepCompleted = useProviderVerificationStore((state) => state.isStepCompleted);
  const previousStep = useProviderVerificationStore((state) => state.previousStep);

  return {
    currentStep,
    steps,
    isFirstStep: currentStep === 1,
    isLastStep: currentStep === 8,
    canGoBack: currentStep > 1,
    canGoNext: currentStep < 8,
    canProceedToNextStep: canProceedToNextStep(),
    completionPercentage: getCompletionPercentage(),
    isStepCompleted,
    previousStep,
  };
};

// Hydration hook
export const useProviderVerificationHydration = () => {
  const _hasHydrated = useProviderVerificationStore((state) => state._hasHydrated);
  return _hasHydrated;
};


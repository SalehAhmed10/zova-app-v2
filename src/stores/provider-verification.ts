import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface VerificationStep {
  stepNumber: number;
  title: string;
  description: string;
  isCompleted: boolean;
  isRequired: boolean;
  data?: any;
}

interface ProviderVerificationState {
  currentStep: number;
  steps: Record<number, VerificationStep>;
  providerId: string | null;
  verificationStatus: 'pending' | 'in_review' | 'approved' | 'rejected';
  _hasHydrated: boolean; // Track hydration state
  
  // Step Data
  documentData: {
    documentType: 'passport' | 'driving_license' | 'id_card' | null;
    documentUrl: string | null;
    verificationStatus: 'pending' | 'approved' | 'rejected';
  };
  
  selfieData: {
    selfieUrl: string | null;
    verificationStatus: 'pending' | 'approved' | 'rejected';
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
    depositPercentage: number;
    cancellationFeePercentage: number;
    cancellationPolicy: string;
    houseCallAvailable: boolean;
    houseCallExtraFee: number;
    termsAccepted: boolean;
  };
}

interface ProviderVerificationActions {
  // Navigation
  setCurrentStep: (step: number) => void;
  nextStep: () => void;
  previousStep: () => void;
  goToStep: (step: number) => void;
  
  // Step completion
  completeStep: (stepNumber: number, data?: any) => void;
  markStepIncomplete: (stepNumber: number) => void;
  
  // Data updates
  updateDocumentData: (data: Partial<ProviderVerificationState['documentData']>) => void;
  updateSelfieData: (data: Partial<ProviderVerificationState['selfieData']>) => void;
  updateBusinessData: (data: Partial<ProviderVerificationState['businessData']>) => void;
  updateCategoryData: (data: Partial<ProviderVerificationState['categoryData']>) => void;
  updateServicesData: (data: Partial<ProviderVerificationState['servicesData']>) => void;
  updatePortfolioData: (data: Partial<ProviderVerificationState['portfolioData']>) => void;
  updateBioData: (data: Partial<ProviderVerificationState['bioData']>) => void;
  updateTermsData: (data: Partial<ProviderVerificationState['termsData']>) => void;
  
  // Status management
  setVerificationStatus: (status: ProviderVerificationState['verificationStatus']) => void;
  setProviderId: (id: string) => void;
  setHasHydrated: (hasHydrated: boolean) => void;
  
  // Reset
  resetVerification: () => void;
  
  // Utilities
  canProceedToNextStep: () => boolean;
  getCompletionPercentage: () => number;
  isStepCompleted: (stepNumber: number) => boolean;
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
      // Initial State
      currentStep: 1,
      steps: initialSteps,
      providerId: null,
      verificationStatus: 'pending',
      _hasHydrated: false,
      
      documentData: {
        documentType: null,
        documentUrl: null,
        verificationStatus: 'pending',
      },
      
      selfieData: {
        selfieUrl: null,
        verificationStatus: 'pending',
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
        depositPercentage: 20,
        cancellationFeePercentage: 0,
        cancellationPolicy: '',
        houseCallAvailable: false,
        houseCallExtraFee: 0,
        termsAccepted: false,
      },
      
      // Actions
      setCurrentStep: (step) => {
        if (step >= 1 && step <= 8) {
          set({ currentStep: step });
        }
      },
      
      nextStep: () => {
        const { currentStep } = get();
        if (currentStep < 8) {
          set({ currentStep: currentStep + 1 });
        }
      },
      
      previousStep: () => {
        const { currentStep } = get();
        if (currentStep > 1) {
          set({ currentStep: currentStep - 1 });
        }
      },
      
      goToStep: (step) => {
        if (step >= 1 && step <= 8) {
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
        set({ providerId: id });
      },
      
      setHasHydrated: (hasHydrated) => {
        set({ _hasHydrated: hasHydrated });
      },
      
      resetVerification: () => {
        set({
          currentStep: 1,
          steps: initialSteps,
          verificationStatus: 'pending',
          documentData: {
            documentType: null,
            documentUrl: null,
            verificationStatus: 'pending',
          },
          selfieData: {
            selfieUrl: null,
            verificationStatus: 'pending',
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
            depositPercentage: 20,
            cancellationFeePercentage: 0,
            cancellationPolicy: '',
            houseCallAvailable: false,
            houseCallExtraFee: 0,
            termsAccepted: false,
          },
        });
      },
      
      canProceedToNextStep: () => {
        const { currentStep, steps } = get();
        return steps[currentStep]?.isCompleted || false;
      },
      
      getCompletionPercentage: () => {
        const { steps } = get();
        const completedSteps = Object.values(steps).filter(step => step.isCompleted).length;
        return Math.round((completedSteps / 8) * 100);
      },
      
      isStepCompleted: (stepNumber) => {
        const { steps } = get();
        return steps[stepNumber]?.isCompleted || false;
      },
    }),
    {
      name: 'provider-verification-storage',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
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
        return persistedState;
      },
      partialize: (state) => ({
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
            // Migration: Reset currentStep if it's 9 (removed payment step)
            if (state.currentStep === 9) {
              console.log('[Provider Verification] Migrating currentStep from 9 to 8');
              state.currentStep = 8;
            }
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


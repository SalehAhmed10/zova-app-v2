import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React from 'react';

interface OnboardingState {
  currentStep: number;
  isCompleted: boolean;
  hasSkipped: boolean;
  startTime: Date | string | null;
  completionTime: Date | string | null;
  _hasHydrated: boolean; // Track hydration state

  // Actions
  nextStep: () => void;
  previousStep: () => void;
  goToStep: (step: number) => void;
  complete: () => void;
  skip: () => void;
  reset: () => void;
  forceComplete: () => void; // For debugging purposes
  setHasHydrated: (hasHydrated: boolean) => void;
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set, get) => ({
      currentStep: 1,
      isCompleted: false,
      hasSkipped: false,
      startTime: null,
      completionTime: null,
      _hasHydrated: false,

      nextStep: () => {
        const { currentStep } = get();
        if (currentStep < 4) {
          set({ currentStep: currentStep + 1 });
        }
      },

      previousStep: () => {
        const { currentStep } = get();
        if (currentStep > 1) {
          set({ currentStep: currentStep - 1 });
        }
      },

      goToStep: (step: number) => {
        if (step >= 1 && step <= 4) {
          set({ currentStep: step });
        }
      },

      complete: () => {
        set({
          isCompleted: true,
          completionTime: new Date().toISOString(),
          hasSkipped: false
        });
      },

      skip: () => {
        set({
          hasSkipped: true,
          isCompleted: true,
          completionTime: new Date().toISOString()
        });
      },

      reset: () => {
        set({
          currentStep: 1,
          isCompleted: false,
          hasSkipped: false,
          startTime: null,
          completionTime: null
        });
        // Clear from AsyncStorage to ensure persistence
        AsyncStorage.removeItem('onboarding-storage').catch((error) => {
          console.error('[Onboarding] Error clearing storage:', error);
        });
      },

      forceComplete: () => {
        set({
          isCompleted: true,
          hasSkipped: false,
          completionTime: new Date().toISOString(),
          currentStep: 4
        });
      },

      setHasHydrated: (hasHydrated: boolean) => {
        set({ _hasHydrated: hasHydrated });
      },
    }),
    {
      name: 'onboarding-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        currentStep: state.currentStep,
        isCompleted: state.isCompleted,
        hasSkipped: state.hasSkipped,
        completionTime: state.completionTime,
      }),
      onRehydrateStorage: () => {
        console.log('[Onboarding] Rehydration started');
        return (state, error) => {
          if (error) {
            console.log('[Onboarding] Rehydration error:', error);
          } else {
            console.log('[Onboarding] Rehydration finished. State:', {
              isCompleted: state?.isCompleted,
              currentStep: state?.currentStep,
              hasSkipped: state?.hasSkipped,
              completionTime: state?.completionTime
            });
            state?.setHasHydrated(true);
          }
        };
      },
    }
  )
);

// Computed selectors
export const useOnboardingSelectors = () => {
  const store = useOnboardingStore();

  return {
    isFirstStep: store.currentStep === 1,
    isLastStep: store.currentStep === 4,
    progress: (store.currentStep / 4) * 100,
    canGoNext: store.currentStep < 4,
    canGoBack: store.currentStep > 1,
    shouldShowOnboarding: !store.isCompleted,
    hasHydrated: store._hasHydrated,
  };
};

// Hook to wait for hydration
export const useOnboardingHydration = () => {
  const hasHydrated = useOnboardingStore((state) => state._hasHydrated);
  const [isReady, setIsReady] = React.useState(hasHydrated);

  React.useEffect(() => {
    if (hasHydrated) {
      setIsReady(true);
    } else if (!isReady) {
      // Shorter timeout - 500ms should be enough for hydration
      const timeout = setTimeout(() => {
        console.log('[Onboarding] Hydration timeout, proceeding anyway');
        setIsReady(true);
      }, 500);

      return () => clearTimeout(timeout);
    }
  }, [hasHydrated, isReady]);

  return isReady;
};

// Debug function to check storage directly
export const checkOnboardingStorage = async () => {
  try {
    const stored = await AsyncStorage.getItem('onboarding-storage');
    console.log('[Onboarding Storage]:', stored);
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.error('[Onboarding Storage] Error reading storage:', error);
    return null;
  }
};
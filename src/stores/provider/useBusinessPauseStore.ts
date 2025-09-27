// Business Pause Store - Zustand store for business pause functionality
// ✅ CREATED: Following copilot-rules.md - Replace complex useState with Zustand
// ❌ REPLACES: Multiple useState hooks for pause modal state

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface BusinessPauseState {
  // UI State
  showPauseModal: boolean;
  showDatePicker: boolean;
  
  // Form State
  pauseMessage: string;
  pauseUntil: string;
  selectedDate: Date;
  isIndefinitePause: boolean;
  
  // Actions
  openPauseModal: () => void;
  closePauseModal: () => void;
  showDateSelection: () => void;
  hideDateSelection: () => void;
  setPauseMessage: (message: string) => void;
  setPauseUntil: (until: string) => void;
  setSelectedDate: (date: Date) => void;
  setIndefinitePause: (indefinite: boolean) => void;
  resetPauseForm: () => void;
}

const initialState = {
  showPauseModal: false,
  showDatePicker: false,
  pauseMessage: '',
  pauseUntil: '',
  selectedDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Default to 1 week from now
  isIndefinitePause: false,
};

export const useBusinessPauseStore = create<BusinessPauseState>()(
  persist(
    (set, get) => ({
      ...initialState,
      
      // Modal Actions
      openPauseModal: () => set({ showPauseModal: true }),
      closePauseModal: () => set({ 
        showPauseModal: false,
        showDatePicker: false 
      }),
      
      // Date Picker Actions
      showDateSelection: () => set({ showDatePicker: true }),
      hideDateSelection: () => set({ showDatePicker: false }),
      
      // Form Actions
      setPauseMessage: (message: string) => set({ pauseMessage: message }),
      setPauseUntil: (until: string) => set({ pauseUntil: until }),
      setSelectedDate: (date: Date) => set({ selectedDate: date }),
      setIndefinitePause: (indefinite: boolean) => set({ 
        isIndefinitePause: indefinite,
        // Clear date fields when setting indefinite pause
        pauseUntil: indefinite ? '' : get().pauseUntil
      }),
      
      // Reset Form
      resetPauseForm: () => set({
        pauseMessage: '',
        pauseUntil: '',
        selectedDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        isIndefinitePause: false,
        showDatePicker: false,
      }),
    }),
    {
      name: 'business-pause-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist form data, not UI state
      partialize: (state) => ({
        pauseMessage: state.pauseMessage,
        pauseUntil: state.pauseUntil,
        selectedDate: state.selectedDate,
        isIndefinitePause: state.isIndefinitePause,
      }),
    }
  )
);
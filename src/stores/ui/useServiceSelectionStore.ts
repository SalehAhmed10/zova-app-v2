/**
 * Service Selection UI Store
 * ✅ Handles transient UI state for service selection (NOT verification progress)
 * 
 * Purpose:
 * - Track which services are selected in UI (before form submission)
 * - Separate from verification store to prevent premature navigation
 * 
 * Pattern:
 * - Selection: Update this UI store only (visual feedback)
 * - Submission: Update verification store (triggers navigation)
 */

import { create } from 'zustand';

interface ServiceSelectionState {
  // UI state - selected service IDs (transient, pre-submission)
  selectedServiceIds: string[];
  
  // Actions
  toggleService: (serviceId: string) => void;
  setSelectedServices: (serviceIds: string[]) => void;
  clearSelection: () => void;
  reset: () => void;
}

export const useServiceSelectionStore = create<ServiceSelectionState>((set, get) => ({
  selectedServiceIds: [],
  
  /**
   * Toggle a service on/off
   */
  toggleService: (serviceId: string) => {
    const current = get().selectedServiceIds;
    const newSelected = current.includes(serviceId)
      ? current.filter(id => id !== serviceId)
      : [...current, serviceId];
    
    console.log('[ServiceSelectionStore] Toggling service:', serviceId, 'New selection:', newSelected);
    set({ selectedServiceIds: newSelected });
  },
  
  /**
   * Set multiple services at once (e.g., loading from database)
   */
  setSelectedServices: (serviceIds: string[]) => {
    console.log('[ServiceSelectionStore] Setting services:', serviceIds);
    set({ selectedServiceIds: serviceIds });
  },
  
  /**
   * Clear all selections
   */
  clearSelection: () => {
    console.log('[ServiceSelectionStore] Clearing selection');
    set({ selectedServiceIds: [] });
  },
  
  /**
   * Reset store to initial state
   */
  reset: () => {
    console.log('[ServiceSelectionStore] Resetting store');
    set({ selectedServiceIds: [] });
  },
}));

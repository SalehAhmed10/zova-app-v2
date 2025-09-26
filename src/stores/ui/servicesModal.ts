import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface ServicesModalState {
  // Modal state
  isModalVisible: boolean;
  isServiceModalVisible: boolean;
  editingService: any | null;
  selectedCategory: string;
  showActiveOnly: boolean; // New filter for active services only

  // Delete dialog state
  deleteDialogOpen: boolean;
  serviceToDelete: string | null;

  // Toggle state
  serviceBeingToggled: string | null;

  // Actions
  openModal: () => void;
  closeModal: () => void;
  openServiceModal: (service?: any) => void;
  closeServiceModal: () => void;
  setSelectedCategory: (category: string) => void;
  setShowActiveOnly: (showActiveOnly: boolean) => void; // New action
  openDeleteDialog: (serviceId: string) => void;
  closeDeleteDialog: () => void;
  setServiceBeingToggled: (serviceId: string | null) => void;
  reset: () => void;

  // Hydration
  _hasHydrated: boolean;
  setHydrated: () => void;
}

export const useServicesModalStore = create<ServicesModalState>()(
  persist(
    (set, get) => ({
      // Initial state
      isModalVisible: false,
      isServiceModalVisible: false,
      editingService: null,
      selectedCategory: 'All',
      showActiveOnly: false, // Default to showing all services
      deleteDialogOpen: false,
      serviceToDelete: null,
      serviceBeingToggled: null,
      _hasHydrated: false,

      // Actions
      openModal: () => {
        console.log('[ServicesModalStore] Opening services modal');
        set({ isModalVisible: true });
      },

      closeModal: () => {
        console.log('[ServicesModalStore] Closing services modal');
        set({
          isModalVisible: false,
          isServiceModalVisible: false,
          editingService: null,
          selectedCategory: 'All'
        });
      },

      openServiceModal: (service = null) => {
        console.log('[ServicesModalStore] Opening service modal', service?.id || 'new');
        set({
          isServiceModalVisible: true,
          editingService: service
        });
      },

      closeServiceModal: () => {
        console.log('[ServicesModalStore] Closing service modal');
        set({
          isServiceModalVisible: false,
          editingService: null
        });
      },

      setSelectedCategory: (category: string) => {
        console.log('[ServicesModalStore] Setting selected category:', category);
        set({ selectedCategory: category });
      },

      setShowActiveOnly: (showActiveOnly: boolean) => {
        console.log('[ServicesModalStore] Setting show active only:', showActiveOnly);
        set({ showActiveOnly });
      },

      openDeleteDialog: (serviceId: string) => {
        console.log('[ServicesModalStore] Opening delete dialog for service:', serviceId);
        set({
          deleteDialogOpen: true,
          serviceToDelete: serviceId
        });
      },

      closeDeleteDialog: () => {
        console.log('[ServicesModalStore] Closing delete dialog');
        set({
          deleteDialogOpen: false,
          serviceToDelete: null
        });
      },

      setServiceBeingToggled: (serviceId: string | null) => {
        console.log('[ServicesModalStore] Setting service being toggled:', serviceId);
        set({ serviceBeingToggled: serviceId });
      },

      reset: () => {
        console.log('[ServicesModalStore] Resetting modal state');
        set({
          isModalVisible: false,
          isServiceModalVisible: false,
          editingService: null,
          selectedCategory: 'All',
          showActiveOnly: false,
          deleteDialogOpen: false,
          serviceToDelete: null
        });
      },

      setHydrated: () => set({ _hasHydrated: true }),
    }),
    {
      name: "services-modal-storage",
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist selectedCategory and showActiveOnly, not modal visibility
      partialize: (state) => ({
        selectedCategory: state.selectedCategory,
        showActiveOnly: state.showActiveOnly,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          console.log('[ServicesModalStore] Rehydrated:', {
            selectedCategory: state.selectedCategory,
          });
          state.setHydrated();
        }
      },
    }
  )
);
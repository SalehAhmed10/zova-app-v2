import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface ProfileModalState {
  // Modal visibility states
  personalInfoModalVisible: boolean;
  notificationModalVisible: boolean;
  bookingHistoryModalVisible: boolean;
  stripeIntegrationModalVisible: boolean;
  servicesModalVisible: boolean;
  favoritesModalVisible: boolean;

  // Actions
  openPersonalInfoModal: () => void;
  closePersonalInfoModal: () => void;
  openNotificationModal: () => void;
  closeNotificationModal: () => void;
  openBookingHistoryModal: () => void;
  closeBookingHistoryModal: () => void;
  openStripeIntegrationModal: () => void;
  closeStripeIntegrationModal: () => void;
  openServicesModal: () => void;
  closeServicesModal: () => void;
  openFavoritesModal: () => void;
  closeFavoritesModal: () => void;

  // Reset all modals
  closeAllModals: () => void;

  // Hydration
  _hasHydrated: boolean;
  setHydrated: () => void;
}

export const useProfileModalStore = create<ProfileModalState>()(
  persist(
    (set, get) => ({
      // Initial state
      personalInfoModalVisible: false,
      notificationModalVisible: false,
      bookingHistoryModalVisible: false,
      stripeIntegrationModalVisible: false,
      servicesModalVisible: false,
      favoritesModalVisible: false,
      _hasHydrated: false,

      // Actions
      openPersonalInfoModal: () => {
        console.log('[ProfileModalStore] Opening personal info modal');
        set({ personalInfoModalVisible: true });
      },

      closePersonalInfoModal: () => {
        console.log('[ProfileModalStore] Closing personal info modal');
        set({ personalInfoModalVisible: false });
      },

      openNotificationModal: () => {
        console.log('[ProfileModalStore] Opening notification modal');
        set({ notificationModalVisible: true });
      },

      closeNotificationModal: () => {
        console.log('[ProfileModalStore] Closing notification modal');
        set({ notificationModalVisible: false });
      },

      openBookingHistoryModal: () => {
        console.log('[ProfileModalStore] Opening booking history modal');
        set({ bookingHistoryModalVisible: true });
      },

      closeBookingHistoryModal: () => {
        console.log('[ProfileModalStore] Closing booking history modal');
        set({ bookingHistoryModalVisible: false });
      },

      openStripeIntegrationModal: () => {
        console.log('[ProfileModalStore] Opening stripe integration modal');
        set({ stripeIntegrationModalVisible: true });
      },

      closeStripeIntegrationModal: () => {
        console.log('[ProfileModalStore] Closing stripe integration modal');
        set({ stripeIntegrationModalVisible: false });
      },

      openServicesModal: () => {
        console.log('[ProfileModalStore] Opening services modal');
        set({ servicesModalVisible: true });
      },

      closeServicesModal: () => {
        console.log('[ProfileModalStore] Closing services modal');
        set({ servicesModalVisible: false });
      },

      openFavoritesModal: () => {
        console.log('[ProfileModalStore] Opening favorites modal');
        set({ favoritesModalVisible: true });
      },

      closeFavoritesModal: () => {
        console.log('[ProfileModalStore] Closing favorites modal');
        set({ favoritesModalVisible: false });
      },

      closeAllModals: () => {
        console.log('[ProfileModalStore] Closing all modals');
        set({
          personalInfoModalVisible: false,
          notificationModalVisible: false,
          bookingHistoryModalVisible: false,
          stripeIntegrationModalVisible: false,
          servicesModalVisible: false,
          favoritesModalVisible: false,
        });
      },

      setHydrated: () => set({ _hasHydrated: true }),
    }),
    {
      name: "profile-modal-storage",
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist essential state, not modal visibility
      partialize: (state) => ({
        // No modal states should be persisted as they should reset on app restart
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          console.log('[ProfileModalStore] Rehydrated');
          state.setHydrated();
        }
      },
    }
  )
);
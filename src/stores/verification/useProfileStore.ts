import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

type VerificationStatus = "pending" | "in_review" | "approved" | "rejected";

interface ProfileState {
  userId: string | null;
  verificationStatus: VerificationStatus | null;
  _hasHydrated: boolean;
  setProfile: (userId: string, status: VerificationStatus) => void;
  clear: () => void;
  isApproved: () => boolean;
  setHydrated: () => void;
}

export const useProfileStore = create<ProfileState>()(
  persist(
    (set, get) => ({
      userId: null,
      verificationStatus: null,
      _hasHydrated: false,
      setProfile: (userId, status) => {
        // Validate status
        const validStatuses: VerificationStatus[] = ["pending", "in_review", "approved", "rejected"];
        if (!validStatuses.includes(status)) {
          console.warn("[ProfileStore] Invalid verification status:", status);
          return;
        }
        console.log(`[ProfileStore] Setting profile: ${userId} -> ${status}`);
        set({ userId, verificationStatus: status });
      },
      clear: () => {
        console.log("[ProfileStore] Clearing profile data");
        set({ userId: null, verificationStatus: null });
      },
      isApproved: () => get().verificationStatus === "approved",
      setHydrated: () => set({ _hasHydrated: true }),
    }),
    {
      name: "profile-storage",
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        if (state) {
          console.log("[ProfileStore] Rehydrated from storage:", {
            userId: state.userId,
            status: state.verificationStatus,
          });
          state.setHydrated();
        }
      },
      partialize: (state) => ({
        userId: state.userId,
        verificationStatus: state.verificationStatus,
      }),
    }
  )
);

// Hook for checking hydration status
export const useProfileHydration = () => {
  return useProfileStore((state) => state._hasHydrated);
};
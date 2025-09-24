import { create } from "zustand";

type VerificationStatus = "pending" | "in_review" | "approved" | "rejected";

interface ProfileState {
  userId: string | null;
  verificationStatus: VerificationStatus | null;
  setProfile: (userId: string, status: VerificationStatus) => void;
  clear: () => void;
}

export const useProfileStore = create<ProfileState>((set) => ({
  userId: null,
  verificationStatus: null,
  setProfile: (userId, status) =>
    set({ userId, verificationStatus: status }),
  clear: () => set({ userId: null, verificationStatus: null }),
}));
// Authentication related types
export type UserRole = 'customer' | 'provider' | 'admin' | 'super-admin';

export type AuthState = {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: any | null;
  userRole: UserRole | null;
  isOnboardingComplete: boolean;
  _hasHydrated: boolean;
};

export type LoginCredentials = {
  email: string;
  password: string;
};

export type RegisterData = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
};

export type OTPVerificationData = {
  email: string;
  otp: string;
};

// Profile types
export interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
  first_name: string;
  last_name: string;
  avatar_url?: string;
  created_at: string;
}

export type VerificationStatus = "pending" | "in_review" | "approved" | "rejected";

export interface ProfileState {
  userId: string | null;
  verificationStatus: VerificationStatus | null;
  _hasHydrated: boolean;
}
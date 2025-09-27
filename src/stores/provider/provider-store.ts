import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SubscriptionType, SubscriptionFeatures } from '@/lib/payment/subscription-config';

// Provider business settings
interface BusinessSettings {
  isAvailable: boolean;
  availabilityMessage?: string;
  pauseUntil?: string;
  depositPercentage: number;
  cancellationFeePercentage: number;
  cancellationPolicy: string;
  houseCallAvailable: boolean;
  houseCallExtraFee: number;
  emergencyBookingsEnabled: boolean;
  instantBookingEnabled: boolean;
}

// Provider subscription state
interface ProviderSubscription {
  type: SubscriptionType | null;
  status: 'active' | 'inactive' | 'cancelled' | 'past_due' | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  features: SubscriptionFeatures | null;
  stripeSubscriptionId: string | null;
}

// Provider stats and performance
interface ProviderStats {
  thisMonthEarnings: number;
  avgRating: number;
  completedBookings: number;
  totalReviews: number;
  responseRate: number;
  lastUpdated: string | null;
}

// Provider preferences
interface ProviderPreferences {
  notificationsEnabled: boolean;
  emailNotifications: boolean;
  pushNotifications: boolean;
  bookingReminders: boolean;
  marketingEmails: boolean;
  profileVisibility: 'public' | 'private';
  autoAcceptBookings: boolean;
}

interface ProviderState {
  // Subscription management
  subscription: ProviderSubscription;
  
  // Business settings
  businessSettings: BusinessSettings;
  
  // Stats and performance
  stats: ProviderStats;
  
  // User preferences
  preferences: ProviderPreferences;
  
  // Hydration state
  _hasHydrated: boolean;
}

interface ProviderActions {
  // Subscription actions
  setSubscription: (subscription: Partial<ProviderSubscription>) => void;
  clearSubscription: () => void;
  updateSubscriptionStatus: (status: ProviderSubscription['status']) => void;
  
  // Business settings actions
  updateBusinessSettings: (settings: Partial<BusinessSettings>) => void;
  toggleAvailability: () => void;
  setPauseUntil: (date: string, message?: string) => void;
  clearPause: () => void;
  updatePricing: (depositPercentage: number, cancellationFeePercentage: number) => void;
  toggleHouseCalls: (enabled: boolean, extraFee?: number) => void;
  toggleEmergencyBookings: () => void;
  toggleInstantBooking: () => void;
  
  // Stats actions
  updateStats: (stats: Partial<ProviderStats>) => void;
  refreshStats: () => void;
  
  // Preferences actions
  updatePreferences: (preferences: Partial<ProviderPreferences>) => void;
  toggleNotifications: (type: keyof Pick<ProviderPreferences, 'emailNotifications' | 'pushNotifications' | 'bookingReminders' | 'marketingEmails'>) => void;
  setProfileVisibility: (visibility: ProviderPreferences['profileVisibility']) => void;
  
  // Utility actions
  setHydrated: (hydrated: boolean) => void;
  reset: () => void;
}

type ProviderStore = ProviderState & ProviderActions;

// Initial state
const initialState: ProviderState = {
  subscription: {
    type: null,
    status: null,
    currentPeriodStart: null,
    currentPeriodEnd: null,
    features: null,
    stripeSubscriptionId: null,
  },
  businessSettings: {
    isAvailable: true,
    depositPercentage: 20,
    cancellationFeePercentage: 10,
    cancellationPolicy: 'Bookings can be cancelled up to 24 hours in advance for a full refund.',
    houseCallAvailable: false,
    houseCallExtraFee: 0,
    emergencyBookingsEnabled: false,
    instantBookingEnabled: false,
  },
  stats: {
    thisMonthEarnings: 0,
    avgRating: 0,
    completedBookings: 0,
    totalReviews: 0,
    responseRate: 0,
    lastUpdated: null,
  },
  preferences: {
    notificationsEnabled: true,
    emailNotifications: true,
    pushNotifications: true,
    bookingReminders: true,
    marketingEmails: false,
    profileVisibility: 'public',
    autoAcceptBookings: false,
  },
  _hasHydrated: false,
};

export const useProviderStore = create<ProviderStore>()(
  persist(
    (set, get) => ({
      ...initialState,
      
      // Subscription actions
      setSubscription: (subscription) => {
        set((state) => ({
          subscription: { ...state.subscription, ...subscription },
        }));
      },
      
      clearSubscription: () => {
        set({
          subscription: initialState.subscription,
        });
      },
      
      updateSubscriptionStatus: (status) => {
        set((state) => ({
          subscription: { ...state.subscription, status },
        }));
      },
      
      // Business settings actions
      updateBusinessSettings: (settings) => {
        set((state) => ({
          businessSettings: { ...state.businessSettings, ...settings },
        }));
      },
      
      toggleAvailability: () => {
        set((state) => ({
          businessSettings: {
            ...state.businessSettings,
            isAvailable: !state.businessSettings.isAvailable,
            availabilityMessage: !state.businessSettings.isAvailable ? undefined : state.businessSettings.availabilityMessage,
            pauseUntil: !state.businessSettings.isAvailable ? undefined : state.businessSettings.pauseUntil,
          },
        }));
      },
      
      setPauseUntil: (date, message) => {
        set((state) => ({
          businessSettings: {
            ...state.businessSettings,
            isAvailable: false,
            pauseUntil: date,
            availabilityMessage: message,
          },
        }));
      },
      
      clearPause: () => {
        set((state) => ({
          businessSettings: {
            ...state.businessSettings,
            isAvailable: true,
            pauseUntil: undefined,
            availabilityMessage: undefined,
          },
        }));
      },
      
      updatePricing: (depositPercentage, cancellationFeePercentage) => {
        set((state) => ({
          businessSettings: {
            ...state.businessSettings,
            depositPercentage,
            cancellationFeePercentage,
          },
        }));
      },
      
      toggleHouseCalls: (enabled, extraFee = 0) => {
        set((state) => ({
          businessSettings: {
            ...state.businessSettings,
            houseCallAvailable: enabled,
            houseCallExtraFee: enabled ? extraFee : 0,
          },
        }));
      },
      
      toggleEmergencyBookings: () => {
        set((state) => ({
          businessSettings: {
            ...state.businessSettings,
            emergencyBookingsEnabled: !state.businessSettings.emergencyBookingsEnabled,
          },
        }));
      },
      
      toggleInstantBooking: () => {
        set((state) => ({
          businessSettings: {
            ...state.businessSettings,
            instantBookingEnabled: !state.businessSettings.instantBookingEnabled,
          },
        }));
      },
      
      // Stats actions
      updateStats: (stats) => {
        set((state) => ({
          stats: { 
            ...state.stats, 
            ...stats,
            lastUpdated: new Date().toISOString(),
          },
        }));
      },
      
      refreshStats: () => {
        // This will be called by React Query mutations to trigger refresh
        console.log('[ProviderStore] Stats refresh triggered');
      },
      
      // Preferences actions
      updatePreferences: (preferences) => {
        set((state) => ({
          preferences: { ...state.preferences, ...preferences },
        }));
      },
      
      toggleNotifications: (type) => {
        set((state) => ({
          preferences: {
            ...state.preferences,
            [type]: !state.preferences[type],
          },
        }));
      },
      
      setProfileVisibility: (visibility) => {
        set((state) => ({
          preferences: { ...state.preferences, profileVisibility: visibility },
        }));
      },
      
      // Utility actions
      setHydrated: (hydrated) => {
        set({ _hasHydrated: hydrated });
      },
      
      reset: () => {
        set(initialState);
      },
    }),
    {
      name: 'provider-store',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
      partialize: (state) => ({
        subscription: state.subscription,
        businessSettings: state.businessSettings,
        stats: state.stats,
        preferences: state.preferences,
      }),
    }
  )
);

// Selectors for performance optimization
export const useProviderSubscription = () => useProviderStore((state) => state.subscription);
export const useBusinessSettings = () => useProviderStore((state) => state.businessSettings);
export const useProviderStats = () => useProviderStore((state) => state.stats);
export const useProviderPreferences = () => useProviderStore((state) => state.preferences);
export const useProviderHydration = () => useProviderStore((state) => state._hasHydrated);

// Feature checks for subscription-based features
export const useProviderFeatures = () => {
  return useProviderStore((state) => ({
    hasActivePremium: state.subscription.status === 'active' && state.subscription.type === 'PROVIDER_PREMIUM',
    features: state.subscription.features,
    canUseEmergencyBooking: state.subscription.features?.emergencyBooking || false,
    canUseAdvancedAnalytics: state.subscription.features?.advancedAnalytics || false,
    canUsePriorityPlacement: state.subscription.features?.priorityPlacement || false,
    canUseCustomBranding: state.subscription.features?.customBranding || false,
  }));
};

export default useProviderStore;
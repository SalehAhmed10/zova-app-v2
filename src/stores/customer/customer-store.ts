/**
 * Customer Store - Zustand Store for Customer-specific State
 * 
 * Manages SOS subscription status and customer-specific features.
 * Follows the established Zustand + AsyncStorage persistence pattern.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SubscriptionStatus } from '@/lib/payment/subscription-config';

interface CustomerState {
  // SOS Subscription State
  hasSOSSubscription: boolean;
  sosSubscriptionStatus: SubscriptionStatus;
  sosSubscriptionId?: string;
  sosTrialEndsAt?: string;
  sosCancelAtPeriodEnd: boolean;
  
  // SOS Features (activated when subscription is active)
  sosFeatures: {
    emergencyBooking: boolean;
    priorityMatching: boolean;
    support24_7: boolean;
    instantConfirmation: boolean;
  };
  
  // Customer Preferences
  preferredServiceRadius: number; // in miles
  allowSOSNotifications: boolean;
  emergencyContactPhone?: string;
  
  // State Management
  _hasHydrated: boolean;

  // Actions
  updateSOSSubscription: (data: {
    hasSubscription: boolean;
    status: SubscriptionStatus;
    subscriptionId?: string;
    trialEndsAt?: string;
    cancelAtPeriodEnd?: boolean;
  }) => void;
  
  setSOSFeatures: (features: Partial<CustomerState['sosFeatures']>) => void;
  updateCustomerPreferences: (preferences: {
    serviceRadius?: number;
    allowSOSNotifications?: boolean;
    emergencyContactPhone?: string;
  }) => void;
  
  // Emergency SOS Actions
  toggleSOSNotifications: () => void;
  setEmergencyContact: (phone: string) => void;
  
  // Reset/Clear
  resetCustomerData: () => void;
}

export const useCustomerStore = create<CustomerState>()(
  persist(
    (set, get) => ({
      // Initial State
      hasSOSSubscription: false,
      sosSubscriptionStatus: 'none',
      sosSubscriptionId: undefined,
      sosTrialEndsAt: undefined,
      sosCancelAtPeriodEnd: false,
      
      sosFeatures: {
        emergencyBooking: false,
        priorityMatching: false,
        support24_7: false,
        instantConfirmation: false,
      },
      
      preferredServiceRadius: 5, // 5 miles default
      allowSOSNotifications: true,
      emergencyContactPhone: undefined,
      
      _hasHydrated: false,

      // Actions
      updateSOSSubscription: (data) => {
        const isActive = data.status === 'active' || data.status === 'trialing';
        
        set({ 
          hasSOSSubscription: data.hasSubscription,
          sosSubscriptionStatus: data.status,
          sosSubscriptionId: data.subscriptionId,
          sosTrialEndsAt: data.trialEndsAt,
          sosCancelAtPeriodEnd: data.cancelAtPeriodEnd || false,
          sosFeatures: {
            emergencyBooking: isActive,
            priorityMatching: isActive,
            support24_7: isActive,
            instantConfirmation: isActive,
          }
        });

        console.log('[CustomerStore] Updated SOS subscription:', {
          hasSubscription: data.hasSubscription,
          status: data.status,
          features: isActive ? 'enabled' : 'disabled'
        });
      },

      setSOSFeatures: (features) => {
        set((state) => ({
          sosFeatures: { ...state.sosFeatures, ...features }
        }));
      },

      updateCustomerPreferences: (preferences) => {
        set((state) => ({
          preferredServiceRadius: preferences.serviceRadius ?? state.preferredServiceRadius,
          allowSOSNotifications: preferences.allowSOSNotifications ?? state.allowSOSNotifications,
          emergencyContactPhone: preferences.emergencyContactPhone ?? state.emergencyContactPhone,
        }));

        console.log('[CustomerStore] Updated customer preferences:', preferences);
      },

      toggleSOSNotifications: () => {
        set((state) => {
          const newValue = !state.allowSOSNotifications;
          console.log('[CustomerStore] Toggled SOS notifications:', newValue);
          return { allowSOSNotifications: newValue };
        });
      },

      setEmergencyContact: (phone) => {
        set({ emergencyContactPhone: phone });
        console.log('[CustomerStore] Updated emergency contact');
      },

      resetCustomerData: () => {
        set({
          hasSOSSubscription: false,
          sosSubscriptionStatus: 'none',
          sosSubscriptionId: undefined,
          sosTrialEndsAt: undefined,
          sosCancelAtPeriodEnd: false,
          sosFeatures: {
            emergencyBooking: false,
            priorityMatching: false,
            support24_7: false,
            instantConfirmation: false,
          },
          preferredServiceRadius: 5,
          allowSOSNotifications: true,
          emergencyContactPhone: undefined,
        });

        console.log('[CustomerStore] Reset customer data');
      },
    }),
    {
      name: 'customer-storage',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        console.log('[CustomerStore] Hydration started');
        if (state) {
          state._hasHydrated = true;
          console.log('[CustomerStore] Hydration completed:', {
            hasSOSSubscription: state.hasSOSSubscription,
            sosStatus: state.sosSubscriptionStatus,
            sosFeatures: state.sosFeatures
          });
        }
      },
    }
  )
);

// Selector hooks for performance optimization
export const useCustomerHydration = () => useCustomerStore((state) => state._hasHydrated);

export const useSOSSubscriptionStatus = () => useCustomerStore((state) => ({
  hasSubscription: state.hasSOSSubscription,
  status: state.sosSubscriptionStatus,
  subscriptionId: state.sosSubscriptionId,
  trialEndsAt: state.sosTrialEndsAt,
  cancelAtPeriodEnd: state.sosCancelAtPeriodEnd,
}));

export const useSOSFeatures = () => useCustomerStore((state) => state.sosFeatures);

export const useCustomerPreferences = () => useCustomerStore((state) => ({
  serviceRadius: state.preferredServiceRadius,
  allowSOSNotifications: state.allowSOSNotifications,
  emergencyContactPhone: state.emergencyContactPhone,
}));

export const useCustomerActions = () => useCustomerStore((state) => ({
  updateSOSSubscription: state.updateSOSSubscription,
  setSOSFeatures: state.setSOSFeatures,
  updateCustomerPreferences: state.updateCustomerPreferences,
  toggleSOSNotifications: state.toggleSOSNotifications,
  setEmergencyContact: state.setEmergencyContact,
  resetCustomerData: state.resetCustomerData,
}));

// Helper to check if customer has active SOS features
export const useHasActiveSOSFeatures = () => {
  const features = useSOSFeatures();
  return features.emergencyBooking && features.priorityMatching;
};
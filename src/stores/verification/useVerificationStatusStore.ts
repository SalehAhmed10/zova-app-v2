/**
 * ✅ VERIFICATION STATUS STORE - Following copilot-rules.md
 * 
 * ARCHITECTURE:
 * - Pure Zustand for global verification state
 * - React Query for server state management
 * - Real-time subscriptions handled in store actions
 * - NO useState + useEffect patterns
 * 
 * REPLACES: Complex verification-status.tsx useEffect patterns
 */

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/core/supabase';

type VerificationStatus = 'pending' | 'in_review' | 'approved' | 'rejected';

interface VerificationStatusState {
  // State
  currentStatus: VerificationStatus;
  lastUpdated: number;
  isSubscribed: boolean;
  _hasHydrated: boolean;

  // Actions
  setStatus: (status: VerificationStatus) => void;
  updateLastUpdated: () => void;
  setSubscribed: (subscribed: boolean) => void;
  setHasHydrated: (hydrated: boolean) => void;
  
  // Real-time subscription management
  setupSubscription: (userId: string, onStatusChange?: (status: VerificationStatus) => void) => () => void;
  cleanup: () => void;
}

// Global subscription reference (outside component lifecycle)
let globalSubscription: any = null;

export const useVerificationStatusStore = create<VerificationStatusState>()(
  persist(
    (set, get) => ({
      // Initial state
      currentStatus: 'pending',
      lastUpdated: 0,
      isSubscribed: false,
      _hasHydrated: false,

      // Actions
      setStatus: (status) => {
        console.log('[VerificationStatusStore] Setting status:', status);
        set({ 
          currentStatus: status, 
          lastUpdated: Date.now() 
        });
      },

      updateLastUpdated: () => {
        set({ lastUpdated: Date.now() });
      },

      setSubscribed: (subscribed) => {
        set({ isSubscribed: subscribed });
      },

      setHasHydrated: (hydrated) => {
        set({ _hasHydrated: hydrated });
      },

      // Real-time subscription setup
      setupSubscription: (userId: string, onStatusChange) => {
        if (globalSubscription) {
          console.log('[VerificationStatusStore] Cleaning up existing subscription');
          supabase.removeChannel(globalSubscription);
          globalSubscription = null;
        }

        console.log('[VerificationStatusStore] Setting up real-time subscription for user:', userId);

        const channel = supabase
          .channel(`verification-status-${userId}`)
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'profiles',
              filter: `id=eq.${userId}`,
            },
            (payload) => {
              console.log('[VerificationStatusStore] Real-time update received:', payload);
              
              const newStatus = payload.new?.verification_status as VerificationStatus;
              if (newStatus && newStatus !== get().currentStatus) {
                console.log('[VerificationStatusStore] Status changed:', get().currentStatus, '->', newStatus);
                
                // Update store
                get().setStatus(newStatus);
                
                // Call optional callback
                onStatusChange?.(newStatus);
              }
            }
          )
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              console.log('[VerificationStatusStore] Successfully subscribed to real-time updates');
              get().setSubscribed(true);
            } else if (status === 'CLOSED') {
              console.log('[VerificationStatusStore] Real-time subscription closed');
              get().setSubscribed(false);
            }
          });

        globalSubscription = channel;

        // Return cleanup function
        return () => {
          if (globalSubscription) {
            console.log('[VerificationStatusStore] Cleaning up subscription via cleanup function');
            supabase.removeChannel(globalSubscription);
            globalSubscription = null;
            get().setSubscribed(false);
          }
        };
      },

      cleanup: () => {
        if (globalSubscription) {
          console.log('[VerificationStatusStore] Manual cleanup triggered');
          supabase.removeChannel(globalSubscription);
          globalSubscription = null;
          set({ isSubscribed: false });
        }
      },
    }),
    {
      name: 'verification-status-storage',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        console.log('[VerificationStatusStore] Hydration complete');
        state?.setHasHydrated(true);
      },
    }
  )
);

// Hydration hook
export const useVerificationStatusHydration = () => {
  return useVerificationStatusStore((state) => state._hasHydrated);
};
/**
 * ✅ PURE ZUSTAND STORE: Payment setup state management
 * - NO useState patterns for payment state
 * - Replaces local payment state in payment.tsx
 * - Integrates with React Query for server state
 */

import { create } from 'zustand';

interface PaymentSetupState {
  // Payment state
  stripeAccountId: string | null;
  accountSetupComplete: boolean;
  
  // Actions
  setStripeAccountId: (accountId: string | null) => void;
  setAccountSetupComplete: (complete: boolean) => void;
  updatePaymentStatus: (accountId: string | null, complete: boolean) => void;
  clearPaymentState: () => void;
}

export const usePaymentSetupStore = create<PaymentSetupState>()((set) => ({
  // Initial state
  stripeAccountId: null,
  accountSetupComplete: false,
  
  // Actions
  setStripeAccountId: (accountId) => {
    set({ stripeAccountId: accountId });
  },
  
  setAccountSetupComplete: (complete) => {
    set({ accountSetupComplete: complete });
  },
  
  updatePaymentStatus: (accountId, complete) => {
    set({ 
      stripeAccountId: accountId,
      accountSetupComplete: complete 
    });
  },
  
  clearPaymentState: () => {
    set({ 
      stripeAccountId: null,
      accountSetupComplete: false 
    });
  },
}));
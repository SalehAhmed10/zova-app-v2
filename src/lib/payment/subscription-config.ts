/**
 * ZOVA Subscription Configuration
 * 
 * This file contains all subscription-related constants and configuration
 * for both Customer SOS subscriptions and Provider Premium subscriptions.
 * 
 * Uses existing Stripe Connect integration - no additional services needed.
 * Price IDs are read from environment variables for security best practices.
 */

// Environment variables for Stripe Price IDs
const CUSTOMER_SOS_PRICE_ID = process.env.EXPO_PUBLIC_STRIPE_CUSTOMER_SOS_PRICE_ID || 'price_1SBWW4ENAHMeamEYNObfzeCr';
const PROVIDER_PREMIUM_PRICE_ID = process.env.EXPO_PUBLIC_STRIPE_PROVIDER_PREMIUM_PRICE_ID || 'price_1SBWaVENAHMeamEYAi2o6NQg';

// Product IDs (these are public identifiers, safe to keep in code)
const CUSTOMER_SOS_PRODUCT_ID = 'prod_T6hcZqr84a8N1n';
const PROVIDER_PREMIUM_PRODUCT_ID = 'prod_T6hciHksuLLimK';

export const SUBSCRIPTION_PRODUCTS = {
  CUSTOMER_SOS: {
    productId: CUSTOMER_SOS_PRODUCT_ID,
    priceId: CUSTOMER_SOS_PRICE_ID, // Now from environment variable
    amount: 599, // £5.99 in pence
    interval: 'month',
    type: 'customer_sos' as const,
    features: [
      'SOS emergency booking access',
      'Priority provider matching', 
      '24/7 priority support',
      'Instant booking confirmation',
      'Emergency service guarantee'
    ],
    displayName: 'SOS Access',
    description: 'Emergency booking access with priority provider matching'
  },
  PROVIDER_PREMIUM: {
    productId: PROVIDER_PREMIUM_PRODUCT_ID,
    priceId: PROVIDER_PREMIUM_PRICE_ID, // Now from environment variable
    amount: 599, // £5.99 in pence
    interval: 'month', 
    type: 'provider_premium' as const,
    features: [
      'Priority search placement',
      'Advanced analytics dashboard',
      'Customer insights & trends',
      'Custom business branding',
      'Enhanced profile visibility',
      'Premium customer support'
    ],
    displayName: 'Premium Provider',
    description: 'Advanced features and priority placement for providers'
  }
} as const;

export type SubscriptionType = keyof typeof SUBSCRIPTION_PRODUCTS;
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'incomplete' | 'trialing' | 'none';

export interface UserSubscription {
  id: string;
  user_id: string;
  stripe_subscription_id: string;
  type: 'customer_sos' | 'provider_premium';
  status: SubscriptionStatus;
  current_period_start?: string;
  current_period_end?: string;
  trial_end?: string;
  cancel_at_period_end: boolean;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionFeatures {
  // Customer SOS features
  emergencyBooking?: boolean;
  priorityMatching?: boolean;
  support24_7?: boolean;
  instantConfirmation?: boolean;
  
  // Provider Premium features  
  priorityPlacement?: boolean;
  advancedAnalytics?: boolean;
  customerInsights?: boolean;
  customBranding?: boolean;
  enhancedProfile?: boolean;
}

// Helper functions
export const getSubscriptionConfig = (type: 'customer_sos' | 'provider_premium') => {
  return type === 'customer_sos' 
    ? SUBSCRIPTION_PRODUCTS.CUSTOMER_SOS 
    : SUBSCRIPTION_PRODUCTS.PROVIDER_PREMIUM;
};

export const isSubscriptionActive = (status: SubscriptionStatus): boolean => {
  return status === 'active' || status === 'trialing';
};

export const getSubscriptionFeatures = (
  type: 'customer_sos' | 'provider_premium', 
  isActive: boolean
): SubscriptionFeatures => {
  if (!isActive) {
    return {
      emergencyBooking: false,
      priorityMatching: false,
      support24_7: false,
      instantConfirmation: false,
      priorityPlacement: false,
      advancedAnalytics: false,
      customerInsights: false,
      customBranding: false,
      enhancedProfile: false,
    };
  }

  if (type === 'customer_sos') {
    return {
      emergencyBooking: true,
      priorityMatching: true,
      support24_7: true,
      instantConfirmation: true,
    };
  }

  return {
    priorityPlacement: true,
    advancedAnalytics: true,
    customerInsights: true,
    customBranding: true,
    enhancedProfile: true,
  };
};
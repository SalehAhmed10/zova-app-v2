import React from 'react';
import { StripeProvider as StripeProviderBase } from '@stripe/stripe-react-native';
import Constants from 'expo-constants';

interface StripeProviderProps {
  children: React.ReactElement | React.ReactElement[];
}

export function StripeProvider({ children }: StripeProviderProps) {
  const publishableKey = Constants.expoConfig?.extra?.stripePublishableKey ||
    process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY;

  console.log('[StripeProvider] Publishable key available:', !!publishableKey);
  if (!publishableKey) {
    console.error('[StripeProvider] Stripe publishable key not found');
    return <>{Array.isArray(children) ? children : [children]}</>;
  }

  console.log('[StripeProvider] Initializing Stripe with key:', publishableKey.substring(0, 20) + '...');

  return (
    <StripeProviderBase
      publishableKey={publishableKey}
      merchantIdentifier="merchant.com.zova.serviceapp"
      urlScheme="zova"
    >
      {children}
    </StripeProviderBase>
  );
}
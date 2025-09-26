import React from 'react';
import { StripeProvider as StripeProviderBase } from '@stripe/stripe-react-native';
import Constants from 'expo-constants';

interface StripeProviderProps {
  children: React.ReactElement | React.ReactElement[];
}

export function StripeProvider({ children }: StripeProviderProps) {
  const publishableKey = Constants.expoConfig?.extra?.stripePublishableKey ||
    process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY;

  if (!publishableKey) {
    console.error('Stripe publishable key not found');
    return <>{Array.isArray(children) ? children : [children]}</>;
  }

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
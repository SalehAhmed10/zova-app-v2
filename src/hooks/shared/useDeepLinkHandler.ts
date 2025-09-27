import { useEffect } from 'react';
import { Linking } from 'react-native';

interface DeepLinkHandlerOptions {
  onStripeComplete?: () => void;
  onStripeRefresh?: () => void;
}

/**
 * Custom hook to handle deep link events
 * Encapsulates useEffect pattern for deep link handling
 * as this is a legitimate system integration requirement
 */
export function useDeepLinkHandler({ onStripeComplete, onStripeRefresh }: DeepLinkHandlerOptions) {
  useEffect(() => {
    const handleDeepLink = (event: { url: string }) => {
      const url = event.url;
      
      if (url.includes('stripe=complete')) {
        console.log('Returned from Stripe onboarding (complete), refreshing status...');
        // Small delay to allow Stripe to process the onboarding completion
        setTimeout(() => {
          onStripeComplete?.();
        }, 2000);
      } else if (url.includes('stripe=refresh')) {
        console.log('Returned from Stripe onboarding (refresh), refreshing status...');
        // Small delay to allow Stripe to process the onboarding completion
        setTimeout(() => {
          onStripeRefresh?.();
        }, 2000);
      }
    };

    // Add event listener for deep links
    const subscription = Linking.addEventListener('url', handleDeepLink);

    return () => {
      subscription?.remove();
    };
  }, [onStripeComplete, onStripeRefresh]);
}
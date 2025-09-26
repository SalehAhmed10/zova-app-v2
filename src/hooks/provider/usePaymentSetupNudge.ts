// Payment Setup Nudge Hook
// Use this to show gentle reminders for payment setup

import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/core/supabase';

const PAYMENT_NUDGE_KEY = 'payment_setup_nudge';
const NUDGE_INTERVAL_DAYS = 3; // Show nudge every 3 days

interface PaymentNudgeState {
  shouldShowNudge: boolean;
  isPaymentComplete: boolean;
  daysSinceLastNudge: number;
}

export const usePaymentSetupNudge = () => {
  const [nudgeState, setNudgeState] = useState<PaymentNudgeState>({
    shouldShowNudge: false,
    isPaymentComplete: false,
    daysSinceLastNudge: 0
  });

  useEffect(() => {
    checkNudgeStatus();
  }, []);

  const checkNudgeStatus = async () => {
    try {
      // Check if payment is already complete
      const { data: paymentData } = await supabase.functions.invoke('check-stripe-account-status');
      
      if (paymentData?.accountSetupComplete && paymentData?.charges_enabled) {
        setNudgeState(prev => ({ ...prev, isPaymentComplete: true }));
        return;
      }

      // Check when we last showed the nudge
      const lastNudgeData = await AsyncStorage.getItem(PAYMENT_NUDGE_KEY);
      const lastNudgeTime = lastNudgeData ? parseInt(lastNudgeData) : 0;
      const currentTime = Date.now();
      const daysSinceLastNudge = Math.floor((currentTime - lastNudgeTime) / (1000 * 60 * 60 * 24));

      setNudgeState({
        shouldShowNudge: daysSinceLastNudge >= NUDGE_INTERVAL_DAYS,
        isPaymentComplete: false,
        daysSinceLastNudge
      });
    } catch (error) {
      console.error('Error checking nudge status:', error);
    }
  };

  const showPaymentNudge = () => {
    Alert.alert(
      '💳 Ready to Start Earning?',
      'Set up your payment account to receive earnings from customers. It only takes 2-3 minutes with secure Stripe Connect.',
      [
        {
          text: 'Remind Later',
          style: 'cancel',
          onPress: markNudgeShown
        },
        {
          text: 'Set Up Now',
          onPress: () => {
            markNudgeShown();
            // Navigate to payment setup
            import('expo-router').then(({ router }) => {
              router.push('/provider-verification/payment');
            });
          }
        }
      ]
    );
  };

  const markNudgeShown = async () => {
    try {
      await AsyncStorage.setItem(PAYMENT_NUDGE_KEY, Date.now().toString());
      setNudgeState(prev => ({ ...prev, shouldShowNudge: false }));
    } catch (error) {
      console.error('Error marking nudge as shown:', error);
    }
  };

  const resetNudgeTimer = async () => {
    try {
      await AsyncStorage.removeItem(PAYMENT_NUDGE_KEY);
      setNudgeState(prev => ({ ...prev, shouldShowNudge: true, daysSinceLastNudge: 0 }));
    } catch (error) {
      console.error('Error resetting nudge timer:', error);
    }
  };

  return {
    ...nudgeState,
    showPaymentNudge,
    markNudgeShown,
    resetNudgeTimer,
    checkNudgeStatus
  };
};
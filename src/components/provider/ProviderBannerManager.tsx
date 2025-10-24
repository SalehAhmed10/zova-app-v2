/**
 * Provider Banner Manager Component
 * 
 * Purpose: Ensures only ONE banner shows at a time with proper priority
 * 
 * Priority Order:
 * 1. Verification Status Banner (pending/in_review) - HIGHEST
 * 2. Payment Setup Banner (approved but no payment) - MEDIUM
 * 
 * This prevents banner stacking and ensures clean UI
 */

import React from 'react';
import { View } from 'react-native';
import { VerificationStatusBanner } from './VerificationStatusBanner';
import { PaymentSetupBanner } from './PaymentSetupBanner';
import { useVerificationData } from '@/hooks/provider/useVerificationSingleSource';
import { useProviderAccess } from '@/hooks/provider/useProviderAccess';
import { useAuthStore } from '@/stores/auth';

export function ProviderBannerManager() {
  const user = useAuthStore((state) => state.user);
  const { data: verificationData } = useVerificationData(user?.id);
  const verificationStatus = verificationData?.progress?.verification_status;
  const { needsPaymentSetup, isFullyActive, isLoading } = useProviderAccess();

  // Priority 1: Show verification banner if pending or in_review
  const showVerificationBanner = verificationStatus === 'pending' || verificationStatus === 'in_review';
  
  // Priority 2: Show payment banner if verified but payment not setup
  // (Only if verification banner is NOT showing AND data is fully loaded)
  // Don't show during initial load to avoid flash/flicker
  const showPaymentBanner = !showVerificationBanner && needsPaymentSetup && !isFullyActive && !isLoading;

  return (
    <View className="pt-3">
      {showVerificationBanner && <VerificationStatusBanner />}
      {showPaymentBanner && <PaymentSetupBanner />}
    </View>
  );
}

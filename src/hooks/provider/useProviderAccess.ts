import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthOptimized } from '@/hooks';

/**
 * Provider Access Control Hook
 * 
 * Centralizes all access control logic for provider features based on:
 * - Verification status (approved/pending/rejected)
 * - Payment setup status (active/pending/null)
 * 
 * Use this hook to:
 * 1. Check if provider can access features (bookings, earnings, etc.)
 * 2. Show/hide UI elements based on status
 * 3. Display appropriate empty states or CTAs
 * 
 * @example
 * const { canAcceptBookings, needsPaymentSetup } = useProviderAccess();
 * 
 * if (!canAcceptBookings && needsPaymentSetup) {
 *   return <PaymentSetupPrompt />;
 * }
 */
export const useProviderAccess = () => {
  const { user } = useAuthOptimized();
  
  // ✅ React Query: Fetch verification + payment status from Supabase
  const { data: profile, isLoading, error } = useQuery({
    queryKey: ['provider-access', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          verification_status,
          stripe_account_status,
          stripe_charges_enabled,
          stripe_details_submitted
        `)
        .eq('id', user.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
    staleTime: 30000, // Cache for 30 seconds
    refetchOnWindowFocus: true, // Refresh when user returns to app
  });

  // Computed access flags
  const isVerificationApproved = profile?.verification_status === 'approved';
  const isVerificationPending = profile?.verification_status === 'pending' || profile?.verification_status === 'in_review';
  const isVerificationRejected = profile?.verification_status === 'rejected';
  
  // Payment is active when Stripe account is active AND charges are enabled
  const isPaymentActive = 
    profile?.stripe_account_status === 'active' && 
    profile?.stripe_charges_enabled === true;
  
  const isPaymentPending = 
    profile?.stripe_account_status === 'pending' ||
    (profile?.stripe_details_submitted === true && !profile?.stripe_charges_enabled);

  // Helper flags (computed before return)
  const needsVerification = !isVerificationApproved;
  const needsPaymentSetup = isVerificationApproved && !isPaymentActive;
  const isFullyActive = isVerificationApproved && isPaymentActive;

  return {
    // ===== Loading & Error States =====
    isLoading,
    error,
    hasError: !!error,
    
    // ===== Dashboard Access =====
    /**
     * Can view dashboard?
     * TRUE for all approved providers (with or without payment)
     */
    canViewDashboard: isVerificationApproved,
    
    /**
     * Is dashboard in read-only mode?
     * TRUE while verification is pending/in_review
     */
    isDashboardReadOnly: !isVerificationApproved,
    
    // ===== Booking Access =====
    /**
     * Can view booking requests?
     * TRUE for approved providers (even without payment)
     * Allows them to see opportunities
     */
    canViewBookings: isVerificationApproved,
    
    /**
     * Can accept booking requests?
     * TRUE only when both verification AND payment are complete
     * This is the primary gate for earning money
     */
    canAcceptBookings: isVerificationApproved && isPaymentActive,
    
    /**
     * Can respond to bookings (message, decline)?
     * TRUE for approved providers (even without payment)
     */
    canRespondToBookings: isVerificationApproved,
    
    // ===== Earnings Access =====
    /**
     * Can view earnings screen?
     * TRUE only when payment is active (otherwise empty state)
     */
    canViewEarnings: isVerificationApproved && isPaymentActive,
    
    /**
     * Can withdraw earnings?
     * TRUE when payment is active and there are earnings
     */
    canWithdrawEarnings: isVerificationApproved && isPaymentActive,
    
    // ===== Profile & Settings Access =====
    /**
     * Can edit profile?
     * TRUE for all (even during verification)
     */
    canEditProfile: true,
    
    /**
     * Can edit services/portfolio?
     * TRUE for approved providers
     */
    canEditServices: isVerificationApproved,
    
    /**
     * Can access settings?
     * TRUE for all
     */
    canAccessSettings: true,
    
    // ===== Calendar & Availability =====
    /**
     * Can set availability?
     * TRUE for approved providers (even without payment)
     * Allows them to prepare for bookings
     */
    canSetAvailability: isVerificationApproved,
    
    /**
     * Can view calendar?
     * TRUE for approved providers
     */
    canViewCalendar: isVerificationApproved,
    
    // ===== Status Flags (for conditional rendering) =====
    /**
     * Needs to complete verification?
     * TRUE when status is pending/in_review/rejected
     */
    needsVerification: !isVerificationApproved,
    
    /**
     * Needs to setup payment?
     * TRUE when approved but payment not active
     */
    needsPaymentSetup: isVerificationApproved && !isPaymentActive,
    
    /**
     * Is payment setup in progress?
     * TRUE when Stripe account is pending
     */
    paymentSetupInProgress: isPaymentPending,
    
    /**
     * Is fully active (can earn money)?
     * TRUE when both verification AND payment are complete
     */
    isFullyActive: isVerificationApproved && isPaymentActive,
    
    /**
     * Is verification rejected?
     * TRUE when status is rejected
     */
    isRejected: isVerificationRejected,
    
    // ===== Raw Status (for debugging & advanced use) =====
    verificationStatus: profile?.verification_status,
    stripeAccountStatus: profile?.stripe_account_status,
    stripeChargesEnabled: profile?.stripe_charges_enabled,
    stripeDetailsSubmitted: profile?.stripe_details_submitted,
    
    // ===== Helper Methods =====
    /**
     * Get primary CTA for provider's current state
     * Returns action user should take next
     */
    getPrimaryCTA: () => {
      if (isVerificationRejected) {
        return {
          label: 'Resubmit Verification',
          route: '/provider-verification',
          variant: 'default' as const,
        };
      }
      
      if (isVerificationPending) {
        return {
          label: 'Check Verification Status',
          route: '/provider-verification/verification-status',
          variant: 'secondary' as const,
        };
      }
      
      if (needsVerification) {
        return {
          label: 'Complete Verification',
          route: '/provider-verification',
          variant: 'default' as const,
        };
      }
      
      if (needsPaymentSetup) {
        return {
          label: 'Setup Payments',
          route: '/provider/setup-payment',
          variant: 'default' as const,
        };
      }
      
      if (isPaymentPending) {
        return {
          label: 'Check Payment Status',
          route: '/provider/setup-payment',
          variant: 'secondary' as const,
        };
      }
      
      return null; // Fully active, no CTA needed
    },
    
    /**
     * Get status message for provider's current state
     */
    getStatusMessage: () => {
      if (isVerificationRejected) {
        return 'Verification was not approved. Please review feedback and resubmit.';
      }
      
      if (isVerificationPending) {
        return 'Your verification is being reviewed (24-48 hours).';
      }
      
      if (needsVerification) {
        return 'Complete your provider verification to start accepting bookings.';
      }
      
      if (needsPaymentSetup) {
        return 'Setup payments to accept bookings and start earning.';
      }
      
      if (isPaymentPending) {
        return 'Payment setup in progress. Check status for updates.';
      }
      
      return 'You\'re all set! Start accepting bookings.';
    },
  };
};

/**
 * Type definition for the hook return value
 * Export for use in components
 */
export type ProviderAccess = ReturnType<typeof useProviderAccess>;

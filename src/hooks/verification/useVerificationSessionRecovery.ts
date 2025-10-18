/**
 * ✅ VERIFICATION SESSION RECOVERY HOOK
 * Handles the edge case where providers lose their session during verification
 *
 * Scenario: Provider registers → OTP → starts verification → closes app → logs back in
 * Should resume verification instead of showing "not approved" status
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthPure as useAuthOptimized } from '../shared/useAuthPure';
import { supabase } from '@/lib/supabase';

interface VerificationSessionRecovery {
  hasIncompleteSession: boolean;
  shouldResumeVerification: boolean;
  lastStepCompleted: number;
  sessionId: string | null;
  isLoading: boolean;
  error: any;
}

/**
 * ✅ PURE: Detects incomplete verification sessions on login
 * Returns whether user should resume verification flow
 */
export const useVerificationSessionRecovery = (): VerificationSessionRecovery => {
  const { user } = useAuthOptimized();

  // ✅ REACT QUERY: Check for incomplete verification sessions
  const { data: sessionData, isLoading, error } = useQuery({
    queryKey: ['verification-session-recovery', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      console.log('[SessionRecovery] Checking for incomplete sessions for user:', user.id);

      // ✅ OPTIMIZATION: Quick check first - if user is already approved, skip complex checks
      const { data: quickProgress, error: quickError } = await supabase
        .from('provider_onboarding_progress')
        .select('verification_status')
        .eq('provider_id', user.id)
        .single();

      if (!quickError && quickProgress?.verification_status === 'approved') {
        console.log('[SessionRecovery] User already approved, skipping session checks');
        return {
          hasIncompleteSession: false,
          shouldResumeVerification: false,
          lastStepCompleted: 9,
          sessionId: null
        };
      }

      // Check provider onboarding progress for incomplete sessions
      const { data: progress, error: progressError } = await supabase
        .from('provider_onboarding_progress')
        .select(`
          current_step,
          verification_status,
          stripe_validation_status,
          updated_at
        `)
        .eq('provider_id', user.id)
        .single();

      if (progressError && progressError.code !== 'PGRST116') { // PGRST116 = no rows
        console.error('[SessionRecovery] Error fetching progress:', progressError);
        throw progressError;
      }

      // If no progress record, no incomplete session
      if (!progress) {
        console.log('[SessionRecovery] No progress record found');
        return {
          hasIncompleteSession: false,
          shouldResumeVerification: false,
          lastStepCompleted: 0,
          sessionId: null
        };
      }

      // Check if verification is already approved
      if (progress.verification_status === 'approved') {
        console.log('[SessionRecovery] Verification already approved');
        return {
          hasIncompleteSession: false,
          shouldResumeVerification: false,
          lastStepCompleted: 9,
          sessionId: null // No session tracking in current schema
        };
      }

      // Check if there's an active incomplete session (in_progress status with recent activity)
      const lastActivity = new Date(progress.updated_at);
      const hoursSinceActivity = (Date.now() - lastActivity.getTime()) / (1000 * 60 * 60);
      
      if (progress.verification_status === 'in_progress' && hoursSinceActivity < 24) {
        console.log('[SessionRecovery] Found incomplete session, should resume');
        return {
          hasIncompleteSession: true,
          shouldResumeVerification: true,
          lastStepCompleted: progress.current_step || 1,
          sessionId: null
        };
      }

      // Check for any incomplete step progress
      const { data: stepProgress, error: stepError } = await supabase
        .from('provider_verification_step_progress')
        .select('step_number, status')
        .eq('provider_id', user.id)
        .in('status', ['in_progress', 'completed'])
        .order('step_number', { ascending: false })
        .limit(1);

      if (stepError) {
        console.error('[SessionRecovery] Error fetching step progress:', stepError);
        return {
          hasIncompleteSession: false,
          shouldResumeVerification: false,
          lastStepCompleted: progress.current_step || 0,
          sessionId: null
        };
      }

      // If there are completed or in-progress steps, user has incomplete verification
      const hasIncompleteSteps = stepProgress && stepProgress.length > 0;
      const lastCompletedStep = stepProgress?.[0]?.step_number || 0;

      console.log('[SessionRecovery] Step progress check:', {
        hasIncompleteSteps,
        lastCompletedStep,
        totalSteps: stepProgress?.length || 0
      });

      return {
        hasIncompleteSession: hasIncompleteSteps,
        shouldResumeVerification: hasIncompleteSteps && progress.verification_status !== 'approved',
        lastStepCompleted: lastCompletedStep,
        sessionId: null
      };
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  return useMemo(() => ({
    hasIncompleteSession: sessionData?.hasIncompleteSession || false,
    shouldResumeVerification: sessionData?.shouldResumeVerification || false,
    lastStepCompleted: sessionData?.lastStepCompleted || 0,
    sessionId: sessionData?.sessionId || null,
    isLoading,
    error
  }), [sessionData, isLoading, error]);
};
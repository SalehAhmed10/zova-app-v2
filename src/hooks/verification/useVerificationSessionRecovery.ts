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
import { supabase } from '@/lib/core/supabase';

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
      const { data: quickProfile, error: quickError } = await supabase
        .from('profiles')
        .select('verification_status')
        .eq('id', user.id)
        .single();

      if (!quickError && quickProfile?.verification_status === 'approved') {
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
          current_session_id,
          last_session_activity,
          total_sessions_count,
          current_step,
          verification_status,
          stripe_validation_status
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
          sessionId: progress.current_session_id
        };
      }

      // Check if there's an active session
      if (progress.current_session_id) {
        // Verify the session is still active
        const { data: session, error: sessionError } = await supabase
          .from('provider_verification_sessions')
          .select('is_active, expires_at, last_activity_at')
          .eq('session_id', progress.current_session_id)
          .eq('provider_id', user.id)
          .single();

        if (sessionError) {
          console.error('[SessionRecovery] Error fetching session:', sessionError);
          // If session fetch fails, assume no active session
          return {
            hasIncompleteSession: false,
            shouldResumeVerification: false,
            lastStepCompleted: progress.current_step || 0,
            sessionId: null
          };
        }

        // Check if session is still valid
        const now = new Date();
        const expiresAt = new Date(session.expires_at);
        const isSessionActive = session.is_active && expiresAt > now;

        if (isSessionActive) {
          console.log('[SessionRecovery] Found active incomplete session:', progress.current_session_id);
          return {
            hasIncompleteSession: true,
            shouldResumeVerification: true,
            lastStepCompleted: progress.current_step || 0,
            sessionId: progress.current_session_id
          };
        }
      }

      // Check for any incomplete step progress (even without active session)
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
        sessionId: progress.current_session_id
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
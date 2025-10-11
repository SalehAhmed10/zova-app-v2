/**
 * ✅ CONFLICT DETECTION & RESOLUTION HOOK
 * Detects cross-device verification conflicts and manages resolution
 */

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthPure as useAuthOptimized } from '../shared/useAuthPure';
import { supabase } from '@/lib/supabase';

interface ConflictData {
  hasConflict: boolean;
  currentDevice: string;
  conflictingDevice: string;
  lastActivity: Date;
  currentStep: number;
  conflictingStep: number;
}

interface UseConflictResolutionReturn {
  conflictData: ConflictData | null;
  showConflictModal: boolean;
  setShowConflictModal: (show: boolean) => void;
  isLoading: boolean;
  error: any;
  resolveConflict: (keepCurrent: boolean) => Promise<void>;
}

/**
 * ✅ Detects and resolves cross-device verification conflicts
 */
export const useConflictResolution = (): UseConflictResolutionReturn => {
  const { user } = useAuthOptimized();
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [conflictData, setConflictData] = useState<ConflictData | null>(null);

  // ✅ REACT QUERY: Check for conflicting sessions
  const { data: conflictCheck, isLoading, error, refetch } = useQuery({
    queryKey: ['verification-conflicts', user?.id],
    queryFn: async (): Promise<ConflictData | null> => {
      if (!user?.id) return null;

      console.log('[ConflictDetection] Checking for conflicts for user:', user.id);

      // Get current device fingerprint (simplified - in real app use proper device ID)
      const currentDeviceId = `device_${Date.now()}`;

      // Check for active sessions from other devices
      const { data: activeSessions, error: sessionsError } = await supabase
        .from('provider_verification_sessions')
        .select(`
          session_id,
          device_fingerprint,
          last_activity_at,
          provider_verification_step_progress!provider_verification_step_progress_session_id_fkey (
            step_number,
            status
          )
        `)
        .eq('provider_id', user.id)
        .eq('is_active', true)
        .neq('device_fingerprint', currentDeviceId)
        .order('last_activity_at', { ascending: false })
        .limit(1);

      if (sessionsError) {
        console.error('[ConflictDetection] Error fetching sessions:', sessionsError);
        throw sessionsError;
      }

      if (!activeSessions || activeSessions.length === 0) {
        console.log('[ConflictDetection] No conflicting sessions found');
        return null;
      }

      const conflictingSession = activeSessions[0];

      // Get the highest completed step for the conflicting session
      const conflictingSteps = conflictingSession.provider_verification_step_progress || [];
      const maxCompletedStep = Math.max(
        0,
        ...conflictingSteps
          .filter((step: any) => step.status === 'completed')
          .map((step: any) => step.step_number)
      );

      // Get current session progress
      const { data: currentProgress, error: progressError } = await supabase
        .from('provider_verification_step_progress')
        .select('step_number, status')
        .eq('provider_id', user.id)
        .eq('status', 'completed')
        .order('step_number', { ascending: false })
        .limit(1);

      if (progressError) {
        console.error('[ConflictDetection] Error fetching current progress:', progressError);
        // Continue without current progress
      }

      const currentMaxStep = currentProgress && currentProgress.length > 0
        ? currentProgress[0].step_number
        : 0;

      console.log('[ConflictDetection] Conflict detected:', {
        currentDevice: currentDeviceId,
        conflictingDevice: conflictingSession.device_fingerprint,
        currentStep: currentMaxStep,
        conflictingStep: maxCompletedStep,
        lastActivity: conflictingSession.last_activity_at
      });

      return {
        hasConflict: true,
        currentDevice: currentDeviceId,
        conflictingDevice: conflictingSession.device_fingerprint,
        lastActivity: new Date(conflictingSession.last_activity_at),
        currentStep: currentMaxStep,
        conflictingStep: maxCompletedStep
      };
    },
    enabled: !!user?.id,
    staleTime: 30 * 1000, // 30 seconds - conflicts need fresh data
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  // Auto-show modal when conflict is detected
  useEffect(() => {
    if (conflictCheck?.hasConflict && !showConflictModal) {
      console.log('[ConflictDetection] Auto-showing conflict modal');
      setConflictData(conflictCheck);
      setShowConflictModal(true);
    }
  }, [conflictCheck, showConflictModal]);

  // ✅ Resolve conflict
  const resolveConflict = async (keepCurrent: boolean) => {
    if (!conflictData) return;

    console.log('[ConflictResolution] Resolving conflict, keepCurrent:', keepCurrent);

    try {
      if (keepCurrent) {
        // End the conflicting session
        const { error } = await supabase
          .from('provider_verification_sessions')
          .update({
            is_active: false,
            ended_at: new Date().toISOString()
          })
          .eq('device_fingerprint', conflictData.conflictingDevice)
          .eq('provider_id', user?.id);

        if (error) throw error;
      } else {
        // End current session and use server data
        // This will be handled by the modal component
        console.log('[ConflictResolution] Using server data - handled by modal');
      }

      // Hide modal and clear conflict data
      setShowConflictModal(false);
      setConflictData(null);

      // Refetch to confirm resolution
      refetch();

    } catch (error) {
      console.error('[ConflictResolution] Failed to resolve conflict:', error);
      throw error;
    }
  };

  return {
    conflictData,
    showConflictModal,
    setShowConflictModal,
    isLoading,
    error,
    resolveConflict
  };
};
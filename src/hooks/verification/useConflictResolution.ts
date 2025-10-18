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

      // ⚠️ TEMPORARY: Disable conflict detection until sessions table is needed
      // This feature detects if user is verifying on multiple devices simultaneously
      // Currently not critical for MVP - can be re-enabled when multi-device support needed
      console.log('[ConflictDetection] Conflict detection disabled (sessions table not in use)');
      return null;

      /* DISABLED - Re-enable when sessions table exists
      const currentDeviceId = `device_${Date.now()}`;
      const { data: activeSessions, error: sessionsError } = await supabase
        .from('provider_verification_sessions')
        .select('...')
        .eq('provider_id', user.id);
      // ... rest of conflict detection logic
      */
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

    console.log('[ConflictResolution] Conflict resolution disabled (sessions table not in use)');
    
    // Just hide the modal since conflict detection is disabled
    setShowConflictModal(false);
    setConflictData(null);

    /* DISABLED - Re-enable when sessions table exists
    try {
      if (keepCurrent) {
        const { error } = await supabase
          .from('provider_verification_sessions')
          .update({ is_active: false, ended_at: new Date().toISOString() })
          .eq('device_fingerprint', conflictData.conflictingDevice)
          .eq('provider_id', user?.id);
        if (error) throw error;
      }
      refetch();
    } catch (error) {
      console.error('[ConflictResolution] Failed to resolve conflict:', error);
      throw error;
    }
    */
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
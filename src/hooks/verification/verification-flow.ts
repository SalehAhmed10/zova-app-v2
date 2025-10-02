import { useEffect } from 'react';
import { useProviderVerificationStore } from '@/stores/verification/provider-verification';
import { useVerificationSync } from './server-queries';

// Main hook that combines Zustand store with React Query server state
export const useVerificationFlow = () => {
  const store = useProviderVerificationStore();
  const serverState = useVerificationSync();

  // Auto-sync server state to store when data changes
  useEffect(() => {
    if (serverState.onboardingProgress) {
      const progress = serverState.onboardingProgress;

      // Update store with server data
      store.setProviderId(progress.provider_id);
      store.setVerificationStatus(progress.verification_status);

      // Update enhanced fields
      if (progress.current_session_id) {
        store.initializeSession(progress.current_session_id);
      }

      if (progress.stripe_validation_status) {
        store.updateStripeValidation({
          status: progress.stripe_validation_status,
          errors: progress.stripe_validation_errors || [],
          lastValidatedAt: progress.stripe_last_validated_at ? new Date(progress.stripe_last_validated_at) : undefined,
        });
      }

      store.updateNotificationPreferences(progress.notification_preferences || {});
    }
  }, [serverState.onboardingProgress, store]);

  // Auto-sync step progress
  useEffect(() => {
    if (serverState.stepProgress) {
      const stepProgressMap: Record<number, any> = {};

      serverState.stepProgress.forEach(step => {
        stepProgressMap[step.step_number] = {
          stepNumber: step.step_number,
          status: step.status,
          data: step.data,
          validationErrors: step.validation_errors || [],
          lock: step.locked_by_session ? {
            lockedBySession: step.locked_by_session,
            lockedAt: new Date(step.locked_at),
            lockExpiresAt: new Date(step.lock_expires_at),
          } : undefined,
          startedAt: step.started_at ? new Date(step.started_at) : undefined,
          completedAt: step.completed_at ? new Date(step.completed_at) : undefined,
          failedAt: step.failed_at ? new Date(step.failed_at) : undefined,
          retryCount: step.retry_count,
          maxRetries: step.max_retries,
        };
      });

      // Update store step progress
      Object.entries(stepProgressMap).forEach(([stepNumber, progress]) => {
        store.updateStepProgress(parseInt(stepNumber), progress);
      });
    }
  }, [serverState.stepProgress, store]);

  // Auto-update session activity
  useEffect(() => {
    const interval = setInterval(() => {
      if (store.sessionId && store.currentSession?.isActive) {
        store.updateSessionActivity();
      }
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [store.sessionId, store.currentSession?.isActive]);

  return {
    // Store state and actions
    ...store,

    // Server state
    serverState,

    // Computed values
    isOnline: !serverState.isLoading && !serverState.error,
    hasServerConflict: serverState.error !== null,

    // Enhanced actions that sync with server
    initializeSession: async (deviceFingerprint?: string) => {
      await store.initializeSession(deviceFingerprint);
      // TODO: Create server session and sync
    },

    completeStep: (stepNumber: number, data?: any) => {
      store.completeStep(stepNumber, data);
      // TODO: Sync completion with server
    },

    acquireStepLock: async (stepNumber: number) => {
      const localLock = await store.acquireStepLock(stepNumber);
      if (localLock) {
        // TODO: Acquire server lock
        return true;
      }
      return false;
    },

    // Utility functions
    getServerStepStatus: (stepNumber: number) => {
      const serverStep = serverState.stepProgress?.find(s => s.step_number === stepNumber);
      return serverStep?.status || 'not_started';
    },

    hasStepConflict: (stepNumber: number) => {
      const localStatus = store.stepProgress[stepNumber]?.status;
      const serverStatus = serverState.stepProgress?.find(s => s.step_number === stepNumber)?.status;
      return localStatus !== serverStatus && serverStatus !== undefined;
    },
  };
};

// Hook for session management
export const useVerificationSession = () => {
  const { currentSession, sessionId, initializeSession, updateSessionActivity, endSession } = useVerificationFlow();

  return {
    session: currentSession,
    sessionId,
    isActive: currentSession?.isActive || false,
    timeRemaining: currentSession ? Math.max(0, currentSession.expiresAt.getTime() - Date.now()) : 0,
    initializeSession,
    updateSessionActivity,
    endSession,
  };
};

// Hook for step locking
export const useStepLocking = (stepNumber: number) => {
  const {
    acquireStepLock,
    releaseStepLock,
    isStepLockedByOther,
    stepProgress,
    sessionId,
    getServerStepStatus,
    hasStepConflict
  } = useVerificationFlow();

  const stepData = stepProgress[stepNumber];
  const isLocked = stepData?.lock !== undefined;
  const isLockedByMe = stepData?.lock?.lockedBySession === sessionId;
  const isLockedByOther = isStepLockedByOther(stepNumber);
  const lockExpiresAt = stepData?.lock?.lockExpiresAt;

  return {
    isLocked,
    isLockedByMe,
    isLockedByOther,
    lockExpiresAt,
    canAcquire: !isLocked || (!isLockedByMe && lockExpiresAt && lockExpiresAt < new Date()),
    serverStatus: getServerStepStatus(stepNumber),
    hasConflict: hasStepConflict(stepNumber),
    acquireLock: () => acquireStepLock(stepNumber),
    releaseLock: () => releaseStepLock(stepNumber),
  };
};

// Hook for Stripe validation
export const useStripeValidation = () => {
  const { stripeValidation, validateStripeAccount, updateStripeValidation } = useVerificationFlow();

  return {
    validation: stripeValidation,
    isValidating: stripeValidation.status === 'validating',
    isValid: stripeValidation.status === 'valid',
    hasErrors: stripeValidation.errors.length > 0,
    validateAccount: validateStripeAccount,
    updateValidation: updateStripeValidation,
  };
};

// Hook for notifications
export const useVerificationNotifications = () => {
  const { notificationPreferences, updateNotificationPreferences, markNotificationRead } = useVerificationFlow();
  const { notifications } = useVerificationSync();

  return {
    notifications: notifications || [],
    preferences: notificationPreferences,
    unreadCount: notifications?.filter(n => !n.read_at).length || 0,
    updatePreferences: updateNotificationPreferences,
    markAsRead: markNotificationRead,
  };
};
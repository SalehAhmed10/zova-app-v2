import { useEffect } from 'react';
import { useProviderVerificationStore } from '@/stores/verification/provider-verification';
import { 
  useVerificationSync, 
  useCreateVerificationSession,
  useUpdateStepProgress,
  useUpdateOnboardingProgress,
  useAcquireStepLock as useAcquireStepLockMutation,
  useReleaseStepLock as useReleaseStepLockMutation,
} from './server-queries';
import { useAuthOptimized } from '../shared';

// Main hook that combines Zustand store with React Query server state
export const useVerificationFlow = () => {
  const store = useProviderVerificationStore();
  const serverState = useVerificationSync();
  const { user } = useAuthOptimized();
  
  // Server mutations
  const createSessionMutation = useCreateVerificationSession();
  const updateStepMutation = useUpdateStepProgress();
  const updateOnboardingMutation = useUpdateOnboardingProgress();
  const acquireStepLockMutation = useAcquireStepLockMutation();
  const releaseStepLockMutation = useReleaseStepLockMutation();

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
      try {
        // 1. Initialize local session first
        await store.initializeSession(deviceFingerprint);
        const sessionId = store.sessionId;
        
        // 2. Create server session and sync
        if (user?.id && sessionId) {
          const serverSession = await createSessionMutation.mutateAsync({
            providerId: user.id,
            deviceFingerprint,
            // Optional: Add IP and user agent if available
          });
          
          console.log('✅ Server session created:', serverSession.session_id);
          
          // 3. Initialize onboarding progress if needed
          await updateOnboardingMutation.mutateAsync({
            providerId: user.id,
            updates: {
              current_session_id: serverSession.session_id,
              last_activity_at: new Date().toISOString(),
            },
          });
        }
        
        return sessionId;
      } catch (error) {
        console.error('❌ Failed to initialize session:', error);
        // Local session still works, just log the error
        return store.sessionId;
      }
    },

    completeStep: async (stepNumber: number, data?: any) => {
      try {
        // 1. Optimistic update: Update local state first
        store.completeStep(stepNumber, data);
        
        // 2. Sync completion with server
        if (store.sessionId && user?.id) {
          await updateStepMutation.mutateAsync({
            sessionId: store.sessionId,
            stepNumber,
            status: 'completed',
            data,
            validationErrors: [],
          });
          
          console.log(`✅ Step ${stepNumber} synced to server`);
          
          // 3. Update overall onboarding progress
          const completedSteps = Object.keys(store.stepProgress)
            .map(Number)
            .filter(step => store.stepProgress[step]?.status === 'completed');
          
          // Calculate total steps from steps object
          const totalSteps = Object.keys(store.steps).length;
          
          await updateOnboardingMutation.mutateAsync({
            providerId: user.id,
            updates: {
              current_step: stepNumber + 1,
              completed_steps: completedSteps,
              last_completed_at: new Date().toISOString(),
              progress_percentage: Math.round((completedSteps.length / totalSteps) * 100),
            },
          });
        }
        
        return { success: true };
      } catch (error) {
        console.error(`❌ Failed to sync step ${stepNumber}:`, error);
        // Data is saved locally, just log the error
        return { success: false, error: (error as Error).message };
      }
    },

    acquireStepLock: async (stepNumber: number) => {
      try {
        // 1. Acquire local lock first
        const localLock = await store.acquireStepLock(stepNumber);
        
        if (localLock && store.sessionId) {
          // 2. Acquire server lock for distributed locking
          const serverLock = await acquireStepLockMutation.mutateAsync({
            sessionId: store.sessionId,
            stepNumber,
            lockDuration: 30, // 30 minutes
          });
          
          if (serverLock) {
            console.log(`✅ Step ${stepNumber} lock acquired`);
            return true;
          } else {
            // Server lock failed, release local lock
            store.releaseStepLock(stepNumber);
            console.warn(`⚠️ Step ${stepNumber} locked by another session`);
            return false;
          }
        }
        
        return false;
      } catch (error) {
        console.error(`❌ Failed to acquire lock for step ${stepNumber}:`, error);
        return false;
      }
    },
    
    releaseStepLock: async (stepNumber: number) => {
      try {
        // 1. Release local lock
        store.releaseStepLock(stepNumber);
        
        // 2. Release server lock
        if (store.sessionId) {
          await releaseStepLockMutation.mutateAsync({
            sessionId: store.sessionId,
            stepNumber,
          });
          
          console.log(`✅ Step ${stepNumber} lock released`);
        }
        
        return true;
      } catch (error) {
        console.error(`❌ Failed to release lock for step ${stepNumber}:`, error);
        return false;
      }
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
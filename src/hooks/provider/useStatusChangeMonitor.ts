/**
 * ✅ STATUS CHANGE MONITOR HOOK
 * Monitors verification status changes and handles them gracefully
 */

import { useEffect, useRef } from 'react';
import { router } from 'expo-router';
import { useProfileStore } from '@/stores/verification/useProfileStore';
import { useAppStore } from '@/stores/auth/app';
import { Alert } from 'react-native';

export const useStatusChangeMonitor = () => {
  const { verificationStatus } = useProfileStore();
  const { isLoggingOut } = useAppStore();
  const previousStatus = useRef<string | null>(null);
  const isHandlingChange = useRef(false);

  useEffect(() => {
    const currentStatus = verificationStatus;

    // ✅ SKIP MONITORING DURING LOGOUT
    if (isLoggingOut) {
      console.log('[StatusChangeMonitor] Skipping status monitoring during logout');
      previousStatus.current = currentStatus;
      return;
    }

    // ✅ DETECT STATUS CHANGE
    if (previousStatus.current && previousStatus.current !== currentStatus && !isHandlingChange.current) {
      isHandlingChange.current = true;

      console.log(`[StatusChangeMonitor] Status changed: ${previousStatus.current} → ${currentStatus}`);

      // ✅ HANDLE DOWNGRADE FROM APPROVED
      if (previousStatus.current === 'approved' && currentStatus !== 'approved') {
        console.log('[StatusChangeMonitor] ⚠️ User status downgraded from approved');

        Alert.alert(
          'Verification Status Changed',
          'Your verification status has been updated. You may need to complete additional steps.',
          [
            {
              text: 'OK',
              onPress: () => {
                // Navigate based on new status
                if (currentStatus === 'pending' || currentStatus === 'in_review') {
                  router.replace('/provider-verification/verification-status');
                } else if (currentStatus === 'rejected') {
                  router.replace('/provider-verification');
                }
                isHandlingChange.current = false;
              }
            }
          ]
        );
      }
      // ✅ HANDLE UPGRADE TO APPROVED
      else if (currentStatus === 'approved' && previousStatus.current !== 'approved') {
        console.log('[StatusChangeMonitor] ✅ User status upgraded to approved');
        // Auto-navigation will handle this
        isHandlingChange.current = false;
      }
      // ✅ OTHER CHANGES
      else {
        isHandlingChange.current = false;
      }
    }

    previousStatus.current = currentStatus;
  }, [verificationStatus]);

  return { currentStatus: verificationStatus, previousStatus: previousStatus.current };
};